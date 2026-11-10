import React, { useEffect, useState } from 'react'
import UserPermissionHeader from './_component/UserPermissionHeader'
import { Button } from '@/components/ui/button'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDispatch } from 'react-redux'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { fetchAllAdminUsers, type IAdminUsers } from '@/store/users/userSlice'
import { createColumnHelper } from "@tanstack/react-table"
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import { DataTable } from '@/components/Datatable/data-table'
import { useNavigate } from 'react-router'

const UsersPage = () => {
    const [search, setSearch] = useState<string>('')
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const userData = useAppSelector((state => state?.user))
    const columnHelper = createColumnHelper<DataTableFeatures, IAdminUsers>()

    console.log("userData", userData)

    useEffect(() => {
        dispatch(fetchAllAdminUsers({}))
    }, [])


    const columns = [
        columnHelper.accessor('id', {
            header: "Sr.No",
            cell: ({ row }) => {
                return row?.index + 1
            }
        }),
        columnHelper.accessor('fullName', {
            header: "Full Name"
        }),
        columnHelper.accessor('email', {
            header: "Email"
        }),
        columnHelper.accessor('status', {
            header: "Status"
        }),
        columnHelper.accessor('action', {
            header: 'Action',
            cell: ({ row }) => {
                return (
                    <div>
                        <Button variant='ghost' className='text-primary cursor-pointer' onClick={() => navigate('/dashboard/users-permissions/user/edit', {
                            state: {
                                userId: row?.original?.id
                            }
                        })}>
                            Edit
                        </Button>
                    </div>
                )
            }
        })
    ]

    return (
        <div>
            <UserPermissionHeader>
                <Button className='min-h-10 cursor-pointer ml-auto' onClick={() => navigate('/dashboard/users-permissions/user/create')}>
                    <PlusIcon />
                    Create User
                </Button>
            </UserPermissionHeader>

            <div className='py-2'>
                <div className='relative'>
                    <Input
                        placeholder='Search admin users....'
                        className='h-12 bg-white pl-8'
                        onChange={(e) => setSearch(e?.target?.value)}
                        value={search}
                    />
                    <SearchIcon className='size-5 absolute left-2 top-3.5 text-muted-foreground' />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={userData?.adminUsers}
                isLoading={userData?.isLoading}
            />


        </div>
    )
}

export default UsersPage