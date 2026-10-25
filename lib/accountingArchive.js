import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import getCurrentUser from "@/utils/auth";
import { CATEGORIES } from "@/models/accountingDocument";

const ROOT = path.resolve(process.cwd(), "storage", "accounting-archive");
export const MAX_SIZE = 15 * 1024 * 1024;
const TYPES = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function accountingAccess() {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ success: false, message: "ورود الزامی است" }, { status: 401 }) };
  if (!["admin", "accountant"].includes(user.role)) return { error: Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 }) };
  return { user };
}
export const validCategory = (value) => CATEGORIES.includes(value);
export function cleanText(value, limit, required = false) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > limit || text.includes("\0") || (required && !text)) return null;
  return text;
}
export function cleanDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T12:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
function detectType(b) {
  if (b.length >= 5 && b.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return "jpg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "png";
  if (b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}
function filePath(key) {
  if (!/^[a-f0-9]{32}\.(pdf|jpg|png|webp)$/.test(key)) throw new Error("Invalid storage key");
  return path.join(ROOT, key);
}
export async function saveFile(b) {
  if (!b.length || b.length > MAX_SIZE) throw new Error("INVALID_SIZE");
  const type = detectType(b);
  if (!type) throw new Error("INVALID_TYPE");
  const key = randomUUID().replaceAll("-", "") + "." + type;
  await mkdir(ROOT, { recursive: true, mode: 0o700 });
  await writeFile(filePath(key), b, { mode: 0o600, flag: "wx" });
  return { storageKey: key, mimeType: TYPES[type] };
}
export const loadFile = (key) => readFile(filePath(key));
export const removeFile = (key) => unlink(filePath(key));
