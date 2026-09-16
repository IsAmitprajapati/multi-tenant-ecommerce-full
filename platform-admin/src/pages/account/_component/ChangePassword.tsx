import TitleHeading from '@/components/Heading'
import PasswordInput from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { changePassword, logoutUser } from '@/store/auth/authSlice'
import React, { useState } from 'react'
import { toast } from 'sonner'

const ChangePassword = () => {
    const [data, setData] = useState({
        password: "",
        confirmPassword: ""
    })
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const handleOnChange = (e: any) => {
        const { name, value } = e.target
        setData((preve) => {
            return {
                ...preve,
                [name]: value
            }
        })
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()

        if (data.password !== data.confirmPassword) {
            toast.error("Password and confirm password must be same.")
            return;
        }

        setIsLoading(true)
        const response: any = await dispatch(changePassword(data))

        if (response?.payload?.success) {
            toast.success(response?.payload?.message)
            setIsOpen(false)
            await dispatch(logoutUser())
        } else {
            toast.error(response?.payload?.message)
        }

        setIsLoading(false)

    }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant='outline' className='cursor-pointer'>Change Password</Button>
            </DialogTrigger>
            <DialogContent className='w-full lg:max-w-2xl min-h-28 p-4 lg:p-6'>
                <TitleHeading
                    title='Change Passsword'
                    classNameTitle='font-semibold'
                    description='Update your password here...'
                />

                <form onSubmit={handleSubmit} className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4'>
                    <div className='grid gap-1'>
                        <Label htmlFor='password'>Password</Label>
                        <PasswordInput
                            className='h-10'
                            id='password'
                            name='password'
                            value={data.password}
                            onChange={handleOnChange}
                        />
                    </div>

                    <div className='grid gap-1'>
                        <Label htmlFor='confirmPassword'>Confirm Password</Label>
                        <PasswordInput
                            className='h-10'
                            id='confirmPassword'
                            name='confirmPassword'
                            value={data.confirmPassword}
                            onChange={handleOnChange}
                        />
                    </div>


                    <div className='col-span-2 mt-4'>
                        <Button className='mx-auto block h-10'>
                            {
                                isLoading ? "Updating..." : "Change Password"
                            }
                        </Button>
                    </div>

                </form>
            </DialogContent>

        </Dialog>
    )
}

export default ChangePassword