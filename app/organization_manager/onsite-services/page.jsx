"use client";

import axios from "axios";
import { CalendarClock, CheckCircle2, ClipboardCheck, MapPin, Plus, Send, UserRound, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { formatJalaliTyping } from "@/utils/jalaliDate";

const emptyForm = { title: "", description: "", serviceType: "پشتیبانی فنی حضوری", priority: "medium", address: "", contactName: "", contactPhone: "", equipmentId: "", preferredDate: "", preferredPeriod: "flexible" };
const statusLabels = { pending_review: "در انتظار بررسی", awaiting_schedule: "در انتظار زمان‌بندی", scheduled: "زمان‌بندی‌شده", accepted: "پذیرفته‌شده", en_route: "کارشناس در مسیر", arrived: "کارشناس در محل", in_progress: "در حال انجام", paused: "متوقف موقت", awaiting_customer_confirmation: "در انتظار تأیید شما", completed: "انجام‌شده", cancelled: "لغوشده", revisit_required: "نیازمند مراجعه مجدد" };
const statusStyles = { pending_review: "bg-amber-100 text-amber-800", awaiting_schedule: "bg-orange-100 text-orange-800", scheduled: "bg-blue-100 text-blue-700", accepted: "bg-violet-100 text-violet-700", en_route: "bg-cyan-100 text-cyan-700", arrived: "bg-sky-100 text-sky-700", in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-slate-100 text-slate-700", awaiting_customer_confirmation: "bg-emerald-100 text-emerald-800", completed: "bg-green-100 text-green-700", cancelled: "bg-rose-100 text-rose-700", revisit_required: "bg-orange-100 text-orange-800" };
const periodLabels = { morning: "صبح", afternoon: "بعدازظهر", evening: "عصر", flexible: "زمان منعطف" };

export default function OrganizationOnsiteServicesPage() {
  const [requests, setRequests] = useState([]);
  const [capabilities, setCapabilities] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [capabilityResult, requestResult] = await Promise.all([axios.get("/api/organization/capabilities"), axios.get("/api/onsite-services")]);
    setCapabilities(capabilityResult.data);
    setRequests(requestResult.data.requests || []);
  };
  useEffect(() => {
    let active = true;
    Promise.all([axios.get("/api/organization/capabilities"), axios.get("/api/onsite-services")])
      .then(([capabilityResult, requestResult]) => {
        if (!active) return;
        setCapabilities(capabilityResult.data);
        setRequests(requestResult.data.requests || []);
      })
      .catch((error) => toast.error(error.response?.data?.message || "دریافت خدمات حضوری ناموفق بود"));
    return () => { active = false; };
  }, []);

  const submit = async () => {
    setSaving(true);
    try { const { data } = await axios.post("/api/onsite-services", form); toast.success(data.message); setOpen(false); setForm(emptyForm); await load(); }
    catch (error) { toast.error(error.response?.data?.message || "ثبت درخواست ناموفق بود"); }
    finally { setSaving(false); }
  };
  const approve = async (requestId, approval) => {
    try { const { data } = await axios.patch("/api/onsite-services", { requestId, approval }); toast.success(data.message); await load(); }
    catch (error) { toast.error(error.response?.data?.message || "ثبت تأیید ناموفق بود"); }
  };

  return <section className="app-page space-y-5" dir="rtl"><Toaster />
    <header className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><Wrench /></span><div><h1 className="page-heading">خدمات حضوری سازمان</h1><p className="mt-1 text-sm text-slate-500">ثبت درخواست اعزام کارشناس، زمان‌بندی و تأیید گزارش انجام کار</p></div></div><button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white"><Plus className="size-5" /> درخواست جدید</button></header>
    {capabilities?.contract && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-800"><b>{capabilities.contract.title}</b> فعال است و امکان ثبت خدمات حضوری برای سازمان شما فراهم شده است.</div>}
    <div className="grid gap-4 xl:grid-cols-2">{requests.length ? requests.map((item) => <article key={item._id} className="glass-panel overflow-hidden p-5"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black text-blue-600">{item.requestNumber}</span><h2 className="mt-1 font-black text-slate-950">{item.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">{item.description}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><Info icon={MapPin} label="محل مراجعه" value={item.address} /><Info icon={UserRound} label="کارشناس" value={item.assignedAgent?.name || "تخصیص‌نیافته"} /><Info icon={CalendarClock} label="زمان مراجعه" value={item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" }) : "در انتظار هماهنگی"} /><Info icon={Wrench} label="تجهیز" value={item.equipment?.name || "عمومی"} /></div>{item.workReport?.actions && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><h3 className="flex items-center gap-2 text-xs font-black text-emerald-900"><ClipboardCheck className="size-4" /> گزارش کارشناس</h3><p className="mt-2 text-xs leading-6 text-slate-700">{item.workReport.actions}</p><p className="mt-2 text-xs leading-6 text-slate-600"><b>نتیجه:</b> {item.workReport.result}</p><span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-[10px] font-black text-emerald-700">زمان صرف‌شده: {(item.workReport.durationMinutes || 0).toLocaleString("fa-IR")} دقیقه</span></div>}{item.status === "awaiting_customer_confirmation" && <div className="mt-4 flex gap-2"><button onClick={() => approve(item._id, "approved")} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white"><CheckCircle2 className="ml-1 inline size-4" /> تأیید انجام کار</button><button onClick={() => approve(item._id, "rejected")} className="rounded-xl border border-rose-200 px-4 py-3 text-xs font-black text-rose-700">نیاز به مراجعه مجدد</button></div>}</article>) : <div className="glass-panel col-span-full grid min-h-52 place-items-center text-center text-sm font-bold text-slate-400">هنوز درخواست خدمات حضوری ثبت نشده است.</div>}</div>
    {open && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><h2 className="text-xl font-black text-slate-950">درخواست اعزام کارشناس</h2><p className="mt-1 text-xs text-slate-500">اطلاعات مراجعه را دقیق ثبت کنید تا زمان‌بندی سریع‌تر انجام شود.</p></div><button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl bg-slate-100"><X /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="عنوان درخواست"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="نوع خدمت"><input value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} /></Field><Field label="اولویت"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">کم</option><option value="medium">عادی</option><option value="high">زیاد</option><option value="urgent">فوری</option></select></Field><Field label="تجهیز مرتبط"><select value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}><option value="">بدون تجهیز مشخص</option>{(capabilities?.equipment || []).map((item) => <option key={item._id} value={item._id}>{item.name}{item.serial ? ` — ${item.serial}` : ""}</option>)}</select></Field><div className="sm:col-span-2"><Field label="شرح کامل مشکل"><textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div><div className="sm:col-span-2"><Field label="آدرس مراجعه"><textarea rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div><Field label="نام شخص حاضر در محل"><input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field><Field label="موبایل شخص حاضر"><input dir="ltr" inputMode="numeric" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></Field><Field label="تاریخ پیشنهادی (شمسی)"><input dir="ltr" inputMode="numeric" placeholder="1405/08/15" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: formatJalaliTyping(e.target.value) })} /></Field><Field label="بازه پیشنهادی"><select value={form.preferredPeriod} onChange={(e) => setForm({ ...form, preferredPeriod: e.target.value })}>{Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div><div className="mt-7 flex gap-3 border-t pt-5"><button onClick={() => setOpen(false)} className="rounded-2xl border px-5 py-3 font-bold">انصراف</button><button disabled={saving} onClick={submit} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-60"><Send className="size-4" />{saving ? "در حال ثبت…" : "ثبت درخواست حضوری"}</button></div></div></div>}
  </section>;
}

function Info({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><span className="flex items-center gap-2 text-[10px] text-slate-500"><Icon className="size-3.5 text-blue-600" />{label}</span><b className="mt-2 block truncate text-xs text-slate-800">{value}</b></div>; }
function Field({ label, children }) { return <label className="block text-xs font-black text-slate-700">{label}<span className="mt-2 block [&>input]:h-12 [&>input]:w-full [&>input]:rounded-2xl [&>input]:border [&>input]:border-slate-200 [&>input]:px-4 [&>select]:h-12 [&>select]:w-full [&>select]:rounded-2xl [&>select]:border [&>select]:border-slate-200 [&>select]:bg-white [&>select]:px-3 [&>textarea]:w-full [&>textarea]:rounded-2xl [&>textarea]:border [&>textarea]:border-slate-200 [&>textarea]:p-3">{children}</span></label>; }
