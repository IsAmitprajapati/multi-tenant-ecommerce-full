import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { useOtpCountdown } from '@/hooks/use-count'
import { useAppDispatch } from '@/hooks/use-store'
import { fetchForgotPassword, forgotPasswordVerifyOtp } from '@/store/auth/authSlice'
import { ArrowLeft } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

const VerifyForgotOtpPage = () => {

    const location = useLocation()
    const email = (location.state as { email?: string })?.email
    const otpCreatedLocation = (location.state as { createdAt?: string })?.createdAt

    const [otp, setOtp] = useState<string>()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const dispatch = useAppDispatch()
    const [otpCreatedAt, setOtpCreatedAt] = useState<string>(location?.state?.createdAt || otpCreatedLocation)

    const { remainingSeconds, formattedTime, isExpired } = useOtpCountdown(otpCreatedAt, 5)

    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()

        setIsSubmitting(true)

        const response = await dispatch(forgotPasswordVerifyOtp({
            email: email,
            otp: otp
        }))

        if (response?.payload?.success) {
            navigate('/auth/reset-password', {
                state: {
                    email: email,
                    resetToken: response?.payload?.data?.resetToken
                },
                replace: true
            })
            setOtp("")
            toast.success(response?.payload?.message)
            setIsSubmitting(false)
        } else {
            const errorMessage = response?.payload?.message || response?.payload
            toast.error(errorMessage)
            setIsSubmitting(false)
            setError(errorMessage)
        }

    }

    const handleResendOtp = async () => {
        setIsSubmitting(true)

        const response = await dispatch(fetchForgotPassword({
            email: email
        }))

        console.log("response", response)
        if (response?.payload?.success) {
            setOtpCreatedAt(response?.payload?.data?.createdAt)
            toast.success(response?.payload?.message)
            setIsSubmitting(false)
        } else {
            const errorMessage = response?.payload?.message || response?.payload
            toast.error(errorMessage)
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        if (!email) {
            navigate('/auth/forgot-password')
        }
    }, [email])

    return (
        <div className='w-full max-w-sm'>
            <Link
                to={'/auth/login'}
                arial-label="Back to sign in"
                className='mb-4 inline-flex text-foreground items-center gap-2'
            >
                <ArrowLeft className='size-5' />
                Back
            </Link>

            <h2 className='text-2xl font-bold'>
                Enter Verification otp
            </h2>
            <p className='mt-1.5 text-sm text-muted-foreground'>
                {
                    email ? (
                        <>
                            We sent a 6 digit otp to {" "}
                            <span className='font-medium text-foreground'>
                                {email}
                            </span>.
                        </>
                    ) : (
                        "We sent a 6 digit otp to your email address."
                    )
                }
            </p>

            <form className='mt-6' onSubmit={handleSubmit}>
                <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={isSubmitting}
                    className='w-full'
                >
                    <InputOTPGroup className='w-full'>
                        <InputOTPSlot index={0} className='w-full h-14 text-lg' />
                        <InputOTPSlot index={1} className='w-full h-14 text-lg' />
                        <InputOTPSlot index={2} className='w-full h-14 text-lg' />
                        <InputOTPSlot index={3} className='w-full h-14 text-lg' />
                        <InputOTPSlot index={4} className='w-full h-14 text-lg' />
                        <InputOTPSlot index={5} className='w-full h-14 text-lg' />
                    </InputOTPGroup>
                </InputOTP>

                {
                    isExpired ? (
                        <Button onClick={handleResendOtp} type='button' variant='link' className='mt-3 cursor-pointer'>
                            Resend OTP
                        </Button>
                    ) : (
                        <>
                            <p className='text-muted-foreground mt-3'>OTP will be expired at : {formattedTime}</p>
                        </>
                    )
                }

                {
                    error && (
                        <p className="mt-3 text-sm text-destructive">{error}</p>
                    )
                }


                <Button
                    type="submit"
                    className="mt-6 h-11 w-full"
                >
                    {
                        isSubmitting ? (
                            <>
                                <Spinner
                                    className="size-4"
                                />
                                Verifying..
                            </>
                        ) : (
                            "Verify OTP"
                        )
                    }

                </Button>

            </form>


        </div>
    )
}


export default VerifyForgotOtpPage
