import Organization from "@/models/organizations";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

export async function GET() {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user || user.role !== "organization_manager") {
      return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const organization = await Organization.findOne({
      isActive: true,
      $or: [{ manager: user._id }, { _id: user.organization }],
    }).select("name code supportContract equipment").lean();
    if (!organization) {
      return Response.json({ success: false, message: "سازمان فعال برای این حساب پیدا نشد" }, { status: 404 });
    }

    const contract = organization.supportContract || {};
    const contractIsActive = contract.status === "active"
      && (!contract.startAt || new Date(contract.startAt) <= new Date())
      && (!contract.endAt || new Date(contract.endAt) >= new Date());
    const configuredFeatures = contract.features || {};
    const features = Object.fromEntries(
      ["onsiteService", "secureCall", "remoteSupport", "prioritySupport"]
        .map((key) => [key, contractIsActive && Boolean(configuredFeatures[key])]),
    );

    return Response.json({
      success: true,
      organization: { id: organization._id.toString(), name: organization.name, code: organization.code },
      contract: { title: contract.title, level: contract.level, status: contract.status, startAt: contract.startAt, endAt: contract.endAt, isActive: contractIsActive },
      features,
      equipment: organization.equipment || [],
    });
  } catch (error) {
    console.error("ORGANIZATION CAPABILITIES ERROR", error);
    return Response.json({ success: false, message: "دریافت دسترسی‌های قرارداد ناموفق بود" }, { status: 500 });
  }
}
