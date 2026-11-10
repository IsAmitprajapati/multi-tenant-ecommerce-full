import { useCallback } from 'react'
import { useAppSelector } from './use-store'
import { hasLevel, type PermissionLevel, type PermissionModule } from '@/lib/permissions'

/**
 * Permission checks for the signed-in admin, based on /auth/me.
 * The backend enforces the same rules — this is only for hiding UI.
 */
export function usePermission() {
    const user = useAppSelector(state => state.auth.user)
    const permissions = user?.permissions

    const can = useCallback(
        (module: PermissionModule, level: PermissionLevel = 'VIEW') => hasLevel(permissions?.[module], level),
        [permissions]
    )

    return {
        can,
        isLoaded: Boolean(user),
        role: user?.role ?? null,
        userId: user?.id,
    }
}
