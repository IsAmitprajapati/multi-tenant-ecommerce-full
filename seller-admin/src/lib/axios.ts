import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { storage } from './storage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"

export const Axios = axios.create({
    baseURL: baseURL
})


Axios.interceptors.request.use((config) => {
    const accessToken = storage.getAccessToken()
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
})

interface RetriableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean
}

async function fetchRefreshToken(): Promise<string> {
    const refreshToken = storage.getRefreshToken()
    if (!refreshToken) {
        throw new Error('No refresh token available')
    }

    const response = await axios.post<{
        accessToken: string,
        refreshToken: string
    }>(`${baseURL}/auth/refresh`, {
        refreshToken
    })

    const { accessToken, refreshToken : newRefreshToken } = response.data

    storage.setToken(accessToken, newRefreshToken)
    return accessToken
}


/*** 
 * 401 - Unauthorized access
 */
Axios.interceptors.response.use(
    (response) => {
        return response
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableConfig | undefined

        // const hadAuthHeader = Boolean(originalRequest?.headers?.Authorization);

        if (!originalRequest || error.response.status !== 401 || originalRequest?._retry) {
            return Promise.reject(error)
        }

        originalRequest._retry = true

        /****Call the Refresh token api */
        try {
            const newAccesstokenToken = await fetchRefreshToken()

            originalRequest.headers.Authorization = `Bearer ${newAccesstokenToken}`

            return Axios(originalRequest)
        } catch (refreshError) {
            storage.clear()
            window.location.href = '/auth/login'
            return Promise.reject(refreshError)
        }

    }
)




export default Axios;