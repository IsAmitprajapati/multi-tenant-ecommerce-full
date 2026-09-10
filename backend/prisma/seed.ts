import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import dotenv from 'dotenv'
import * as bcrypt from 'bcryptjs'
dotenv.config()

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
})


async function main(){

    console.log("Seeding the platform admin user")

    const email = 'amitprj737@gmail.com'
    const password = 'ChangeMe123!'


    const passwordHash = await bcrypt.hash(password,10)
    /***Seed */
    await prisma.user.upsert({
        where : {
            email
        },
        update : {
            passwordHash : passwordHash 
        },
        create : {
            email,
            fullName : "Amit Prajapati",
            passwordHash,
            userType : 'PLATFORM_ADMIN',
            twoFactorEnabled : false,
            phone : '9307961978'
        }
    })

    console.log("\n User Create done.")

}


main()
