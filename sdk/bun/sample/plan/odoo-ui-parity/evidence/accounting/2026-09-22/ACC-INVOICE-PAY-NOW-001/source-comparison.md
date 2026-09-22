# Source comparison

| Odoo behavior | Core3 implementation | Result |
| --- | --- | --- |
| Preview exposes Pay Now for an open posted customer invoice | Preview page adds `pay_now_accounting_invoice` with residual/state guard | implemented |
| `/payment/pay` renders a provider-aware public payment form | `/accounting/invoice-payment` renders a payment form with provider/method choices and persisted invoice data | bounded implementation |
| `/payment/transaction` starts a draft payment transaction before provider processing | `submit_accounting_invoice_payment` inserts a linked `pending` transaction with durable reference | bounded implementation |
| Provider confirmation later settles the transaction/invoice | Core3 stops at pending and leaves invoice residual/state unchanged | explicit follow-up |
| Public access token and portal sharing protect external invoice access | Core3 uses authenticated Accounting read/write permissions; no public token route added | explicit follow-up |
