import { isAxiosError } from "axios";


export function getAxiosErrorMessage(error : unknown,fallback:string) : string{
    if(isAxiosError<{ message? : string | string[] }>(error)){
        const message = error?.response?.data?.message

        if(Array.isArray(message)) return message[0] ?? fallback;

        if(typeof message === 'string') return message ?? fallback;
    }
}