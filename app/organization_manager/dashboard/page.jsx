"use client";

import axios from "axios";
import { Activity, Building2, CalendarClock, CheckCircle2, ChevronLeft, CircleAlert, Cpu, FileClock, Gauge, PackageCheck, ShieldCheck, Star, TicketCheck, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const statusLabels = { open: "باز", "in-progress": "در حال رسیدگی", resolved: "حل‌شده", closed: "بسته‌شده" };
const statusStyles = { open: "bg-blue-100 text-blue-700", "in-progress": "bg-violet-100 text-violet-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-slate-100 text-slate-700" };
const contractLevel = { basic: "پایه", standard: "استاندارد", premium: "ویژه" };
const contractStatus = { active: "فعال", expiring: "رو به پایان", expired: "منقضی", draft: "پیش‌نویس" };
const formatDate = (value) => value ? new Date(value).toLocaleDateString("fa-IR") : "تعیین نشده";

export default function OrganizationDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    axios.get("/api/organization/dashboard")
      .then(({ data: response }) => response.success && setData(response))
      .catch((requestError) => setError(requestError.response?.data?.message || "دریافت اطلاعات پرتال ناموفق بود"));
  }, []);

  const maxMonthly = useMemo(() => Math.max(...(data?.monthly || []).map((month) => month.created), 1), [data]);
  if (error) return <section className="app-page"><div className="glass-panel grid min-h-72 place-items-center p-8 text-center"><div><CircleAlert className="mx-auto size-12 text-rose-500" /><h1 className="mt-4 text-lg font-black text-slate-900">پرتال سازمان در دسترس نیست</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></div></section>;
  if (!data) return <section className="app-page"><div className="glass-panel grid min-h-72 place-items-center text-sm font-bold text-slate-400">در حال آماده‌سازی نمای مدیریتی سازمان…</div></section>;

  const { organization, summary, status, monthly, employeeStats, recurringIssues, recentTickets, serviceHistory } = data;
  const totalStatus = Math.max(summary.totalTickets, 1);
  const donut = `conic-gradient(#2563eb 0 ${(status.open / totalStatus) * 100}%, #7c3aed ${(status.open / totalStatus) * 100}% ${((status.open + status.inProgress) / totalStatus) * 100}%, #10b981 ${((status.open + status.inProgress) / totalStatus) * 100}% ${((status.open + status.inProgress + status.resolved) / totalStatus) * 100}%, #64748b ${((status.open + status.inProgress + status.resolved) / totalStatus) * 100}% 100%)`;

  return (
    <section className="app-page space-y-5" dir="rtl">
      <header className="glass-panel relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -left-12 -top-16 size-56 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-xl shadow-blue-200"><Building2 className="size-7" /></span><div><p className="text-xs font-bold text-blue-600">پرتال اختصاصی مشتری سازمانی</p><h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{organization.name}</h1><p className="mt-1 text-xs text-slate-500">نمای مدیریتی کارکنان و خدمات پشتیبانی · {organization.code}</p></div></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"><span className="text-[10px] font-bold text-emerald-600">وضعیت قرارداد</span><b className="mt-1 block text-sm text-emerald-900">{contractStatus[organization.contract?.status]} · سطح {contractLevel[organization.contract?.level]}</b></div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={TicketCheck} label="کل درخواست‌ها" value={summary.totalTickets} tone="blue" />
        <Metric icon={Activity} label="در حال رسیدگی" value={summary.activeTickets} tone="violet" />
        <Metric icon={CheckCircle2} label="رسیدگی‌شده" value={summary.resolvedTickets} tone="emerald" />
        <Metric icon={CalendarClock} label="دارای تأخیر" value={summary.overdue} tone="rose" />
        <Metric icon={Star} label="رضایت مشتری" value={summary.satisfaction ? `${summary.satisfaction.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} / ۵` : "—"} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <article className="glass-panel p-5 xl:col-span-8">
          <div className="flex items-center justify-between"><div><h2 className="font-black text-slate-950">گزارش شش‌ماهه خدمات</h2><p className="mt-1 text-xs text-slate-500">مقایسه درخواست‌های ثبت‌شده و حل‌شده</p></div><Gauge className="text-blue-600" /></div>
          <div className="mt-6 flex h-56 items-end justify-around gap-3 border-b border-slate-200 px-2">
            {monthly.map((month) => <div key={month.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[80%] w-full max-w-16 items-end justify-center gap-1"><div className="w-2/5 rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400" style={{ height: `${Math.max(4, (month.created / maxMonthly) * 100)}%` }} title={`${month.created} ثبت‌شده`} /><div className="w-2/5 rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-300" style={{ height: `${Math.max(4, (month.resolved / maxMonthly) * 100)}%` }} title={`${month.resolved} حل‌شده`} /></div><span className="pb-2 text-[10px] font-bold text-slate-500">{month.label}</span></div>)}
          </div>
          <div className="mt-3 flex justify-center gap-5 text-[10px] font-bold text-slate-500"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-blue-500" /> ثبت‌شده</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-emerald-500" /> حل‌شده</span></div>
        </article>

        <article className="glass-panel p-5 xl:col-span-4">
          <h2 className="font-black text-slate-950">وضعیت رسیدگی</h2><p className="mt-1 text-xs text-slate-500">تصویر کلی درخواست‌های کارکنان</p>
          <div className="mt-6 grid place-items-center"><div className="grid size-40 place-items-center rounded-full" style={{ background: donut }}><div className="grid size-28 place-items-center rounded-full bg-white text-center shadow-inner"><div><b className="block text-3xl text-slate-950">{summary.totalTickets.toLocaleString("fa-IR")}</b><span className="text-[10px] text-slate-500">کل تیکت‌ها</span></div></div></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2">{[["باز", status.open, "bg-blue-500"], ["در حال رسیدگی", status.inProgress, "bg-violet-500"], ["حل‌شده", status.resolved, "bg-emerald-500"], ["بسته", status.closed, "bg-slate-500"]].map(([label, value, color]) => <div key={label} className="rounded-xl bg-slate-50 p-2.5 text-xs"><span className="flex items-center gap-2 text-slate-500"><i className={`size-2 rounded-full ${color}`} />{label}</span><b className="mt-1 block text-left text-slate-900">{value.toLocaleString("fa-IR")}</b></div>)}</div>
        </article>
      </div>

      <article className="glass-panel p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 font-black text-slate-950"><UsersRound className="size-5 text-violet-600" /> کنترل فعالیت کارکنان</h2><p className="mt-1 text-xs text-slate-500">برای مشاهده تیکت‌های هر کارمند روی کارت او بزنید.</p></div><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{employeeStats.length.toLocaleString("fa-IR")} کارمند</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{employeeStats.map((employee) => {
          const completion = employee.total ? Math.round((employee.resolved / employee.total) * 100) : 0;
          return <button key={employee.id} onClick={() => setSelectedEmployee(employee)} className="group rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-right transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"><div className="flex items-center justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-blue-100 font-black text-blue-700">{employee.name?.slice(0, 1)}</span><ChevronLeft className="size-5 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-blue-600" /></div><h3 className="mt-3 font-black text-slate-900">{employee.name}</h3><div className="mt-4 grid grid-cols-3 gap-2 text-center"><SmallStat value={employee.total} label="کل" /><SmallStat value={employee.active} label="فعال" /><SmallStat value={employee.highPriority} label="فوری" /></div><div className="mt-4"><div className="flex justify-between text-[10px] text-slate-500"><span>نرخ رسیدگی</span><b>{completion.toLocaleString("fa-IR")}٪</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-blue-600 to-emerald-400" style={{ width: `${completion}%` }} /></div></div></button>;
        })}</div>
      </article>

      <div className="grid gap-5 xl:grid-cols-12">
        <article className="glass-panel p-5 xl:col-span-7"><h2 className="flex items-center gap-2 font-black text-slate-950"><FileClock className="size-5 text-blue-600" /> آخرین درخواست‌های کارکنان</h2><div className="mt-4 space-y-2">{recentTickets.length ? recentTickets.map((ticket) => <div key={ticket.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><b className="block truncate text-xs text-slate-800">{ticket.title}</b><span className="mt-1 block text-[10px] text-slate-500">{ticket.employee} · {ticket.service}</span></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${statusStyles[ticket.status]}`}>{statusLabels[ticket.status]}</span></div>) : <Empty text="هنوز تیکتی ثبت نشده است." />}</div></article>
        <article className="glass-panel p-5 xl:col-span-5"><h2 className="flex items-center gap-2 font-black text-slate-950"><CircleAlert className="size-5 text-amber-600" /> موضوعات پرتکرار</h2><p className="mt-1 text-xs text-slate-500">دسته‌های پرتکرار درخواست کارکنان</p><div className="mt-5 space-y-3">{recurringIssues.length ? recurringIssues.map((issue) => <div key={issue.label}><div className="flex justify-between text-xs"><b className="text-slate-700">{issue.label}</b><span className="text-slate-500">{issue.count.toLocaleString("fa-IR")} مورد</span></div><div className="mt-2 h-2 rounded-full bg-amber-50"><div className="h-full rounded-full bg-gradient-to-l from-amber-500 to-orange-300" style={{ width: `${Math.max(8, (issue.count / recurringIssues[0].count) * 100)}%` }} /></div></div>) : <Empty text="داده کافی برای تشخیص الگو وجود ندارد." />}</div></article>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="glass-panel p-5"><h2 className="flex items-center gap-2 font-black text-slate-950"><ShieldCheck className="size-5 text-emerald-600" /> قرارداد پشتیبانی</h2><div className="mt-5 grid grid-cols-2 gap-3"><ContractItem label="نوع قرارداد" value={contractLevel[organization.contract?.level]} /><ContractItem label="ساعات ماهانه" value={`${(organization.contract?.monthlyHours || 0).toLocaleString("fa-IR")} ساعت`} /><ContractItem label="شروع" value={formatDate(organization.contract?.startAt)} /><ContractItem label="پایان" value={formatDate(organization.contract?.endAt)} /></div></article>
        <article className="glass-panel p-5"><h2 className="flex items-center gap-2 font-black text-slate-950"><Cpu className="size-5 text-cyan-600" /> تجهیزات سازمان</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{organization.equipment.length ? organization.equipment.slice(0, 6).map((item) => <div key={item._id} className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3"><PackageCheck className="size-5 shrink-0 text-cyan-600" /><span className="min-w-0"><b className="block truncate text-xs text-slate-800">{item.name}</b><small className="text-[10px] text-slate-500">{item.type || "تجهیز سازمانی"}{item.serial ? ` · ${item.serial}` : ""}</small></span></div>) : <Empty text="تجهیزی ثبت نشده است." />}</div></article>
      </div>

      <article className="glass-panel p-5"><h2 className="font-black text-slate-950">سوابق خدمات اخیر</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{serviceHistory.length ? serviceHistory.map((item) => <div key={item.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><CheckCircle2 className="size-5 text-emerald-600" /><b className="mt-3 block truncate text-xs text-slate-800">{item.title}</b><span className="mt-1 block text-[10px] text-slate-500">{item.employee} · {formatDate(item.resolvedAt)}</span>{item.rating && <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black text-amber-700"><Star className="size-3 fill-amber-400" /> {item.rating.toLocaleString("fa-IR")}</span>}</div>) : <Empty text="سابقه خدمت تکمیل‌شده‌ای وجود ندارد." />}</div></article>

      {selectedEmployee && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSelectedEmployee(null)}><section className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><h2 className="text-xl font-black text-slate-950">فعالیت {selectedEmployee.name}</h2><p className="mt-1 text-xs text-slate-500">خلاصه عملکرد و آخرین تیکت‌های ثبت‌شده</p></div><button onClick={() => setSelectedEmployee(null)} className="grid size-10 place-items-center rounded-xl bg-slate-100"><X className="size-5" /></button></div><div className="mt-5 grid grid-cols-4 gap-2"><SmallStat value={selectedEmployee.total} label="کل" /><SmallStat value={selectedEmployee.active} label="فعال" /><SmallStat value={selectedEmployee.resolved} label="حل‌شده" /><SmallStat value={selectedEmployee.highPriority} label="فوری" /></div><div className="mt-6 space-y-2">{selectedEmployee.recentTickets.length ? selectedEmployee.recentTickets.map((ticket) => <div key={ticket.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"><span className="min-w-0"><b className="block truncate text-xs text-slate-800">{ticket.title}</b><small className="mt-1 block text-[10px] text-slate-500">{ticket.service} · {formatDate(ticket.createdAt)}</small></span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusStyles[ticket.status]}`}>{statusLabels[ticket.status]}</span></div>) : <Empty text="این کارمند هنوز تیکتی ثبت نکرده است." />}</div></section></div>}
    </section>
  );
}

const toneMap = { blue: "border-blue-100 bg-blue-50 text-blue-700", violet: "border-violet-100 bg-violet-50 text-violet-700", emerald: "border-emerald-100 bg-emerald-50 text-emerald-700", rose: "border-rose-100 bg-rose-50 text-rose-700", amber: "border-amber-100 bg-amber-50 text-amber-700" };
function Metric({ icon: Icon, label, value, tone }) { return <article className={`rounded-3xl border p-4 ${toneMap[tone]}`}><div className="flex items-center justify-between"><Icon className="size-5" /><strong className="text-xl text-slate-950">{typeof value === "number" ? value.toLocaleString("fa-IR") : value}</strong></div><p className="mt-3 text-xs font-black">{label}</p></article>; }
function SmallStat({ value, label }) { return <span className="rounded-xl bg-slate-50 p-2 text-center"><b className="block text-sm text-slate-900">{value.toLocaleString("fa-IR")}</b><small className="text-[9px] text-slate-500">{label}</small></span>; }
function ContractItem({ label, value }) { return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><span className="text-[10px] text-slate-500">{label}</span><b className="mt-1 block text-xs text-slate-800">{value}</b></div>; }
function Empty({ text }) { return <p className="col-span-full rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400">{text}</p>; }
