import ProjectAssessment from "@/models/projectAssessments";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import { ensureProjectFormsForUser } from "@/lib/ensureProjectForms";

export const dynamic = "force-dynamic";

export async function GET() {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "ابتدا وارد حساب شوید" }, { status: 401 });
  if (["passive_agent", "active_agent"].includes(user.role)) await ensureProjectFormsForUser(user._id);
  const assessments = await ProjectAssessment.find({ assignee: user._id })
    .populate("project", "name code description")
    .sort({ createdAt: -1 }).lean();
  return Response.json(
    { success: true, assessments },
    { headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" } },
  );
}
