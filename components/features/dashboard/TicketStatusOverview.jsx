const statusMeta = {
  open: { label: "باز", color: "#0d6efd", soft: "#dbeafe" },
  "in-progress": { label: "در حال رسیدگی", color: "#7c3aed", soft: "#ede9fe" },
  resolved: { label: "حل‌شده", color: "#10b981", soft: "#d1fae5" },
  closed: { label: "بسته‌شده", color: "#475569", soft: "#e2e8f0" },
};

export default function TicketStatusOverview({ data = [], title = "وضعیت تیکت‌ها" }) {
  const total = data.reduce((sum, item) => sum + item.tickets, 0);
  let cursor = 0;
  const stops = data.map((item) => {
    const meta = statusMeta[item.status] || statusMeta.closed;
    const size = total ? (item.tickets / total) * 100 : 0;
    const start = cursor;
    cursor += size;
    return `${meta.color} ${start}% ${cursor}%`;
  });
  const chartBackground = total
    ? `conic-gradient(${stops.join(", ")})`
    : "conic-gradient(#e2e8f0 0 100%)";

  return (
    <section className="ticket-status-chart glass-panel relative h-full overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute -left-12 -top-16 size-36 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">نمای لحظه‌ای روند رسیدگی</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2 text-center shadow-sm backdrop-blur-xl">
          <strong className="block text-xl font-black text-[#0a2540]">{total.toLocaleString("fa-IR")}</strong>
          <span className="text-[10px] text-slate-500">مجموع</span>
        </div>
      </div>

      <div className="relative mt-5 grid items-center gap-5 sm:grid-cols-[8.5rem_1fr] lg:grid-cols-1 xl:grid-cols-[8.5rem_1fr]">
        <div
          className="ticket-status-chart__donut relative mx-auto grid size-32 place-items-center rounded-full"
          style={{ background: chartBackground }}
          role="img"
          aria-label={`مجموع ${total.toLocaleString("fa-IR")} تیکت`}
        >
          <div className="grid size-[5.8rem] place-items-center rounded-full bg-white text-center shadow-inner">
            <div>
              <strong className="block text-2xl font-black text-slate-900">{total.toLocaleString("fa-IR")}</strong>
              <span className="text-[10px] font-bold text-slate-500">تیکت</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
        {data.map((item) => {
          const meta = statusMeta[item.status] || statusMeta.closed;
          const percentage = total ? Math.round((item.tickets / total) * 100) : 0;
          return (
            <div key={item.status} className="rounded-xl border border-slate-100 bg-white/55 p-2.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-700">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
                <span className="font-black text-slate-900">
                  {item.tickets.toLocaleString("fa-IR")}
                  <span className="mr-1 font-medium text-slate-400">({percentage.toLocaleString("fa-IR")}٪)</span>
                </span>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
