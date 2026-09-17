import { IsEmail,IsNotEmpty,IsOptional,isString,IsString } from 'class-validator'

export class LoginDTO {

    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email! : string;

    @IsString()
    @IsNotEmpty()
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