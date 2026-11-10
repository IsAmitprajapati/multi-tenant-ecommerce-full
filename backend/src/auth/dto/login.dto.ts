import { IsEmail,IsIn,IsNotEmpty,IsOptional,IsString, Matches, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

/** Which app is signing in — each app only accepts its own kind of account */
export const LOGIN_PANELS = ['PLATFORM', 'SELLER'] as const
export type LoginPanel = (typeof LOGIN_PANELS)[number]

export class LoginDTO {

    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email! : string;

    @IsString()
    @IsNotEmpty()
    password! : string;

    @IsOptional()
    @IsIn(LOGIN_PANELS)
    panel? : LoginPanel;
}


/** Self-service seller account (step 1 of seller signup) */
export class SellerRegisterDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @MinLength(2)
    fullName! : string;

    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail({}, { message: 'Enter a valid business email' })
    email! : string;

    @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
    @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Enter a valid phone number' })
    phone! : string;

    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
        message: 'Password must be at least 8 characters and include upper & lower case letters, a number and a special character'
    })
    password! : string;
}


export class forgotPasswordDto {
    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email! : string;

    @IsString()
    @IsOptional()
    otp : string;
}


export class resetPasswordDto {
    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email! : string;

    @IsString()
    @IsOptional()
    resetToken : string;

    @IsString()
    @IsNotEmpty()
    password! : string;

}