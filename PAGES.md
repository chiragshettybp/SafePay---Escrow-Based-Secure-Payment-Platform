# Application Pages

This document lists all pages in the Safepay Escrow Payment Platform.

---

## Public Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Index | Landing page |
| `/customer-login` | CustomerLogin | Customer login page |
| `/customer-signup` | CustomerSignup | Customer registration |
| `/customer-verify` | CustomerVerify | Email verification |
| `/reset-password` | ResetPassword | Password reset |

---

## Customer Pages

### Dashboard & Orders
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Customer dashboard |
| `/orders` | Orders | Order list |
| `/order/:orderId` | OrderDetails | Order details |
| `/order/:orderId/tracking` | OrderTracking | Track order |
| `/order/:orderId/confirm` | ConfirmDelivery | Confirm delivery |
| `/order/:orderId/report` | ReportIssue | Report issue |

### Payments
| Route | Page | Description |
|-------|------|-------------|
| `/payment/new` | NewPayment | Create new payment |
| `/payment/review/:orderId` | PaymentReview | Review payment |
| `/payment/pay/:orderId` | PaymentPay | Make payment |
| `/payment/success/:orderId` | PaymentSuccess | Payment success |
| `/payment/failed/:orderId` | PaymentFailed | Payment failed |

### Disputes
| Route | Page | Description |
|-------|------|-------------|
| `/disputes` | Disputes | Dispute list |
| `/dispute/:orderId/raise` | RaiseDispute | Raise dispute |
| `/dispute/:disputeId/upload` | DisputeUpload | Upload evidence |
| `/dispute/:disputeId/status` | DisputeStatus | Dispute status |
| `/dispute/:disputeId/result` | DisputeResult | Dispute result |

### Refunds
| Route | Page | Description |
|-------|------|-------------|
| `/refunds` | Refunds | Refund list |
| `/refund/:refundId` | RefundInitiated | Refund initiated |
| `/refund/:refundId/success` | RefundSuccess | Refund success |
| `/refund/:refundId/failed` | RefundFailed | Refund failed |

### Wallet
| Route | Page | Description |
|-------|------|-------------|
| `/wallet` | Wallet | Wallet overview |
| `/wallet/transactions` | WalletTransactions | Transaction history |
| `/wallet/bank-account` | WalletBankAccount | Bank account management |
| `/wallet/withdraw` | WalletWithdraw | Withdraw funds |

### Profile
| Route | Page | Description |
|-------|------|-------------|
| `/profile` | Profile | User profile |
| `/profile/edit` | EditProfile | Edit profile |
| `/profile/kyc` | Kyc | KYC verification |

### Settings
| Route | Page | Description |
|-------|------|-------------|
| `/settings` | CustomerSettings | Settings hub |
| `/settings/profile` | CustomerSettingsProfile | Profile settings |
| `/settings/security` | CustomerSettingsSecurity | Security settings |
| `/settings/notifications` | CustomerSettingsNotifications | Notification preferences |
| `/settings/privacy` | CustomerSettingsPrivacy | Privacy settings |

### Support
| Route | Page | Description |
|-------|------|-------------|
| `/support` | CustomerSupport | Support hub |
| `/support/create` | CustomerSupportCreate | Create ticket |
| `/support/tickets` | CustomerSupportTickets | Ticket list |
| `/support/ticket/:ticketId` | CustomerSupportTicketDetails | Ticket details |
| `/support/faq` | CustomerSupportFaq | FAQ |

### Drafts
| Route | Page | Description |
|-------|------|-------------|
| `/drafts` | Drafts | Draft payments list |
| `/drafts/:draftId` | DraftDetails | Draft details |
| `/drafts/:draftId/edit` | DraftEdit | Edit draft |

---

## Merchant Pages

All merchant routes are prefixed with `/merchant`

### Authentication
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/login` | MerchantLogin | Merchant login |
| `/merchant/signup` | MerchantSignup | Merchant registration |

### Dashboard & Orders
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/dashboard` | MerchantDashboard | Merchant dashboard |
| `/merchant/orders` | MerchantOrders | Order list |
| `/merchant/order/:orderId` | MerchantOrderDetails | Order details |
| `/merchant/order/:orderId/tracking/add` | MerchantAddTracking | Add tracking |
| `/merchant/order/:orderId/tracking/edit` | MerchantEditTracking | Edit tracking |
| `/merchant/order/:orderId/delivery-proof` | MerchantDeliveryProof | Upload delivery proof |

