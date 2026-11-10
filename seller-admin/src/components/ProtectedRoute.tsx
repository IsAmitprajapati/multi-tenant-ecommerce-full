import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { fetchMe } from '@/store/auth/authSlice'
import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import { BrandLoader } from './brand/SiteHeader'

const ProtectedRoute = () => {
    const user = useAppSelector(state => state?.auth)
    const dispatch = useAppDispatch()


    useEffect(()=>{
        dispatch(fetchMe())
    },[])

    // Full-screen loader only until the first profile load; later refreshes happen in place
    if (user.status === 'loading' && !user.user) {
        return <BrandLoader />
    }

    const isAuthenticated = Boolean(user.accessToken)
    return isAuthenticated ? <Outlet /> : <Navigate to='/auth/login' replace />
}

export default ProtectedRoute