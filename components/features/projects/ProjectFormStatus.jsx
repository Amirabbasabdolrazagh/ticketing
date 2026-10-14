const labels = {
  assigned: "شروع نشده", draft: "شروع نشده", in_progress: "شروع شده",
  viewed: "مشاهده‌شده", submitted: "ارسال‌شده", issued: "ابلاغ‌شده",
  reviewed: "تأییدشده", acknowledged: "مشاهده و تأییدشده", approved: "تأیید نهایی", rejected: "نیازمند اصلاح",
};
const colors = {
  assigned: "bg-slate-100 text-slate-700 border-slate-200", draft: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  viewed: "bg-violet-50 text-violet-800 border-violet-200",
  submitted: "bg-blue-50 text-blue-800 border-blue-200", issued: "bg-blue-50 text-blue-800 border-blue-200",
  reviewed: "bg-emerald-50 text-emerald-800 border-emerald-200", acknowledged: "bg-emerald-50 text-emerald-800 border-emerald-200", approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
};
export default function ProjectFormStatus({ status = "assigned", progress = 0, viewedAt }) {
  const state = ["assigned", "draft"].includes(status) ? Number(progress) > 0 ? "in_progress" : viewedAt ? "viewed" : status : status === "issued" && viewedAt ? "viewed" : status;
  return <span className={`inline-flex min-h-9 w-32 max-w-full shrink-0 items-center justify-center rounded-xl border px-2 py-1.5 text-center align-middle text-xs font-bold leading-5 ${colors[state] || colors.assigned}`}>{labels[state] || state}</span>;
}
