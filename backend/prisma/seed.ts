import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { PermissionLevel, UserType } from "../src/generated/prisma/enums.js";
import { moduleKeysForUserType, SUPER_ADMIN_ROLE_NAME, type PermissionModule } from "../src/permissions/permissions.constants.js";
import dotenv from 'dotenv'
import * as bcrypt from 'bcryptjs'
dotenv.config()

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
})

type RoleSeed = {
    name: string
    description: string
    userType: UserType
    isSystem?: boolean
    permissions: Partial<Record<PermissionModule, PermissionLevel>>
}

const allOf = (userType: UserType, level: PermissionLevel) =>
    Object.fromEntries(moduleKeysForUserType(userType).map((m) => [m, level])) as Partial<Record<PermissionModule, PermissionLevel>>

/***Default roles. Only created if missing — edits made from the UI are never overwritten. */
const DEFAULT_ROLES: RoleSeed[] = [
    {
        name: SUPER_ADMIN_ROLE_NAME, // Platform Admin
        description: "Full access to the platform admin panel. System role, cannot be edited or deleted.",
        userType: 'PLATFORM_ADMIN',
        isSystem: true,
        permissions: allOf('PLATFORM_ADMIN', 'MANAGE'),
    },
    {
        name: "Platform User",
        description: "Platform staff with read-only access. Cannot manage users, roles or settings.",
        userType: 'PLATFORM_ADMIN',
        permissions: { ...allOf('PLATFORM_ADMIN', 'VIEW'), USERS_PERMISSIONS: 'NONE', SETTINGS: 'NONE' },
    },
    {
        name: "Seller Admin",
        description: "Seller owner with full access to the seller admin panel.",
        userType: 'SELLER',
        // Sellers can only view customer details
        permissions: { ...allOf('SELLER', 'MANAGE'), SELLER_CUSTOMERS: 'VIEW' },
    },
    {
        name: "Seller Manager",
        description: "Runs the business day to day: catalog, orders, returns, delivery and offers. No access to staff.",
        userType: 'SELLER',
        permissions: {
            SELLER_DASHBOARD: 'VIEW', SELLER_PRODUCTS: 'MANAGE', SELLER_COLLECTIONS: 'MANAGE', SELLER_ORDERS: 'MANAGE',
            SELLER_RETURNS: 'MANAGE', SELLER_CUSTOMERS: 'VIEW', SELLER_DISCOUNTS: 'MANAGE', SELLER_DELIVERY: 'MANAGE',
            SELLER_REVIEWS: 'MANAGE', SELLER_SETTINGS: 'VIEW', SELLER_REPORTS: 'VIEW',
        },
    },
    {
        name: "Seller User",
        description: "Seller staff who run daily operations. No access to settings or staff.",
        userType: 'SELLER',
        permissions: {
            SELLER_DASHBOARD: 'VIEW', SELLER_PRODUCTS: 'EDIT', SELLER_COLLECTIONS: 'EDIT', SELLER_ORDERS: 'EDIT',
            SELLER_RETURNS: 'EDIT', SELLER_CUSTOMERS: 'VIEW', SELLER_DISCOUNTS: 'VIEW', SELLER_DELIVERY: 'EDIT',
            SELLER_REVIEWS: 'EDIT', SELLER_REPORTS: 'VIEW',
        },
    },
    {
        name: "Seller Orders",
        description: "Handles orders: accept, pack and hand over for delivery, returns and replacements.",
        userType: 'SELLER',
        permissions: {
            SELLER_DASHBOARD: 'VIEW', SELLER_ORDERS: 'MANAGE', SELLER_RETURNS: 'EDIT', SELLER_DELIVERY: 'EDIT',
            SELLER_PRODUCTS: 'VIEW', SELLER_CUSTOMERS: 'VIEW',
        },
    },
    {
        name: "Seller Catalog",
        description: "Maintains products, collections, offers and replies to reviews.",
        userType: 'SELLER',
        permissions: {
            SELLER_DASHBOARD: 'VIEW', SELLER_PRODUCTS: 'MANAGE', SELLER_COLLECTIONS: 'MANAGE', SELLER_DISCOUNTS: 'EDIT',
            SELLER_REVIEWS: 'EDIT',
        },
    },
    {
        name: "Seller Viewer",
        description: "Read-only access to the dashboard, catalog, orders and reports. Can't change anything.",
        userType: 'SELLER',
        permissions: {
            ...allOf('SELLER', 'VIEW'), SELLER_SETTINGS: 'NONE', SELLER_STAFF_ROLES: 'NONE',
        },
    },
]

async function seedRoles() {
    const ids: Record<string, string> = {}
    for (const role of DEFAULT_ROLES) {
        const existing = await prisma.role.findUnique({ where: { name: role.name } })
        if (existing) {
            ids[role.name] = existing.id
            continue
        }
        const created = await prisma.role.create({
            data: {
                name: role.name,
                description: role.description,
                userType: role.userType,
                isSystem: role.isSystem ?? false,
                permissions: {
                    create: moduleKeysForUserType(role.userType).map((module) => ({
                        module,
                        level: role.permissions[module] ?? 'NONE',
                    })),
                },
            },
        })
        ids[role.name] = created.id
        console.log(`  + role "${role.name}"`)
    }
    return ids
}

async function main() {

    console.log("Seeding roles")
    const roleIds = await seedRoles()

    console.log("Seeding the platform admin user")

    /***Initial Platform Admin — all values come from .env (SEED_ADMIN_*) */
    const required = (key: string) => {
        const v = process.env[key]?.trim()
        if (!v) throw new Error(`${key} is missing in .env`)
        return v
    }
    const email = required('SEED_ADMIN_EMAIL').toLowerCase()
    // Only used when the account is first created; never overwrites an existing password
    const password = required('SEED_ADMIN_PASSWORD')
    const fullName = required('SEED_ADMIN_NAME')
    const phone = process.env.SEED_ADMIN_PHONE?.trim() || null

    const passwordHash = await bcrypt.hash(password, 10)
    /***Seed */
    await prisma.user.upsert({
        where: {
            email
        },
        // Existing account: only make sure it has the Platform Admin role (never reset the password)
        update: {
            roleId: roleIds[SUPER_ADMIN_ROLE_NAME],
        },
        create: {
            email,
            fullName,
            passwordHash,
            userType: 'PLATFORM_ADMIN',
            twoFactorEnabled: false,
            phone,
            roleId: roleIds[SUPER_ADMIN_ROLE_NAME],
        }
    })

    console.log("\n User Create done.")

}


main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
