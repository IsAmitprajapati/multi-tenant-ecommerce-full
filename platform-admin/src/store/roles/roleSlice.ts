import { roleApi, type IRoleItem, type ListRolesParams, type RolePayload, type RoleStatus } from "@/api/role";
import { getAxiosErrorMessage } from "@/lib/api.error";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface RolesState {
    roles: IRoleItem[]
    isLoading: boolean
    isSaving: boolean
    error: string | null
}

const initialState: RolesState = {
    roles: [],
    isLoading: false,
    isSaving: false,
    error: null,
}

export const fetchRoles = createAsyncThunk('roles/list',
    async (params: ListRolesParams | undefined, { rejectWithValue }) => {
        try {
            return await roleApi.list(params ?? {})
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to fetch roles"))
        }
    }
)

export const createRole = createAsyncThunk('roles/create',
    async (payload: RolePayload, { rejectWithValue }) => {
        try {
            return await roleApi.create(payload)
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to create role"))
        }
    }
)

export const updateRole = createAsyncThunk('roles/update',
    async ({ id, payload }: { id: string; payload: Partial<RolePayload> }, { rejectWithValue }) => {
        try {
            return await roleApi.update(id, payload)
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to update role"))
        }
    }
)

export const updateRoleStatus = createAsyncThunk('roles/status',
    async ({ id, status }: { id: string; status: RoleStatus }, { rejectWithValue }) => {
        try {
            return await roleApi.updateStatus(id, status)
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to update role status"))
        }
    }
)

export const deleteRole = createAsyncThunk('roles/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            const res = await roleApi.remove(id)
            return { ...res, id }
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to delete role"))
        }
    }
)

const upsert = (state: RolesState, role?: IRoleItem) => {
    if (!role) return
    const idx = state.roles.findIndex(r => r.id === role.id)
    if (idx === -1) state.roles.push(role)
    else state.roles[idx] = role
}

export const rolesSlice = createSlice({
    name: 'roles',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchRoles.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchRoles.fulfilled, (state, action) => {
                state.isLoading = false
                state.roles = action.payload?.data ?? []
            })
            .addCase(fetchRoles.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })

            .addCase(createRole.fulfilled, (state, action) => upsert(state, action.payload?.data))
            .addCase(updateRole.fulfilled, (state, action) => upsert(state, action.payload?.data))
            .addCase(updateRoleStatus.fulfilled, (state, action) => upsert(state, action.payload?.data))
            .addCase(deleteRole.fulfilled, (state, action) => {
                state.roles = state.roles.filter(r => r.id !== action.payload.id)
            })

            // Shared "saving" flag for every mutation
            .addMatcher(
                (a) => a.type.startsWith('roles/') && !a.type.startsWith('roles/list') && a.type.endsWith('/pending'),
                (state) => { state.isSaving = true }
            )
            .addMatcher(
                (a) => a.type.startsWith('roles/') && !a.type.startsWith('roles/list') && (a.type.endsWith('/fulfilled') || a.type.endsWith('/rejected')),
                (state) => { state.isSaving = false }
            )
    },
})

export default rolesSlice.reducer
