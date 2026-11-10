import { Navigate, Outlet } from 'react-router'
import { useAppSelector } from '@/hooks/use-store'
import { BrandLoader } from './brand/SiteHeader'

/**
 * Dashboard access for seller users:
 *  - no application yet / KYC rejected → application wizard
 *  - application under review         → application status
 *  - approved (ACTIVE)                 → dashboard
 */
export default function SellerGate() {
    const user = useAppSelector(s => s.auth.user)

    if (!user) {
        return <BrandLoader />
    }

    const seller = user.seller
    if (!seller) return <Navigate to='/apply/details' replace />
    if (seller.status === 'ACTIVE') return <Outlet />
    if (seller.kycStatus === 'REJECTED' && seller.isOwner) return <Navigate to='/apply/details' replace />
    return <Navigate to='/application' replace />
}
