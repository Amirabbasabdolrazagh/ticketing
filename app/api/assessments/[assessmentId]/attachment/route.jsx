import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import ProjectAssessment from "@/models/projectAssessments";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";

export const runtime = "nodejs";
const storage = () => path.join(process.cwd(), "storage", "project-assessments");

async function findAccessible(id, user) {
  if (!isValidObjectId(id) || !user) return null;
  return ProjectAssessment.findOne(user.role === "admin" ? { _id: id } : { _id: id, assignee: user._id });
}

export async function GET(req, { params }) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    const { assessmentId } = await params;
    const assessment = await findAccessible(assessmentId, user);
    if (!assessment) return Response.json({ success: false, message: "فرم پیدا نشد" }, { status: 404 });
    const name = path.basename(new URL(req.url).searchParams.get("file") || "");
    const attachment = assessment.attachments.find((item) => item.path === name);
    if (!attachment) return Response.json({ success: false, message: "پیوست پیدا نشد" }, { status: 404 });
    const file = await readFile(path.join(storage(), name));
    return new Response(file, { headers: { "Content-Type": attachment.mimeType || "application/octet-stream", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}` } });
  } catch {
    return Response.json({ success: false, message: "خواندن پیوست ناموفق بود" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    const { assessmentId } = await params;
    if (!user || !["passive_agent", "active_agent"].includes(user.role)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    if (!isValidObjectId(assessmentId)) return Response.json({ success: false, message: "شناسه فرم معتبر نیست" }, { status: 400 });
    const assessment = await ProjectAssessment.findOne({ _id: assessmentId, assignee: user._id, project: null, status: { $in: ["assigned", "in_progress"] } });
    if (!assessment) return Response.json({ success: false, message: "فرم قابل ویرایش نیست" }, { status: 409 });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function" || file.size > 10 * 1024 * 1024) return Response.json({ success: false, message: "فایل معتبر نیست یا بیش از ۱۰ مگابایت است" }, { status: 400 });
    const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
    const ext = extensions[file.type];
    if (!ext) return Response.json({ success: false, message: "فقط تصویر یا PDF مجاز است" }, { status: 400 });
    await mkdir(storage(), { recursive: true });
    const storedName = `${assessmentId}-${crypto.randomUUID()}${ext}`;
    await writeFile(path.join(storage(), storedName), Buffer.from(await file.arrayBuffer()));
    assessment.attachments.push({ name: path.basename(file.name || storedName), path: storedName, mimeType: file.type, size: file.size });
    await assessment.save();
    return Response.json({ success: true, attachment: assessment.attachments.at(-1) }, { status: 201 });
  } catch (error) {
    console.error("ASSESSMENT ATTACHMENT ERROR", error);
    return Response.json({ success: false, message: "ذخیره پیوست ناموفق بود" }, { status: 500 });
  }
}