### Disputes
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/disputes` | MerchantDisputes | Dispute list |
| `/merchant/dispute/:disputeId/respond` | MerchantDisputeResponse | Respond to dispute |
| `/merchant/dispute/:disputeId/upload` | MerchantDisputeUpload | Upload evidence |
| `/merchant/dispute/:disputeId/result` | MerchantDisputeResult | Dispute result |

### Payouts
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/payouts` | MerchantPayouts | Payout overview |
| `/merchant/payouts/bank-account` | MerchantBankAccount | Bank account |
| `/merchant/payouts/withdraw` | MerchantWithdraw | Request withdrawal |
| `/merchant/payouts/success/:payoutId` | MerchantWithdrawSuccess | Withdrawal success |
| `/merchant/payouts/history` | MerchantPayoutHistory | Payout history |

### Notifications
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/notifications` | MerchantNotifications | Notification list |
| `/merchant/notifications/:notificationId` | MerchantNotificationDetail | Notification detail |
| `/merchant/notifications/preferences` | MerchantNotificationPreferences | Preferences |
| `/merchant/notifications/archive` | MerchantNotificationsArchive | Archived notifications |

### Shipments
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/shipments` | MerchantShipments | Shipment list |
| `/merchant/shipments/bulk` | MerchantShipmentsBulk | Bulk shipment |
| `/merchant/shipments/create/:orderId` | MerchantShipmentCreate | Create shipment |
| `/merchant/shipments/:shipmentId` | MerchantShipmentDetails | Shipment details |
| `/merchant/shipments/:shipmentId/edit` | MerchantShipmentEdit | Edit shipment |
| `/merchant/shipments/:shipmentId/status` | MerchantShipmentStatus | Update status |
| `/merchant/shipments/:shipmentId/proof` | MerchantShipmentProof | Upload proof |
| `/merchant/shipments/:shipmentId/timeline` | MerchantShipmentTimeline | Timeline |

