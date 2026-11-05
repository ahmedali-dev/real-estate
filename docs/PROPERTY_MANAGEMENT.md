# Property management — Stages 1, 2 and 3

## Workflow

1. Open **Property Management / إدارة الأملاك**.
2. Select a property from the existing database, or create one from this page. Creation returns to that property's management workspace.
3. Save a management agreement with the owner, responsible employee, whole-property or individual-unit scope, dates, and an explicit fee basis.
4. Create leases linked to an agreement. Record the tenant, dates, installment amount/frequency, first due date, and deposit. The schedule preview uses calendar months with month-end adjustment; it does not prorate partial months or create payment records.
5. Enter income and expense records. Pending entries are expected obligations, while settled entries require the actual receipt/payment date. Choose the income beneficiary or expense cost bearer explicitly.
6. Open a saved record's details to upload supporting documents or review its change history.

## Data and accounting rules

- Agreement fees can be 5–15% of collected rent, 5–15% of scheduled rent, or an explicitly entered fixed fee.
- Agreements store the agreed fee basis. Stage 2 uses it for owner balance calculations; the app does not automatically charge or collect money.
- All monetary amounts are SAR, with at most two decimal places.
- Income categories include rent, sale proceeds, deposits, office commission, and other receipts. Deposits are recorded separately and must not be treated as profit in later reports.
- Expense categories include maintenance, utilities, cleaning, security, insurance, administration, and other costs.
- Planned expenses do not count as paid costs; expected income does not count as received cash.
- Lease dates must fit the linked agreement. Active leases require an active agreement. Conflicting active agreements or leases are rejected.
- Building units must have unique numbers before they can be referenced. Numbered units with current management records cannot be removed or renamed through property editing.
- Private record statuses do not automatically change public listing availability.
- Manual transaction references and due dates are supported. Stage 2 adds installment generation, partial-payment reconciliation, maintenance approval and manually recorded owner payouts. Stage 3 adds decision reports, full exports and in-app reminders; bank automation remains separate.

## Privacy and history

Admins and real estate officers can manage all property categories. Project managers are scoped to buildings. Sales officers and signed-out visitors cannot access these records or files.

Every record creation, edit, attachment upload, and archive action saves the employee and timestamp. Edits preserve before/after snapshots. Updates require the current record version; stale writes return HTTP 409. New-record retries use idempotency keys to avoid duplicate financial entries.

Archiving requires a reason and retains history. Archive dependent financial records/leases before their parent agreement. There is no permanent record deletion API. Property deletion is blocked once management records exist.

Documents are stored privately in MongoDB and downloaded through a role-checked endpoint, never through a public Cloudinary URL. Supported formats are PDF, JPEG, PNG, and WebP, checked by file signature; maximum size is 3 MB and maximum count is 10 per record.

## Storage and deployment

Management mutations use MongoDB transactions to save the record, audit event, and property registration atomically. MongoDB Atlas or another replica-set deployment is required; a standalone local MongoDB server is not sufficient. Existing listings require no migration. Records and documents use the new `managementrecords` and `managementattachments` collections.

## API

- `GET /api/property-management`: paginated managed-property directory or existing-property picker.
- `GET /api/property-management/records?propertyId=...`: paginated property records; supports `kind`, `archived`, `page`, and exact `id` for full audit history.
- `GET /api/property-management/records?propertyId=...&options=1`: compact agreement/lease reference options (up to 1,000).
- `POST /api/property-management/records`: create a validated agreement, lease, income, or expense record with an `Idempotency-Key` header.
- `PATCH /api/property-management/records`: update with `id`, `version`, and `data`, or archive with `archiveReason`.
- `POST /api/property-management/attachments`: multipart upload containing `recordId`, current `version`, and `file`.
- `GET /api/property-management/attachments?id=...`: authenticated file download.

All mutation routes require a same-origin request and an authorized staff session.

## Verification

Run `npm run lint`, `npm run build`, and `node --import tsx --test tests/*.test.ts tests/*.test.tsx`.

For end-to-end database verification, run:

```sh
RUN_MANAGEMENT_INTEGRATION=1 node tests/integration-management.mjs
```

This opt-in test uses the configured MongoDB server but creates a randomly named `estate_stage1_it_...` database, starts a test app on loopback port 3012, and removes only its own temporary database afterward. It does not modify the existing application database.

## Stage 2 — operations

Open a managed property's **Maintenance, payments & payouts / الصيانة والدفعات ومستحقات المالك** tab.

### Maintenance

