import Axios from "@/lib/axios";

export interface getAdminuserPayload {
    page?: number
    limit?: number
    search?: string
    userId? : string
}


export const userApi = {
    getAdminUsers: (params : getAdminuserPayload) => Axios.get('/users/admin',{ params : params}).then(res => res?.data)
}