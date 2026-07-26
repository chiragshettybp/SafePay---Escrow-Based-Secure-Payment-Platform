# 🚀 SafePay

**SafePay** is a secure payment platform designed to make online transactions safer for both buyers and sellers. It introduces a trusted payment flow where funds are held securely until both parties complete their part of the transaction.

Whether you're purchasing products, selling online, or managing digital deals, SafePay helps reduce payment disputes, fraud, and uncertainty with a simple and transparent experience.

---

# 📖 Overview

SafePay is a payment platform built to provide trust in online transactions.

It is designed for individuals, businesses, freelancers, and marketplaces that want a safer way to exchange money. By adding an extra layer of protection between payment and delivery, SafePay creates a more reliable buying and selling experience.

---

# ❗ The Problem

Online payments often require one side to trust the other without any guarantee.

Buyers worry about paying for products that never arrive, while sellers fear shipping goods without receiving payment. Disputes, scams, delayed refunds, and fraudulent transactions make online commerce stressful for everyone involved.

Many existing solutions either lack transparency, involve complicated processes, or are designed only for large businesses. Smaller sellers and everyday users are often left without an easy way to protect their transactions.

---

# 💡 Our Solution

SafePay provides a secure payment workflow where transactions are protected from start to finish.

Instead of transferring money immediately, payments are securely held until the agreed conditions are met. This gives buyers confidence before paying and gives sellers confidence before delivering.

The goal is to make every transaction simple, transparent, and fair while reducing the risk of fraud and payment disputes.

---

# ✨ Key Features

* 🔒 Secure payment flow designed to protect both buyers and sellers.
* 💰 Funds are safely held until transaction conditions are completed.
* 🤝 Builds trust between people who have never done business before.
* 📦 Supports secure product and service transactions.
* ⚡ Fast and straightforward payment experience with minimal friction.
* 📱 Clean, user-friendly interface that is easy for anyone to use.
* 🔔 Real-time transaction updates and payment status tracking.
* 🧾 Transparent transaction history for better accountability.
* 🛡️ Helps reduce scams, fraudulent payments, and common disputes.
* 🌍 Designed to support individuals, businesses, and online marketplaces.

---

# 🎯 Who Is It For?

SafePay is designed for:

* 🛒 Online shoppers
* 🏪 Small businesses
* 💼 Freelancers
* 📦 E-commerce sellers
* 🛍️ Marketplace platforms
* 👨‍💻 Developers building payment-enabled applications
* 🏢 Businesses handling customer transactions
* 🌍 Anyone looking for a safer way to send or receive payments

---

# 🌍 Vision

Our vision is to make secure digital transactions accessible to everyone, not just large organisations. SafePay aims to become a trusted payment layer that helps people transact with confidence, regardless of where they are or who they are buying from.

As the project evolves, it can expand to support more payment methods, stronger dispute resolution, business integrations, marketplace tools, and cross-border transactions. By focusing on trust, transparency, and simplicity, SafePay seeks to make online commerce safer for millions of users.

---

# 🤝 Contributing

Contributions are always welcome!

Whether you want to fix a bug, improve the documentation, suggest a new feature, or enhance the user experience, your support is greatly appreciated.

* 🐞 Report bugs
* 💡 Suggest new features
* 📖 Improve documentation
* 🔧 Submit pull requests

Together, we can make SafePay even better.

---

# ⭐ Support

If you found this project useful, consider giving it a **⭐ Star** on GitHub to support its development.

Your support helps improve the project, encourages future contributions, and makes SafePay better for everyone.

Thank you for checking out **SafePay**! 🚀


## Customer Pages

Customer pages handle the buyer-side experience including orders, payments, disputes, and account management.

### Authentication & Onboarding

