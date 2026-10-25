import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import getCurrentUser from "@/utils/auth";
import { canAccessAccounting } from "@/lib/accountingAccessPolicy.mjs";
import { detectType, validStorageKey } from "@/lib/accountingValidation.mjs";
export { cleanDate, cleanText, validCategory } from "@/lib/accountingValidation.mjs";

const ROOT = path.resolve(process.cwd(), "storage", "accounting-archive");
export const MAX_SIZE = 15 * 1024 * 1024;
const TYPES = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function accountingAccess() {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ success: false, message: "ورود الزامی است" }, { status: 401 }) };
  if (!canAccessAccounting(user.role)) return { error: Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 }) };
  return { user };
}
function filePath(key) {
  if (!validStorageKey(key)) throw new Error("Invalid storage key");
  return path.join(ROOT, key);
}
export async function saveFile(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_SIZE) throw new Error("INVALID_SIZE");
  const type = detectType(bytes);
  if (!type) throw new Error("INVALID_TYPE");
  const key = randomUUID().replaceAll("-", "") + "." + type;
  await mkdir(ROOT, { recursive: true, mode: 0o700 });
  await writeFile(filePath(key), bytes, { mode: 0o600, flag: "wx" });
  return { storageKey: key, mimeType: TYPES[type] };
}
export const loadFile = (key) => readFile(filePath(key));
export const removeFile = (key) => unlink(filePath(key));
