import TitleHeading from '@/components/Heading'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { sessionRevoke, sessionRevokeOthers, sessionsList } from '@/store/auth/authSlice'
import React, { useEffect, useState } from 'react'
import moment from 'moment'
import { Badge } from '@/components/ui/badge'

const SessionsCard = () => {
    const storeData = useAppSelector((state) => state.auth)
    const dispatch = useAppDispatch()
    const [open, setOpen] = useState<boolean>(false)


    useEffect(() => {
        dispatch(sessionsList())
    }, [])

    const handleRevokeSession = async (sessionId: string) => {
        const response = await dispatch(sessionRevoke({
            sessionId: sessionId
        }))

        if (response?.payload?.success) {
            dispatch(sessionsList())
        }
    }


    const handleRevokeAllSession = async () => {
        const response = await dispatch(sessionRevokeOthers())

        if (response?.payload?.success) {
            dispatch(sessionsList())
        }
    }
    return (
        <Card className='p-4 lg:p-6 h-full'>
            <TitleHeading
                title='Active Sessions'
                classNameTitle='font-medium text-base'
                description='3 devices signed in'
                className='flex justify-between gap-4'
            />

            <div>
                {
                    storeData?.isSessionsLoading ? (
                        <div className='flex items-center flex-col justify-center min-h-16'>
                            <Spinner className='size-6' />
                            <p className='mt-3'>Loading...</p>
                        </div>
                    ) : (
                        storeData?.sessions.map((session, index: number) => {
                            return (
                                <div key={session?.id}>
                                    {
                                        Boolean(index) && storeData.sessions?.length - 1 !== index && (
                                            <div className='border-b'></div>
                                        )
                                    }
                                    <div key={session?.id} className='flex w-full justify-between gap-4 lg:gap-6 my-4'>
                                        {/***Device Details */}
                                        <div>
                                            <div className='font-semibold'>{session?.deviceLabel}</div>
                                            <p>{moment(session?.lastActiveAt).startOf('seconds').fromNow()}</p>
                                        </div>

                                        {/***Button */}
                                        <div>
                                            {
                                                session?.isCurrent && (
                                                    <Badge>This Device</Badge>
                                                )
                                            }

                                            {
                                                !Boolean(session?.isCurrent) && (
                                                    <Dialog open={open} onOpenChange={setOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant='outline' className='cursor-pointer'>
                                                                Revoke
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className='w-full lg:max-w-2xl min-h-28 p-4 lg:p-6'>
                                                            <TitleHeading
                                                                title='Revoke sessions'
                                                                classNameTitle='font-semibold'
                                                                description=''
                                                            />

                                                            <p>Do you want to revoke this session ? </p>
                                                            <DialogFooter>
                                                                <Button onClick={() => setOpen(false)}>
                                                                    Cancel
                                                                </Button>

                                                                <Button onClick={() => handleRevokeSession(session?.id)}>
                                                                    Confirm
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                )
                                            }
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )
                }

                {
                    storeData?.sessions?.length >= 2 && (
                        <Button className='h-12 cursor-pointer' onClick={handleRevokeAllSession} variant='destructive'>
                            Sign out all other sessions
                        </Button>
                    )
                }
            </div>
        </Card>
    )
}

export default SessionsCard