import TitleHeading from '@/components/Heading'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { IUser } from '@/store/auth/authSlice'
import React, { useState } from 'react'

const TwoFactorAuthentication = ({ user }: { user: Partial<IUser> }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleSubmit = (e: any) => {
    e.preventDefault()
    
  }


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' className='cursor-pointer'>Enable</Button>
      </DialogTrigger>
      <DialogContent className='w-full lg:max-w-2xl min-h-28 p-4 lg:p-6'>
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
      </DialogContent>
    </Dialog>
  )
}

export default TwoFactorAuthentication