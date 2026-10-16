"use client";

import { Activity, Clock3, Gauge, Repeat2, ShieldAlert, Star, Users } from "lucide-react";

const HOUR = 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["open", "in-progress"]);

const formatDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "بدون داده";
  const hours = Math.floor(milliseconds / HOUR);
  const minutes = Math.round((milliseconds % HOUR) / 60000);
  if (hours) return `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
  return `${Math.max(minutes, 1).toLocaleString("fa-IR")} دقیقه`;
};

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function performanceScore(agent) {
  const stats = agent.stats || {};
  const total = Math.max(stats.totalTickets || 0, 1);
  const resolution = ((stats.resolvedTickets || 0) / total) * 100;
  const response = ((stats.repliedTickets || 0) / total) * 100;
  const view = ((stats.viewedTickets || 0) / total) * 100;
  const satisfaction = stats.averageRating ? (stats.averageRating / 5) * 100 : 60;
  const escalationPenalty = ((stats.escalatedTickets || 0) / total) * 20;
  return Math.round(clamp(resolution * 0.35 + response * 0.25 + satisfaction * 0.25 + view * 0.15 - escalationPenalty));
}

function delayRisk(ticket, now) {
  if (!ACTIVE_STATUSES.has(ticket.status)) return 0;
  let score = 10;
  if (!ticket.agentViewedAt) score += 18;
  if (!ticket.agentFirstReplyAt) score += 18;
  if (ticket.priority === "high") score += 16;
  if (ticket.alerts?.escalation4h) score = Math.max(score, 92);

  const deadline = ticket.deadlineAt || ticket.deadline;
  if (deadline) {
    const remaining = new Date(deadline).getTime() - now;
    if (remaining <= 0) score = 99;
    else if (remaining <= 6 * HOUR) score = Math.max(score, 88);
    else if (remaining <= 24 * HOUR) score = Math.max(score, 72);
    else if (remaining <= 48 * HOUR) score = Math.max(score, 55);
  }
  return Math.round(clamp(score, 0, 99));
}

const normalizeText = (value = "") => value
  .toLowerCase()
  .replaceAll("ي", "ی")
  .replaceAll("ك", "ک")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

function recurringProblems(tickets) {
  const ignored = new Set(["مشکل", "خرابی", "درخواست", "عدم", "رفع", "سیستم", "برای", "روی", "های", "این", "است", "شده", "شدن", "تیکت", "کاربر", "مشتری", "پشتیبانی", "دارد", "کردن"]);
  const counts = new Map();
  tickets.forEach((ticket) => {
    const uniqueTokens = new Set(normalizeText(ticket.title).split(" ").filter((token) => token.length >= 3 && !ignored.has(token)));
    uniqueTokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  });
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
}

export default function ManagementIntelligence({ data }) {
  if (!data?.agents) {
    return (
      <section className="glass-panel grid min-h-64 place-items-center p-6 text-center text-sm font-bold text-slate-400">
        در حال آماده‌سازی تحلیل مدیریتی…
      </section>
    );
  }

  const now = new Date(data.serverTime).getTime();
  const agents = data.agents.map((agent) => ({ ...agent, score: performanceScore(agent) }));
  const tickets = agents.flatMap((agent) => agent.tickets.map((ticket) => ({ ...ticket, agentName: agent.name })));
  const activeTickets = tickets.filter((ticket) => ACTIVE_STATUSES.has(ticket.status));
  const riskTickets = activeTickets
    .map((ticket) => ({ ...ticket, risk: delayRisk(ticket, now) }))
    .sort((a, b) => b.risk - a.risk);
  const highRiskTickets = riskTickets.filter((ticket) => ticket.risk >= 70);
  const teamScore = agents.length ? Math.round(agents.reduce((sum, agent) => sum + agent.score, 0) / agents.length) : 0;
  const ratings = agents.filter((agent) => agent.stats?.ratingCount && agent.stats?.averageRating);
  const ratingCount = ratings.reduce((sum, agent) => sum + agent.stats.ratingCount, 0);
  const satisfaction = ratingCount
    ? ratings.reduce((sum, agent) => sum + agent.stats.averageRating * agent.stats.ratingCount, 0) / ratingCount
    : null;
  const recurring = recurringProblems(tickets);
  const maxWorkload = Math.max(...agents.map((agent) => agent.stats?.openTickets || 0), 1);

  const intelligenceCards = [
    { label: "عملکرد تیم", value: `${teamScore.toLocaleString("fa-IR")}٪`, note: "ترکیب حل، پاسخ، مشاهده و رضایت", icon: Gauge, style: "border-blue-200 bg-blue-50 text-blue-700" },
    { label: "ریسک تأخیر بالا", value: highRiskTickets.length.toLocaleString("fa-IR"), note: `از ${activeTickets.length.toLocaleString("fa-IR")} تیکت فعال`, icon: ShieldAlert, style: "border-rose-200 bg-rose-50 text-rose-700" },
    { label: "رضایت مشتری", value: satisfaction ? `${satisfaction.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از ۵` : "بدون امتیاز", note: `${ratingCount.toLocaleString("fa-IR")} ارزیابی ثبت‌شده`, icon: Star, style: "border-amber-200 bg-amber-50 text-amber-700" },
    { label: "حجم کار فعال", value: activeTickets.length.toLocaleString("fa-IR"), note: `میان ${agents.length.toLocaleString("fa-IR")} پشتیبان`, icon: Activity, style: "border-violet-200 bg-violet-50 text-violet-700" },
  ];

  return (
    <section className="glass-panel overflow-hidden p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-200"><Activity className="size-5" /></span>
            داشبورد هوشمند مدیریتی
          </div>
          <p className="mt-2 text-xs leading-6 text-slate-500">تحلیل زنده بر اساس زمان مشاهده و پاسخ، مهلت، اولویت، تشدید و امتیاز واقعی مشتری</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">به‌روزرسانی خودکار از داده‌های سامانه</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {intelligenceCards.map(({ label, value, note, icon: Icon, style }) => (
          <article key={label} className={`rounded-3xl border p-4 ${style}`}>
            <div className="flex items-center justify-between gap-3">
              <Icon className="size-5" />
              <span className="text-xs font-black">{label}</span>
            </div>
            <strong className="mt-4 block text-2xl font-black text-slate-950">{value}</strong>
            <span className="mt-1 block text-[10px] font-medium text-slate-500">{note}</span>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-black text-slate-900"><Users className="size-5 text-blue-600" /> عملکرد و حجم کار پشتیبان‌ها</div>
            <span className="text-[10px] text-slate-400">امتیاز از ۱۰۰</span>
          </div>
          <div className="mt-4 space-y-3">
            {agents.length ? agents.map((agent) => {
              const workload = agent.stats?.openTickets || 0;
              return (
                <div key={agent.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-black text-slate-800">{agent.name}</span>
                    <span className="font-black text-blue-700">{agent.score.toLocaleString("fa-IR")}٪</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-l from-blue-600 to-cyan-400" style={{ width: `${agent.score}%` }} /></div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                    <span>فعال: <b className="text-slate-700">{workload.toLocaleString("fa-IR")}</b></span>
                    <span>میانگین پاسخ: <b className="text-slate-700">{formatDuration(agent.stats?.averageFirstReplyMs)}</b></span>
                    <span>رضایت: <b className="text-slate-700">{agent.stats?.averageRating ? `${agent.stats.averageRating.toLocaleString("fa-IR")} / ۵` : "بدون امتیاز"}</b></span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-violet-100" title="سهم نسبی حجم کار"><div className="h-full rounded-full bg-violet-500" style={{ width: `${(workload / maxWorkload) * 100}%` }} /></div>
                </div>
              );
            }) : <p className="py-8 text-center text-xs text-slate-400">پشتیبانی تعریف نشده است.</p>}
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="rounded-[1.75rem] border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4">
            <div className="flex items-center gap-2 font-black text-slate-900"><Clock3 className="size-5 text-rose-600" /> تیکت‌های در معرض تأخیر</div>
            <div className="mt-3 space-y-2">
              {riskTickets.slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-white/80 p-3">
                  <span className="min-w-0"><b className="block truncate text-xs text-slate-800">{ticket.title}</b><small className="mt-1 block truncate text-[10px] text-slate-500">{ticket.agentName}</small></span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${ticket.risk >= 90 ? "bg-rose-600 text-white" : ticket.risk >= 70 ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>{ticket.risk.toLocaleString("fa-IR")}٪ ریسک</span>
                </div>
              ))}
              {!riskTickets.length ? <p className="py-5 text-center text-xs font-bold text-emerald-700">تیکت فعالی در معرض تأخیر نیست.</p> : null}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
            <div className="flex items-center gap-2 font-black text-slate-900"><Repeat2 className="size-5 text-violet-600" /> مشکلات پرتکرار</div>
            <p className="mt-1 text-[10px] text-slate-500">استخراج خودکار موضوعات تکرارشونده از عنوان تیکت‌ها</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {recurring.length ? recurring.map((item, index) => (
                <span key={item.label} className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700" style={{ fontSize: `${Math.max(11, 14 - index * 0.5)}px` }}>
                  {item.label} <b className="mr-1 text-slate-400">×{item.count.toLocaleString("fa-IR")}</b>
                </span>
              )) : <span className="text-xs font-bold text-slate-400">هنوز الگوی تکرارشونده معناداری پیدا نشده است.</span>}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