1. Select an active agreement, describe the problem, contractor, estimated cost, urgency, and who bears the cost.
2. An administrator or real estate officer approves a budget. Project managers can submit and complete building work, but cannot approve it.
3. Complete approved work with its actual cost and completion date. Costs above the approved budget are rejected. Cancel the request and create a revised request if more budget is needed.
4. Completion creates exactly one **pending** maintenance expense linked to the agreement. Completion does not mean the contractor has been paid.
5. Record contractor payments against that expense under Payments. Attach quotes to the agreement and invoices to the generated expense using Stage 1 private documents.

Requested and approved work may be cancelled with a reason. Completed work stays in history. Approval, completion, cancellation and reversals save the employee and timestamp.

### Dues and partial payments

- Generate an active lease's full calendar installment schedule once. Each installment becomes an unpaid owner rent obligation. Existing rent entries prevent automatic generation so historical/manual entries cannot be duplicated. Lease deposits remain separately recorded income; schedule generation does not collect deposits.
- Generated schedules lock the lease's financial terms and tenant identity. Its title, notes and status can still be updated unless other accounting protections apply. Future obligations are retained when a lease ends; reconcile contractual changes manually rather than silently deleting debts.
- Choose an income or expense obligation and record actual payments, dates and receipt references. Both full and partial payments are supported; overpayments and future payment dates are rejected.
- The outstanding-dues list shows paid, remaining and overdue amounts, filters receivables/payables, and paginates. Fully paid entries disappear from outstanding dues. Stage 1 lists also show the derived paid/remaining balances.
- Legacy settled records count once as fully paid and cannot receive extra payments. Legacy pending records remain pending obligations; their derived payment balance determines whether they are partially or fully paid.
- Payments are immutable. Officers can reverse an incorrect entry with a reason; reversal restores the outstanding amount. Posted owner payouts must be reversed before related financial history can be corrected. Reversed entries stay visible and no longer count as cash.

### Owner payouts

The workspace calculates a separate cumulative balance for each agreement:

`available = max(0, owner receipts − owner costs actually paid − earned management fees − posted payouts)`

Tenant security deposits and office-owned income are excluded. Tenant/office-borne expenses are not deducted from owner receipts. Unpaid expenses and expected income do not affect cash. Financial records must link to the agreement, directly or through a lease, to enter its balance; unassigned records are excluded.

Fees use the saved agreement: collected-rent percentage on actual owner rent receipts, scheduled-rent percentage on contractual installments due to date (including ended leases, excluding drafts), or the fixed fee once the agreement begins. Fixed fees are cumulative, not charged again on every payout. Amounts are calculated in integer halalas; percentage fees round to the nearest halala.

Officers record a payout **on today's Riyadh date**, after completing the transfer outside this app. The amount cannot exceed the current available balance. The record preserves the owner, agreement and balance snapshot at the time of recording. Subsequent payouts deduct previous payouts. A negative balance is displayed with zero available to transfer.

Posted payouts protect existing financial records and agreement/lease financial terms against edits and archives. Contract title, notes and status can still be updated, subject to lease/agreement validation; records with operational history cannot return to draft. Draft agreements do not accrue fees and cannot receive owner payouts. Reverse incorrect payouts first. Records with live payment, maintenance or generation history also retain their anchors. These conservative locks prevent silently rewriting an already reconciled owner statement. New obligations, work and payments can still be added.

This is an operational cash ledger, not bank reconciliation or a statutory accounting/tax system. No bank transfer, automatic debit, supplier payment or tenant notification is initiated.

### Stage 2 API and storage

- `GET /api/property-management/operations?propertyId=...&kind=maintenance|payment|payout&page=1`: paginated operations, agreement balances, lease references and obligation balances. Payment history includes schedule-generation events.
- `POST /api/property-management/operations`: `action` is `maintenance`, `payment`, `payout`, or `generate`; requires an `Idempotency-Key` UUID. Reusing a key with changed details returns 409.
- `PATCH /api/property-management/operations`: version-checked `approve`, `complete`, `cancel`, or `reverse`; privileged actions require an administrator or real estate officer.

New private `managementoperations` collection. Mutations share the same per-property transactional lock as Stage 1. No migration is required. Ledger loading refuses more than 10,000 active records or operations rather than silently computing an incomplete balance. Stage 3 adds reports/exports and in-app reminders. External bank reconciliation, lease amendments, outbound notifications and owner payout approval chains remain separate work.

## Stage 3 — reports, exports and reminders

Open **Property Management → Reports & reminders / التقارير والتذكيرات**, or the same button in an individual property's workspace. The direct page is `/dashboard/management/reports`.

### Workflow and report views

