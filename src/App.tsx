import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useSupabaseAuth";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
