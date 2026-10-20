import { isValidObjectId } from "mongoose";
import Organization from "@/models/organizations";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import { validateSlaPolicy } from "@/lib/slaPolicy.mjs";

export const runtime = "nodejs";

async function authorize(organizationId) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: Response.json({success:false,message:"Forbidden"},{status:403}) };
  if (!isValidObjectId(organizationId)) return { error: Response.json({success:false,message:"شناسه سازمان نامعتبر است"},{status:400}) };
  await ConnectDb();
  const org = await Organization.findById(organizationId);
  if (!org) return { error: Response.json({success:false,message:"سازمان پیدا نشد"},{status:404}) };
  return { org };
}
export async function GET(_req,{params}) {
  const {organizationId} = await params;
  const result = await authorize(organizationId);
  if (result.error) return result.error;
  return Response.json({success:true,policy:result.org.supportContract?.slaPolicy || null});
}
export async function PUT(req,{params}) {
  const {organizationId} = await params;
  const result = await authorize(organizationId);
  if (result.error) return result.error;
  const body = await req.json().catch(() => null);
  if (body?.enabled === false && body.targets === undefined) {
    result.org.set("supportContract.slaPolicy.enabled", false);
    await result.org.save();
    return Response.json({ success: true, policy: result.org.supportContract.slaPolicy });
  }
  let policy;
  try { policy = validateSlaPolicy(body); }
  catch { return Response.json({success:false,message:"سیاست SLA باید دارای مقادیر معتبر برای اولویت کم، متوسط و بالا باشد (حالت ۲۴ ساعته)."},{status:400}); }
  result.org.set("supportContract.slaPolicy",policy);
  await result.org.save();
  return Response.json({success:true,policy:result.org.supportContract.slaPolicy});
}
