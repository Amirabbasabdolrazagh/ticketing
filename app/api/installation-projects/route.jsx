import InstallationProject from "@/models/installationProjects";
import ProjectAssessment from "@/models/projectAssessments";
import ProjectHandover from "@/models/projectHandovers";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";

export async function GET() {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const projects = await InstallationProject.find({}).populate("passiveAgent", "name phone").populate("activeAgent", "name phone").sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, projects });
}

export async function POST(req) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const { name, customerName, location, description, code, passiveAgent, activeAgent } = await req.json();
  if (!name || !code || (!passiveAgent && !activeAgent)) return Response.json({ success: false, message: "نام، کد پروژه و حداقل یک کارشناس الزامی است" }, { status: 400 });
  const normalizedCode = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(normalizedCode)) return Response.json({ success: false, message: "کد پروژه فقط شامل حروف انگلیسی، عدد و خط تیره است" }, { status: 400 });
  if (await InstallationProject.exists({ code: normalizedCode })) return Response.json({ success: false, message: "این کد پروژه قبلاً ثبت شده است" }, { status: 409 });
  const [passive, active] = await Promise.all([passiveAgent ? User.findOne({ _id: passiveAgent, role: "passive_agent" }).select(`name ${messengerUserSelect}`) : null, activeAgent ? User.findOne({ _id: activeAgent, role: "active_agent" }).select(`name ${messengerUserSelect}`) : null]);
  if ((passiveAgent && !passive) || (activeAgent && !active)) return Response.json({ success: false, message: "کارشناس انتخاب‌شده معتبر نیست" }, { status: 400 });
  const project = await InstallationProject.create({ name, customerName, location, description, code: normalizedCode, owner: user._id, passiveAgent: passive?._id || null, activeAgent: active?._id || null });
  for (const [agent, role] of [[passive, "passive_agent"], [active, "active_agent"]]) if (agent) { await ProjectAssessment.create({ project: project._id, assignee: agent._id, assigneeRole: role }); await ProjectHandover.create({ project: project._id, assignee: agent._id, assigneeRole: role }); }
  await Promise.allSettled([[passive, "پسیو"], [active, "اکتیو"]].filter(([agent]) => agent).map(([agent, label]) => sendMessengerNotification(agent, ["📁 <b>ارجاع پروژه جدید</b>", "", `پروژه: <b>${project.name}</b>`, `کد پروژه: <b>${project.code}</b>`, `نقش شما: کارشناس ${label}`, "برای تکمیل فرم ارزیابی وارد سامانه پشتیبانی ای‌تی رسام شوید."].join("\n"))));
  return Response.json({ success: true, project }, { status: 201 });
}
