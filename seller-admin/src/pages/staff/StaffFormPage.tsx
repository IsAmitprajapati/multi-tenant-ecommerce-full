import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { ShieldCheckIcon, UserIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { usePermission } from '@/hooks/use-permission'
import { teamApi, type ISellerRole, type IStaff } from '@/api/team'
import { grantedCount, RolePermissionsTable, roleSummary } from './_component/role-ui'

const schema = z.object({
    fullName: z.string().trim().min(2, 'Enter a name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().transform(v => v.replace(/[\s-]/g, '')).refine(v => !v || /^\+?[1-9]\d{9,14}$/.test(v), 'Enter a valid phone number'),
    roleId: z.string().min(1, 'Choose a role'),
})
type Form = z.input<typeof schema>
type Errors = Partial<Record<keyof Form, string>>

/**
 *   /dashboard/staff/new          → add staff (sends an invite)
 *   /dashboard/staff/:staffId/edit → edit details / change role
 */
export default function StaffFormPage() {
    const { staffId } = useParams<{ staffId: string }>()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const { userId } = usePermission()
    const isEdit = Boolean(staffId)

    const [roles, setRoles] = useState<ISellerRole[]>([])
    const [staff, setStaff] = useState<IStaff | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<Form>({ fullName: '', email: '', phone: '', roleId: params.get('role') ?? '' })
    const [errors, setErrors] = useState<Errors>({})

    useEffect(() => {
        Promise.all([teamApi.listRoles(), staffId ? teamApi.getStaff(staffId) : Promise.resolve(null)])
            .then(([r, s]) => {
                setRoles(r.data)
                if (s) {
                    setStaff(s.data)
                    setForm({ fullName: s.data.fullName, email: s.data.email, phone: s.data.phone ?? '', roleId: s.data.role?.id ?? '' })
                }
            })
            .catch(err => {
                toast.error(getAxiosErrorMessage(err, 'Could not load'))
                navigate('/dashboard/staff', { replace: true })
            })
            .finally(() => setLoading(false))
    }, [staffId, navigate])

    const set = (k: keyof Form, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
    const roleLocked = Boolean(staff && (staff.isOwner || staff.id === userId))
    const selectedRole = roles.find(r => r.id === form.roleId)
    const backTo = staff ? `/dashboard/staff/${staff.id}` : '/dashboard/staff'

    const save = async () => {
        const r = schema.safeParse(form)
        if (!r.success) {
            const errs: Errors = {}
            r.error.issues.forEach(i => { const k = i.path[0] as keyof Form; if (!errs[k]) errs[k] = i.message })
            setErrors(errs)
            return
        }
        setSaving(true)
        try {
            if (staff) {
                const res = await teamApi.updateStaff(staff.id, {
                    fullName: r.data.fullName,
                    phone: r.data.phone,
                    ...(!roleLocked && r.data.roleId !== staff.role?.id && { roleId: r.data.roleId }),
                })
                toast.success(res.message ?? 'Saved')
                navigate(`/dashboard/staff/${staff.id}`)
            } else {
                const res = await teamApi.createStaff({ fullName: r.data.fullName, email: r.data.email, phone: r.data.phone || undefined, roleId: r.data.roleId })
                if (res.data.inviteSent) toast.success(res.message ?? 'Invite sent')
                else toast.warning(res.message ?? 'Staff added, but the invite email could not be sent')
                navigate(`/dashboard/staff/${res.data.id}`)
            }
        } catch (err) {
            const message = getAxiosErrorMessage(err, 'Could not save')
            if (/email/i.test(message)) setErrors({ email: message })
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const actions = (
        <>
            <Button variant='outline' className='h-10 cursor-pointer' onClick={() => navigate(backTo)} disabled={saving}>Cancel</Button>
            <Button className='h-10 min-w-32 cursor-pointer' onClick={save} disabled={saving || loading}>
                {saving && <Spinner />} {isEdit ? 'Save changes' : 'Send invite'}
            </Button>
        </>
    )

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={isEdit ? `Edit ${staff?.fullName ?? 'staff member'}` : 'Add staff member'}
                description={isEdit ? 'Update contact details and role. Role changes apply immediately.' : 'They’ll get an email invite to set their password and sign in.'}
                actions={actions}
            />

            {loading ? (
                <div className='grid gap-6 lg:grid-cols-5'>
                    <Skeleton className='h-72 lg:col-span-2' /><Skeleton className='h-96 lg:col-span-3' />
                </div>
            ) : (
                <div className='grid gap-6 lg:grid-cols-5'>
                    <Card className='h-fit lg:col-span-2'>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'><UserIcon className='size-4 text-primary' /> Details</CardTitle>
                            <CardDescription>Used to sign in and to contact them.</CardDescription>
                        </CardHeader>
                        <CardContent className='grid gap-5'>
                            <div className='grid gap-1.5'>
                                <Label htmlFor='fullName' className='text-xs font-semibold text-muted-foreground'>Full name</Label>
                                <Input id='fullName' className='h-10' placeholder='Amit Prajapati' value={form.fullName} aria-invalid={!!errors.fullName}
                                    onChange={e => set('fullName', e.target.value)} disabled={saving} autoFocus={!isEdit} />
                                {errors.fullName && <p className='text-xs text-destructive'>{errors.fullName}</p>}
                            </div>
                            <div className='grid gap-1.5'>
                                <Label htmlFor='email' className='text-xs font-semibold text-muted-foreground'>Email</Label>
                                <Input id='email' type='email' className='h-10' placeholder='name@yourbusiness.com' value={form.email} aria-invalid={!!errors.email}
                                    onChange={e => set('email', e.target.value)} disabled={saving || isEdit} />
                                {errors.email ? <p className='text-xs text-destructive'>{errors.email}</p>
                                    : isEdit && <p className='text-xs text-muted-foreground'>Sign-in email can’t be changed.</p>}
                            </div>
                            <div className='grid gap-1.5'>
                                <Label htmlFor='phone' className='text-xs font-semibold text-muted-foreground'>Phone <span className='font-normal'>(optional)</span></Label>
                                <Input id='phone' type='tel' className='h-10' placeholder='+91 98765 43210' value={form.phone} aria-invalid={!!errors.phone}
                                    onChange={e => set('phone', e.target.value)} disabled={saving} />
                                {errors.phone && <p className='text-xs text-destructive'>{errors.phone}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className='lg:col-span-3'>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'><ShieldCheckIcon className='size-4 text-primary' /> Role</CardTitle>
                            <CardDescription>{roleLocked
                                ? staff?.isOwner ? 'The owner’s role can’t be changed.' : 'You can’t change your own role.'
                                : 'Decides which parts of the dashboard they can use.'}</CardDescription>
                        </CardHeader>
                        <CardContent className='grid gap-5'>
                            <div role='radiogroup' aria-label='Role' className='grid gap-2 sm:grid-cols-2'>
                                {roles.map(r => {
                                    const selected = form.roleId === r.id
                                    return (
                                        <button key={r.id} type='button' role='radio' aria-checked={selected} disabled={saving || roleLocked}
                                            onClick={() => set('roleId', r.id)}
                                            className={cn('flex items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed',
                                                selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
                                                roleLocked && !selected && 'opacity-50', !roleLocked && 'cursor-pointer')}>
                                            <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary' : 'border-input')}>
                                                {selected && <span className='size-2 rounded-full bg-primary' />}
                                            </span>
                                            <span className='min-w-0 flex-1'>
                                                <span className='flex items-center justify-between gap-2'>
                                                    <span className='text-sm font-semibold'>{r.name}</span>
                                                    <span className='shrink-0 text-[11px] text-muted-foreground'>{grantedCount(r)}/{r.permissions.length}</span>
                                                </span>
                                                <span className='mt-0.5 block text-xs text-muted-foreground'>{roleSummary(r)}</span>
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                            {errors.roleId && <p className='-mt-2 text-xs text-destructive'>{errors.roleId}</p>}

                            {selectedRole && (
                                <div>
                                    <div className='mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                                        What {selectedRole.name} can do
                                    </div>
                                    {selectedRole.description && <p className='mb-3 text-sm text-muted-foreground'>{selectedRole.description}</p>}
                                    <RolePermissionsTable role={selectedRole} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
            {!loading && <div className='mt-6 flex justify-end gap-2'>{actions}</div>}
        </div>
    )
}
