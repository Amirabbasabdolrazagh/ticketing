/**
 * Injectable SLA admin route handler. Runtime adapters use the real session,
 * MongoDB and policy model; tests use isolated repositories with no credentials.
 * This exercises GET/PUT authorization and persistence boundaries end-to-end
 * at the request/response handler level.
 */
export function createSlaAdminHandlers({ getCurrentUser, isValidObjectId, connectDb, Organization, validateSlaPolicy }) {
  async function authorize(id) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { error: Response.json({ success: false, message: "Forbidden" }, { status: 403 }) };
    }
    if (!isValidObjectId(id)) {
      return { error: Response.json({ success: false, message: "شناسه سازمان نامعتبر است" }, { status: 400 }) };
    }
    await connectDb();
    const org = await Organization.findById(id);
    if (!org) return { error: Response.json({ success: false, message: "سازمان پیدا نشد" }, { status: 404 }) };
    return { org };
  }
  async function GET(_req, { params }) {
    const { organizationId } = await params;
    const result = await authorize(organizationId);
    if (result.error) return result.error;
    return Response.json({ success: true, policy: result.org.supportContract?.slaPolicy || null }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  async function PUT(req, { params }) {
    const { organizationId } = await params;
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
    catch {
      return Response.json({
        success: false,
        message: "سیاست SLA باید دارای مقادیر معتبر برای اولویت کم، متوسط و بالا باشد.",
      }, { status: 400 });
    }
    result.org.set("supportContract.slaPolicy", policy);
    await result.org.save();
    return Response.json({ success: true, policy: result.org.supportContract.slaPolicy });
  }
  return { GET, PUT };
}
