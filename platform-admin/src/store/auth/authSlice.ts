import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface User {
    email : string
    fullName : string
}

export type AsyncStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

interface AuthState {
    user : User,
    accessToken : string | null,
    refreshToken : string | null,
    status : AsyncStatus,
    error : string | null 
}


const initialState:AuthState = {
    user : null,
    accessToken : "",
    refreshToken : "",
    status : 'idle',
    error : null 
}



export const authSlice = createSlice({
    name : 'auth',
    initialState,
    reducers : {
        clearAuthError(state){
            state.error = null;
        }
    },
    extraReducers(builder) {
        
    },
})


export default authSlice.reducer

