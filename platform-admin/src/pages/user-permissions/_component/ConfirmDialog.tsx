import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: React.ReactNode
    confirmLabel: string
    destructive?: boolean
    loading?: boolean
    onConfirm: () => void
}

const ConfirmDialog = ({ open, onOpenChange, title, description, confirmLabel, destructive, loading, onConfirm }: ConfirmDialogProps) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className='cursor-pointer' disabled={loading}>Cancel</AlertDialogCancel>
                {/* Plain button so the dialog stays open until the request finishes */}
                <Button
                    variant={destructive ? 'destructive' : 'default'}
                    onClick={onConfirm}
                    disabled={loading}
                    className='cursor-pointer'
                >
                    {loading && <Spinner />}
                    {confirmLabel}
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
)

export default ConfirmDialog
