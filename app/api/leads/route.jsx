import Lead from "@/models/leads";
import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";

export async function GET() {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "Forbidden" }, { status: 403 });
  const leads = await Lead.find().populate("assignedTo", "name").sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, leads });
}

export async function PATCH(req) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "Forbidden" }, { status: 403 });
  const { leadId, status, notes, assignedTo } = await req.json();
  const allowed = ["new", "contacted", "qualified", "converted", "lost"];
  if (!leadId || (status !== undefined && !allowed.includes(status))) return Response.json({ success: false, message: "اطلاعات نامعتبر است" }, { status: 400 });
  if (assignedTo) {
    const agent = await User.findOne({ _id: assignedTo, role: "agent" }).select("_id");
    if (!agent) return Response.json({ success: false, message: "پشتیبان نامعتبر است" }, { status: 400 });
  }
  const lead = await Lead.findByIdAndUpdate(leadId, { ...(status !== undefined ? { status } : {}), ...(notes !== undefined ? { notes: String(notes).slice(0, 3000) } : {}), ...(assignedTo !== undefined ? { assignedTo: assignedTo || null } : {}) }, { new: true }).populate("assignedTo", "name");
  if (!lead) return Response.json({ success: false, message: "سرنخ پیدا نشد" }, { status: 404 });
  return Response.json({ success: true, lead });
}
