import TitleHeading from '@/components/Heading'
import PasswordInput from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { PasswordConfirmPasswordSchema, strongPasswordSchema } from '@/lib/zod/password'
import { fetchAllAdminUsers, type IAdminUsers } from '@/store/users/userSlice'
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { createUserSchema, EditUserSchema } from '@/lib/zod/password'
import { FieldError } from '@/components/ui/field'

const CreateEditUsers = () => {
    const location = useLocation()
    const userId = location?.state?.userId
    const [formData, setFormData] = useState<Partial<IAdminUsers>>({
        email: "",
        fullName: "",
        phone: "",
        password: "",
        confirmPassword: ""
    })
    const dispatch = useAppDispatch()
    const userData = useAppSelector(state => state?.user)
    const [isLoading, setIsLoading] = useState<boolean>(userData?.isLoading)
    const [errors, setErrors] = useState<Partial<IAdminUsers>>({
        email: "",
        fullName: "",
        phone: "",
        password: "",
        confirmPassword: ""
    })

    useEffect(() => {
        dispatch(fetchAllAdminUsers({
            userId: userId
        }))
    }, [userId])

    useEffect(() => {
        if (userId) {
            setFormData((preve) => {
                return {
                    ...preve,
                    email: userData?.adminUsers[0]?.email,
                    fullName: userData?.adminUsers[0]?.fullName,
                    status: userData?.adminUsers[0]?.status,
                    phone: userData?.adminUsers[0]?.phone,
                }
            })
        }
    }, [userData?.adminUsers[0]])


    const handleOnChange = (e) => {
        const { name, value } = e.target
        setFormData((preve) => {
            return {
                ...preve,
                [name]: value
            }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Trigger Zod validation safely
        const result = userId ? EditUserSchema.safeParse(formData) : createUserSchema.safeParse(formData);
        const editPasswordProvided = (userId && formData?.password) && PasswordConfirmPasswordSchema.safeParse(formData)
        console.log("editPasswordProvided", editPasswordProvided)
        if (!result.success) {
            // Map Zod errors to a flat key-value pair object
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as string] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        /***ONly for update */
        if (editPasswordProvided && !editPasswordProvided.success && userId) {
            // Map Zod errors to a flat key-value pair object
            const fieldErrors: Record<string, string> = {};
            editPasswordProvided.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as string] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }



    }

    console.log('errors', errors)

    return (
        <div>
            <TitleHeading
                title={`${userId ? "Edit" : "Create"} User`}
                description={`${userId ? "Update" : "Add"} user details and permissions.`}
                back
            />

            <form onSubmit={handleSubmit} className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 my-4 lg:my-8'>
                <div className='grid gap-2'>
                    <Label htmlFor='fullName'>Full Name:</Label>
                    <Input
                        id='fullName'
                        name='fullName'
                        value={formData.fullName}
                        onChange={handleOnChange}
                        className='h-12 bg-white'
                        placeholder='Enter full name...'
                        disabled={isLoading}
                    />
                    {
                        errors.fullName && (
                            <FieldError errors={[{
                                message: errors?.fullName
                            }]} />
                        )
                    }
                </div>
                <div className='grid gap-2'>
                    <Label htmlFor='email'>Email:</Label>
                    <Input
                        id='email'
                        name='email'
                        type='email'
                        value={formData.email}
                        onChange={handleOnChange}
                        className='h-12 bg-white'
                        placeholder='Enter email address...'
                        disabled={isLoading}
                    />
                    {
                        errors.email && (
                            <FieldError errors={[{
                                message: errors?.email
                            }]} />
                        )
                    }
                </div>

                <div className='grid gap-2'>
                    <Label htmlFor='phone'>Phone:</Label>
                    <Input
                        id='phone'
                        name='phone'
                        value={formData.phone}
                        onChange={handleOnChange}
                        className='h-12 bg-white'
                        placeholder='Enter phone number...'
                        disabled={isLoading}
                    />
                    {
                        errors.phone && (
                            <FieldError errors={[{
                                message: errors?.phone
                            }]} />
                        )
                    }
                </div>

                <div className='grid gap-2'>
                    <Label htmlFor='password'>Password {userId && '(optional)'}:</Label>
                    <PasswordInput
                        id='password'
                        name='password'
                        value={formData.password}
                        onChange={handleOnChange}
                        className='h-12 bg-white'
                        placeholder='Enter password...'
                        disabled={isLoading}
                    />
                    {
                        errors.password && (
                            <FieldError errors={[{
                                message: errors?.password
                            }]} />
                        )
                    }
                </div>

                <div className='grid gap-2'>
                    <Label htmlFor='confirmPassword'>Confirm password {userId && '(optional)'}:</Label>
                    <PasswordInput
                        id='confirmPassword'
                        name='confirmPassword'
                        value={formData.confirmPassword}
                        onChange={handleOnChange}
                        className='h-12 bg-white'
                        placeholder='Enter confirm password...'
                        disabled={isLoading}
                    />
                    {
                        errors.confirmPassword && (
                            <FieldError errors={[{
                                message: errors?.confirmPassword
                            }]} />
                        )
                    }
                </div>

                <div className='lg:col-span-2'>
                    <Button
                        className='min-h-12 px-6 mx-auto block mt-4 cursor-pointer'
                        disabled={isLoading}
                    >
                        {
                            isLoading ? "Submitting..." : (
                                userId ? "Update User" : "Create User"
                            )
                        }
                    </Button>
                </div>

            </form>
        </div>
    )
}

export default CreateEditUsers