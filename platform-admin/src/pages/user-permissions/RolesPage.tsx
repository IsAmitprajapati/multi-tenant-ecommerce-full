import React from 'react'
import UserPermissionHeader from './_component/UserPermissionHeader'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

const RolesPage = () => {
    return (
        <div>
            <UserPermissionHeader>
                <Button className='min-h-10 cursor-pointer ml-auto'>
                    <PlusIcon />
                    Create Role
                </Button>
            </UserPermissionHeader>
        </div>
    )
}

export default RolesPage