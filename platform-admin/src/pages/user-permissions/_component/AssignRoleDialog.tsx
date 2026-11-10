import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { UserCogIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { assignUserRole, type IAdminUsers } from '@/store/users/userSlice'
import { modulesForUserType } from '@/lib/permissions'

interface AssignRoleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: IAdminUsers | null
}

const AssignRoleDialog = ({ open, onOpenChange, user }: AssignRoleDialogProps) => {
    const dispatch = useAppDispatch()
    const roles = useAppSelector(state => state.roles.roles)
    const isSaving = useAppSelector(state => state.user.isSaving)
    const [roleId, setRoleId] = useState<string>('')

    useEffect(() => {
        if (open) setRoleId(user?.role?.id ?? '')
    }, [open, user])

    const activeRoles = useMemo(() => roles.filter(r => r.status === 'ACTIVE'), [roles])


    const handleSave = async () => {
        if (!user || !roleId) return
        const result = await dispatch(assignUserRole({ id: user.id, roleId }))
        if (assignUserRole.fulfilled.match(result)) {
            toast.success(result.payload?.message ?? 'Role assigned')
            onOpenChange(false)
        } else {
            toast.error((result.payload as string) ?? 'Failed to assign role')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='gap-0 p-0 sm:max-w-lg' showCloseButton>
                <DialogHeader className='border-b px-6 pt-6 pb-4'>
                    <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
                        <UserCogIcon className='size-5 text-primary' />
                        Assign role
                    </DialogTitle>
                    <DialogDescription>
                        Choose the role for <span className='font-semibold text-foreground'>{user?.fullName}</span>.
                        Access changes take effect immediately.
                    </DialogDescription>
                </DialogHeader>

                <div role='radiogroup' className='grid max-h-[55vh] gap-2 overflow-y-auto px-6 py-5'>
                    {activeRoles.length === 0 && (
                        <p className='py-6 text-center text-sm text-muted-foreground'>No active roles. Create a role first.</p>
                    )}
                    {activeRoles.map(r => {
                        const selected = r.id === roleId
                        const granted = r.permissions.filter(p => p.level !== 'NONE').length
                        return (
                            <button
                                key={r.id}
                                type='button'
                                role='radio'
                                aria-checked={selected}
                                onClick={() => setRoleId(r.id)}
                                className={cn(
                                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                                    selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                                )}
                            >
                                <span className={cn(
                                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                                    selected ? 'border-primary' : 'border-input'
                                )}>
                                    {selected && <span className='size-2 rounded-full bg-primary' />}
                                </span>
                                <span className='min-w-0 flex-1'>
                                    <span className='flex items-center gap-2 text-sm font-semibold'>
                                        {r.name}
                                        {r.isSystem && <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase'>System</span>}
                                    </span>
                                    {r.description && <span className='mt-0.5 block text-xs text-muted-foreground'>{r.description}</span>}
                                    <span className='mt-1 block text-xs text-muted-foreground'>
                                        {r.isSystem ? 'Full access' : modulesForUserType(r.userType).length === 0 ? 'No admin access' : `${granted} of ${modulesForUserType(r.userType).length} modules`}
                                        {' '}· {r.usersCount} user{r.usersCount === 1 ? '' : 's'}
                                    </span>
                                </span>
                            </button>
                        )
                    })}
                </div>

                <DialogFooter className='mx-0 mb-0 rounded-b-xl px-6 py-4'>
                    <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isSaving} className='cursor-pointer'>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !roleId || roleId === user?.role?.id}
                        className='min-w-28 cursor-pointer'
                    >
                        {isSaving && <Spinner />}
                        Assign role
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default AssignRoleDialog
