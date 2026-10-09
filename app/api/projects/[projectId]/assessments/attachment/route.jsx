import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import ProjectAssessment from "@/models/projectAssessments";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user || !["admin", "passive_agent", "active_agent"].includes(user.role)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const { projectId } = await params;
    const query = new URL(req.url).searchParams;
    const assessmentId = query.get("assessmentId"); const fileName = path.basename(query.get("file") || "");
    const filter = authorization(user, ["admin"]) ? { _id: assessmentId, project: projectId } : { _id: assessmentId, project: projectId, assignee: user._id };
    const assessment = await ProjectAssessment.findOne(filter).lean();
    const attachment = assessment?.attachments?.find((item) => item.path === fileName);
    if (!attachment) return Response.json({ success: false, message: "پیوست پیدا نشد" }, { status: 404 });
    const file = await readFile(path.join(process.cwd(), "storage", "project-assessments", fileName));
    return new Response(file, { headers: { "Content-Type": attachment.mimeType || "application/octet-stream", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}` } });
  } catch (error) { return Response.json({ success: false, message: "خواندن فایل انجام نشد" }, { status: 404 }); }
}

export async function POST(req, { params }) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user || !["admin", "passive_agent", "active_agent"].includes(user.role)) {
      return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    }
    const { projectId } = await params;
    const form = await req.formData();
    const assessmentId = form.get("assessmentId");
    const file = form.get("file");
    if (!isValidObjectId(projectId) || !isValidObjectId(assessmentId) || !file || typeof file.arrayBuffer !== "function") {
      return Response.json({ success: false, message: "فایل یا فرم معتبر نیست" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) return Response.json({ success: false, message: "حداکثر حجم فایل ۱۰ مگابایت است" }, { status: 400 });
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) return Response.json({ success: false, message: "فقط تصویر یا PDF مجاز است" }, { status: 400 });
    const filter = authorization(user, ["admin"])
      ? { _id: assessmentId, project: projectId }
      : { _id: assessmentId, project: projectId, assignee: user._id };
    const assessment = await ProjectAssessment.findOne(filter);
    if (!assessment) return Response.json({ success: false, message: "فرم پیدا نشد" }, { status: 404 });
    const dir = path.join(process.cwd(), "storage", "project-assessments");
    await mkdir(dir, { recursive: true });
    const ext = path.extname(file.name || "").toLowerCase() || ".bin";
    const storedName = `${assessmentId}-${crypto.randomUUID()}${ext}`;
    await writeFile(path.join(dir, storedName), Buffer.from(await file.arrayBuffer()));
    assessment.attachments.push({ name: file.name || storedName, path: storedName, mimeType: file.type, size: file.size });
    await assessment.save();
    return Response.json({ success: true, attachment: assessment.attachments.at(-1) }, { status: 201 });
  } catch (error) {
    console.error("ASSESSMENT ATTACHMENT ERROR", error);
    return Response.json({ success: false, message: "ذخیره فایل انجام نشد" }, { status: 500 });
  }
}
