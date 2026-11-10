import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { KycDocumentType } from '../generated/prisma/enums.js';
import { ImageKitStorageService, type UploadKind } from './imagekit-storage.service.js';
import { ListSellersQueryDto, OnboardSellerDto, SellerApplicationDto, SellerStatusActionDto, UpdateSellerDto } from './dto/seller.dto.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { hasLevel } from '../permissions/permissions.constants.js';
import {
  BRAND_COLORS,
  BUSINESS_TYPES,
  KYC_DOCUMENTS,
  requiredKycDocuments,
  SELLER_ADMIN_ROLE_NAME,
  SELLER_CATEGORIES,
  SLUG_REGEX,
  type SellerCategoryKey,
} from './sellers.constants.js';

const INVITE_TTL = '7d';
const INVITE_TTL_LABEL = '7 days';

/** Slugs that would clash with marketplace routes */
const RESERVED_SLUGS = new Set(['admin', 'api', 'auth', 'login', 'signup', 'seller', 'sellers', 'cart', 'checkout', 'account', 'help', 'search']);

const listSelect = {
  id: true,
  name: true,
  slug: true,
  category: true,
  logoUrl: true,
  brandColor: true,
  status: true,
  kycStatus: true,
  commissionRate: true,
  createdVia: true,
  createdAt: true,
  owner: { select: { id: true, fullName: true, email: true, phone: true } },
  businessDetails: { select: { legalBusinessName: true } },
  _count: { select: { kycDocuments: true, users: true } },
} satisfies Prisma.SellerSelect;

