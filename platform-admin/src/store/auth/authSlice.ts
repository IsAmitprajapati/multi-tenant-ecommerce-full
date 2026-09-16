import { authApi, type loginPayload, type loginResponse } from '@/api/auth'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { storage } from '@/lib/storage'
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface IRole {
    id : string
    name : string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUser {
    id: string
    email: string
    fullName: string
    phone: string
    status?: string;
    profile_image: string;
    avatarName: string;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: boolean;
    password? : string;
    role? : IRole;
    userType?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type AsyncStatus = 'idle' | 'pending' | 'succeeded' | 'failed' | 'loading'
export type USER_TYPE = "CUSTOMER" | "SELLER" | "PLATFORM_ADMIN" | "DELIVERY_AGENT"

interface AuthState {
    user: IUser,
    accessToken: string | null,
    refreshToken: string | null,
    userType: USER_TYPE,
    status: AsyncStatus,
    error: string | null,
    isLoading?: boolean
}

const initialState: AuthState = {
    user: null,
    accessToken: storage.getAccessToken(),
    refreshToken: storage.getRefreshToken(),
    userType: 'PLATFORM_ADMIN',
    status: 'idle',
    error: null,
    isLoading: false
}

export const fetchLogin = createAsyncThunk('auth/login',
    async (payload: loginPayload, { rejectWithValue }) => {
        try {
            const tokens = await authApi.login(payload);
            storage.setToken(tokens.accessToken, tokens.refreshToken)

            return tokens
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Could not sign in"))
        }
    }
)

export const fetchMe = createAsyncThunk('auth/me',
    async (payload, { rejectWithValue }) => {
        try {
            const data = await authApi.me();
            return data
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to fetch"))
        }
    }
)


export const logoutUser = createAsyncThunk('auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            const data = await authApi.logout();
            return data
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to fetch"))
        }
    }
)


export const updateCurrentUser = createAsyncThunk('auth/updateCurrentUser',
    async (payload: Partial<IUser>, { rejectWithValue }) => {
        try {
            const data = await authApi.updateCurrentUser(payload);
            return data
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to update"))
        }
    }
)

export const changePassword = createAsyncThunk('auth/changePassword',
    async (payload: Partial<IUser>, { rejectWithValue }) => {
        try {
            const data = await authApi.changePassword(payload);
            return data
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to update"))
        }
    }
)


export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearAuthError(state) {
            state.error = null;
        }
    },
    extraReducers(builder) {
        builder.addCase(fetchLogin.pending, (state) => {
            state.status = 'loading'
            state.error = null;
        })
            .addCase(fetchLogin.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.accessToken = action?.payload?.accessToken;
                state.refreshToken = action?.payload.refreshToken;
                state.userType = action?.payload?.userType
            })
            .addCase(fetchLogin.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.payload as string;
                state.accessToken = null;
                state.refreshToken = null;
                state.userType = 'PLATFORM_ADMIN'
            })

            /*****Current User Details */
            .addCase(fetchMe.pending, (state) => {
                state.status = 'loading'
                state.user = null
            })
            .addCase(fetchMe.fulfilled, (state, action) => {
                state.status = 'succeeded'

                state.user = {
                    ...action.payload,
                    avatarName: `${action.payload?.fullName?.split(' ')?.[0]?.[0] ?? ""}${action.payload?.fullName?.split(' ')?.[1]?.[0] ?? ""}`
                }


            })
            .addCase(fetchMe.rejected, (state) => {
                state.status = 'failed'
                state.user = null
            })


            /***Logout */
            .addCase(logoutUser.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(logoutUser.fulfilled, (state, actionPayload) => {
                state.status = 'idle'
                state.user = null;
                state.accessToken = null;
                state.refreshToken = null;
                state.error = null;

                storage.clear()
            })
            .addCase(logoutUser.rejected, (state, actionPayload) => {
                state.status = 'failed'
                state.error = null;
            })


            /*****updateCurrentUser */
            .addCase(updateCurrentUser.pending, (state) => {
                // state.status = 'loading'
                // state.user = null
                state.isLoading = true
            })
            .addCase(updateCurrentUser.fulfilled, (state, action) => {
                // state.status = 'succeeded's
                state.isLoading = false
                const user = (action?.payload as any)?.data
                state.user = {
                    ...state.user,
                    fullName: user?.fullName,
                    email: user?.email,
                    phone: user?.phone,
                    avatarName: `${user?.fullName?.split(' ')?.[0]?.[0] ?? ""}${user?.fullName?.split(' ')?.[1]?.[0] ?? ""}`
                }

            })
            .addCase(updateCurrentUser.rejected, (state) => {
                // state.status = 'failed'
                state.isLoading = false
            })

    },
})


export default authSlice.reducer

