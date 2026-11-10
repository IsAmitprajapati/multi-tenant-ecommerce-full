import { userApi, type AdminUserPayload, type AdminUserStatus, type getAdminuserPayload } from "@/api/user";
import { getAxiosErrorMessage } from "@/lib/api.error";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface IAdminUserRole {
    id: string
    name: string
    status: 'ACTIVE' | 'INACTIVE'
    isSystem: boolean
    userType: string
}

export interface IAdminUsers {
    id: string;
    fullName: string;
    email: string;
    password?: string;
    confirmPassword?: string;
    status: AdminUserStatus | string;
    phone: string;
    roleId?: string;
    userType?: string;
    role?: IAdminUserRole | null;
    profileImage?: string | null;
    twoFactorEnabled?: boolean;
    lastActiveAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    action?: any;
}

interface IInitialState {
    adminUsers: IAdminUsers[]
    isLoading: boolean
    isSaving: boolean
}

const initialState: IInitialState = {
    adminUsers: [],
    isLoading: false,
    isSaving: false,
}


export const fetchAllAdminUsers = createAsyncThunk('users/all-admin-users',
    async (payload: getAdminuserPayload, { rejectWithValue }) => {
        try {
            const data = await userApi.getAdminUsers(payload)
            return data
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to fetch"))
        }
    }
)

export const createAdminUser = createAsyncThunk('users/create-admin-user',
    async (payload: AdminUserPayload, { rejectWithValue }) => {
        try {
            return await userApi.createAdminUser(payload)
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to create user"))
        }
    }
)

export const updateAdminUser = createAsyncThunk('users/update-admin-user',
    async ({ id, payload }: { id: string; payload: Partial<AdminUserPayload> }, { rejectWithValue }) => {
        try {
            return await userApi.updateAdminUser(id, payload)
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to update user"))
        }
    }
)

export const assignUserRole = createAsyncThunk('users/assign-role',
    async ({ id, roleId }: { id: string; roleId: string }, { rejectWithValue }) => {
        try {
            return await userApi.assignRole(id, roleId)
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to assign role"))
        }
    }
)

export const updateAdminUserStatus = createAsyncThunk('users/update-status',
    async ({ id, status }: { id: string; status: AdminUserStatus }, { rejectWithValue }) => {
        try {
            return await userApi.updateStatus(id, status)
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to update status"))
        }
    }
)

const upsertUser = (state: IInitialState, user?: IAdminUsers) => {
    if (!user) return
    const idx = state.adminUsers.findIndex(u => u.id === user.id)
    if (idx === -1) state.adminUsers.push(user)
    else state.adminUsers[idx] = user
}

const MUTATIONS = ['users/create-admin-user', 'users/update-admin-user', 'users/assign-role', 'users/update-status']

export const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchAllAdminUsers.pending, (state) => {
                state.isLoading = true
            })
            .addCase(fetchAllAdminUsers.fulfilled, (state, action) => {
                state.adminUsers = action?.payload?.data ?? []
                state.isLoading = false
            })
            .addCase(fetchAllAdminUsers.rejected, (state) => {
                state.adminUsers = []
                state.isLoading = false
            })

            .addCase(createAdminUser.fulfilled, (state, action) => upsertUser(state, action.payload?.data))
            .addCase(updateAdminUser.fulfilled, (state, action) => upsertUser(state, action.payload?.data))
            .addCase(assignUserRole.fulfilled, (state, action) => upsertUser(state, action.payload?.data))
            .addCase(updateAdminUserStatus.fulfilled, (state, action) => upsertUser(state, action.payload?.data))

            .addMatcher(
                (a) => MUTATIONS.some(m => a.type === `${m}/pending`),
                (state) => { state.isSaving = true }
            )
            .addMatcher(
                (a) => MUTATIONS.some(m => a.type === `${m}/fulfilled` || a.type === `${m}/rejected`),
                (state) => { state.isSaving = false }
            )
    },
})


export default usersSlice.reducer