const detailSelect = {
  ...listSelect,
  kycOfflineReference: true,
  updatedAt: true,
  businessDetails: true,
  createdBy: { select: { id: true, fullName: true } },
  users: {
    select: {
      id: true, fullName: true, email: true, phone: true, status: true, createdAt: true,
      role: { select: { id: true, name: true } },
      sessions: { select: { lastActiveAt: true }, orderBy: { lastActiveAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  },
  kycDocuments: {
    select: {
      id: true, documentType: true, fileName: true, mimeType: true, status: true, uploadedAt: true, reviewedAt: true,
      reviewedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { uploadedAt: 'asc' },
  },
} satisfies Prisma.SellerSelect;

type SellerRow = Prisma.SellerGetPayload<{ select: typeof listSelect }>;

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageKitStorageService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly permissions: PermissionsService,
  ) { }

  /** Customer store (storefront) base URL from .env CUSTOMER_STORE, e.g. https://marketplace.example.com */
  private get customerStoreUrl() {
    return (this.config.get<string>('CUSTOMER_STORE')?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
  }

  /** Seller admin app base URL (links in emails) */
  private get sellerAdminUrl() {
    return (this.config.get<string>('SELLER_ADMIN_URL')?.trim() || 'http://localhost:3001').replace(/\/+$/, '');
  }

  /** Base for seller pages: <CUSTOMER_STORE>/seller/ */
  private get sellerPageBase() {
    return `${this.customerStoreUrl}/seller/`;
  }

  private serialize<T extends SellerRow>(seller: T) {
    const { _count, commissionRate, ...rest } = seller;
    return {
      ...rest,
      /** Full public page URL, built from CUSTOMER_STORE */
      publicUrl: `${this.sellerPageBase}${seller.slug}`,
      commissionRate: Number(commissionRate),
      kycDocumentsCount: _count.kycDocuments,
      usersCount: _count.users,
      categoryLabel: SELLER_CATEGORIES.find((c) => c.key === seller.category)?.label ?? seller.category,
    };
  }

  meta() {
    return {
      data: {
        categories: SELLER_CATEGORIES,
        businessTypes: BUSINESS_TYPES,
        brandColors: BRAND_COLORS,
        kycDocuments: KYC_DOCUMENTS,
        sellerPageBase: this.sellerPageBase,
      },
    };
  }

  uploadAuth(kind: UploadKind) {
    return { data: this.storage.getUploadAuth(kind) };
  }

  async slugAvailability(slug: string) {
    if (!SLUG_REGEX.test(slug) || slug.length < 3 || slug.length > 50) {
      return { data: { slug, available: false, reason: 'Use 3–50 lowercase letters, numbers and hyphens' } };
    }
    if (RESERVED_SLUGS.has(slug)) {
      return { data: { slug, available: false, reason: 'This URL is reserved' } };
    }
    const taken = await this.prisma.seller.findUnique({ where: { slug }, select: { id: true } });
    return { data: { slug, available: !taken, reason: taken ? 'Already taken by another seller' : null } };
  }

  async findAll(query: ListSellersQueryDto) {
    const sellers = await this.prisma.seller.findMany({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.kycStatus && { kycStatus: query.kycStatus }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
            { owner: { email: { contains: query.search, mode: 'insensitive' } } },
            { businessDetails: { legalBusinessName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      select: listSelect,
    });
    return { data: sellers.map((s) => this.serialize(s)) };
  }

  async findOne(id: string) {
    const seller = await this.prisma.seller.findUnique({ where: { id }, select: detailSelect });
    if (!seller) throw new NotFoundException('Seller not found');
    const { users, ...rest } = this.serialize(seller);
    return {
      data: {
        ...rest,
        users: users.map(({ sessions, ...u }) => ({ ...u, lastActiveAt: sessions[0]?.lastActiveAt ?? null })),
      },
    };
  }

  /** Short-lived signed link to view one private KYC document. */
  async kycDocumentUrl(sellerId: string, documentId: string) {
    const doc = await this.prisma.sellerKycDocument.findFirst({
      where: { id: documentId, sellerId },
      select: { filePath: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return { data: { url: this.storage.signedUrl(doc.filePath) } };
  }

  /** Checks logo + KYC files with ImageKit and that every required document is present. */
  private async verifyFiles(
    profile: { category: SellerCategoryKey; logoFileId?: string },
    kyc: { mode: 'UPLOAD' | 'OFFLINE'; documents?: { documentType: KycDocumentType; fileId: string }[] },
  ) {
    // Nothing is uploaded through this server — files went straight to ImageKit
    const logo = profile.logoFileId ? await this.storage.verify(profile.logoFileId, 'logo') : null;

    let documents: { documentType: KycDocumentType; fileId: string; filePath: string; fileName: string; mimeType: string }[] = [];
    if (kyc.mode === 'UPLOAD') {
      const provided = new Map((kyc.documents ?? []).map((d) => [d.documentType, d.fileId]));
      const missing = requiredKycDocuments(profile.category).filter((t) => !provided.has(t));
      if (missing.length) {
        const labels = missing.map((t) => KYC_DOCUMENTS.find((d) => d.type === t)?.label ?? t);
        throw new BadRequestException(`Missing KYC documents: ${labels.join(', ')}`);
      }
      documents = await Promise.all(
        [...provided].map(async ([documentType, fileId]) => {
          const f = await this.storage.verify(fileId, 'kyc');
          return { documentType, fileId: f.fileId, filePath: f.filePath, fileName: f.fileName, mimeType: f.mimeType };
        }),
      );
    }
    return { logo, documents };
  }

  /* ======================= Seller self-service ======================= */

  /** The signed-in seller's application / seller record (null before they apply). */
  async getMyApplication(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { sellerId: true, userType: true } });
    if (!user || user.userType !== 'SELLER') throw new ForbiddenException('Only seller accounts can do this');
    if (!user.sellerId) return { data: null };
    return this.findOne(user.sellerId);
  }

  /**
   * Submit the seller's own application for review (status PENDING, KYC UNDER_REVIEW).
   * If the platform rejected the KYC, the seller can fix details and submit again.
   */
  async submitApplication(userId: string, dto: SellerApplicationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, userType: true, sellerId: true },
    });
    if (!user || user.userType !== 'SELLER') throw new ForbiddenException('Only seller accounts can apply');

    const { business, profile, kyc } = dto;
    const existing = user.sellerId
      ? await this.prisma.seller.findUnique({ where: { id: user.sellerId }, select: { id: true, slug: true, ownerId: true, kycStatus: true, status: true } })
      : null;

    if (existing) {
      if (existing.ownerId !== user.id) throw new ForbiddenException('Only the seller owner can submit the application');
      if (existing.kycStatus !== 'REJECTED') {
        throw new ConflictException(existing.status === 'ACTIVE' ? 'Your seller account is already approved' : 'Your application is already under review');
      }
    }

    if (!existing || existing.slug !== profile.slug) {
      const check = await this.slugAvailability(profile.slug);
      if (!check.data.available) throw this.conflict('slug', check.data.reason ?? 'This page URL is not available');
    }

    const { logo, documents } = await this.verifyFiles(profile, kyc);
    const category = SELLER_CATEGORIES.find((c) => c.key === profile.category)!;
    const businessDetails = {
      legalBusinessName: business.legalBusinessName,
      businessType: business.businessType,
      registeredAddress: business.registeredAddress,
      gstNumber: business.gstNumber ?? null,
      panNumber: business.panNumber ?? null,
      contactPersonName: business.ownerName,
      contactPersonMobile: business.ownerPhone,
      contactEmail: user.email,
    };
    const sellerData = {
      name: profile.name,
      slug: profile.slug,
      category: profile.category,
      brandColor: profile.brandColor,
      // Re-submitting without a new logo keeps the current one
      ...(logo ? { logoUrl: logo.url, logoFileId: logo.fileId } : existing ? {} : { logoUrl: null, logoFileId: null }),
      // Self-service sellers wait for platform review
      status: 'PENDING' as const,
      kycStatus: 'UNDER_REVIEW' as const,
      kycOfflineReference: null,
      commissionRate: category.commissionRate,
    };

    const sellerId = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        // Re-submission after rejection: replace details and documents
        await tx.sellerKycDocument.deleteMany({ where: { sellerId: existing.id } });
        await tx.seller.update({
          where: { id: existing.id },
          data: {
            ...sellerData,
            businessDetails: { upsert: { create: businessDetails, update: businessDetails } },
            kycDocuments: { create: documents },
          },
        });
        return existing.id;
      }
      const seller = await tx.seller.create({
        data: {
          ...sellerData,
          createdVia: 'SELF_SERVICE',
          ownerId: user.id,
          businessDetails: { create: businessDetails },
          kycDocuments: { create: documents },
        },
        select: { id: true },
      });
      await tx.user.update({ where: { id: user.id }, data: { sellerId: seller.id } });
      return seller.id;
    }).catch((err: unknown) => {
      if (this.uniqueViolationField(err) === 'slug') {
        throw this.conflict('slug', 'This page URL was just taken by another seller — choose a different one');
      }
      throw err;
    });

    await this.emailService.sendSellerApplicationReceived(user.fullName, user.email, profile.name);

    return {
      success: true,
      message: existing ? 'Application re-submitted for review' : 'Application submitted for review',
      data: (await this.findOne(sellerId)).data,
    };
  }

  async onboard(dto: OnboardSellerDto, actorId: string) {
    const { business, profile, kyc } = dto;

    // ---- uniqueness
    if (await this.prisma.user.findUnique({ where: { email: business.ownerEmail }, select: { id: true } })) {
      throw this.conflict('ownerEmail', 'An account with this owner email already exists');
    }
    const slugCheck = await this.slugAvailability(profile.slug);
    if (!slugCheck.data.available) throw this.conflict('slug', slugCheck.data.reason ?? 'This page URL is not available');

    const role = await this.prisma.role.findFirst({
      where: { name: SELLER_ADMIN_ROLE_NAME, userType: 'SELLER', status: 'ACTIVE', sellerId: null },
      select: { id: true },
    });
    if (!role) throw new InternalServerErrorException(`The "${SELLER_ADMIN_ROLE_NAME}" role is missing or inactive — run the seed`);

    const { logo, documents } = await this.verifyFiles(profile, kyc);
    const category = SELLER_CATEGORIES.find((c) => c.key === profile.category)!;

    // ---- create everything atomically
    // The unique index on sellers.slug is the final guarantee: if another admin
    // claimed the same URL a moment ago, the insert fails and we return a 409.
    const { sellerId, ownerId } = await this.prisma.$transaction(async (tx) => {
      // Owner sets their own password from the invite; this random hash is never shared
      const owner = await tx.user.create({
        data: {
          email: business.ownerEmail,
          fullName: business.ownerName,
          phone: business.ownerPhone,
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          userType: 'SELLER',
          roleId: role.id,
        },
        select: { id: true },
      });

      const seller = await tx.seller.create({
        data: {
          name: profile.name,
          slug: profile.slug,
          category: profile.category,
          brandColor: profile.brandColor,
          logoUrl: logo?.url ?? null,
          logoFileId: logo?.fileId ?? null,
          // Admin-onboarded sellers go live immediately (self-serve signups wait for review)
          status: 'ACTIVE',
          kycStatus: kyc.mode === 'OFFLINE' ? 'VERIFIED' : 'UNDER_REVIEW',
          kycOfflineReference: kyc.mode === 'OFFLINE' ? kyc.offlineReference : null,
          commissionRate: category.commissionRate,
          createdVia: 'ADMIN_INITIATED',
          ownerId: owner.id,
          createdById: actorId,
          businessDetails: {
            create: {
              legalBusinessName: business.legalBusinessName,
              businessType: business.businessType,
              registeredAddress: business.registeredAddress,
              gstNumber: business.gstNumber ?? null,
              panNumber: business.panNumber ?? null,
              contactPersonName: business.ownerName,
              contactPersonMobile: business.ownerPhone,
              contactEmail: business.ownerEmail,
            },
          },
          kycDocuments: { create: documents },
        },
        select: { id: true },
      });

      await tx.user.update({ where: { id: owner.id }, data: { sellerId: seller.id } });
      return { sellerId: seller.id, ownerId: owner.id };
    }).catch((err: unknown) => {
      const field = this.uniqueViolationField(err);
      if (field === 'slug') throw this.conflict('slug', 'This page URL was just taken by another seller — choose a different one');
      if (field === 'email') throw this.conflict('ownerEmail', 'An account with this owner email already exists');
      throw err;
    });

    // ---- invite (outside the transaction: an email failure must not undo the seller)
    const inviteSent = await this.sendInvite(ownerId, business.ownerName, business.ownerEmail, profile.name);

    const created = await this.findOne(sellerId);
    return {
      success: true,
      message: inviteSent
        ? `Seller onboarded. Invite sent to ${business.ownerEmail}`
        : 'Seller onboarded, but the invite email could not be sent',
      data: { ...created.data, inviteSent },
    };
  }

  /** 409 with the offending form field, e.g. { field: 'slug', message } */
  private conflict(field: 'slug' | 'ownerEmail', message: string) {
    return new ConflictException({ statusCode: 409, error: 'Conflict', field, message });
  }

  /** Which unique column a Prisma P2002 error is about (works with and without driver adapters). */
  private uniqueViolationField(err: unknown): 'slug' | 'email' | null {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return null;
    const meta = JSON.stringify(err.meta ?? {});
    if (meta.includes('slug')) return 'slug';
    if (meta.includes('email')) return 'email';
    return null;
  }

  async update(id: string, dto: UpdateSellerDto, actorId: string) {
    const existing = await this.prisma.seller.findUnique({
      where: { id },
      select: { id: true, slug: true, ownerId: true, logoFileId: true, businessDetails: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Seller not found');
    const { business, profile, commissionRate } = dto;

    // Commission is financial — only admins with MANAGE on Sellers may change it
    if (commissionRate !== undefined) {
      const access = await this.permissions.getEffectiveAccess(actorId);
      if (!hasLevel(access.permissions.SELLERS, 'MANAGE')) {
        throw new ForbiddenException('You need manage access to Sellers to change the commission rate');
      }
    }

    // Page URL must stay unique (its own current URL is fine)
    if (profile?.slug && profile.slug !== existing.slug) {
      const check = await this.slugAvailability(profile.slug);
      if (!check.data.available) throw this.conflict('slug', check.data.reason ?? 'This page URL is not available');
    }

    const logo = profile?.logoFileId ? await this.storage.verify(profile.logoFileId, 'logo') : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.seller.update({
        where: { id },
        data: {
          ...(profile?.name && { name: profile.name }),
          ...(profile?.slug && { slug: profile.slug }),
          ...(profile?.category && { category: profile.category }),
          ...(profile?.brandColor && { brandColor: profile.brandColor }),
          ...(logo && { logoUrl: logo.url, logoFileId: logo.fileId }),
          ...(!logo && profile?.removeLogo && { logoUrl: null, logoFileId: null }),
          ...(commissionRate !== undefined && { commissionRate }),
        },
      });

      if (business && Object.keys(business).length) {
        const details = {
          ...(business.legalBusinessName && { legalBusinessName: business.legalBusinessName }),
          ...(business.businessType && { businessType: business.businessType }),
          ...(business.registeredAddress && { registeredAddress: business.registeredAddress }),
          // Optional fields: sending '' clears them (DTO turns '' into undefined, so use 'in')
          ...('gstNumber' in business && { gstNumber: business.gstNumber ?? null }),
          ...('panNumber' in business && { panNumber: business.panNumber ?? null }),
          ...(business.ownerName && { contactPersonName: business.ownerName }),
          ...(business.ownerPhone && { contactPersonMobile: business.ownerPhone }),
        };
        await tx.sellerBusinessDetails.update({ where: { sellerId: id }, data: details });

        // Keep the owner's account in sync with the contact details
        if (business.ownerName || business.ownerPhone) {
          await tx.user.update({
            where: { id: existing.ownerId },
            data: {
              ...(business.ownerName && { fullName: business.ownerName }),
              ...(business.ownerPhone && { phone: business.ownerPhone }),
            },
          });
        }
      }
    }).catch((err: unknown) => {
      if (this.uniqueViolationField(err) === 'slug') {
        throw this.conflict('slug', 'This page URL was just taken by another seller — choose a different one');
      }
      throw err;
    });

    return { success: true, message: 'Seller details updated', data: (await this.findOne(id)).data };
  }

  private async sendInvite(userId: string, name: string, email: string, sellerName: string) {
    // Same token the existing /auth/reset-password endpoint accepts
    const token = await this.jwtService.signAsync(
      { userId },
      { secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'), expiresIn: INVITE_TTL },
    );
    const link = `${this.sellerAdminUrl}/auth/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    return this.emailService.sendSellerInvite(name, email, sellerName, link, INVITE_TTL_LABEL);
  }

  async changeStatus(id: string, { action }: SellerStatusActionDto, actorId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { id }, select: { id: true, status: true, kycStatus: true } });
    if (!seller) throw new NotFoundException('Seller not found');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      switch (action) {
        case 'APPROVE':
          if (seller.kycStatus === 'VERIFIED' && seller.status === 'ACTIVE') throw new BadRequestException('Seller is already approved');
          await tx.sellerKycDocument.updateMany({
            where: { sellerId: id, status: 'PENDING' },
            data: { status: 'VERIFIED', reviewedById: actorId, reviewedAt: now },
          });
          await tx.seller.update({ where: { id }, data: { kycStatus: 'VERIFIED', status: seller.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' } });
          break;
        case 'REJECT':
          await tx.sellerKycDocument.updateMany({
            where: { sellerId: id, status: 'PENDING' },
            data: { status: 'REJECTED', reviewedById: actorId, reviewedAt: now },
          });
          await tx.seller.update({ where: { id }, data: { kycStatus: 'REJECTED' } });
          break;
        case 'SUSPEND':
          if (seller.status === 'SUSPENDED') throw new BadRequestException('Seller is already suspended');
          await tx.seller.update({ where: { id }, data: { status: 'SUSPENDED' } });
          // Sign out every seller user immediately
          await tx.userSession.updateMany({
            where: { user: { sellerId: id }, revokedAt: null },
            data: { revokedAt: now },
          });
          break;
        case 'REACTIVATE':
          if (seller.status !== 'SUSPENDED') throw new BadRequestException('Seller is not suspended');
          await tx.seller.update({ where: { id }, data: { status: 'ACTIVE' } });
          break;
      }
    });

    // Let the seller know the outcome of their review
    if (action === 'APPROVE' || action === 'REJECT') {
      const s = await this.prisma.seller.findUnique({ where: { id }, select: { name: true, owner: { select: { fullName: true, email: true } } } });
      if (s) {
        if (action === 'APPROVE') await this.emailService.sendSellerApproved(s.owner.fullName, s.owner.email, s.name, this.sellerAdminUrl);
        else await this.emailService.sendSellerRejected(s.owner.fullName, s.owner.email, s.name, this.sellerAdminUrl);
      }
    }

    const messages = { APPROVE: 'Seller approved', REJECT: 'KYC rejected', SUSPEND: 'Seller suspended', REACTIVATE: 'Seller reactivated' };
    return { success: true, message: messages[action], data: (await this.findOne(id)).data };
  }
}
