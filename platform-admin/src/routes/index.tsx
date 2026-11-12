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
import DashboardPage from "@/pages/dashboard/DashboardPage";
import SellersPage from "@/pages/sellers/SellersPage";
import OnboardSellerPage from "@/pages/sellers/OnboardSellerPage";
import SellerDetailPage from "@/pages/sellers/SellerDetailPage";
import SellerEditPage from "@/pages/sellers/SellerEditPage";
import CategoriesPage from "@/pages/catalog/CategoriesPage";
import CategoryDetailPage from "@/pages/catalog/CategoryDetailPage";
import CategoryFormPage from "@/pages/catalog/CategoryFormPage";
import AttributesPage from "@/pages/catalog/AttributesPage";
import BrandsPage from "@/pages/catalog/BrandsPage";
import TaxClassesPage from "@/pages/catalog/TaxClassesPage";
import PlatformProductsPage from "@/pages/catalog/PlatformProductsPage";
import HomePageBuilder from '@/pages/storefront/HomePageBuilder'
import CustomersPage from '@/pages/customers/CustomersPage'
import CreateUserPage from "@/pages/user-permissions/CreateUser";
import RolesPage from "@/pages/user-permissions/RolesPage";
import RoleFormPage from "@/pages/user-permissions/RoleFormPage";
import UpdateUserPage from "@/pages/user-permissions/UpdateUserPage";
import UsersPage from "@/pages/user-permissions/UsersPage";
import ComingSoonPage, { NotFoundPage } from "@/pages/ComingSoonPage";
import type { PermissionModule } from "@/lib/permissions";
import { Navigate, Route, Routes } from "react-router";

/** Platform modules not built yet — each gated by its permission so every sidebar link opens a page */
const MODULE_PAGES: { path: string; module: PermissionModule; title: string; description: string }[] = [
    { path: "commission-payouts", module: "COMMISSION_PAYOUTS", title: "Commission & payouts", description: "Commission rules, seller settlements and payouts." },
    { path: "delivery-network", module: "DELIVERY_NETWORK", title: "Delivery network", description: "Delivery agents, zones and agent KYC." },
    { path: "orders", module: "ORDERS", title: "Orders", description: "Every order across the marketplace — cancellations and refunds." },
    { path: "support", module: "SUPPORT", title: "Support", description: "Tickets from customers and sellers, with the full conversation." },
    { path: "marketing", module: "MARKETING", title: "Marketing", description: "Platform banners, campaigns and their performance." },
    { path: "reports", module: "REPORTS", title: "Reports", description: "Sales, sellers, customers and delivery analytics with exports." },
    { path: "settings", module: "SETTINGS", title: "Settings", description: "Platform configuration." },
]

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
                    {/* old misspelt address */}
                    <Route path="commision-payouts" element={<Navigate to="/dashboard/commission-payouts" replace />} />
                    <Route path="my-account" element={<ProfileDetailsPage />} />

                    {/***Global catalog */}
                    <Route path="global-catalog" element={<PermissionRoute module="GLOBAL_CATALOG" level="VIEW" />}>
                        <Route index element={<Navigate to="categories" replace />} />
                        <Route path="categories" element={<CategoriesPage />} />
                        <Route path="categories/:categoryId" element={<CategoryDetailPage />} />
                        <Route path="attributes" element={<AttributesPage />} />
                        <Route path="brands" element={<BrandsPage />} />
                        <Route path="tax-classes" element={<TaxClassesPage />} />
                        <Route path="products" element={<PlatformProductsPage />} />
                        <Route element={<PermissionRoute module="GLOBAL_CATALOG" level="EDIT" />}>
                            <Route path="categories/new" element={<CategoryFormPage />} />
                            <Route path="categories/:categoryId/edit" element={<CategoryFormPage />} />
                        </Route>
                    </Route>

                    {/***Storefront (customer home page) */}
                    <Route path="storefront" element={<PermissionRoute module="STOREFRONT" level="VIEW" />}>
                        <Route index element={<Navigate to="home" replace />} />
                        <Route path="home" element={<HomePageBuilder />} />
                    </Route>

                    {/***Customers (every shopper account) */}
                    <Route path="customers" element={<PermissionRoute module="CUSTOMERS" level="VIEW" />}>
                        <Route index element={<CustomersPage />} />
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

                    {MODULE_PAGES.map(p => (
                        <Route key={p.path} path={p.path}
                            element={<PermissionRoute module={p.module}><ComingSoonPage title={p.title} description={p.description} /></PermissionRoute>} />
                    ))}
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Route>

            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}