import { userApi, type getAdminuserPayload } from "@/api/user";
import { getAxiosErrorMessage } from "@/lib/api.error";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface IAdminUsers {
    id: string;
    fullName: string;
    email: string;
    password? : string;
    confirmPassword? : string;
    status: string;
    phone : string;
    updateAt?: Date;
    action?: any;
}

interface IInitialState {
    adminUsers: IAdminUsers[]
    isLoading: boolean
}

const initialState: IInitialState = {
    adminUsers: [],
    isLoading: false
}


export const fetchAllAdminUsers = createAsyncThunk('users/all-admin-users',
    async (payload : getAdminuserPayload, { rejectWithValue }) => {
        try {
            const data = await userApi.getAdminUsers(payload)
            return data
        } catch (error) {
            return rejectWithValue(getAxiosErrorMessage(error, "Failed to fetch"))
        }
    }
)


export const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {

    },
    extraReducers(builder) {
        builder
            .addCase(fetchAllAdminUsers.pending, (state) => {
                state.adminUsers = []
                state.isLoading = true
            })
            .addCase(fetchAllAdminUsers.fulfilled, (state, action) => {
                console.log('action-users', action.payload)
                state.adminUsers = action?.payload?.data
                state.isLoading = false
            })
            .addCase(fetchAllAdminUsers.rejected, (state, action) => {
                state.adminUsers = []
                state.isLoading = false
            })
    },
})


export default usersSlice.reducer