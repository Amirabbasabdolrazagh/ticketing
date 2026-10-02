import Lead from "@/models/leads";
import ConnectDb from "@/utils/connectDB";

export const runtime = "nodejs";
const ALLOWED_ORIGIN = process.env.PUBLIC_INTAKE_ORIGIN || "https://itrasam.com";
const corsHeaders = { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin", "Cache-Control": "no-store" };
const json = (data, status = 200) => Response.json(data, { status, headers: corsHeaders });
const normalizePhone = (value = "") => {
  const latin = String(value).replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9+]/g, "");
  if (latin.startsWith("+98")) return `0${latin.slice(3)}`;
  if (latin.startsWith("0098")) return `0${latin.slice(4)}`;
  if (latin.startsWith("98") && latin.length === 12) return `0${latin.slice(2)}`;
  return latin;
};
const clean = (value = "") => String(value).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  return origin && origin !== ALLOWED_ORIGIN ? new Response(null, { status: 403 }) : new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    if (req.headers.get("origin") !== ALLOWED_ORIGIN) return json({ success: false, message: "درخواست نامعتبر است" }, 403);
    const body = await req.json();
    if (body?.website) return json({ success: true, message: "درخواست دریافت شد" }, 201);
    const name = clean(body?.name), phone = normalizePhone(body?.phone), message = clean(body?.message);
    if (name.length < 3 || name.length > 70) return json({ success: false, message: "نام و نام خانوادگی را کامل وارد کنید" }, 400);
    if (!/^09\d{9}$/.test(phone)) return json({ success: false, message: "شماره موبایل معتبر وارد کنید" }, 400);
    if (message.length < 10 || message.length > 2000) return json({ success: false, message: "شرح درخواست باید بین ۱۰ تا ۲۰۰۰ نویسه باشد" }, 400);
    await ConnectDb();
    const recent = await Lead.countDocuments({ phone, createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } });
    if (recent >= 3) return json({ success: false, message: "تعداد درخواست‌های شما بیش از حد مجاز است؛ لطفاً کمی بعد تلاش کنید" }, 429);
    const lead = await Lead.create({ name, phone, message, source: "website" });
    return json({ success: true, message: "اطلاعات شما با موفقیت ثبت شد", leadId: lead._id.toString() }, 201);
  } catch (error) {
    console.error("PUBLIC LEAD ERROR:", error.message);
    return json({ success: false, message: "ثبت اطلاعات با خطا مواجه شد؛ لطفاً دوباره تلاش کنید" }, 500);
  }
}
