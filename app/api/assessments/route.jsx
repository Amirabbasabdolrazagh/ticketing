import ProjectAssessment from "@/models/projectAssessments";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

export async function GET() {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "ابتدا وارد حساب شوید" }, { status: 401 });
  const assessments = await ProjectAssessment.find({ assignee: user._id })
    .populate("project", "name code description")
    .sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, assessments });
}
