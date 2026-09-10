import Axios from "@/lib/axios";
import type { IUser, USER_TYPE } from "@/store/auth/authSlice";

export interface loginPayload {
    email : string;
    password : string
}
export interface loginResponse {
    accessToken : string;
    refreshToken : string;
    userType : USER_TYPE
}

interface SuccessResponse {
    success : true;
}


export const authApi = {
    login : (payload : loginPayload) => Axios.post<loginResponse>('/auth/login',payload).then((res) => res?.data),
    me : () => Axios.get<IUser>('/auth/me').then((res) => res?.data),
    logout : () => Axios.post<SuccessResponse>("/auth/logout").then(res => res?.data),
    updateCurrentUser : (payload : Partial<IUser>) => Axios.put<IUser>('/users/me',payload).then((res) => res?.data),
}