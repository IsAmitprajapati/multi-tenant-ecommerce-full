import type { loginResponse } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { useAppDispatch } from '@/hooks/use-store'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { Verify2FALoginOtp, verifyEnablDisableTwoFactor } from '@/store/auth/authSlice'
import { ArrowLeft } from 'lucide-react'
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

const Verify2AaOTP = () => {

    const location = useLocation()
    const email = (location.state as { email?: string })?.email
    const twoFactorToken = (location.state as { twoFactorToken?: string })?.twoFactorToken

    const dispatch = useAppDispatch()

    console.log("location", location)

    const [otp, setOtp] = useState<string>()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()

        setIsSubmitting(true)
        setError(null)
        try {
            const result: any = await dispatch(Verify2FALoginOtp({
                otp: otp,
                twoFactorToken
            }))

            const reponse = result?.payload as loginResponse
            if (
                reponse.accessToken &&
                reponse.refreshToken &&
                reponse.userType
            ) {
                navigate('/dashboard')
            }
            else if (reponse.requiredsTwoFactor && reponse.twoFactorToken) {
                navigate('/auth/2fa', {
                    state: {
                        email: email,
                        twoFactorToken: reponse.twoFactorToken
                    }
                })
            }
            else {
                setError(result?.payload)
            }
        } catch (error) {
            setError(getAxiosErrorMessage(error, "Failed to login"))
        } finally {
            setIsSubmitting(false)
        }
    }

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
                Enter 2FA otp
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
                            "Verify 2FA OTP"
                        )
                    }

                </Button>

            </form>
        </div>
    )
}


export default Verify2AaOTP