| Page | Route | Description |
|------|-------|-------------|
| **CustomerLogin** | `/customer/login` | Customer login page with email/password authentication. Includes "Remember me" option and password reset link. |
| **CustomerSignup** | `/customer/signup` | New customer registration with email, password, and phone number. Sends verification email upon signup. |
| **CustomerVerify** | `/customer/verify` | Email verification page. Confirms customer email address after signup. |
| **Login** | `/login` | Alternative/legacy login page for customers. |
| **SignUp** | `/signup` | Alternative/legacy signup page for customers. |
| **ResetPassword** | `/reset-password` | Password reset request page. Sends reset link to customer email. |

### Dashboard & Orders

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/dashboard` | Main customer dashboard showing order summary, recent activity, next delivery, attendance metrics, and quick actions. |
| **Orders** | `/orders` | Lists all customer orders with filtering by status (pending, shipped, delivered, completed, disputed). Shows order amount, merchant, and status. |
| **OrderDetails** | `/orders/:id` | Detailed view of a specific order including product info, merchant details, payment status, delivery timeline, and available actions. |
| **OrderTracking** | `/orders/:id/tracking` | Real-time shipment tracking with timeline events, carrier info, and estimated delivery date. |
| **ConfirmDelivery** | `/orders/:id/confirm` | Delivery confirmation page where customers confirm receipt and release escrow funds to merchant. |

### Payments & Wallet

| Page | Route | Description |
|------|-------|-------------|
| **NewPayment** | `/payment/new` | Initiate a new escrow payment to a merchant. Enter merchant ID, amount, and product details. |
| **PaymentReview** | `/payment/review` | Review payment details before confirming. Shows breakdown of amount, fees, and total. |
| **PaymentSuccess** | `/payment/success` | Payment confirmation page after successful escrow deposit. |
| **Wallet** | `/wallet` | Customer wallet dashboard showing available balance, pending funds, and transaction history. |
| **WalletTransactions** | `/wallet/transactions` | Complete list of wallet transactions with filtering and search. |
| **WalletBankAccount** | `/wallet/bank-account` | Manage linked bank accounts for withdrawals. Add, edit, or remove bank accounts. |
| **WalletWithdraw** | `/wallet/withdraw` | Withdraw funds from wallet to linked bank account. |

### Refunds

| Page | Route | Description |
|------|-------|-------------|
| **Refunds** | `/refunds` | List of all refund requests with status (pending, processing, completed, failed). |
| **RefundInitiated** | `/refunds/initiated` | Confirmation page when a refund has been initiated. |
| **RefundSuccess** | `/refunds/success` | Success page when refund is completed and funds credited. |
| **RefundFailed** | `/refunds/failed` | Error page when refund processing fails with retry options. |

### Disputes

| Page | Route | Description |
|------|-------|-------------|
| **Disputes** | `/disputes` | List all customer disputes with status tracking (open, under review, resolved). |
| **RaiseDispute** | `/disputes/raise/:orderId` | Create a new dispute for an order. Select issue type, describe problem, and submit. |
| **DisputeUpload** | `/disputes/:id/upload` | Upload supporting documents and evidence for an active dispute. |
| **DisputeStatus** | `/disputes/:id/status` | View dispute progress, admin responses, and timeline of events. |
| **DisputeResult** | `/disputes/:id/result` | Final dispute resolution outcome showing decision and any refund amount. |
| **ReportIssue** | `/report-issue` | General issue reporting form for non-order related problems. |

### KYC & Profile

| Page | Route | Description |
|------|-------|-------------|
| **Kyc** | `/kyc` | Know Your Customer verification. Upload ID documents, selfie, and address proof for account verification. |
| **Profile** | `/profile` | View customer profile with personal details, verification status, and account info. |
| **EditProfile** | `/profile/edit` | Edit personal information including name, phone, and avatar. |
| **Account** | `/account` | Account overview with quick links to profile, settings, and security options. |

### Settings

| Page | Route | Description |
|------|-------|-------------|
| **CustomerSettings** | `/customer/settings` | Main settings hub with links to profile, notifications, privacy, and security settings. |
| **CustomerSettingsProfile** | `/customer/settings/profile` | Edit profile settings including display name and contact preferences. |
| **CustomerSettingsNotifications** | `/customer/settings/notifications` | Configure notification preferences for orders, payments, disputes via email, SMS, and in-app. |
| **CustomerSettingsPrivacy** | `/customer/settings/privacy` | Privacy settings and data management options. Request data export or account deletion. |
| **CustomerSettingsSecurity** | `/customer/settings/security` | Security settings including password change and two-factor authentication setup. |
| **Settings** | `/settings` | Alternative/legacy settings page. |

### Support

| Page | Route | Description |
|------|-------|-------------|
| **CustomerSupport** | `/customer/support` | Support center landing page with quick actions and help categories. |
| **CustomerSupportCreate** | `/customer/support/create` | Create a new support ticket with category, subject, and description. |
| **CustomerSupportTickets** | `/customer/support/tickets` | List all support tickets with status and last update time. |
| **CustomerSupportTicketDetails** | `/customer/support/tickets/:id` | View ticket details, conversation thread, and add replies. |
| **CustomerSupportFaq** | `/customer/support/faq` | Frequently asked questions organized by category. |

### Notifications

| Page | Route | Description |
|------|-------|-------------|
| **Notifications** | `/notifications` | All customer notifications including order updates, payment alerts, and system messages. Mark as read/unread. |

---

## Merchant Pages

Merchant pages handle the seller-side experience including order fulfillment, shipments, payouts, and business management.

### Authentication & Onboarding

| Page | Route | Description |
|------|-------|-------------|
| **MerchantLogin** | `/merchant/login` | Merchant login with email and password. Includes forgot password and signup links. |
| **MerchantSignup** | `/merchant/signup` | Merchant registration with business name, email, phone, and password. |
| **MerchantVerification** | `/merchant/verification` | Business verification status page showing KYC and document verification progress. |
| **MerchantVerificationDocs** | `/merchant/verification/docs` | Upload business documents for verification (GST certificate, PAN, address proof). |

### Dashboard & Orders

| Page | Route | Description |
|------|-------|-------------|
| **MerchantDashboard** | `/merchant/dashboard` | Merchant dashboard with revenue metrics, pending orders, active disputes, and recent activity feed. |
| **MerchantRouteRoot** | `/merchant` | Root route handler for merchant section, redirects to dashboard. |
| **MerchantOrders** | `/merchant/orders` | List all orders received with filtering by status. Shows order value, customer, and fulfillment status. |
| **MerchantOrderDetails** | `/merchant/orders/:id` | Detailed order view with customer info, product details, payment status, and fulfillment actions. |

### Shipments & Delivery

| Page | Route | Description |
|------|-------|-------------|
| **MerchantShipments** | `/merchant/shipments` | All shipments list with tracking status, carrier info, and delivery progress. |
| **MerchantShipmentCreate** | `/merchant/shipments/create` | Create a new shipment for an order. Enter carrier, tracking number, and expected delivery. |
| **MerchantShipmentDetails** | `/merchant/shipments/:id` | View shipment details including tracking events, carrier info, and delivery status. |
| **MerchantShipmentEdit** | `/merchant/shipments/:id/edit` | Edit shipment details like tracking number or expected delivery date. |
| **MerchantShipmentStatus** | `/merchant/shipments/:id/status` | Update shipment status (picked up, in transit, out for delivery, delivered). |
| **MerchantShipmentTimeline** | `/merchant/shipments/:id/timeline` | Visual timeline of all shipment events from creation to delivery. |
| **MerchantShipmentProof** | `/merchant/shipments/:id/proof` | Upload proof of shipment (shipping label, receipt, photos). |
| **MerchantShipmentsBulk** | `/merchant/shipments/bulk` | Bulk shipment management for multiple orders. |
| **MerchantAddTracking** | `/merchant/orders/:id/tracking` | Add tracking information to an order. |
| **MerchantEditTracking** | `/merchant/orders/:id/tracking/edit` | Edit existing tracking information. |
| **MerchantDeliveryProof** | `/merchant/orders/:id/delivery-proof` | Upload delivery confirmation proof (photos, signature, POD). |

### Payouts & Wallet

| Page | Route | Description |
|------|-------|-------------|
| **MerchantPayouts** | `/merchant/payouts` | Payout dashboard showing available balance, pending amount, and payout history. |
| **MerchantPayoutHistory** | `/merchant/payouts/history` | Complete payout transaction history with filtering and export options. |
| **MerchantWithdraw** | `/merchant/withdraw` | Request withdrawal of available funds to linked bank account. |
| **MerchantWithdrawSuccess** | `/merchant/withdraw/success` | Withdrawal request confirmation page. |
| **MerchantBankAccount** | `/merchant/bank-account` | Manage merchant bank accounts for receiving payouts. Add, verify, or remove accounts. |

### Disputes

| Page | Route | Description |
|------|-------|-------------|
| **MerchantDisputes** | `/merchant/disputes` | List of disputes raised against merchant orders with status tracking. |
| **MerchantDisputeResponse** | `/merchant/disputes/:id/respond` | Submit response to a customer dispute with explanation and evidence. |
| **MerchantDisputeUpload** | `/merchant/disputes/:id/upload` | Upload supporting documents and evidence for dispute defense. |
| **MerchantDisputeResult** | `/merchant/disputes/:id/result` | View final dispute outcome and any financial impact. |

### Profile & Settings

| Page | Route | Description |
|------|-------|-------------|
| **MerchantProfile** | `/merchant/profile` | View merchant business profile, verification status, and performance metrics. |
| **MerchantEditProfile** | `/merchant/profile/edit` | Edit business information including name, logo, category, and contact details. |
| **MerchantSettings** | `/merchant/settings` | Merchant settings hub with business, notification, and security options. |

### Notifications

| Page | Route | Description |
|------|-------|-------------|
| **MerchantNotifications** | `/merchant/notifications` | All merchant notifications including order alerts, payout updates, and dispute notices. |
| **MerchantNotificationDetail** | `/merchant/notifications/:id` | Detailed view of a specific notification with related actions. |
| **MerchantNotificationPreferences** | `/merchant/notifications/preferences` | Configure notification channels and frequency for different event types. |
| **MerchantNotificationsArchive** | `/merchant/notifications/archive` | Archived/dismissed notifications history. |

### Support

| Page | Route | Description |
|------|-------|-------------|
| **MerchantSupport** | `/merchant/support` | Merchant support center with help resources and ticket creation. |
| **MerchantSupportCreate** | `/merchant/support/create` | Create new support ticket for merchant-specific issues. |
| **MerchantSupportTickets** | `/merchant/support/tickets` | List all merchant support tickets with status tracking. |
| **MerchantSupportTicketDetails** | `/merchant/support/tickets/:id` | View and respond to support ticket conversation. |
| **MerchantSupportUpload** | `/merchant/support/:id/upload` | Upload attachments to support ticket. |
| **MerchantSupportResult** | `/merchant/support/:id/result` | View support ticket resolution outcome. |
| **MerchantSupportFaq** | `/merchant/support/faq` | Merchant-focused frequently asked questions. |

---

## Admin Pages

Admin pages provide complete platform management including user administration, order oversight, financial controls, and dispute resolution.

### Authentication

| Page | Route | Description |
|------|-------|-------------|
| **AdminLogin** | `/admin/login` | Secure admin login with email and PIN. Includes rate limiting and failed attempt tracking. |
| **AdminResetPassword** | `/admin/reset-password` | Admin password/PIN reset request page. |
| **AdminResetPasswordConfirm** | `/admin/reset-password/confirm` | Confirm password reset with token and set new PIN. |

### Dashboard

| Page | Route | Description |
|------|-------|-------------|
| **AdminDashboard** | `/admin/dashboard` | Main admin dashboard with key metrics (total orders, revenue, users, disputes), charts showing trends, alerts for pending actions, recent activity feed, and quick action buttons. |

### User Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminUsers** | `/admin/users` | List all platform users (customers) with search, filtering by status, and sorting options. |
| **AdminUserDetails** | `/admin/users/:id` | Comprehensive user profile with personal info, KYC status, order history, and account actions. |
| **AdminUserProfile** | `/admin/users/:id/profile` | Detailed user profile information and edit capabilities. |
| **AdminUserKyc** | `/admin/users/:id/kyc` | Review and approve/reject user KYC documents. View uploaded ID, selfie, and address proof. |
| **AdminUserWallet** | `/admin/users/:id/wallet` | View user wallet balance, transaction history, and manage wallet actions. |
| **AdminUserTransactions** | `/admin/users/:id/transactions` | Complete transaction history for a specific user. |
| **AdminUserBankVerify** | `/admin/users/:id/bank-verify` | Verify user's linked bank account details. |
| **AdminUserControls** | `/admin/users/:id/controls` | Account control actions including suspend, restrict, or enable features. |
| **AdminUserBan** | `/admin/users/:id/ban` | Ban or suspend user account with reason and duration options. |
| **AdminUserVerificationHistory** | `/admin/users/:id/verification-history` | Complete history of user verification attempts and status changes. |

### Merchant Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminMerchants** | `/admin/merchants` | List all registered merchants with search, status filters, and verification status indicators. |
| **AdminMerchantDetails** | `/admin/merchants/:id` | Complete merchant profile with business info, performance metrics, and management actions. |
| **AdminMerchantKyc** | `/admin/merchants/:id/kyc` | Review merchant KYC documents (GST, PAN, business registration). Approve or reject with comments. |
| **AdminMerchantVerification** | `/admin/merchants/:id/verification` | Merchant business verification workflow with document review and approval. |
| **AdminMerchantVerificationHistory** | `/admin/merchants/:id/verification-history` | History of all verification attempts and status changes for merchant. |
| **AdminMerchantBankVerify** | `/admin/merchants/:id/bank-verify` | Verify merchant bank account for payouts. |
| **AdminMerchantBan** | `/admin/merchants/:id/ban` | Suspend or ban merchant account with reason documentation. |

### Order Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminOrders** | `/admin/orders` | All platform orders with advanced filtering, search, and bulk actions. |
| **AdminOrderDetails** | `/admin/orders/:id` | Complete order details including customer, merchant, payment, shipment, and timeline. Admin can take actions like cancel, refund, or escalate. |

### Payment Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminPayments** | `/admin/payments` | All payment transactions with status tracking and search capabilities. |
| **AdminPaymentDetails** | `/admin/payments/:id` | Detailed payment information including transaction reference, gateway response, and reconciliation status. |

### Escrow Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminEscrow** | `/admin/escrow` | Escrow accounts overview with total held funds, frozen accounts, and risk flags. |
| **AdminEscrowDetails** | `/admin/escrow/:id` | Detailed escrow account view with balance breakdown and transaction history. |
| **AdminEscrowOrders** | `/admin/escrow/:id/orders` | Orders associated with a specific escrow account. |
| **AdminEscrowHistory** | `/admin/escrow/:id/history` | Complete transaction history for an escrow account. |
| **AdminEscrowActions** | `/admin/escrow/:id/actions` | Administrative actions on escrow (freeze, unfreeze, add notes, flag for review). |
| **AdminForceRelease** | `/admin/escrow/:id/force-release` | Force release escrow funds to merchant (override normal flow). Requires reason and approval. |
| **AdminForceRefund** | `/admin/escrow/:id/force-refund` | Force refund escrow funds to customer. Requires documentation and approval. |

### Payout Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminPayouts** | `/admin/payouts` | All merchant payout requests with status filtering (pending, processing, completed, failed). |
| **AdminPayoutDetails** | `/admin/payouts/:id` | Detailed payout information with merchant details, bank account, and processing status. |
| **AdminPayoutVerify** | `/admin/payouts/:id/verify` | Verify and approve payout request. Confirm bank details and authorize transfer. |

### Withdrawal Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminWithdrawals** | `/admin/withdrawals` | All withdrawal requests from merchants and customers with approval workflow. |
| **AdminWithdrawalDetails** | `/admin/withdrawals/:id` | Detailed withdrawal request with amount, bank details, and verification status. |
| **AdminWithdrawalActions** | `/admin/withdrawals/:id/actions` | Approve, reject, or hold withdrawal with reason documentation. |
| **AdminWithdrawalHistory** | `/admin/withdrawals/:id/history` | Complete history of actions taken on a withdrawal request. |
| **AdminWithdrawalMerchant** | `/admin/withdrawals/:id/merchant` | View merchant details associated with withdrawal request. |

### Shipment Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminShipments** | `/admin/shipments` | All platform shipments with tracking status, delays, and delivery issues. |
| **AdminShipmentDetails** | `/admin/shipments/:id` | Detailed shipment view with carrier info, tracking events, and issue management. |

### Dispute Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminDisputes** | `/admin/disputes` | All platform disputes with priority indicators, status filters, and assignment. |
| **AdminDisputeReview** | `/admin/disputes/:id/review` | Review dispute details including customer complaint, merchant response, and evidence from both parties. |
| **AdminDisputeDecision** | `/admin/disputes/:id/decision` | Make final dispute decision (favor customer, favor merchant, split). Set refund amount and resolution notes. |

### Support Ticket Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminSupport** | `/admin/support` | All support tickets with priority, category, and assignment management. |
| **AdminSupportTicket** | `/admin/support/:id` | Overview of a specific support ticket. |
| **AdminSupportTicketDetails** | `/admin/support/:id/details` | Detailed ticket information with user details and related orders. |
| **AdminSupportTicketConversation** | `/admin/support/:id/conversation` | Full conversation thread with customer/merchant. Add internal notes or public replies. |
| **AdminSupportTicketAttachments** | `/admin/support/:id/attachments` | View and download all attachments on a support ticket. |
| **AdminSupportTicketActions** | `/admin/support/:id/actions` | Ticket actions including assign, escalate, change priority, or close. |
| **AdminSupportTicketHistory** | `/admin/support/:id/history` | Complete audit trail of all actions taken on ticket. |

### Notification Management

| Page | Route | Description |
|------|-------|-------------|
| **AdminNotifications** | `/admin/notifications` | Manage platform-wide notifications and announcements. |
| **AdminNotificationCreate** | `/admin/notifications/create` | Create new notification/announcement targeting specific user groups. |
| **AdminNotificationDetails** | `/admin/notifications/:id` | View notification details and delivery statistics. |
| **AdminNotificationRecipients** | `/admin/notifications/:id/recipients` | List of recipients and their read/delivery status. |
| **AdminNotificationActions** | `/admin/notifications/:id/actions` | Edit, resend, or cancel scheduled notification. |
| **AdminNotificationHistory** | `/admin/notifications/:id/history` | History of changes and sends for a notification. |

---

## Shared/Common Pages

Pages that are shared or serve common purposes across the platform.

| Page | Route | Description |
|------|-------|-------------|
| **Index** | `/` | Landing page / home page of the platform. |
| **NotFound** | `*` | 404 error page for unmatched routes. |
| **Timetable** | `/timetable` | Timetable management feature (if applicable to platform use case). |
| **TimetableUploadAnalysis** | `/timetable/upload` | Upload and analyze timetable data. |
| **Attendance** | `/attendance` | Attendance tracking feature. |

---

## Project Structure

```
src/
├── components/
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard widgets
│   ├── layout/         # Layout components
│   ├── merchant/       # Merchant-specific components
│   ├── orders/         # Order-related components
│   ├── seo/            # SEO components
│   ├── timetable/      # Timetable components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations (Supabase)
├── interfaces/         # TypeScript interfaces
├── lib/                # Utility functions
└── pages/              # Page components
```


Simply open [Lovable](https://lovable.dev/projects/4d2de453-c527-42d7-960d-21e41da7b69d) and click on Share → Publish.

