import AuthLayouts from "@/layouts/AuthLayouts";
import { ForgotPassowordPage } from "@/pages/auth/ForgotPassoword";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPassword from "@/pages/auth/ResetPassword";
import VerifyForgotOtpPage from "@/pages/auth/VerifyForgotOtp";
import { Route, Routes } from "react-router";

export default function Routers(){
    return(
        <Routes>
            
            {/****Auth Section */}
            <Route path="auth" element={<AuthLayouts/>}>
                <Route path="login" element={<LoginPage/>}/>
                <Route path="forgot-password" element={<ForgotPassowordPage/>}/>
                <Route path="forgot-password/otp" element={<VerifyForgotOtpPage/>}/>
                <Route path="reset-password" element={<ResetPassword/>}/>
            </Route>

            {/***Dashboard*/}


        </Routes>
    )
}