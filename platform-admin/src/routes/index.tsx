import ProtectedRoute from "@/components/ProtectedRoute";
import AuthLayouts from "@/layouts/AuthLayouts";
import DashboardLayouts from "@/layouts/DashboardLayouts";
import ProfileDetailsPage from "@/pages/account/ProfileDetailsPage";
import { ForgotPassowordPage } from "@/pages/auth/ForgotPassoword";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPassword from "@/pages/auth/ResetPassword";
import VerifyForgotOtpPage from "@/pages/auth/VerifyForgotOtp";
import CommisionPayoutPages from "@/pages/dashboard/commision-payouts/CommisionPayoutPages";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import SellersPage from "@/pages/dashboard/sellers/SellersPage";
import { Route, Routes } from "react-router";

export default function Routers() {
    return (
        <Routes>

            {/****Auth Section */}
            <Route path="auth" element={<AuthLayouts />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="forgot-password" element={<ForgotPassowordPage />} />
                <Route path="forgot-password/otp" element={<VerifyForgotOtpPage />} />
                <Route path="reset-password" element={<ResetPassword />} />
            </Route>

            {/***Dashboard*/}
            <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<DashboardLayouts />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="sellers" element={<SellersPage />} />
                    <Route path="commision-payouts" element={<CommisionPayoutPages />} />
                    <Route path="my-account" element={<ProfileDetailsPage />} />
            
                </Route>
            </Route>


        </Routes>
    )
}