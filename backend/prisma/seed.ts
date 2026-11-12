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

/***Platform product taxonomy — top level matches the seller categories */
/***Starter categories — managed afterwards from Platform admin › Global catalog (seed never overwrites edits) */
const CATEGORY_TREE: { key: string; name: string; commission: number; requiresFssai?: boolean; children: string[] }[] = [
    { key: 'grocery', name: 'Grocery & food', commission: 8, requiresFssai: true, children: ['Fruits', 'Vegetables', 'Dairy & eggs', 'Bakery', 'Staples', 'Beverages', 'Snacks', 'Meat & seafood'] },
    { key: 'fashion', name: 'Fashion & apparel', commission: 12, children: ["Men's clothing", "Women's clothing", 'Kids', 'Footwear', 'Accessories'] },
    { key: 'electronics', name: 'Electronics', commission: 6, children: ['Mobiles & tablets', 'Laptops & computers', 'Audio', 'TVs & appliances', 'Accessories'] },
    { key: 'home', name: 'Home & kitchen', commission: 10, children: ['Cookware', 'Home decor', 'Furniture', 'Storage'] },
    { key: 'beauty', name: 'Beauty & personal care', commission: 10, children: ['Skincare', 'Haircare', 'Makeup', 'Fragrances'] },
    { key: 'other', name: 'Other', commission: 10, children: ['General'] },
]

/***GST tax classes (verify rates with your CA before going live) */
/**
 * Global catalog › Attributes. Sellers use them on the product form:
 *  - Specifications: pick one value per attribute (shown on the product page)
 *  - Variants: pick several values of one or two attributes to generate variant rows (e.g. 8GB · 256GB)
 * category: top-level category key, or null for every category. Only created if missing.
 */
