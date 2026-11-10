import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import PermissionRoute from "@/components/PermissionRoute";
import SellerGate from "@/components/SellerGate";
import AuthLayouts from "@/layouts/AuthLayouts";
import ApplyLayout from "@/layouts/ApplyLayout";
import DashboardLayouts from "@/layouts/DashboardLayouts";
import LandingPage from "@/pages/landing/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import { ForgotPassowordPage } from "@/pages/auth/ForgotPassoword";
import VerifyForgotOtpPage from "@/pages/auth/VerifyForgotOtp";
import ResetPassword from "@/pages/auth/ResetPassword";
import Verify2AaOTP from "@/pages/auth/Verify2FaOtp";
import SetPasswordPage from "@/pages/auth/SetPasswordPage";
import CreateAccountPage from "@/pages/apply/CreateAccountPage";
import ApplicationWizardPage from "@/pages/apply/ApplicationWizardPage";
import ApplicationStatusPage from "@/pages/apply/ApplicationStatusPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ProfileDetailsPage from "@/pages/account/ProfileDetailsPage";
import ComingSoonPage from "@/pages/ComingSoonPage";
import StaffPage from "@/pages/staff/StaffPage";
import StaffFormPage from "@/pages/staff/StaffFormPage";
import StaffDetailPage from "@/pages/staff/StaffDetailPage";
import RoleDetailPage from "@/pages/staff/RoleDetailPage";
import type { PermissionModule } from "@/lib/permissions";
import { BrandLogo } from "@/components/brand/SiteHeader";

/** Seller modules not built yet — each gated by its permission */
const MODULE_PAGES: { path: string; module: PermissionModule; title: string; description: string }[] = [
    { path: "products", module: "SELLER_PRODUCTS", title: "Products", description: "Your catalog, variants, pricing and inventory." },
    { path: "collections", module: "SELLER_COLLECTIONS", title: "Collections", description: "Group products into curated collections." },
    { path: "orders", module: "SELLER_ORDERS", title: "Orders", description: "Accept, pack and hand over orders for delivery." },
    { path: "returns", module: "SELLER_RETURNS", title: "Returns & replacements", description: "Review return and replacement requests." },
    { path: "customers", module: "SELLER_CUSTOMERS", title: "Customers", description: "People who bought from you, and customer segments." },
    { path: "discounts", module: "SELLER_DISCOUNTS", title: "Discounts", description: "Coupons and offers for your listings." },
    { path: "delivery", module: "SELLER_DELIVERY", title: "Delivery", description: "Delivery fees, time slots and your own fleet." },
    { path: "reviews", module: "SELLER_REVIEWS", title: "Reviews", description: "Ratings and replies from customers." },
    { path: "settings", module: "SELLER_SETTINGS", title: "Seller settings", description: "Seller page, business hours, payments, taxes and policies." },
    { path: "reports", module: "SELLER_REPORTS", title: "Reports", description: "Sales, inventory, returns and customer analytics." },
]

export default function Routers() {
    return (
        <Routes>
            {/****Public: landing */}
            <Route index element={<LandingPage />} />

            {/****Auth */}
            <Route path="auth" element={<AuthLayouts />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="forgot-password" element={<ForgotPassowordPage />} />
                <Route path="forgot-password/otp" element={<VerifyForgotOtpPage />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="2fa" element={<Verify2AaOTP />} />
            </Route>
            {/* Invite link from admin onboarding — must work even if someone else is signed in */}
            <Route path="auth/set-password" element={<AuthShell />} />

            {/****Seller signup & application */}
            <Route element={<ApplyLayout />}>
                <Route path="apply" element={<CreateAccountPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
                <Route element={<ApplyLayout />}>
                    <Route path="apply/details" element={<ApplicationWizardPage />} />
                    <Route path="application" element={<ApplicationStatusPage />} />
                </Route>
            </Route>

            {/****Dashboard (approved sellers only) */}
            <Route element={<ProtectedRoute />}>
                <Route element={<SellerGate />}>
                    <Route path="dashboard" element={<DashboardLayouts />}>
                        <Route index element={<PermissionRoute module="SELLER_DASHBOARD"><DashboardPage /></PermissionRoute>} />
                        <Route path="my-account" element={<ProfileDetailsPage />} />
                        <Route path="staff" element={<PermissionRoute module="SELLER_STAFF_ROLES" />}>
                            <Route index element={<StaffPage />} />
                            <Route path="roles/:roleId" element={<RoleDetailPage />} />
                            <Route path=":staffId" element={<StaffDetailPage />} />
                            <Route element={<PermissionRoute module="SELLER_STAFF_ROLES" level="EDIT" />}>
                                <Route path="new" element={<StaffFormPage />} />
                                <Route path=":staffId/edit" element={<StaffFormPage />} />
                            </Route>
                        </Route>
                        {MODULE_PAGES.map(p => (
                            <Route key={p.path} path={p.path}
                                element={<PermissionRoute module={p.module}><ComingSoonPage title={p.title} description={p.description} /></PermissionRoute>} />
                        ))}
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

/** Same split layout as the auth pages, without the "already signed in → dashboard" redirect */
function AuthShell() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-10 bg-background p-8">
            <BrandLogo />
            <SetPasswordPage />
        </div>
    )
}
