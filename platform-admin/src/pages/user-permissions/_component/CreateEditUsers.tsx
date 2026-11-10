import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { ShieldCheckIcon, UserIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PasswordInput from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { usePermission } from '@/hooks/use-permission'
import { strongPasswordSchema } from '@/lib/zod/password'
import { modulesForUserType, PERMISSION_LEVELS } from '@/lib/permissions'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { userApi } from '@/api/user'
import { fetchRoles } from '@/store/roles/roleSlice'
import { createAdminUser, updateAdminUser, type IAdminUsers } from '@/store/users/userSlice'
import StatusBadge from './StatusBadge'

const baseSchema = z.object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
    phone: z.string().trim().regex(/^(\+?[1-9]\d{6,14})?$/, 'Invalid phone number').optional(),
    roleId: z.string().min(1, 'Select a role'),
})

const createSchema = baseSchema.extend({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

const editSchema = baseSchema.extend({
    password: z.union([z.literal(''), strongPasswordSchema]).optional(),
    confirmPassword: z.string().optional(),
}).refine(d => !d.password || d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type FormState = { fullName: string; email: string; phone: string; roleId: string; password: string; confirmPassword: string }
type Errors = Partial<Record<keyof FormState, string>>

const EMPTY: FormState = { fullName: '', email: '', phone: '', roleId: '', password: '', confirmPassword: '' }

const CreateEditUsers = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const userId: string | undefined = location?.state?.userId
    const isEdit = Boolean(userId)

    const roles = useAppSelector(state => state.roles.roles)
    const isSaving = useAppSelector(state => state.user.isSaving)
    const { userId: currentUserId } = usePermission()
    const isSelf = isEdit && userId === currentUserId

    const [form, setForm] = useState<FormState>(EMPTY)
    const [errors, setErrors] = useState<Errors>({})
    const [existing, setExisting] = useState<IAdminUsers | null>(null)
    const [isFetching, setIsFetching] = useState(isEdit)

    useEffect(() => {
        dispatch(fetchRoles())
    }, [dispatch])

    // Load the user being edited without clobbering the list in the store
    useEffect(() => {
        if (!userId) return
        let cancelled = false
        setIsFetching(true)
        userApi.getAdminUsers({ userId })
            .then(res => {
                if (cancelled) return
                const u: IAdminUsers | undefined = res?.data?.[0]
                if (!u) {
                    toast.error('User not found')
                    navigate('/dashboard/users-permissions/user', { replace: true })
                    return
                }
                setExisting(u)
                setForm({ ...EMPTY, fullName: u.fullName ?? '', email: u.email ?? '', phone: u.phone ?? '', roleId: u.role?.id ?? '' })
            })
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load user')))
            .finally(() => !cancelled && setIsFetching(false))
        return () => { cancelled = true }
    }, [userId, navigate])

    const assignableRoles = useMemo(
        () => roles.filter(r => r.status === 'ACTIVE' || r.id === existing?.role?.id),
        [roles, existing]
    )
    const selectedRole = roles.find(r => r.id === form.roleId)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
        setErrors(prev => ({ ...prev, [name]: undefined }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const parsed = (isEdit ? editSchema : createSchema).safeParse(form)
        if (!parsed.success) {
            const fieldErrors: Errors = {}
            parsed.error.issues.forEach(issue => {
                const key = issue.path[0] as keyof FormState
                if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
            })
            setErrors(fieldErrors)
            return
        }

        const payload = {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            roleId: form.roleId,
            ...(form.password && { password: form.password }),
        }

        const result = isEdit
            ? await dispatch(updateAdminUser({ id: userId!, payload: isSelf ? { ...payload, roleId: undefined } : payload }))
            : await dispatch(createAdminUser(payload))

        if (createAdminUser.fulfilled.match(result) || updateAdminUser.fulfilled.match(result)) {
            toast.success(result.payload?.message ?? 'Saved')
            navigate('/dashboard/users-permissions/user')
        } else {
            toast.error((result.payload as string) ?? 'Failed to save user')
        }
    }

    const disabled = isSaving || isFetching
    const err = (k: keyof FormState) => errors[k] && <FieldError errors={[{ message: errors[k] }]} />

    return (
        <div className='pb-10'>
            <PageHeader
                    title={isEdit ? 'Edit user' : 'Add user'}
                    description={isEdit ? 'Update account details and role.' : 'Create an account and choose the role that controls their access.'}
                back
                actions={existing && <StatusBadge status={existing.status} />}
            />

            <form onSubmit={handleSubmit} className='grid gap-6 lg:grid-cols-3'>
                <div className='grid gap-6 lg:col-span-2'>
                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                <UserIcon className='size-4 text-primary' /> Account details
                            </CardTitle>
                            <CardDescription>Basic information used to sign in and contact this user.</CardDescription>
                        </CardHeader>
                        <CardContent className='grid gap-5 sm:grid-cols-2'>
                            {isFetching ? (
                                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-16' />)
                            ) : (
                                <>
                                    <div className='grid gap-2 sm:col-span-2'>
                                        <Label htmlFor='fullName'>Full name</Label>
                                        <Input id='fullName' name='fullName' value={form.fullName} onChange={handleChange}
                                            className='h-10' placeholder='e.g. Divya Rao' disabled={disabled} aria-invalid={Boolean(errors.fullName)} />
                                        {err('fullName')}
                                    </div>
                                    <div className='grid gap-2'>
                                        <Label htmlFor='email'>Work email</Label>
                                        <Input id='email' name='email' type='email' value={form.email} onChange={handleChange}
                                            className='h-10' placeholder='name@company.com' disabled={disabled} aria-invalid={Boolean(errors.email)} />
                                        {err('email')}
                                    </div>
                                    <div className='grid gap-2'>
                                        <Label htmlFor='phone'>Phone <span className='font-normal text-muted-foreground'>(optional)</span></Label>
                                        <Input id='phone' name='phone' value={form.phone} onChange={handleChange}
                                            className='h-10' placeholder='+919876543210' disabled={disabled} aria-invalid={Boolean(errors.phone)} />
                                        {err('phone')}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='text-base font-semibold'>{isEdit ? 'Reset password' : 'Password'}</CardTitle>
                            <CardDescription>
                                {isEdit
                                    ? 'Leave blank to keep the current password.'
                                    : 'At least 8 characters with upper & lower case letters, a number and a symbol.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='grid gap-5 sm:grid-cols-2'>
                            <div className='grid gap-2'>
                                <Label htmlFor='password'>{isEdit ? 'New password' : 'Password'}</Label>
                                <PasswordInput id='password' name='password' value={form.password} onChange={handleChange}
                                    className='h-10' placeholder='••••••••' disabled={disabled} autoComplete='new-password' aria-invalid={Boolean(errors.password)} />
                                {err('password')}
                            </div>
                            <div className='grid gap-2'>
                                <Label htmlFor='confirmPassword'>Confirm password</Label>
                                <PasswordInput id='confirmPassword' name='confirmPassword' value={form.confirmPassword} onChange={handleChange}
                                    className='h-10' placeholder='••••••••' disabled={disabled} autoComplete='new-password' aria-invalid={Boolean(errors.confirmPassword)} />
                                {err('confirmPassword')}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className='grid content-start gap-6'>
                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                <ShieldCheckIcon className='size-4 text-primary' /> Role & access
                            </CardTitle>
                            <CardDescription>The role decides which modules this user can access.</CardDescription>
                        </CardHeader>
                        <CardContent className='grid gap-4'>
                            <div className='grid gap-2'>
                                <Label>Role</Label>
                                <Select
                                    value={form.roleId}
                                    onValueChange={v => { setForm(p => ({ ...p, roleId: v })); setErrors(p => ({ ...p, roleId: undefined })) }}
                                    disabled={disabled || isSelf}
                                >
                                    <SelectTrigger className='h-10! w-full' aria-invalid={Boolean(errors.roleId)}>
                                        <SelectValue placeholder='Select a role' />
                                    </SelectTrigger>
                                    <SelectContent position='popper'>
                                        {assignableRoles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {isSelf && <p className='text-xs text-muted-foreground'>You can't change your own role.</p>}
                                {err('roleId')}
                            </div>

                            {selectedRole && (
                                <div className='rounded-lg border bg-muted/30 p-3'>
                                    <div className='flex items-center justify-between gap-2'>
                                        <span className='text-sm font-semibold'>{selectedRole.name}</span>
                                    </div>
                                    {selectedRole.description && <p className='mt-1 text-xs text-muted-foreground'>{selectedRole.description}</p>}
                                    <ul className='mt-3 grid gap-1.5'>
                                        {modulesForUserType(selectedRole.userType).length === 0 && (
                                            <li className='text-xs text-muted-foreground'>No admin panel access.</li>
                                        )}
                                        {modulesForUserType(selectedRole.userType).map(m => {
                                            const level = selectedRole.permissions.find(p => p.module === m.key)?.level ?? 'NONE'
                                            return (
                                                <li key={m.key} className='flex items-center justify-between text-xs'>
                                                    <span className={level === 'NONE' ? 'text-muted-foreground' : ''}>{m.label}</span>
                                                    <span className={level === 'NONE' ? 'text-muted-foreground' : 'font-semibold text-primary'}>
                                                        {PERMISSION_LEVELS.find(l => l.value === level)?.label}
                                                    </span>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className='flex gap-2'>
                        <Button type='button' variant='outline' className='h-10 flex-1 cursor-pointer' onClick={() => navigate(-1)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type='submit' className='h-10 flex-1 cursor-pointer' disabled={disabled}>
                            {isSaving && <Spinner />}
                            {isEdit ? 'Save changes' : 'Create user'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default CreateEditUsers
