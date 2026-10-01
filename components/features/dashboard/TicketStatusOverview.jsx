const statusMeta = {
  open: { label: "باز", color: "#0d6efd", soft: "#dbeafe" },
  "in-progress": { label: "در حال رسیدگی", color: "#7c3aed", soft: "#ede9fe" },
  resolved: { label: "حل‌شده", color: "#10b981", soft: "#d1fae5" },
  closed: { label: "بسته‌شده", color: "#475569", soft: "#e2e8f0" },
};

export default function TicketStatusOverview({ data = [], title = "وضعیت تیکت‌ها" }) {
  const total = data.reduce((sum, item) => sum + item.tickets, 0);

  return (
    <section className="glass-panel relative overflow-hidden p-4 sm:p-5">
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

      <div className="relative mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner" aria-label="توزیع وضعیت تیکت‌ها">
        {data.map((item) => {
          const meta = statusMeta[item.status] || statusMeta.closed;
          const width = total ? (item.tickets / total) * 100 : 0;
          return (
            <span
              key={item.status}
              title={`${meta.label}: ${item.tickets}`}
              style={{ width: `${width}%`, backgroundColor: meta.color }}
              className="h-full transition-[width] duration-500 first:rounded-r-full last:rounded-l-full"
            />
          );
        })}
      </div>

      <div className="relative mt-5 space-y-4">
        {data.map((item) => {
          const meta = statusMeta[item.status] || statusMeta.closed;
          const percentage = total ? Math.round((item.tickets / total) * 100) : 0;
          return (
            <div key={item.status}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-700">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
                <span className="font-black text-slate-900">
                  {item.tickets.toLocaleString("fa-IR")}
                  <span className="mr-1 font-medium text-slate-400">({percentage.toLocaleString("fa-IR")}٪)</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: meta.soft }}>
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${meta.color}, #0a2540)` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
