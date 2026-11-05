import { z } from "zod";
export const recordKinds = ["agreement", "lease", "income", "expense"] as const;
export type RecordKind = typeof recordKinds[number];
export const expenseCategories = ["maintenance", "utilities", "cleaning", "security", "insurance", "administration", "other"] as const;
const id = z.string().regex(/^[a-f\d]{24}$/i);
const text = z.string().trim().max(2000);
const name = z.string().trim().min(2).max(160);
const money = z.number().finite().positive().max(1e12).multipleOf(.01);
const optionalMoney = z.number().finite().min(0).max(1e12).multipleOf(.01).optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}, "Enter a valid date.");
const period = { startDate: date, endDate: date };
const maxPeriodDays = 366 * 20;
const withinPeriodLimit = (start:string,end:string) => (new Date(end).getTime()-new Date(start).getTime())/86400000 <= maxPeriodDays;
const base = { title: name, unit: z.string().trim().max(80).default(""), notes: text.default("") };
const agreement = z.object({
  ...base, ...period, ownerName: name, ownerPhone: z.string().trim().min(5).max(40),
  responsibleUserId: id, scope: z.enum(["whole_property", "unit"]),
  feeBasis: z.enum(["collected_rent", "scheduled_rent", "fixed"]),
  commissionRate: z.number().int().min(5).max(15).optional(), fixedFee: optionalMoney,
  status: z.enum(["draft", "active", "ended"]),
}).strict().superRefine((value, ctx) => {
  if (!withinPeriodLimit(value.startDate,value.endDate)) ctx.addIssue({code:"custom",path:["endDate"],message:"Maximum record term is 20 years."});
  if (value.endDate < value.startDate) ctx.addIssue({code:"custom",path:["endDate"],message:"End date must follow start date."});
  if (value.scope === "unit" && !value.unit) ctx.addIssue({code:"custom",path:["unit"],message:"Choose a unit."});
  if (value.feeBasis === "fixed" ? value.fixedFee === undefined : value.commissionRate === undefined) ctx.addIssue({code:"custom",path:["feeBasis"],message:"Enter the agreed fee."});
  if (value.feeBasis === "fixed" && value.commissionRate !== undefined || value.feeBasis !== "fixed" && value.fixedFee !== undefined) ctx.addIssue({code:"custom",path:["feeBasis"],message:"Use only the selected fee basis."});
});
const lease = z.object({
  ...base, ...period, agreementId: id, tenantName: name, tenantPhone: z.string().trim().min(5).max(40),
  rentAmount: money, frequency: z.enum(["monthly", "quarterly", "semiannual", "annual"]), deposit: optionalMoney,
  firstDueDate: date, status: z.enum(["draft", "active", "ended"]),
}).strict().superRefine((value, ctx) => {
  if (!withinPeriodLimit(value.startDate,value.endDate)) ctx.addIssue({code:"custom",path:["endDate"],message:"Maximum record term is 20 years."});
  if (value.endDate < value.startDate) ctx.addIssue({code:"custom",path:["endDate"],message:"End date must follow start date."});
  if (value.firstDueDate < value.startDate || value.firstDueDate > value.endDate) ctx.addIssue({code:"custom",path:["firstDueDate"],message:"First due date must be within the lease."});
});
const finance = {
  ...base, amount: money, date, agreementId: id.optional(), leaseId: id.optional(),
  counterparty: name, dueDate: date.optional(), status: z.enum(["pending", "settled"]), settledDate: date.optional(),
  reference: z.string().trim().max(160).default(""),
};
const income = z.object({...finance, category:z.enum(["rent", "sale", "deposit", "commission", "other"]), beneficiary:z.enum(["owner","office"])}).strict();
const expense = z.object({...finance, category:z.enum(expenseCategories), payer:z.enum(["owner","tenant","office"])}).strict();
export const dataSchemas = {agreement,lease,income,expense};
export type RecordData = z.infer<typeof agreement> | z.infer<typeof lease> | z.infer<typeof income> | z.infer<typeof expense>;
export const recordInput = z.object({propertyId:id,kind:z.enum(recordKinds),data:z.record(z.string(),z.unknown())}).strict().superRefine((value,ctx) => {
  const parsed = dataSchemas[value.kind].safeParse(value.data);
  if (!parsed.success) for (const issue of parsed.error.issues) ctx.addIssue({code:"custom",path:["data",...issue.path],message:issue.message});
  if (parsed.success && (value.kind === "income" || value.kind === "expense")) {
    const finance = parsed.data as z.infer<typeof income>;
    if (finance.status === "settled" && !finance.settledDate || finance.status === "pending" && finance.settledDate) ctx.addIssue({code:"custom",path:["data","settledDate"],message:"Payment date is required only for settled records."});

  }
});
export const editInput = z.object({id,version:z.number().int().nonnegative(),data:z.record(z.string(),z.unknown()).optional(),archiveReason:z.string().trim().min(5).max(500).optional()}).strict().refine(v=>Boolean(v.data) !== Boolean(v.archiveReason),"Choose an edit or an archive action.");
export interface AttachmentMeta { id:string; name:string; size:number; mime:string }
export interface AuditEvent { action:string; at:string; actorId:string; actorName:string; before?:Record<string,unknown>; after?:Record<string,unknown>; reason?:string }
export interface OfficeRecord {
  _id:string;propertyId:string;kind:RecordKind;data:Record<string,unknown>;version:number;archived:boolean;
  paymentSummary?:{paid:number;remaining:number};
  attachments:AttachmentMeta[];audit:AuditEvent[];createdAt:string;updatedAt:string;
}
export function financialTotals(records: Pick<OfficeRecord,"kind"|"data"|"archived">[]) {
  const total = {received:0,paid:0,expected:0,planned:0};
  for (const record of records) {
    if (record.archived || !["income","expense"].includes(record.kind)) continue;
    const cents = Math.round(Number(record.data.amount)*100);
    if (!Number.isFinite(cents)) continue;
    const key = record.kind === "income" ? record.data.status === "settled" ? "received" : "expected" : record.data.status === "settled" ? "paid" : "planned";
    total[key] += cents;
  }
  return Object.fromEntries(Object.entries(total).map(([key,value])=>[key,value/100])) as typeof total;
}
