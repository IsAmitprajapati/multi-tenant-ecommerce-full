import TitleHeading from '@/components/Heading'
import PageHeader from '@/components/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAppSelector } from '@/hooks/use-store'
import { ArrowRight, Heading } from 'lucide-react'
import React from 'react'
import ProfileUpdate from './_component/ProfileUpdate'
import ChangePassword from './_component/ChangePassword'
import TwoFactorAuthentication from './_component/TwoFactorAuthentication'
import SessionsCard from './_component/SessionsCard'
import moment from 'moment'

const ProfileDetailsPage = () => {
  const user = useAppSelector(state => state?.auth?.user)


  return (
    <div>
      <PageHeader
        title='My Account'
        description={`Your profile, password, two-factor authentication, and where you're currently signed in.`}
      />

      <div className='space-y-4 space-x-4'>

        {/****User Details and Roles*/}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 min-h-28'>
          <div className='col-span-1 lg:col-span-2 h-full'>
            <Card className='p-4 lg:p-6 h-full'>
              <div className='flex justify-between'>
                <div className='flex items-center gap-4'>
                  <Avatar className='cursor-pointer w-14 h-14'>
                    <AvatarImage src={user?.profile_image} />
                    <AvatarFallback className='bg-primary font-semibold text-white'>{user?.avatarName}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className='font-semibold text-lg truncate'>{user?.fullName}</div>
                    <div className='bg-primary/20 text-primary font-semibold px-3 py-1 text-xs rounded-full w-fit'>{user?.seller?.isOwner ? 'Seller owner' : (user?.role?.name ?? 'Seller')}</div>
                  </div>
                </div>

                <div>
                  <ProfileUpdate
                    user={user}
                  />
                </div>
              </div>
              <div className='grid gap-3'>
                <div className='flex items-center justify-between'>
                  <Label>Email</Label>
                  <div>{user?.email}</div>
                </div>
                <div className='border-b'></div>
                <div className='flex items-center justify-between'>
                  <Label>Phone</Label>
                  <div>{user?.phone}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className='h-full'>
            <Card className='p-4 lg:p-6 h-full'>
              <TitleHeading
                title='Role & access'
                classNameTitle='font-medium text-base'
                description=''
              />
              <div className='grid gap-3'>
                <div className='flex items-center justify-between'>
                  <Label>Role</Label>
                  <div>{user?.role?.name ?? "-"}</div>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <Label>Seller</Label>
                <div>{user?.seller?.name ?? "-"}</div>
              </div>
              <p className='text-xs text-muted-foreground'>
                {user?.seller?.isOwner
                  ? `You own ${user?.seller?.name} — full access to its seller dashboard.`
                  : `Your access is set by the ${user?.role?.name ?? 'assigned'} role.`}
              </p>

              <Button
                variant='link'
                className='cursor-ponter'
              >
                View permission matrix <ArrowRight />
              </Button>
            </Card>
          </div>

        </div>



        {/****Password & Security*/}
        <div>
          <Card className='p-4 lg:p-6 h-full'>
            <TitleHeading
              title='Password & Securiy'
              classNameTitle='font-medium text-base'
              description=''
            />
            <div className=' flex items-center justify-between gap-4 lg:gap-6'>
              <div className='flex flex-col'>
                <Label>Password</Label>
                <div>{moment(user?.passwordUpdatedAt).startOf('seconds').fromNow()}</div>
              </div>
              <div>
                <ChangePassword />
              </div>
            </div>

            <div className='border-b'></div>
            <div className=' flex items-center justify-between gap-4 lg:gap-6'>
              <div className='flex flex-col'>
                <Label>Two-factor authentication</Label>
                <div>Extra code required at login, in addition to your password</div>
              </div>
              <div className='flex items-center gap-4'>
                <Badge
                  variant={user?.twoFactorEnabled ? "default" : 'destructive'}
                >
                  {
                    user?.twoFactorEnabled ? "Enable" : "Disable"
                  }
                </Badge>

                <TwoFactorAuthentication
                  user={user}
                />
              </div>
            </div>

          </Card>
        </div>




        {/****Session Details*/}
        <div>
            <SessionsCard/>
        </div>

      </div>

    </div>
  )
}

export default ProfileDetailsPage