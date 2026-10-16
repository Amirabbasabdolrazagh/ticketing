"use client";

import PhoneSupportPanel from "@/components/features/tickets/PhoneSupportPanel";
import axios from "axios";
import { PhoneCall, TicketCheck } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function OrganizationSecureCallPage() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => { axios.get("/api/organization/tickets").then(({ data }) => { setTickets(data.tickets || []); setSelected(data.tickets?.[0] || null); }).catch((error) => toast.error(error.response?.data?.message || "دریافت تیکت‌ها ناموفق بود")); }, []);
  return <section className="app-page space-y-5" dir="rtl"><Toaster /><header className="glass-panel p-5 sm:p-7"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white"><PhoneCall /></span><div><h1 className="page-heading">تماس امن با پشتیبانی</h1><p className="mt-1 text-sm text-slate-500">تماس درباره تیکت کارکنان بدون نمایش شماره شخصی پشتیبان</p></div></div></header><div className="grid gap-5 xl:grid-cols-12"><aside className="glass-panel p-4 xl:col-span-4"><h2 className="flex items-center gap-2 font-black text-slate-900"><TicketCheck className="size-5 text-blue-600" /> تیکت‌های فعال سازمان</h2><div className="mt-4 space-y-2">{tickets.length ? tickets.map((ticket) => <button key={ticket._id} onClick={() => setSelected(ticket)} className={`w-full rounded-2xl border p-3 text-right transition ${selected?._id === ticket._id ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-white"}`}><b className="block truncate text-xs text-slate-800">{ticket.title}</b><span className="mt-1 block text-[10px] text-slate-500">{ticket.creator?.name} · {ticket.project?.name || "سایر"}</span></button>) : <p className="rounded-2xl border border-dashed p-6 text-center text-xs text-slate-400">تیکت فعالی وجود ندارد.</p>}</div></aside><main className="xl:col-span-8">{selected ? <PhoneSupportPanel ticketId={selected._id} role="customer" /> : <div className="glass-panel grid min-h-56 place-items-center text-sm text-slate-400">یک تیکت را برای تماس انتخاب کنید.</div>}</main></div></section>;
}
