import ProtectedRoute from "@/components/ProtectedRoute";
import PermissionRoute from "@/components/PermissionRoute";
import AuthLayouts from "@/layouts/AuthLayouts";
import DashboardLayouts from "@/layouts/DashboardLayouts";
import ProfileDetailsPage from "@/pages/account/ProfileDetailsPage";
import { ForgotPassowordPage } from "@/pages/auth/ForgotPassoword";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPassword from "@/pages/auth/ResetPassword";
import Verify2AaOTP from "@/pages/auth/Verify2FaOtp";
import VerifyForgotOtpPage from "@/pages/auth/VerifyForgotOtp";
import CommisionPayoutPages from "@/pages/dashboard/commision-payouts/CommisionPayoutPages";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import SellersPage from "@/pages/sellers/SellersPage";
import OnboardSellerPage from "@/pages/sellers/OnboardSellerPage";
import SellerDetailPage from "@/pages/sellers/SellerDetailPage";
import SellerEditPage from "@/pages/sellers/SellerEditPage";
import CategoriesPage from "@/pages/catalog/CategoriesPage";
import CategoryDetailPage from "@/pages/catalog/CategoryDetailPage";
import CategoryFormPage from "@/pages/catalog/CategoryFormPage";
import CreateUserPage from "@/pages/user-permissions/CreateUser";
import RolesPage from "@/pages/user-permissions/RolesPage";
import RoleFormPage from "@/pages/user-permissions/RoleFormPage";
import UpdateUserPage from "@/pages/user-permissions/UpdateUserPage";
import UsersPage from "@/pages/user-permissions/UsersPage";
import { Navigate, Route, Routes } from "react-router";

export default function Routers() {
    return (
        <Routes>

            {/****Auth Section */}
            <Route path="auth" element={<AuthLayouts />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="forgot-password" element={<ForgotPassowordPage />} />
                <Route path="forgot-password/otp" element={<VerifyForgotOtpPage />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="2fa" element={<Verify2AaOTP />} />
            </Route>

            {/***Dashboard*/}
            <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<DashboardLayouts />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="sellers" element={<PermissionRoute module="SELLERS" level="VIEW" />}>
                        <Route index element={<SellersPage />} />
                        <Route path=":sellerId" element={<SellerDetailPage />} />
                        <Route element={<PermissionRoute module="SELLERS" level="EDIT" />}>
                            <Route path="onboard" element={<OnboardSellerPage />} />
                            <Route path=":sellerId/edit" element={<SellerEditPage />} />
                        </Route>
                    </Route>
                    <Route path="commision-payouts" element={<CommisionPayoutPages />} />
                    <Route path="my-account" element={<ProfileDetailsPage />} />

                    {/***Global catalog */}
                    <Route path="global-catalog" element={<PermissionRoute module="GLOBAL_CATALOG" level="VIEW" />}>
                        <Route index element={<Navigate to="categories" replace />} />
                        <Route path="categories" element={<CategoriesPage />} />
                        <Route path="categories/:categoryId" element={<CategoryDetailPage />} />
                        <Route element={<PermissionRoute module="GLOBAL_CATALOG" level="EDIT" />}>
                            <Route path="categories/new" element={<CategoryFormPage />} />
                            <Route path="categories/:categoryId/edit" element={<CategoryFormPage />} />
                        </Route>
                    </Route>

                    {/***Users & Permissions */}
                    <Route path="users-permissions" element={<PermissionRoute module="USERS_PERMISSIONS" level="VIEW" />}>
                        <Route index element={<Navigate to="user" replace />} />
                        <Route path="user" element={<UsersPage />} />
                        <Route path="role" element={<RolesPage />} />
                        <Route path="role/:roleId" element={<RoleFormPage />} />
                        <Route element={<PermissionRoute module="USERS_PERMISSIONS" level="MANAGE" />}>
                            <Route path="role/create" element={<RoleFormPage />} />
                            <Route path="role/:roleId/edit" element={<RoleFormPage />} />
                        </Route>
                        <Route element={<PermissionRoute module="USERS_PERMISSIONS" level="EDIT" />}>
                            <Route path="user/create" element={<CreateUserPage />} />
                            <Route path="user/edit" element={<UpdateUserPage />} />
                        </Route>
                    </Route>
                </Route>
            </Route>


        </Routes>
    )
}