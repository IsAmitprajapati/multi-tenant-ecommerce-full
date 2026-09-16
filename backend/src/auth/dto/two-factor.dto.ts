import { IsNotEmpty, IsString } from "class-validator";

export class TwoFactorDto {

    @IsString()
    @IsNotEmpty()
    otp: string
}


export class TwoFactorVerifyLoginOtpDto {

    @IsString()
    @IsNotEmpty()
    otp: string


    @IsString()
    @IsNotEmpty()
    twoFactorToken: string

}