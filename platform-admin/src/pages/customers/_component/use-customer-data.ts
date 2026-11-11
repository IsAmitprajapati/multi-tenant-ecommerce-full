import { useEffect, useState } from 'react'
import { getAxiosErrorMessage } from '@/lib/api.error'
import type { Paged } from '@/api/customer'

/** Loads one page of a customer's history tab; keeps the previous page visible while the next loads */
export function usePagedHistory<T>(customerId: string, load: (id: string, page: number) => Promise<Paged<T>>, page: number) {
    const key = `${customerId}:${page}`
    const [result, setResult] = useState<{ key: string; data: Paged<T> | null; error: string | null } | null>(null)

    useEffect(() => {
        let cancelled = false
        load(customerId, page)
            .then(data => { if (!cancelled) setResult({ key, data, error: null }) })
            .catch(err => { if (!cancelled) setResult(r => ({ key, data: r?.data ?? null, error: getAxiosErrorMessage(err, 'Could not load this tab') })) })
        return () => { cancelled = true }
        // `load` is a stable module function
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    return {
        data: result?.data ?? null,
        error: result?.key === key ? result.error : null,
        loading: result?.key !== key,
    }
}

/** Loads something once per customer (cart) */
export function useCustomerResource<T>(customerId: string, load: (id: string) => Promise<{ data: T }>) {
    const [result, setResult] = useState<{ id: string; data: T | null; error: string | null } | null>(null)

    useEffect(() => {
        let cancelled = false
        load(customerId)
            .then(res => { if (!cancelled) setResult({ id: customerId, data: res.data, error: null }) })
            .catch(err => { if (!cancelled) setResult({ id: customerId, data: null, error: getAxiosErrorMessage(err, 'Could not load this tab') }) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerId])

    const mine = result?.id === customerId ? result : null
    return { data: mine?.data ?? null, error: mine?.error ?? null, loading: !mine }
}
