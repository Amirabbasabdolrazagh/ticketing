import { isValidObjectId } from "mongoose";
import InstallationProject from "@/models/installationProjects";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";

export async function GET(req, { params }) {
  await ConnectDb(); const user = await getCurrentUser(); const { projectId } = await params;
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  if (!isValidObjectId(projectId)) return Response.json({ success: false, message: "شناسه پروژه معتبر نیست" }, { status: 400 });
  const project = await InstallationProject.findById(projectId).populate("passiveAgent", "name phone").populate("activeAgent", "name phone").lean();
  if (!project) return Response.json({ success: false, message: "پروژه پیدا نشد" }, { status: 404 });
  return Response.json({ success: true, project });
}
