import TitleHeading from '@/components/Heading'
import PasswordInput from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { PasswordConfirmPasswordSchema } from '@/lib/zod/password'
import { changePassword, logoutUser } from '@/store/auth/authSlice'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface IPasswordData {
    password: string,
    confirmPassword: string
}

const ChangePassword = () => {
    const [data, setData] = useState<IPasswordData>({
        password: "",
        confirmPassword: ""
    })
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<IPasswordData>({
        password: "",
        confirmPassword: ""
    })

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


        const result = PasswordConfirmPasswordSchema.safeParse(data)
        if (!result.success) {
            // Map Zod errors to a flat key-value pair object
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as string] = err.message;
                }
            });
            setError(fieldErrors as any);
            return;
        }
        setError({
            password: "",
            confirmPassword: ""
        })

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

    console.log(error)
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

                    <div className='lg:col-span-2 text-center'>
                        {
                            error.password && (
                                <FieldError errors={[
                                    {
                                        message: error.password
                                    }
                                ]}
                                />
                            )
                        }
                        {
                            error.confirmPassword && (
                                <FieldError errors={[
                                    {
                                        message: error.confirmPassword
                                    }
                                ]}
                                />
                            )
                        }
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