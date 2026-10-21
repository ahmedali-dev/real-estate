import { literalSearch } from "./search";

export const dashboardFilterGroups = [
  { en: "Listing & location", ar: "العقار والموقع", fields: [
    { key: "listingId", en: "Listing ID", ar: "معرف العقار", type: "text" },
    { key: "title", en: "Title contains", ar: "العنوان يحتوي", type: "text" },
    { key: "description", en: "Description contains", ar: "الوصف يحتوي", type: "text" },
    { key: "city", en: "City", ar: "المدينة", type: "text" },
    { key: "district", en: "District", ar: "الحي", type: "text" },
    { key: "address", en: "Address", ar: "العنوان التفصيلي", type: "text" },
    { key: "mapLink", en: "Map URL contains", ar: "رابط الخريطة يحتوي", type: "text" },
    { key: "tiktokLink", en: "TikTok URL contains", ar: "رابط TikTok يحتوي", type: "text" },
    { key: "imageLink", en: "Image URL contains", ar: "رابط الصورة يحتوي", type: "text" },
    { key: "rentalPeriod", en: "Rental period", ar: "مدة الإيجار", type: "period" },
    { key: "broughtByUserId", en: "Offer brought by", ar: "مصدر العرض", type: "user" },
    { key: "broughtByName", en: "Offer source name contains", ar: "اسم مصدر العرض يحتوي", type: "text" },
  ] },
  { en: "Rooms & amenities", ar: "الغرف والتجهيزات", nonLand: true, fields: [
    { key: "maxRooms", en: "Maximum rooms", ar: "أقصى عدد غرف", type: "number" },
    { key: "bathrooms", en: "Minimum bathrooms", ar: "أقل عدد دورات مياه", type: "number" },
    { key: "maxBathrooms", en: "Maximum bathrooms", ar: "أقصى عدد دورات مياه", type: "number" },
    { key: "hasKitchen", en: "Kitchen", ar: "مطبخ", type: "boolean" },
    { key: "kitchenCabinetsInstalled", en: "Kitchen cabinets installed", ar: "مطبخ راكب", type: "boolean" },
    { key: "acInstalled", en: "AC installed (standalone listings)", ar: "مكيفات راكبة (العقار المستقل)", type: "boolean" },
  ] },
  { en: "Owner", ar: "المالك", fields: [
    { key: "hasOwner", en: "Owner information recorded", ar: "بيانات المالك مسجلة", type: "boolean" },
    { key: "ownerName", en: "Owner name", ar: "اسم المالك", type: "text" },
    { key: "ownerPhone", en: "Owner phone", ar: "هاتف المالك", type: "text" },
    { key: "ownerEmail", en: "Owner email", ar: "بريد المالك", type: "text" },
    { key: "ownerNotes", en: "Owner notes", ar: "ملاحظات المالك", type: "text" },
  ] },
  { en: "Tenant", ar: "المستأجر", nonLand: true, fields: [
    { key: "hasTenant", en: "Tenant information recorded", ar: "بيانات المستأجر مسجلة", type: "boolean" },
    { key: "tenantName", en: "Tenant name", ar: "اسم المستأجر", type: "text" },
    { key: "tenantPhone", en: "Tenant phone", ar: "هاتف المستأجر", type: "text" },
    { key: "tenantId", en: "Tenant ID number", ar: "رقم هوية المستأجر", type: "text" },
  ] },
  { en: "Building units", ar: "وحدات المبنى", building: true, fields: [
    { key: "minUnits", en: "Minimum unit count", ar: "أقل عدد وحدات", type: "number" },
    { key: "maxUnits", en: "Maximum unit count", ar: "أقصى عدد وحدات", type: "number" },
    { key: "unitName", en: "Unit name / number", ar: "اسم أو رقم الوحدة", type: "text" },
    { key: "unitRented", en: "Matching unit is rented", ar: "الوحدة المطابقة مؤجرة", type: "boolean" },
    { key: "electricityNumber", en: "Electricity number", ar: "رقم الكهرباء", type: "text" },
  ] },
  { en: "Dates", ar: "التواريخ", fields: [
    { key: "createdFrom", en: "Created from", ar: "تاريخ الإضافة من", type: "date" },
    { key: "createdTo", en: "Created through", ar: "تاريخ الإضافة إلى", type: "date" },
    { key: "updatedFrom", en: "Updated from", ar: "تاريخ التحديث من", type: "date" },
    { key: "updatedTo", en: "Updated through", ar: "تاريخ التحديث إلى", type: "date" },
  ] },
] as const;
export const dashboardFilterKeys = dashboardFilterGroups.flatMap(group => group.fields.map(field => field.key));
export type DashboardFilterKey = typeof dashboardFilterKeys[number];

