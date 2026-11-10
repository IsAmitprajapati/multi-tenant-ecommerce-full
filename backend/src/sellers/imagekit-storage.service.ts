import { BadRequestException, Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from '@imagekit/nodejs';

/**
 * ImageKit storage. Files NEVER pass through this server:
 *  1. Browser asks for upload credentials  → `getUploadAuth(kind)`
 *  2. Browser uploads directly to ImageKit  (logo: public, KYC: isPrivateFile)
 *  3. Browser sends us only the `fileId`    → `verify(fileId, kind)` checks it with ImageKit
 * KYC documents are private and only viewable through short-lived signed URLs.
 *
 * Env: IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_ROOT_FOLDER (optional)
 */
export type UploadKind = 'logo' | 'kyc' | 'product' | 'banner';

const RULES: Record<UploadKind, { subfolder: string; private: boolean; mimes: string[] }> = {
  logo: { subfolder: 'sellers/logos', private: false, mimes: ['image/png', 'image/jpeg', 'image/webp'] },
  kyc: { subfolder: 'sellers/kyc', private: true, mimes: ['application/pdf', 'image/png', 'image/jpeg'] },
  product: { subfolder: 'sellers/products', private: false, mimes: ['image/png', 'image/jpeg', 'image/webp'] },
  banner: { subfolder: 'storefront/banners', private: false, mimes: ['image/png', 'image/jpeg', 'image/webp'] },
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const AUTH_TTL_SECONDS = 10 * 60;
const SIGNED_URL_TTL_SECONDS = 10 * 60;

export interface VerifiedFile {
  fileId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  url: string | null;
}

@Injectable()
export class ImageKitStorageService {
  private readonly logger = new Logger(ImageKitStorageService.name);
  private client: ImageKit | null = null;

  constructor(private readonly config: ConfigService) { }

  /** Lazily created so the API still boots before ImageKit keys are configured. */
  private get ik(): ImageKit {
    if (this.client) return this.client;
    const privateKey = this.config.get<string>('IMAGEKIT_PRIVATE_KEY');
    if (!privateKey || !this.config.get<string>('IMAGEKIT_PUBLIC_KEY') || !this.config.get<string>('IMAGEKIT_URL_ENDPOINT')) {
      throw new ServiceUnavailableException('File uploads are not configured (missing ImageKit keys)');
    }
    this.client = new ImageKit({ privateKey });
    return this.client;
  }

  private folder(kind: UploadKind) {
    const root = (this.config.get<string>('IMAGEKIT_ROOT_FOLDER') ?? 'marketplace').replace(/^\/+|\/+$/g, '');
    return `/${root}/${RULES[kind].subfolder}`;
  }

  /** Everything the browser needs to upload one file directly to ImageKit. */
  getUploadAuth(kind: UploadKind) {
    const expire = Math.floor(Date.now() / 1000) + AUTH_TTL_SECONDS;
    const { token, signature } = this.ik.helper.getAuthenticationParameters(undefined, expire);
    return {
      token,
      expire,
      signature,
      publicKey: this.config.getOrThrow<string>('IMAGEKIT_PUBLIC_KEY'),
      urlEndpoint: this.config.getOrThrow<string>('IMAGEKIT_URL_ENDPOINT'),
      folder: this.folder(kind),
      isPrivateFile: RULES[kind].private,
      allowedMimeTypes: RULES[kind].mimes,
      maxBytes: MAX_UPLOAD_BYTES,
    };
  }

  /**
   * Upload credentials only prove the browser was allowed to upload *something*,
   * so every fileId is re-checked with ImageKit before we store it.
   */
  async verify(fileId: string, kind: UploadKind): Promise<VerifiedFile> {
    const rule = RULES[kind];
    let file: Awaited<ReturnType<ImageKit['files']['get']>>;
    try {
      file = await this.ik.files.get(fileId);
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.warn(`ImageKit lookup failed for ${fileId}: ${(err as Error).message}`);
      throw new BadRequestException('Uploaded file not found — please upload it again');
    }

    const filePath = file.filePath ?? '';
    if (!filePath.startsWith(`${this.folder(kind)}/`)) {
      throw new BadRequestException('Uploaded file is in the wrong location — please upload it again');
    }
    if (rule.private && file.isPrivateFile === false) {
      throw new BadRequestException('KYC documents must be uploaded as private files');
    }
    if (file.mime && !rule.mimes.includes(file.mime)) {
      throw new BadRequestException('Unsupported file type');
    }
    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File is larger than 5 MB');
    }

    return {
      fileId,
      filePath,
      fileName: (file.name ?? filePath.split('/').pop() ?? 'file').slice(0, 200),
      mimeType: file.mime ?? 'application/octet-stream',
      url: rule.private ? null : (file.url ?? null),
    };
  }

  /** Short-lived link for viewing a private KYC document. */
  signedUrl(filePath: string, expiresIn = SIGNED_URL_TTL_SECONDS) {
    try {
      return this.ik.helper.buildSrc({
        urlEndpoint: this.config.getOrThrow<string>('IMAGEKIT_URL_ENDPOINT'),
        src: filePath,
        expiresIn,
      });
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new InternalServerErrorException('Could not create document link');
    }
  }
}
