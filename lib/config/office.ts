/**
 * Office contact numbers, shown to signed-out visitors in place of a
 * listing's real owner info (name/phone/email are staff-only). Update this
 * list directly to add, remove, or change numbers — there's no admin UI
 * for it yet since it's a small, infrequently-changed set.
 *
 * Numbers are stored in local Saudi format (05XXXXXXXX) and converted to
 * international format (+9665XXXXXXXX) for tel:/wa.me links.
 */
export const OFFICE_PHONE_NUMBERS: string[] = ["0554430357", "0565050004", "0506717943"];

function toInternational(localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  return digits.startsWith("0") ? `966${digits.slice(1)}` : digits;
}

export function officeWhatsAppLink(localNumber: string, message?: string): string {
  const intl = toInternational(localNumber);
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${intl}${query}`;
}

export function officeCallLink(localNumber: string): string {
  return `tel:+${toInternational(localNumber)}`;
}
