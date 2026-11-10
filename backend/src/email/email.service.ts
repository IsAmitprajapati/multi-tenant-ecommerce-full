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

    /** Sent when a platform admin onboards a seller: link to set their own password. */
    async sendSellerInvite(
        ownerName: string,
        toEmail: string,
        sellerName: string,
        inviteLink: string,
        validFor: string
    ): Promise<boolean> {
        this.logger.log("Sending seller invite")
        try {
            const { error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: toEmail,
                subject: `Your seller account for ${sellerName} is ready`,
                text: `
Hi ${ownerName},

Your seller account for ${sellerName} has been created on our marketplace and is now live.

Set your password to reach your seller dashboard:

${inviteLink}

This link is valid for ${validFor}. If it expires, use "Forgot password" on the sign-in page with this email address.

Best regards,
Amit Prajapati
                `
            })
            if (error) {
                this.logger.warn(`Resend Send Failed : ${error.message}`)
                return false
            }
            return true
        } catch (error) {
            this.logger.warn(
                `Resend Send Failed : ${(error as Error)?.message}`
            )
            return false
        }
    }

    /** Shared plain-text sender for the seller lifecycle emails */
    private async sendText(toEmail: string, subject: string, text: string): Promise<boolean> {
        try {
            const { error } = await this.resend.emails.send({ from: this.fromEmail, to: toEmail, subject, text })
            if (error) {
                this.logger.warn(`Resend Send Failed : ${error.message}`)
                return false
            }
            return true
        } catch (error) {
            this.logger.warn(`Resend Send Failed : ${(error as Error)?.message}`)
            return false
        }
    }

    /** Self-service application submitted */
    sendSellerApplicationReceived(ownerName: string, toEmail: string, sellerName: string) {
        this.logger.log("Sending seller application received")
        return this.sendText(toEmail, `We received your application for ${sellerName}`, `
Hi ${ownerName},

Thanks for applying to sell on our marketplace. We're reviewing the business details and KYC documents for ${sellerName}.

Most applications are reviewed within 2 business days. We'll email you as soon as your seller account is approved.

Best regards,
Amit Prajapati
`)
    }

    /** Application approved — seller can sign in and go live */
    sendSellerApproved(ownerName: string, toEmail: string, sellerName: string, sellerAdminUrl: string) {
        this.logger.log("Sending seller approved")
        return this.sendText(toEmail, `${sellerName} is approved — you can start selling`, `
Hi ${ownerName},

Good news — ${sellerName} has been approved and your seller dashboard is ready.

Sign in to list your products and go live:
${sellerAdminUrl}/auth/login

Best regards,
Amit Prajapati
`)
    }

    /** KYC rejected — seller fixes details and re-submits */
    sendSellerRejected(ownerName: string, toEmail: string, sellerName: string, sellerAdminUrl: string) {
        this.logger.log("Sending seller KYC rejected")
        return this.sendText(toEmail, `Action needed on your application for ${sellerName}`, `
Hi ${ownerName},

We couldn't verify the KYC documents for ${sellerName}. Please sign in, check your business details and upload clear copies of the documents, then submit your application again:
${sellerAdminUrl}/auth/login

Best regards,
Amit Prajapati
`)
    }

    /** A seller added a staff member — link to set their password */
    sendSellerStaffInvite(name: string, toEmail: string, sellerName: string, roleName: string, inviteLink: string, validFor: string) {
        this.logger.log("Sending seller staff invite")
        return this.sendText(toEmail, `You've been added to ${sellerName}`, `
Hi ${name},

You've been added to the ${sellerName} seller dashboard as ${roleName}.

Set your password to get started:
${inviteLink}

This link is valid for ${validFor}. If it expires, ask your admin to resend the invite, or use "Forgot password" on the sign-in page.

Best regards,
Amit Prajapati
`)
    }
}
