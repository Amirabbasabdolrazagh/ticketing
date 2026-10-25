export const CATEGORIES = Object.freeze([
  "quarterly_transactions",
  "tax_vat",
  "purchase_invoice",
  "sales_invoice",
]);

export const validCategory = (value) => typeof value === "string" && CATEGORIES.includes(value);

export function cleanText(value, limit, required = false) {
  if (typeof value !== "string" || !Number.isInteger(limit) || limit < 1) return null;
  const text = value.trim();
  if (text.length > limit || text.includes("\0") || (required && !text)) return null;
  return text;
}

export function cleanDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T12:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function detectType(bytes) {
  if (!Buffer.isBuffer(bytes)) return null;
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export const validStorageKey = (key) =>
  typeof key === "string" && /^[a-f0-9]{32}\.(pdf|jpg|png|webp)$/.test(key);
