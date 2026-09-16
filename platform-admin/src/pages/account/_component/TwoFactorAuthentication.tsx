import TitleHeading from '@/components/Heading'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { useAppDispatch } from '@/hooks/use-store'
import { twoFactorGenerateOtp, verifyEnablDisableTwoFactor, type IUser } from '@/store/auth/authSlice'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

const TwoFactorAuthentication = ({ user }: { user: Partial<IUser> }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const dispatch = useAppDispatch()
  const [otpSend, setOtpSend] = useState<boolean>(false)
  const [otp, setOtp] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await dispatch(twoFactorGenerateOtp())

      if (response.payload.success) {
        toast.success(response?.payload?.message)
        setOtpSend(true)
      } else {
        toast.error(response?.payload?.message)
      }
    } catch (error) {
      toast.error("Failed to send otp")
    } finally {
      setIsLoading(false)
    }

  }


  const handleVerifyOtp = async (e: any) => {
    e.preventDefault()
    setIsLoading(true)
    setIsLoading(true)
    try {
      const response = await dispatch(verifyEnablDisableTwoFactor({
        otp: otp
      }))

      if (response.payload.success) {
        toast.success(response?.payload?.message)
        setOtpSend(false)
        setOtp('')
        setOpen(false)
      } else {
        toast.error(response?.payload?.message)
      }
    } catch (error) {
      toast.error("Failed to send otp")
    } finally {
      setIsLoading(false)
    }

  }


  useEffect(() => {
    if (!open) {
      setOtpSend(false)
      setOtp('')
    }
  }, [open])


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' className='cursor-pointer'>
          {
            user?.twoFactorEnabled ? "Disable" : "Enable"
          }
        </Button>
      </DialogTrigger>
      <DialogContent className='w-full lg:max-w-2xl min-h-28 p-4 lg:p-6'>
        {
          otpSend ?
            (<>
              <TitleHeading
                title='OTP 2FA'
                classNameTitle='font-semibold'
                description='Enter your 2fa authetication otp....'
              />
              <form onSubmit={handleVerifyOtp} className='grid gap-4 lg:gap-6 w-fit mx-auto min-w-sm'>
                <div className='grid gap-1 w-full max-w-xs lg:max-w-sm mt-4'>
                  <Label htmlFor='email'>OTP</Label>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={isLoading}
                    className='w-full max-w-xs lg:max-w-sm'
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
                </div>
                <div className='mt-4'>
                  <Button className='mx-auto block h-10'>
                    {
                      isLoading ? "Verifing..." : "Verify OTP"
                    }
                  </Button>
                </div>
              </form>
            </>)
            : (
              <>
                <TitleHeading
                  title='Two-Factor Authentication'
                  classNameTitle='font-semibold'
                  description='Enable two factor authentication....'
                />
                <form onSubmit={handleSubmit} className='grid gap-4 lg:gap-6 mt-4'>
                  <div className='grid gap-1'>
                    <Label htmlFor='email'>Email</Label>
                    <Input
                      id='email'
                      disabled
                      value={user?.email}
                      placeholder='Enter your email...'
                      className='h-10'
                    />
                  </div>

                  <div className='mt-4'>
                    <Button className='mx-auto block h-10'>
                      {
                        isLoading ? "Sending otp..." : "Send OTP"
                      }
                    </Button>
                  </div>
                </form>
              </>
            )
        }

      </DialogContent>
    </Dialog>
  )
}

export default TwoFactorAuthentication