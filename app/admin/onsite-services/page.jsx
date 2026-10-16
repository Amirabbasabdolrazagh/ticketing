"use client";

import axios from "axios";
import { CalendarClock, MapPin, Save, UserRoundCheck, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { formatJalaliInput, formatJalaliTyping } from "@/utils/jalaliDate";

const statusLabels = { pending_review: "در انتظار بررسی", awaiting_schedule: "در انتظار زمان‌بندی", scheduled: "زمان‌بندی‌شده", accepted: "پذیرفته‌شده", en_route: "در مسیر", arrived: "در محل", in_progress: "در حال انجام", paused: "متوقف", awaiting_customer_confirmation: "در انتظار تأیید مشتری", completed: "تکمیل‌شده", cancelled: "لغوشده", revisit_required: "مراجعه مجدد" };

export default function AdminOnsiteServicesPage() {
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState("");
  const load = async () => { const { data } = await axios.get("/api/onsite-services"); setRequests(data.requests || []); setAgents(data.agents || []); };
  useEffect(() => {
    let active = true;
    axios.get("/api/onsite-services")
      .then(({ data }) => {
        if (!active) return;
        setRequests(data.requests || []);
        setAgents(data.agents || []);
      })
      .catch((error) => toast.error(error.response?.data?.message || "دریافت مأموریت‌ها ناموفق بود"));
    return () => { active = false; };
  }, []);
  const draft = (item) => drafts[item._id] || { assignedAgent: item.assignedAgent?._id || "", scheduleDate: formatJalaliInput(item.scheduledAt), scheduleTime: item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" }) : "09:00", estimatedDurationMinutes: item.estimatedDurationMinutes || 60 };
  const setDraft = (item, key, value) => setDrafts((current) => ({ ...current, [item._id]: { ...draft(item), [key]: value } }));
  const save = async (item) => { setSaving(item._id); try { const { data } = await axios.patch("/api/onsite-services", { requestId: item._id, ...draft(item) }); toast.success(data.message); await load(); } catch (error) { toast.error(error.response?.data?.message || "زمان‌بندی ناموفق بود"); } finally { setSaving(""); } };

  return <section className="app-page space-y-5" dir="rtl"><Toaster /><header className="glass-panel p-5 sm:p-7"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><Wrench /></span><div><h1 className="page-heading">مدیریت خدمات حضوری</h1><p className="mt-1 text-sm text-slate-500">بررسی درخواست‌ها، تخصیص کارشناس و تعیین زمان مراجعه</p></div></div></header>
    <div className="grid gap-4">{requests.length ? requests.map((item) => { const values = draft(item); return <article key={item._id} className="glass-panel overflow-hidden p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0 xl:max-w-md"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black text-blue-700">{item.requestNumber}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700">{statusLabels[item.status]}</span></div><h2 className="mt-3 text-lg font-black text-slate-950">{item.title}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{item.description}</p><div className="mt-4 space-y-2 text-xs text-slate-600"><p className="flex items-center gap-2"><MapPin className="size-4 text-rose-500" />{item.organization?.name} · {item.address}</p><p className="flex items-center gap-2"><UserRoundCheck className="size-4 text-violet-500" />شخص حاضر: {item.onsiteContact?.name}</p></div></div><div className="grid flex-1 gap-3 rounded-3xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2 xl:grid-cols-4"><Field label="کارشناس"><select value={values.assignedAgent} onChange={(e) => setDraft(item, "assignedAgent", e.target.value)}><option value="">انتخاب کارشناس</option>{agents.map((agent) => <option key={agent._id} value={agent._id}>{agent.name} — {agent.role}</option>)}</select></Field><Field label="تاریخ مراجعه (شمسی)"><input dir="ltr" inputMode="numeric" value={values.scheduleDate} onChange={(e) => setDraft(item, "scheduleDate", formatJalaliTyping(e.target.value))} placeholder="1405/08/15" /></Field><Field label="ساعت"><input dir="ltr" type="time" value={values.scheduleTime} onChange={(e) => setDraft(item, "scheduleTime", e.target.value)} /></Field><Field label="مدت تخمینی (دقیقه)"><input dir="ltr" type="number" min="0" value={values.estimatedDurationMinutes} onChange={(e) => setDraft(item, "estimatedDurationMinutes", e.target.value)} /></Field><button onClick={() => save(item)} disabled={saving === item._id} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black text-white disabled:opacity-60 sm:col-span-2 xl:col-span-4"><Save className="size-4" />{saving === item._id ? "در حال ذخیره…" : "ثبت تخصیص و زمان‌بندی"}</button></div></div></article>; }) : <div className="glass-panel grid min-h-52 place-items-center text-slate-400">درخواست حضوری ثبت نشده است.</div>}</div>
  </section>;
}

function Field({ label, children }) { return <label className="text-[10px] font-black text-slate-600">{label}<span className="mt-2 block [&>input]:h-11 [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-blue-100 [&>input]:bg-white [&>input]:px-3 [&>select]:h-11 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-blue-100 [&>select]:bg-white [&>select]:px-3">{children}</span></label>; }
