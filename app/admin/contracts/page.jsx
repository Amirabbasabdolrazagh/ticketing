"use client";

import axios from "axios";
import Link from "next/link";
import { Building2, CalendarDays, CheckCircle2, FileCheck2, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

const featureLabels = { onsiteService: "خدمات حضوری", secureCall: "تماس امن", remoteSupport: "پشتیبانی ریموت", prioritySupport: "پشتیبانی ویژه" };
const statusLabels = { active: "فعال", expiring: "رو به پایان", expired: "منقضی", draft: "پیش‌نویس" };
const statusStyle = { active: "bg-emerald-100 text-emerald-700", expiring: "bg-amber-100 text-amber-800", expired: "bg-rose-100 text-rose-700", draft: "bg-slate-100 text-slate-600" };
const summaryTone = { blue: "border-blue-100 bg-blue-50 text-blue-600", emerald: "border-emerald-100 bg-emerald-50 text-emerald-600", amber: "border-amber-100 bg-amber-50 text-amber-600", violet: "border-violet-100 bg-violet-50 text-violet-600" };
const date = (value) => value ? new Date(value).toLocaleDateString("fa-IR-u-ca-persian") : "تعیین نشده";

export default function ContractsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/organizations").then(({ data }) => setOrganizations(data.organizations || [])).catch((error) => toast.error(error.response?.data?.message || "دریافت قراردادها ناموفق بود")).finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => ({
    total: organizations.length,
    active: organizations.filter((item) => item.supportContract?.status === "active").length,
    expiring: organizations.filter((item) => item.supportContract?.status === "expiring").length,
    featureCount: organizations.reduce((sum, item) => sum + Object.values(item.supportContract?.features || {}).filter(Boolean).length, 0),
  }), [organizations]);

  return <section className="app-page space-y-5" dir="rtl"><Toaster />
    <header className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white"><FileCheck2 /></span><div><h1 className="page-heading">قراردادهای سازمانی</h1><p className="mt-1 text-sm text-slate-500">وضعیت قرارداد و دسترسی هر سازمان به امکانات سامانه</p></div></div><Link href="/admin/organizations" className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-black text-white">مدیریت سازمان‌ها و قراردادها</Link></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["کل قراردادها", summary.total, Building2, "blue"], ["قرارداد فعال", summary.active, CheckCircle2, "emerald"], ["رو به پایان", summary.expiring, ShieldAlert, "amber"], ["امکانات فعال", summary.featureCount, FileCheck2, "violet"]].map(([label, value, Icon, tone]) => <article key={label} className={`rounded-3xl border p-5 ${summaryTone[tone]}`}><div className="flex items-center justify-between"><Icon /><b className="text-2xl text-slate-950">{value.toLocaleString("fa-IR")}</b></div><p className="mt-3 text-xs font-black text-slate-700">{label}</p></article>)}</div>
    {loading ? <div className="glass-panel grid min-h-52 place-items-center text-slate-400">در حال بارگذاری…</div> : <div className="grid gap-4 xl:grid-cols-2">{organizations.map((organization) => { const contract = organization.supportContract || {}; const features = Object.entries(contract.features || {}).filter(([, enabled]) => enabled); return <article key={organization._id} className="glass-panel overflow-hidden p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{organization.name}</h2><p className="mt-1 text-xs text-slate-500">{organization.code} · مدیر: {organization.manager?.name || "نامشخص"}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black ${statusStyle[contract.status] || statusStyle.draft}`}>{statusLabels[contract.status] || "نامشخص"}</span></div><div className="mt-5 grid grid-cols-2 gap-2"><Info label="شروع قرارداد" value={date(contract.startAt)} /><Info label="پایان قرارداد" value={date(contract.endAt)} /></div><div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black text-slate-500">امکانات مجاز قرارداد</p><div className="mt-3 flex flex-wrap gap-2">{features.length ? features.map(([key]) => <span key={key} className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-blue-700 shadow-sm">{featureLabels[key]}</span>) : <span className="text-xs text-slate-400">امکان ویژه‌ای فعال نشده است.</span>}</div></div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="size-4 text-blue-600" /> {organization.members.length.toLocaleString("fa-IR")} کارمند · {organization.equipment.length.toLocaleString("fa-IR")} تجهیز</div></article>; })}</div>}
  </section>;
}

function Info({ label, value }) { return <div className="rounded-2xl border border-slate-100 bg-white p-3"><span className="text-[10px] text-slate-500">{label}</span><b className="mt-1 block text-xs text-slate-800">{value}</b></div>; }
