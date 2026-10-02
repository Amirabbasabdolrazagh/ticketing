"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

const statuses = { all: "همه سرنخ‌ها", new: "جدید", contacted: "تماس‌گرفته‌شده", qualified: "واجد شرایط", converted: "تبدیل‌شده", lost: "از دست‌رفته" };

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await axios.get("/api/leads");
      if (data.success) setLeads(data.leads);
    } catch (error) {
      toast.error(error.response?.data?.message || "خطا در دریافت سرنخ‌ها");
    } finally {
      setLoading(false);
    }
  }

  // The initial fetch intentionally hydrates this client-only admin view.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function update(leadId, status) {
    try {
      await axios.patch("/api/leads", { leadId, status });
      setLeads((items) => items.map((item) => (item._id === leadId ? { ...item, status } : item)));
      toast.success("وضعیت سرنخ ذخیره شد");
    } catch (error) {
      toast.error(error.response?.data?.message || "خطا در ذخیره وضعیت");
    }
  }

  const filteredLeads = useMemo(() => (filter === "all" ? leads : leads.filter((lead) => lead.status === filter)), [filter, leads]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(statuses).map((key) => [key, key === "all" ? leads.length : leads.filter((lead) => lead.status === key).length])), [leads]);

  return (
    <section className="app-page w-full max-w-6xl">
      <Toaster />
      <div className="mb-6">
        <p className="section-kicker">مدیریت ارتباط با مشتری</p>
        <h1 className="page-heading">بازاریابی و فروش</h1>
        <p className="mt-2 text-sm text-slate-500">سرنخ‌های ثبت‌شده از سایت را پیگیری کنید و هر مشتری را در مرحله مناسب فروش قرار دهید.</p>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(statuses).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-2xl border p-3 text-right transition ${filter === key ? "border-blue-300 bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border-white/80 bg-white/65 text-slate-700 hover:bg-white"}`}>
            <span className="block text-[11px] font-bold">{label}</span><strong className="mt-1 block text-xl">{counts[key] ?? 0}</strong>
          </button>
        ))}
      </div>
      <div className="glass-panel overflow-hidden p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-800">سرنخ‌های مشتریان</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{filteredLeads.length.toLocaleString("fa-IR")} مورد</span></div>
        {loading ? <p className="p-8 text-center text-slate-500">در حال بارگذاری…</p> : filteredLeads.length === 0 ? <p className="p-8 text-center text-slate-500">در این دسته هنوز سرنخی ثبت نشده است.</p> : <div className="space-y-3">{filteredLeads.map((lead) => <article key={lead._id} className="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800">{lead.name}</h3><a className="mt-1 block font-semibold text-blue-700" dir="ltr" href={`tel:${lead.phone}`}>{lead.phone}</a></div><select value={lead.status} onChange={(event) => update(lead._id, event.target.value)} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700">{Object.entries(statuses).filter(([key]) => key !== "all").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50/80 p-3 text-sm leading-7 text-slate-600">{lead.message}</p><time className="mt-2 block text-[11px] text-slate-400">{new Date(lead.createdAt).toLocaleString("fa-IR")}</time></article>)}</div>}
      </div>
    </section>
  );
}
