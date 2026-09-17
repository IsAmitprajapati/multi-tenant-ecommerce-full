import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend'

@Injectable()
export class EmailService {
    private readonly resend: Resend;
    private readonly fromEmail: string;
    private readonly logger = new Logger(EmailService.name)

    constructor(private readonly config: ConfigService) {
        this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'))
        this.fromEmail = this.config.getOrThrow<string>('RESEND_FROM_EMAIL')
    }

    async sendOtp2FA(
        userName: string,
        toEmail: string,
        otp: string,
        expiredOtp : string
    ) {
        this.logger.log("Sending otp 2fa")
        try {
            await this.resend.emails.send({
                from: this.fromEmail,
                to: toEmail,
                subject: 'Your Two-Factor Authentication (2FA) Code',
                text: `
Hello ${userName},

Your Two-Factor Authentication (2FA) verification code is:

${otp}

This code will expire in ${expiredOtp} minutes.

For your security, please do not share this code with anyone.

If you did not request this verification code, please secure your account and contact our support team.

Regards,
Amit Prajapati

                `
            })
        } catch (error) {
            this.logger.warn(
                `Resend Send Failed : ${(error as Error)?.message}`
            )
        }
    }

    async sendOtpForgotPassword(
        userName: string,
        toEmail: string,
        otp: string,
        expiredOtp : string
    ) {
        this.logger.log("Sending otp")
        try {
            await this.resend.emails.send({
                from: this.fromEmail,
                to: toEmail,
                subject: 'Your Password Reset OTP',
                text: `
Hi ${userName},

We received a request to reset the password for your account.

Your One-Time Password (OTP) is:

${otp}

This OTP is valid for ${expiredOtp}. For your security, please do not share this OTP with anyone.

If you did not request a password reset, please ignore this email or contact our support team.

Best regards,
Amit Prajapati

                `
            })
        } catch (error) {
            this.logger.warn(
                `Resend Send Failed : ${(error as Error)?.message}`
            )
        }
    }
}