### Support
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/support` | MerchantSupport | Support hub |
| `/merchant/support/create` | MerchantSupportCreate | Create ticket |
| `/merchant/support/tickets` | MerchantSupportTickets | Ticket list |
| `/merchant/support/ticket/:ticketId` | MerchantSupportTicketDetails | Ticket details |
| `/merchant/support/upload/:ticketId` | MerchantSupportUpload | Upload attachment |
| `/merchant/support/result/:ticketId` | MerchantSupportResult | Ticket result |
| `/merchant/support/faq` | MerchantSupportFaq | FAQ |

### Settings
| Route | Page | Description |
|-------|------|-------------|
| `/merchant/settings` | MerchantSettings | Merchant settings |
| `/merchant/verification` | MerchantVerification | Verification |
| `/merchant/verification/docs` | MerchantVerificationDocs | Upload documents |
| `/merchant/profile` | MerchantProfile | Profile |
| `/merchant/profile/edit` | MerchantEditProfile | Edit profile |

---

## Admin Pages

All admin routes are prefixed with `/admin` and require authentication.

### Authentication
| Route | Page | Description |
|-------|------|-------------|
| `/admin/login` | AdminLogin | Admin login |
| `/admin/reset-password` | AdminResetPassword | Password reset |
| `/admin/reset-password/confirm` | AdminResetPasswordConfirm | Confirm reset |

### Dashboard
| Route | Page | Description |
|-------|------|-------------|
| `/admin/dashboard` | AdminDashboard | Admin dashboard |

### Payments
| Route | Page | Description |
|-------|------|-------------|
| `/admin/payments` | AdminPayments | Payment list |
| `/admin/payments/:paymentId` | AdminPaymentDetails | Payment details |
| `/admin/payments/:paymentId/force-release` | AdminForceRelease | Force release |
| `/admin/payments/:paymentId/force-refund` | AdminForceRefund | Force refund |

### Refunds
| Route | Page | Description |
|-------|------|-------------|
| `/admin/refunds` | AdminRefunds | Refund list |
| `/admin/refunds/:refundId` | AdminRefundDetails | Refund details |

### Disputes
| Route | Page | Description |
|-------|------|-------------|
| `/admin/disputes` | AdminDisputes | Dispute list |
| `/admin/disputes/:disputeId` | AdminDisputeReview | Review dispute |
| `/admin/disputes/:disputeId/decision` | AdminDisputeDecision | Make decision |

### Merchants
| Route | Page | Description |
|-------|------|-------------|
| `/admin/merchants` | AdminMerchants | Merchant list |
| `/admin/merchants/:merchant_id` | AdminMerchantDetails | Merchant details |
| `/admin/merchants/:merchant_id/verification` | AdminMerchantVerification | Verification |
| `/admin/merchants/:merchant_id/ban` | AdminMerchantBan | Ban merchant |
| `/admin/merchants/:merchant_id/kyc` | AdminMerchantKyc | KYC review |
| `/admin/merchants/:merchant_id/bankdetails-verify` | AdminMerchantBankVerify | Verify bank |
| `/admin/merchants/:merchant_id/verification-history` | AdminMerchantVerificationHistory | History |

### Users
| Route | Page | Description |
|-------|------|-------------|
| `/admin/users` | AdminUsers | User list |
| `/admin/users/:user_id` | AdminUserDetails | User details |
| `/admin/users/:user_id/ban` | AdminUserBan | Ban user |
| `/admin/users/:user_id/profile` | AdminUserProfile | User profile |
| `/admin/users/:user_id/controls` | AdminUserControls | User controls |
| `/admin/users/:user_id/wallet` | AdminUserWallet | User wallet |
| `/admin/users/:user_id/transactions` | AdminUserTransactions | Transactions |
| `/admin/users/:user_id/kyc` | AdminUserKyc | KYC review |
| `/admin/users/:user_id/bankdetails-verify` | AdminUserBankVerify | Verify bank |
| `/admin/users/:user_id/verification-history` | AdminUserVerificationHistory | History |

### Orders
| Route | Page | Description |
|-------|------|-------------|
| `/admin/orders` | AdminOrders | Order list |
| `/admin/orders/:orderId` | AdminOrderDetails | Order details |

### Payouts
| Route | Page | Description |
|-------|------|-------------|
| `/admin/payouts` | AdminPayouts | Payout list |
| `/admin/payouts/:payoutId` | AdminPayoutDetails | Payout details |
| `/admin/payouts/:payoutId/verify` | AdminPayoutVerify | Verify payout |

### Shipments
| Route | Page | Description |
|-------|------|-------------|
| `/admin/shipments` | AdminShipments | Shipment list |
| `/admin/shipments/:shipmentId` | AdminShipmentDetails | Shipment details |

### Escrow
| Route | Page | Description |
|-------|------|-------------|
| `/admin/escrow` | AdminEscrow | Escrow list |
| `/admin/escrow/:escrow_id` | AdminEscrowDetails | Escrow details |
| `/admin/escrow/:escrow_id/orders` | AdminEscrowOrders | Escrow orders |
| `/admin/escrow/:escrow_id/history` | AdminEscrowHistory | Transaction history |
| `/admin/escrow/:escrow_id/actions` | AdminEscrowActions | Escrow actions |

### Withdrawals
| Route | Page | Description |
|-------|------|-------------|
| `/admin/withdrawals` | AdminWithdrawals | Withdrawal list |
| `/admin/withdrawals/:withdrawal_id` | AdminWithdrawalDetails | Withdrawal details |
| `/admin/withdrawals/:withdrawal_id/merchant` | AdminWithdrawalMerchant | Merchant info |
| `/admin/withdrawals/:withdrawal_id/history` | AdminWithdrawalHistory | History |
| `/admin/withdrawals/:withdrawal_id/actions` | AdminWithdrawalActions | Actions |

### Support
| Route | Page | Description |
|-------|------|-------------|
| `/admin/support` | AdminSupport | Support tickets |
| `/admin/support/:ticketId` | AdminSupportTicket | Ticket container |
| `/admin/support/:ticketId/details` | AdminSupportTicketDetails | Ticket details |
| `/admin/support/:ticketId/conversation` | AdminSupportTicketConversation | Conversation |
| `/admin/support/:ticketId/attachments` | AdminSupportTicketAttachments | Attachments |
| `/admin/support/:ticketId/history` | AdminSupportTicketHistory | History |
| `/admin/support/:ticketId/actions` | AdminSupportTicketActions | Actions |

### Notifications
| Route | Page | Description |
|-------|------|-------------|
| `/admin/notifications` | AdminNotifications | Notification list |
| `/admin/notifications/create` | AdminNotificationCreate | Create notification |
| `/admin/notifications/:notificationId` | AdminNotificationDetails | Details |
| `/admin/notifications/:notificationId/recipients` | AdminNotificationRecipients | Recipients |
| `/admin/notifications/:notificationId/history` | AdminNotificationHistory | History |
| `/admin/notifications/:notificationId/actions` | AdminNotificationActions | Actions |

---

## Error Pages

| Route | Page | Description |
|-------|------|-------------|
| `*` | NotFound | 404 page |

---

## Total Page Count

- **Public Pages**: 5
- **Customer Pages**: 34
- **Merchant Pages**: 35
- **Admin Pages**: 52
- **Error Pages**: 1

**Total: ~127 pages**