1. Select a period (up to five years, ending no later than today), property category, property, responsible employee, and agreement/owner. Apply filters. Filter values, report view and pagination are saved in the URL.
2. Review the KPI cards and monthly cash movement. Property performance ranks the lowest owner cash margins first, to focus review on weaker properties. Rent collection rates compare payments received by the end date against recorded rent obligations due within the period, including advance receipts.
3. Choose a report view:
   - **Property performance**: operating receipts, costs, owner cash margin, rent collection, maintenance paid, arrears, fees and payouts.
   - **Cash ledger**: dated receipts, expense payments and owner payouts, with references and cost bearer/beneficiary.
   - **Dues & ageing**: remaining receivables/payables as of the end date, including due-today, 1–30, 31–60, 61–90 and over-90-day bands.
   - **Maintenance & budgets**: completed work in the period and currently open backlog, approved budgets, actual cost, variance and cash paid separately. Cancelled requests originally created in the period remain visible.
   - **Owner statements**: opening balance + owner receipts − costs paid − fees earned − payouts = closing balance. Negative balances are retained; available payout is floored at zero.
   - **Expense breakdown**: actual payments grouped by expense category and owner/tenant/office cost bearer.
   - **Action reminders**: overdue receivables/payables, active leases/agreements expiring within 30 days or already expired, maintenance awaiting approval, active leases without recorded rent dues, and owner financial entries missing an agreement link.
4. Open a row's property workspace to follow up. Reminders are calculated when the report loads; there is no background notification worker, WhatsApp message, email or automatic money movement.
5. Export the selected view as a UTF-8 **CSV**, compatible with Excel and Arabic text, or open **Print / Save PDF** and use the browser's print menu. Exports include all matching rows, regardless of the visible 25-row page. CSV includes the period, currency, generation timestamp and ledger basis. Printable exports include the scope, KPIs and data definitions.

### Calculation basis and interpretation

Reports use a **current, restated ledger**, not immutable historical period closes. Archived and currently reversed entries are excluded even from prior periods. Changes to historical records can change an old period's results. Every report is calculated from a consistent read-only MongoDB snapshot. Each export refreshes that snapshot; it may differ from an earlier on-screen report.

- Cash is assigned to its actual payment/settlement date, including partial payments. Legacy settled entries count once; payment operations are used for pending obligations. No payment and obligation are counted twice.
- Outstanding amounts use all valid payments through the report end date, regardless of the period start date. Due dates determine ageing. Payments after the end date do not reduce an earlier cutoff's arrears.
- Tenant deposits are shown separately from operating receipts. Property cash margin is receipts minus all costs paid, before deposits and owner payouts; it is not office profit.
- Owner cash margin includes only owner-owned operating receipts minus owner-borne costs, before fees and payouts. Office cash net includes office-owned receipts minus office-borne costs only. Earned management fees use the agreed terms and are not automatically extra cash receipts.
- Owner statements require a direct agreement link or a lease linked to an agreement. Unassigned owner entries remain in portfolio cash totals but are excluded from owner statements and flagged for correction.
- Maintenance completion costs, approved budgets and actual payments are separate. Completing work does not count as cash paid.
- Recorded rent obligations determine rent collection rates and arrears. A missing lease schedule can understate debt; reminders flag active leases with no recorded rent dues. No occupancy/yield figure is invented where unit valuation or inventory is incomplete.
- Monetary calculations use integer halalas; unrepresentable totals are rejected rather than silently rounded.

### Access, safety and API

The same listing-management role rules apply to JSON, CSV and printable exports. Administrators and real estate officers can report on all managed property categories; project managers see buildings only; sales officers and signed-out users have no access. Private owner contacts, tenant identity numbers and attached document bytes are not included in report datasets.

`GET /api/property-management/reports` accepts `from`, `to`, `propertyId`, `category`, `agreementId`, `employeeId`, `view`, `page`, `format=json|csv|print` and `lang=ar|en`. Supported views are `properties`, `transactions`, `dues`, `maintenance`, `owners`, `expenses`, and `reminders`. Default period is year-to-date; default view is property performance. JSON includes 25 report rows plus scope options, KPIs and monthly trends. CSV and print ignore page slicing and export the full selected report.

Responses are private/no-store and noindex. CSV text neutralizes spreadsheet formulas and escapes quotes/newlines; numeric negatives remain numbers. Printable HTML escapes all record text and uses a restrictive content security policy. The read-only endpoint performs no property/ledger mutations. Capacity is bounded at 2,000 role-visible managed properties and 20,000 records/operations each; exceeding a bound returns an error without partial financial totals.

The integration test now verifies all three stages, including role-restricted report access, reconciliation against the payment ledger, 25-row pagination, complete multi-page exports, Arabic printable output and CSV formula protection. This release does not add immutable accounting period closes, tax accounting, bank integration, automated delivery, XLSX files or server-generated PDF files.