/** Staff-only query builder. Unit criteria are grouped in one elemMatch. */
export function dashboardFilterConditions(params: URLSearchParams, category: string | null): Record<string, unknown>[] {
  const conditions: Record<string, unknown>[] = [];
  const unit: Record<string, unknown>[] = [];
  const detail: Record<string, unknown>[] = [];
  const nonLand = category !== "land";
  function text(key: string, field: string, target = conditions) { const value = literalSearch(params.get(key)); if (value) target.push({ [field]: { $regex: value, $options: "i" } }); }
  for (const [key, field] of Object.entries({ title: "title", description: "description", city: "location.city", district: "location.district", address: "location.address", mapLink: "location.mapUrl", tiktokLink: "tiktokUrl", imageLink: "images", ownerName: "owner.name", ownerPhone: "owner.phone", ownerEmail: "owner.email", ownerNotes: "owner.notes", broughtByName: "broughtBy.name" })) text(key, field);
  const id = params.get("listingId");
  if (id) { if (!/^[a-f\d]{24}$/i.test(id)) throw new RangeError("Invalid listing ID."); conditions.push({ _id: id }); }
  const user = params.get("broughtByUserId");
  if (user) { if (!/^[a-f\d]{24}$/i.test(user)) throw new RangeError("Invalid offer source."); conditions.push({ "broughtBy.userId": user }); }
  const period = params.get("rentalPeriod");
  if (nonLand && period) { if (!["monthly", "yearly"].includes(period)) throw new RangeError("Invalid rental period."); conditions.push({ listingType: "rent", rentalPeriod: period }); }
  function numeric(key: string) { const raw = params.get(key); if (!raw) return undefined; const value = Number(raw); if (!Number.isInteger(value) || value < 0 || value > 200) throw new RangeError("Room, bathroom and unit counts must be between 0 and 200."); return value; }
  function range(minKey: string, maxKey: string, field: string, target: Record<string, unknown>[]) {
    const min = numeric(minKey), max = numeric(maxKey); if (min != null && max != null && min > max) throw new RangeError("Minimum cannot exceed maximum.");
    if (min != null || max != null) target.push({ [field]: { ...(min != null ? { $gte: min } : {}), ...(max != null ? { $lte: max } : {}) } });
  }
  if (nonLand) {
    range("rooms", "maxRooms", "rooms", detail); range("bathrooms", "maxBathrooms", "bathrooms", detail);
    for (const field of ["hasKitchen", "kitchenCabinetsInstalled"]) { const value = params.get(field); if (["yes", "no"].includes(value || "")) detail.push({ [field]: value === "yes" }); }
    const residency = params.get("residencyType"); if (["family", "singles", "women_only"].includes(residency || "")) detail.push({ residencyType: residency });
    for (const [key, field] of [["tenantName", "tenant.name"], ["tenantPhone", "tenant.phone"], ["tenantId", "tenant.idNumber"]]) text(key, field, detail);
    const hasTenant = params.get("hasTenant");
    if (["yes", "no"].includes(hasTenant || "")) {
      const recorded = { $or: ["name", "phone", "idNumber"].map(key => ({ [`tenant.${key}`]: { $exists: true, $nin: [null, ""] } })) };
      detail.push(hasTenant === "yes" ? recorded : { $nor: [recorded] });
    }
    if (["yes", "no"].includes(params.get("acInstalled") || "")) conditions.push({ "details.acInstalled": params.get("acInstalled") === "yes" });
  }
  if (!category || category === "build") {
    const min = numeric("minUnits"), max = numeric("maxUnits");
    if (min != null && max != null && min > max) throw new RangeError("Minimum units cannot exceed maximum.");
    if (min != null || max != null) conditions.push({ category: "build", $expr: { $and: [...(min != null ? [{ $gte: [{ $size: { $ifNull: ["$units", []] } }, min] }] : []), ...(max != null ? [{ $lte: [{ $size: { $ifNull: ["$units", []] } }, max] }] : [])] } });
    const name = literalSearch(params.get("unitName")); if (name) unit.push({ $or: [{ name: { $regex: name, $options: "i" } }, { number: { $regex: name, $options: "i" } }] });
    text("electricityNumber", "electricityNumber", unit);
    if (["yes", "no"].includes(params.get("unitRented") || "")) {
      const rented = { $or: [{ isRented: true }, { isRented: { $exists: false }, "tenant.name": { $exists: true, $nin: [null, ""] } }] };
      unit.push(params.get("unitRented") === "yes" ? rented : { $nor: [rented] });
    }
  }
  if (unit.length) conditions.push({ category: "build", units: { $elemMatch: { $and: [...detail, ...unit] } } });
  else if (detail.length) {
    const top = detail.map(condition => {
      function prefix(value: unknown): unknown {
        if (Array.isArray(value)) return value.map(prefix);
        if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.startsWith("$") ? key : key.startsWith("tenant.") ? key : `details.${key}`, key.startsWith("$") ? prefix(item) : item]));
        return value;
      }
      return prefix(condition);
    });
    conditions.push({ $or: [{ category: { $ne: "build" }, $and: top }, { category: "build", units: { $elemMatch: { $and: detail } } }] });
  }
  const owner = params.get("hasOwner"); if (["yes", "no"].includes(owner || "")) conditions.push(owner === "yes" ? { "owner.name": { $exists: true, $nin: [null, ""] } } : { $or: [{ "owner.name": { $exists: false } }, { "owner.name": null }, { "owner.name": "" }] });
  for (const [from, to, field] of [["createdFrom", "createdTo", "createdAt"], ["updatedFrom", "updatedTo", "updatedAt"]]) {
    const start = params.get(from), end = params.get(to); if (!start && !end) continue;
    for (const raw of [start, end]) if (raw && (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw)) || new Date(raw).toISOString().slice(0, 10) !== raw)) throw new RangeError("Invalid date.");
    if (start && end && start > end) throw new RangeError("Start date cannot follow end date.");
    conditions.push({ [field]: { ...(start ? { $gte: new Date(`${start}T00:00:00.000Z`) } : {}), ...(end ? { $lt: new Date(Date.parse(`${end}T00:00:00.000Z`) + 86400000) } : {}) } });
  }
  return conditions;
}
