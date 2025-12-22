import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useSupabaseAuth";
import { AdminAuthProvider, AdminProtectedRoute } from "@/hooks/useAdminAuth";
import Index from "./pages/Index";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerSignup from "./pages/CustomerSignup";
import CustomerVerify from "./pages/CustomerVerify";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import OrderTracking from "./pages/OrderTracking";
import ConfirmDelivery from "./pages/ConfirmDelivery";
import ReportIssue from "./pages/ReportIssue";
import NewPayment from "./pages/NewPayment";
import PaymentReview from "./pages/PaymentReview";
import PaymentSuccess from "./pages/PaymentSuccess";
import RaiseDispute from "./pages/RaiseDispute";
import DisputeUpload from "./pages/DisputeUpload";
import DisputeStatus from "./pages/DisputeStatus";
import DisputeResult from "./pages/DisputeResult";
import Disputes from "./pages/Disputes";
import Refunds from "./pages/Refunds";
import RefundInitiated from "./pages/RefundInitiated";
import RefundSuccess from "./pages/RefundSuccess";
import RefundFailed from "./pages/RefundFailed";
import Wallet from "./pages/Wallet";
import WalletTransactions from "./pages/WalletTransactions";
import WalletBankAccount from "./pages/WalletBankAccount";
import WalletWithdraw from "./pages/WalletWithdraw";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Kyc from "./pages/Kyc";
import CustomerSettings from "./pages/CustomerSettings";
import CustomerSettingsProfile from "./pages/CustomerSettingsProfile";
import CustomerSettingsSecurity from "./pages/CustomerSettingsSecurity";
import CustomerSettingsNotifications from "./pages/CustomerSettingsNotifications";
import CustomerSettingsPrivacy from "./pages/CustomerSettingsPrivacy";
import CustomerSupport from "./pages/CustomerSupport";
import CustomerSupportCreate from "./pages/CustomerSupportCreate";
import CustomerSupportTickets from "./pages/CustomerSupportTickets";
import CustomerSupportTicketDetails from "./pages/CustomerSupportTicketDetails";
import CustomerSupportFaq from "./pages/CustomerSupportFaq";
import MerchantLogin from "./pages/MerchantLogin";
import MerchantSignup from "./pages/MerchantSignup";
import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantOrders from "./pages/MerchantOrders";
import MerchantOrderDetails from "./pages/MerchantOrderDetails";
import MerchantAddTracking from "./pages/MerchantAddTracking";
import MerchantEditTracking from "./pages/MerchantEditTracking";
import MerchantDeliveryProof from "./pages/MerchantDeliveryProof";
import MerchantSettings from "./pages/MerchantSettings";
import MerchantRouteRoot from "./pages/MerchantRouteRoot";
import MerchantDisputes from "./pages/MerchantDisputes";
import MerchantDisputeResponse from "./pages/MerchantDisputeResponse";
import MerchantDisputeUpload from "./pages/MerchantDisputeUpload";
import MerchantDisputeResult from "./pages/MerchantDisputeResult";
import MerchantPayouts from "./pages/MerchantPayouts";
import MerchantBankAccount from "./pages/MerchantBankAccount";
import MerchantWithdraw from "./pages/MerchantWithdraw";
import MerchantWithdrawSuccess from "./pages/MerchantWithdrawSuccess";
import MerchantPayoutHistory from "./pages/MerchantPayoutHistory";
import MerchantNotifications from "./pages/MerchantNotifications";
import MerchantNotificationDetail from "./pages/MerchantNotificationDetail";
import MerchantNotificationPreferences from "./pages/MerchantNotificationPreferences";
import MerchantNotificationsArchive from "./pages/MerchantNotificationsArchive";
import MerchantShipments from "./pages/MerchantShipments";
import MerchantShipmentDetails from "./pages/MerchantShipmentDetails";
import MerchantShipmentCreate from "./pages/MerchantShipmentCreate";
import MerchantShipmentEdit from "./pages/MerchantShipmentEdit";
import MerchantShipmentStatus from "./pages/MerchantShipmentStatus";
import MerchantShipmentProof from "./pages/MerchantShipmentProof";
import MerchantShipmentTimeline from "./pages/MerchantShipmentTimeline";
import MerchantShipmentsBulk from "./pages/MerchantShipmentsBulk";
import MerchantSupport from "./pages/MerchantSupport";
import MerchantSupportCreate from "./pages/MerchantSupportCreate";
import MerchantSupportTickets from "./pages/MerchantSupportTickets";
import MerchantSupportTicketDetails from "./pages/MerchantSupportTicketDetails";
import MerchantSupportUpload from "./pages/MerchantSupportUpload";
import MerchantSupportResult from "./pages/MerchantSupportResult";
import MerchantSupportFaq from "./pages/MerchantSupportFaq";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminResetPasswordConfirm from "./pages/AdminResetPasswordConfirm";
import AdminPayments from "./pages/AdminPayments";
import AdminPaymentDetails from "./pages/AdminPaymentDetails";
import AdminForceRelease from "./pages/AdminForceRelease";
import AdminForceRefund from "./pages/AdminForceRefund";
import AdminDisputes from "./pages/AdminDisputes";
import AdminDisputeReview from "./pages/AdminDisputeReview";
import AdminDisputeDecision from "./pages/AdminDisputeDecision";
import AdminMerchants from "./pages/AdminMerchants";
import AdminMerchantDetails from "./pages/AdminMerchantDetails";
import AdminMerchantVerification from "./pages/AdminMerchantVerification";
import AdminMerchantBan from "./pages/AdminMerchantBan";
import AdminUsers from "./pages/AdminUsers";
import AdminUserDetails from "./pages/AdminUserDetails";
import AdminUserBan from "./pages/AdminUserBan";
import AdminPayouts from "./pages/AdminPayouts";
import AdminPayoutDetails from "./pages/AdminPayoutDetails";
import AdminPayoutVerify from "./pages/AdminPayoutVerify";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/customer-login" element={<CustomerLogin />} />
              <Route path="/customer-signup" element={<CustomerSignup />} />
              <Route path="/customer-verify" element={<CustomerVerify />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/order/:orderId" element={<OrderDetails />} />
              <Route path="/order/:orderId/tracking" element={<OrderTracking />} />
              <Route path="/order/:orderId/confirm" element={<ConfirmDelivery />} />
              <Route path="/order/:orderId/report" element={<ReportIssue />} />
              <Route path="/dispute/:orderId/raise" element={<RaiseDispute />} />
              <Route path="/dispute/:disputeId/upload" element={<DisputeUpload />} />
              <Route path="/dispute/:disputeId/status" element={<DisputeStatus />} />
              <Route path="/dispute/:disputeId/result" element={<DisputeResult />} />
              <Route path="/disputes" element={<Disputes />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/refund/:refundId" element={<RefundInitiated />} />
              <Route path="/refund/:refundId/success" element={<RefundSuccess />} />
              <Route path="/refund/:refundId/failed" element={<RefundFailed />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/wallet/transactions" element={<WalletTransactions />} />
              <Route path="/wallet/bank-account" element={<WalletBankAccount />} />
              <Route path="/wallet/withdraw" element={<WalletWithdraw />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/profile/kyc" element={<Kyc />} />
              <Route path="/payment/new" element={<NewPayment />} />
              <Route path="/payment/review/:orderId" element={<PaymentReview />} />
              <Route path="/payment/success/:orderId" element={<PaymentSuccess />} />
              {/* Customer Settings Routes */}
              <Route path="/settings" element={<CustomerSettings />} />
              <Route path="/settings/profile" element={<CustomerSettingsProfile />} />
              <Route path="/settings/security" element={<CustomerSettingsSecurity />} />
              <Route path="/settings/notifications" element={<CustomerSettingsNotifications />} />
              <Route path="/settings/privacy" element={<CustomerSettingsPrivacy />} />
              {/* Customer Support Routes */}
              <Route path="/support" element={<CustomerSupport />} />
              <Route path="/support/create" element={<CustomerSupportCreate />} />
              <Route path="/support/tickets" element={<CustomerSupportTickets />} />
              <Route path="/support/ticket/:ticketId" element={<CustomerSupportTicketDetails />} />
              <Route path="/support/faq" element={<CustomerSupportFaq />} />
              {/* Merchant Routes */}
              <Route path="/merchant" element={<MerchantRouteRoot />}>
                <Route path="login" element={<MerchantLogin />} />
                <Route path="signup" element={<MerchantSignup />} />
                <Route path="dashboard" element={<MerchantDashboard />} />
                <Route path="orders" element={<MerchantOrders />} />
                <Route path="order/:orderId" element={<MerchantOrderDetails />} />
                <Route path="order/:orderId/tracking/add" element={<MerchantAddTracking />} />
                <Route path="order/:orderId/tracking/edit" element={<MerchantEditTracking />} />
                <Route path="order/:orderId/delivery-proof" element={<MerchantDeliveryProof />} />
                <Route path="settings" element={<MerchantSettings />} />
                <Route path="disputes" element={<MerchantDisputes />} />
                <Route path="dispute/:disputeId/respond" element={<MerchantDisputeResponse />} />
                <Route path="dispute/:disputeId/upload" element={<MerchantDisputeUpload />} />
                <Route path="dispute/:disputeId/result" element={<MerchantDisputeResult />} />
                <Route path="payouts" element={<MerchantPayouts />} />
                <Route path="payouts/bank-account" element={<MerchantBankAccount />} />
                <Route path="payouts/withdraw" element={<MerchantWithdraw />} />
                <Route path="payouts/success/:payoutId" element={<MerchantWithdrawSuccess />} />
                <Route path="payouts/history" element={<MerchantPayoutHistory />} />
                <Route path="notifications" element={<MerchantNotifications />} />
                <Route path="notifications/:notificationId" element={<MerchantNotificationDetail />} />
                <Route path="notifications/preferences" element={<MerchantNotificationPreferences />} />
                <Route path="notifications/archive" element={<MerchantNotificationsArchive />} />
                {/* Shipments Routes */}
                <Route path="shipments" element={<MerchantShipments />} />
                <Route path="shipments/bulk" element={<MerchantShipmentsBulk />} />
                <Route path="shipments/create/:orderId" element={<MerchantShipmentCreate />} />
                <Route path="shipments/:shipmentId" element={<MerchantShipmentDetails />} />
                <Route path="shipments/:shipmentId/edit" element={<MerchantShipmentEdit />} />
                <Route path="shipments/:shipmentId/status" element={<MerchantShipmentStatus />} />
                <Route path="shipments/:shipmentId/proof" element={<MerchantShipmentProof />} />
                <Route path="shipments/:shipmentId/timeline" element={<MerchantShipmentTimeline />} />
                {/* Support Routes */}
                <Route path="support" element={<MerchantSupport />} />
                <Route path="support/create" element={<MerchantSupportCreate />} />
                <Route path="support/tickets" element={<MerchantSupportTickets />} />
                <Route path="support/ticket/:ticketId" element={<MerchantSupportTicketDetails />} />
                <Route path="support/upload/:ticketId" element={<MerchantSupportUpload />} />
                <Route path="support/result/:ticketId" element={<MerchantSupportResult />} />
                <Route path="support/faq" element={<MerchantSupportFaq />} />
              </Route>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/reset-password" element={<AdminResetPassword />} />
              <Route path="/admin/reset-password/confirm" element={<AdminResetPasswordConfirm />} />
              <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/payments" element={<AdminProtectedRoute><AdminPayments /></AdminProtectedRoute>} />
              <Route path="/admin/payments/:paymentId" element={<AdminProtectedRoute><AdminPaymentDetails /></AdminProtectedRoute>} />
              <Route path="/admin/payments/:paymentId/force-release" element={<AdminProtectedRoute><AdminForceRelease /></AdminProtectedRoute>} />
              <Route path="/admin/payments/:paymentId/force-refund" element={<AdminProtectedRoute><AdminForceRefund /></AdminProtectedRoute>} />
              <Route path="/admin/disputes" element={<AdminProtectedRoute><AdminDisputes /></AdminProtectedRoute>} />
              <Route path="/admin/disputes/:disputeId" element={<AdminProtectedRoute><AdminDisputeReview /></AdminProtectedRoute>} />
              <Route path="/admin/disputes/:disputeId/decision" element={<AdminProtectedRoute><AdminDisputeDecision /></AdminProtectedRoute>} />
              <Route path="/admin/merchants" element={<AdminProtectedRoute><AdminMerchants /></AdminProtectedRoute>} />
              <Route path="/admin/merchants/:merchant_id" element={<AdminProtectedRoute><AdminMerchantDetails /></AdminProtectedRoute>} />
              <Route path="/admin/merchants/:merchant_id/verification" element={<AdminProtectedRoute><AdminMerchantVerification /></AdminProtectedRoute>} />
              <Route path="/admin/merchants/:merchant_id/ban" element={<AdminProtectedRoute><AdminMerchantBan /></AdminProtectedRoute>} />
              <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
              <Route path="/admin/users/:user_id" element={<AdminProtectedRoute><AdminUserDetails /></AdminProtectedRoute>} />
              <Route path="/admin/users/:user_id/ban" element={<AdminProtectedRoute><AdminUserBan /></AdminProtectedRoute>} />
              <Route path="/admin/payouts" element={<AdminProtectedRoute><AdminPayouts /></AdminProtectedRoute>} />
              <Route path="/admin/payouts/:payoutId" element={<AdminProtectedRoute><AdminPayoutDetails /></AdminProtectedRoute>} />
              <Route path="/admin/payouts/:payoutId/verify" element={<AdminProtectedRoute><AdminPayoutVerify /></AdminProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
