import { Outlet, useNavigate } from "react-router";
import PlatfromLogo from '@/assets/platform-logo.png'
import { useAppSelector } from "@/hooks/use-store";
import { useEffect } from "react";

export default function AuthLayouts(){
    const user = useAppSelector(state => state.auth)
    const navigate = useNavigate()

    useEffect(()=>{
        if(user?.accessToken){
            navigate('/dashboard')
        }
    },[user])

    return(
        <div className="flex min-h-svh">
            {/***Left */}
            <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#06251A] to-[#10543A] p-12 lg:w-[440px] xl:w-[500px]">
                <div className="flex items-center gap-3">
                    <img src={PlatfromLogo} alt="Platform Admin Logo" className="size-12 roundd-xl shadow-lg shadow-black/20"/>
                    <span className="text-base font-bold text-white">Platform Admin</span>
                </div>

                <div>
                    <h1 className="max-w-[380px] text-2xl leading-snug font-bold text-white">
                        Run every store on your marketplace from one place.
                    </h1>
                    <p className="mt-3.5 max-w-[360px] text-sm leading-5 text-[#c7dccb]">
                        Tenants, catalog, commissions, delivery network and reporting — unified across every store on the platform.
                    </p>
                </div>

                <p className="text-xs text-[#8fb093]">&copy; 2026 Dynamic Coding with Amit</p>
            </div>


               {/***Right */}
            <div className="flex flex-1 items-center justify-center bg-background p-8">
                <Outlet/>
            </div>
        </div>
    )
}