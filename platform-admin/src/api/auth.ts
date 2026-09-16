import Axios from "@/lib/axios";
import type { IUser, USER_TYPE } from "@/store/auth/authSlice";

export interface loginPayload {
    email : string;
    password : string
}
export interface loginResponse {
    accessToken : string;
    refreshToken : string;
    userType : USER_TYPE;

    twoFactorToken? : null,
    requiredsTwoFactor? : boolean,
}

export interface IVerifyEnablDisableTwoFactor{
    otp : string
}

export interface IVerify2FALoginOtp {
    otp : string
    twoFactorToken : string
}

interface SuccessResponse {
    success : true;
    message? : string;
}


export const authApi = {
    login : (payload : loginPayload) => Axios.post<loginResponse>('/auth/login',payload).then((res) => res?.data),
    me : () => Axios.get<IUser>('/auth/me').then((res) => res?.data),
    logout : () => Axios.post<SuccessResponse>("/auth/logout").then(res => res?.data),
    updateCurrentUser : (payload : Partial<IUser>) => Axios.put<IUser>('/users/me',payload).then((res) => res?.data),
    changePassword : (payload : Partial<IUser>)=> Axios.put<SuccessResponse>('/users/change-password',payload).then((res) => res?.data),
    twoFactorGenerateOtp : () => Axios.get('/auth/2fa-generate-otp').then((res)=>res.data),
    verifyEnablDisableTwoFactor : (payload : IVerifyEnablDisableTwoFactor) => Axios.post('/auth/2fa-verify-enable',payload).then((res)=>res.data),
    
    Verify2FALoginOtp : (payload : IVerify2FALoginOtp) => Axios.post<loginResponse>('/auth/2fa-verify-login-otp',payload).then((res) => res?.data),

}