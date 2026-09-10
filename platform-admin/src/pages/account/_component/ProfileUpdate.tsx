import TitleHeading from '@/components/Heading'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppDispatch } from '@/hooks/use-store'
import { updateCurrentUser, type IUser } from '@/store/auth/authSlice'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

const ProfileUpdate = ({ user }: { user: IUser }) => {
    const dispatch = useAppDispatch()
    const [data, setData] = useState<IUser>({
        id: user?.id,
        email: user?.email,
        fullName: user?.fullName,
        phone: user?.phone,
        profile_image: user?.profile_image,
        avatarName: user?.avatarName
    })
    const [isSubmitting,setIsSubmitting] = useState<boolean>(false)

    useEffect(() => {
        setData({
            id: user?.id,
            email: user?.email,
            fullName: user?.fullName,
            phone: user?.phone,
            profile_image: user?.profile_image,
            avatarName: user?.avatarName
        })
    }, [user])

    const handleChange = (e: any) => {
        const { name, value } = e.target
        setData((preve) => {
            return {
                ...preve,
                [name]: value
            }
        })
    }

    const handleSubmit = async(e:any) =>{
        e.preventDefault()
        const response:any = await dispatch(updateCurrentUser(data)) 

        if(response?.payload?.success){
            toast.success(response?.payload?.message)
        }else{
            toast.error(response?.payload?.message)
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant='outline' className='cursor-pointer'>
                    Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className='w-full lg:max-w-2xl min-h-28 p-4 lg:p-6'>
                <TitleHeading
                    title='Edit Profile'
                    classNameTitle='font-semibold'
                    description='Update your profile details'
                />
                <form onSubmit={handleSubmit} className='my-3 grid gap-4 grid-cols-2'>
                    <div className='grid gap-2'>
                        <Label htmlFor='fullName'>Full Name</Label>
                        <Input
                            id='fullName'
                            placeholder='Enter your full name'
                            className='h-10'
                            value={data?.fullName}
                            name='fullName'
                            disabled={isSubmitting}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className='grid gap-2'>
                        <Label htmlFor='Email'>Email</Label>
                        <Input
                            id='Email'
                            placeholder='Enter your email'
                            className='h-10'
                            value={data?.email}
                            name='email'
                            disabled={isSubmitting}
                            onChange={handleChange}
                            required
                        />
                    </div>

                     <div className='grid gap-2'>
                        <Label htmlFor='Phone'>Phone</Label>
                        <Input
                            id='Phone'
                            placeholder='Enter your phone'
                            className='h-10'
                            value={data?.phone}
                            name='phone'
                            disabled={isSubmitting}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className='col-span-2 mt-4'>
                        <Button className='mx-auto block h-10'>Update Profile</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default ProfileUpdate