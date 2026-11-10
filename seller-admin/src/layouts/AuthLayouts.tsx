import { Outlet, useNavigate } from "react-router";
import { BrandLogo } from "@/components/brand/SiteHeader";
import { useAppSelector } from "@/hooks/use-store";
import { useEffect } from "react";

export default function AuthLayouts() {
    const auth = useAppSelector(state => state.auth)
    const navigate = useNavigate()

    useEffect(() => {
        if (auth?.accessToken) navigate('/dashboard')
    }, [auth, navigate])

    return (
        <div className="flex min-h-svh">
            {/***Left */}
            <div className="hidden flex-col justify-between bg-gradient-to-br from-[#06251A] to-[#10543A] p-12 lg:flex lg:w-[440px] xl:w-[500px]">
                <BrandLogo inverted />

                <div>
                    <h1 className="max-w-[380px] text-2xl leading-snug font-bold text-white">
                        Run your business from one dashboard.
                    </h1>
                    <p className="mt-3.5 max-w-[360px] text-sm leading-5 text-[#c7dccb]">
                        Products, orders, delivery, discounts and payouts — everything you need to sell on the marketplace.
                    </p>
                </div>

                <p className="text-xs text-[#8fb093]">&copy; 2026 Dynamic Coding with Amit</p>
            </div>

            {/***Right */}
            <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-background p-8">
                <BrandLogo className="lg:hidden" />
                <Outlet />
            </div>
        </div>
    )
}
