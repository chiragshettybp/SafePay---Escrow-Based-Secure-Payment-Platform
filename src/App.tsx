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
import MerchantVerify from "./pages/MerchantVerify";
import MerchantDashboard from "./pages/MerchantDashboard";
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
            <Route path="/merchant/login" element={<MerchantLogin />} />
            <Route path="/merchant/signup" element={<MerchantSignup />} />
            <Route path="/merchant/verify" element={<MerchantVerify />} />
            <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
