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
        description: "Store owner with full access to their store admin panel.",
        userType: 'SELLER',
        permissions: allOf('SELLER', 'MANAGE'),
    },
    {
        name: "Seller User",
        description: "Store staff who run daily operations. No access to store settings or staff.",
        userType: 'SELLER',
        permissions: {
            STORE_DASHBOARD: 'VIEW', STORE_PRODUCTS: 'EDIT', STORE_COLLECTIONS: 'EDIT', STORE_ORDERS: 'EDIT',
            STORE_RETURNS: 'EDIT', STORE_CUSTOMERS: 'VIEW', STORE_DISCOUNTS: 'VIEW', STORE_DELIVERY: 'EDIT',
            STORE_REVIEWS: 'EDIT', STORE_REPORTS: 'VIEW',
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

    const email = 'amitprj737@gmail.com'
    const password = 'ChangeMe123!'

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
            fullName: "Amit Prajapati",
            passwordHash,
            userType: 'PLATFORM_ADMIN',
            twoFactorEnabled: false,
            phone: '9307961978',
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