const ATTRIBUTES: { name: string; category: string | null; values: string[] }[] = [
    { name: 'Colour', category: null, values: ['Black', 'White', 'Grey', 'Silver', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Brown', 'Gold', 'Multicolour'] },
    { name: 'Pack size', category: null, values: ['Pack of 1', 'Pack of 2', 'Pack of 3', 'Pack of 4', 'Pack of 6', 'Pack of 12'] },
    { name: 'Weight', category: 'grocery', values: ['100g', '250g', '500g', '1kg', '2kg', '5kg', '10kg'] },
    { name: 'Volume', category: 'grocery', values: ['200ml', '500ml', '1L', '2L', '5L'] },
    { name: 'Diet', category: 'grocery', values: ['Veg', 'Non-veg', 'Vegan', 'Jain'] },
    { name: 'Size', category: 'fashion', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] },
    { name: 'Footwear size', category: 'fashion', values: ['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] },
    { name: 'Fabric', category: 'fashion', values: ['Cotton', 'Polyester', 'Linen', 'Denim', 'Silk', 'Wool', 'Rayon'] },
    { name: 'Fit', category: 'fashion', values: ['Slim', 'Regular', 'Relaxed', 'Oversized'] },
    { name: 'RAM', category: 'electronics', values: ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB'] },
    { name: 'Storage', category: 'electronics', values: ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'] },
    { name: 'Screen size', category: 'electronics', values: ['32"', '43"', '50"', '55"', '65"'] },
    { name: 'Connectivity', category: 'electronics', values: ['Wired', 'Bluetooth', 'Wi-Fi', 'USB-C', '5G'] },
    { name: 'Warranty', category: 'electronics', values: ['6 months', '1 year', '2 years', '3 years'] },
    { name: 'Material', category: 'home', values: ['Stainless steel', 'Aluminium', 'Cast iron', 'Wood', 'Glass', 'Ceramic', 'Plastic'] },
    { name: 'Capacity', category: 'home', values: ['500ml', '1L', '2L', '3L', '5L'] },
    { name: 'Set of', category: 'home', values: ['1 piece', '2 pieces', '3 pieces', '4 pieces', '6 pieces'] },
    { name: 'Skin type', category: 'beauty', values: ['All skin types', 'Dry', 'Oily', 'Combination', 'Sensitive'] },
    { name: 'Volume', category: 'beauty', values: ['15ml', '30ml', '50ml', '100ml', '200ml'] },
    { name: 'Shade', category: 'beauty', values: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'] },
]

const TAX_CLASSES: { hsnCode: string; description: string; rate: number }[] = [
    { hsnCode: '0803', description: 'Fresh fruits', rate: 0 },
    { hsnCode: '0709', description: 'Fresh vegetables', rate: 0 },
    { hsnCode: '0401', description: 'Milk & fresh dairy', rate: 0 },
    { hsnCode: '1905', description: 'Bread & bakery', rate: 5 },
    { hsnCode: '1006', description: 'Rice & staples (packaged)', rate: 5 },
    { hsnCode: '2106', description: 'Packaged food preparations', rate: 18 },
    { hsnCode: '6109', description: 'Apparel up to ₹1,000', rate: 5 },
    { hsnCode: '6203', description: 'Apparel above ₹1,000', rate: 12 },
    { hsnCode: '6403', description: 'Footwear', rate: 18 },
    { hsnCode: '8517', description: 'Mobile phones', rate: 18 },
    { hsnCode: '8471', description: 'Computers & laptops', rate: 18 },
    { hsnCode: '3304', description: 'Cosmetics & skincare', rate: 18 },
    { hsnCode: '9403', description: 'Furniture', rate: 18 },
    { hsnCode: '9999', description: 'General goods', rate: 18 },
]

const slugify = (v: string) => v.toLowerCase().replace(/&/g, 'and').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function seedCatalog() {
    for (const [i, top] of CATEGORY_TREE.entries()) {
        const parent = await prisma.productCategory.upsert({
            where: { slug: top.key },
            update: {},
            create: { name: top.name, slug: top.key, defaultCommissionRate: top.commission, requiresFssai: top.requiresFssai ?? false, sortOrder: i },
        })
        for (const [j, child] of top.children.entries()) {
            const slug = `${top.key}-${slugify(child)}`
            await prisma.productCategory.upsert({
                where: { slug },
                update: {},
                create: { name: child, slug, parentId: parent.id, requiresFssai: top.requiresFssai ?? false, sortOrder: j },
            })
        }
    }
    for (const t of TAX_CLASSES) {
        await prisma.taxClass.upsert({
            where: { hsnCode_gstRatePercent: { hsnCode: t.hsnCode, gstRatePercent: t.rate } },
            update: {},
            create: { hsnCode: t.hsnCode, description: t.description, gstRatePercent: t.rate },
        })
    }
    let added = 0
    for (const a of ATTRIBUTES) {
        const categoryId = a.category ? (await prisma.productCategory.findUnique({ where: { slug: a.category }, select: { id: true } }))?.id ?? null : null
        if (a.category && !categoryId) continue
        const exists = await prisma.categoryAttribute.findFirst({ where: { name: { equals: a.name, mode: 'insensitive' }, categoryId }, select: { id: true } })
        if (exists) continue
        await prisma.categoryAttribute.create({ data: { name: a.name, values: a.values, categoryId } })
        added++
    }
    console.log(`  catalog: ${CATEGORY_TREE.length} top categories, ${TAX_CLASSES.length} tax classes, ${added} new attributes`)
}

async function main() {
    console.log("Seeding catalog")
    await seedCatalog()


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

    await seedHomeSections()
}

/** Starter customer home page — only when the admin hasn't set one up yet (empty rows are hidden on the storefront) */
async function seedHomeSections() {
    if (await prisma.homeSection.count()) return
    const defaults = [
        { type: 'SHOP_BY_CATEGORY' as const, title: 'Shop by category', source: null },
        { type: 'PRODUCTS' as const, title: 'Deals of the day', source: 'DEALS' as const },
        { type: 'PRODUCTS' as const, title: 'Trending now', source: 'TRENDING' as const },
        { type: 'PRODUCTS' as const, title: 'New arrivals', source: 'LATEST' as const },
    ]
    await prisma.homeSection.createMany({ data: defaults.map((d, i) => ({ ...d, sortOrder: i })) })
    console.log(" Home page sections seeded.")
}


main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
