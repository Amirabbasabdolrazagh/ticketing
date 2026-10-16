"use client";

import { ArrowLeft, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

const toneClasses = {
  blue: {
    card: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50",
    icon: "bg-blue-600 text-white shadow-blue-200",
    count: "bg-blue-100 text-blue-700",
    row: "border-blue-100 bg-white/75",
    badge: "bg-blue-100 text-blue-700",
  },
  violet: {
    card: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50",
    icon: "bg-violet-600 text-white shadow-violet-200",
    count: "bg-violet-100 text-violet-700",
    row: "border-violet-100 bg-white/75",
    badge: "bg-violet-100 text-violet-700",
  },
  amber: {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50",
    icon: "bg-amber-500 text-white shadow-amber-200",
    count: "bg-amber-100 text-amber-800",
    row: "border-amber-100 bg-white/75",
    badge: "bg-amber-100 text-amber-800",
  },
  rose: {
    card: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-pink-50",
    icon: "bg-rose-600 text-white shadow-rose-200",
    count: "bg-rose-100 text-rose-700",
    row: "border-rose-100 bg-white/75",
    badge: "bg-rose-100 text-rose-700",
  },
  emerald: {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50",
    icon: "bg-emerald-600 text-white shadow-emerald-200",
    count: "bg-emerald-100 text-emerald-700",
    row: "border-emerald-100 bg-white/75",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

export default function DashboardTableCard({
  title,
  description,
  count = 0,
  icon: Icon,
  tone = "blue",
  previewItems = [],
  emptyText = "موردی برای نمایش وجود ندارد.",
  children,
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const colors = toneClasses[tone] || toneClasses.blue;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative flex min-h-[17rem] w-full flex-col overflow-hidden rounded-[2rem] border p-5 text-right shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${colors.card}`}
      >
        <span className="pointer-events-none absolute -left-8 -top-10 size-32 rounded-full bg-white/70 blur-2xl" />
        <span className="relative flex w-full items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-base font-black text-slate-900 sm:text-lg">{title}</span>
            <span className="mt-1.5 block text-xs leading-6 text-slate-500">{description}</span>
          </span>
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-lg ${colors.icon}`}>
            {Icon ? <Icon className="size-6" /> : null}
          </span>
        </span>

        <span className="relative mt-5 flex w-full items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${colors.count}`}>
            {Number(count || 0).toLocaleString("fa-IR")} مورد
          </span>
          <span className="text-[11px] font-bold text-slate-400">خلاصه آخرین موارد</span>
        </span>

        <span className="relative mt-3 flex w-full flex-1 flex-col gap-2">
          {previewItems.length ? (
            previewItems.slice(0, 3).map((item, index) => (
              <span
                key={item.id || `${item.title}-${index}`}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 ${colors.row}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-extrabold text-slate-800">{item.title}</span>
                  {item.subtitle ? <span className="mt-1 block truncate text-[10px] text-slate-500">{item.subtitle}</span> : null}
                </span>
                {item.badge ? (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${item.badgeClassName || colors.badge}`}>
                    {item.badge}
                  </span>
                ) : null}
              </span>
            ))
          ) : (
            <span className="grid flex-1 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white/55 px-4 text-center text-xs font-bold text-slate-400">
              {emptyText}
            </span>
          )}
        </span>

        <span className="relative mt-4 flex w-full items-center justify-between border-t border-slate-200/80 pt-4 text-xs font-black text-slate-700">
          مشاهده جدول کامل
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir="rtl"
            className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl"
          >
            <header className={`flex items-start justify-between gap-4 border-b p-4 sm:p-6 ${colors.card}`}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl shadow-lg ${colors.icon}`}>
                  {Icon ? <Icon className="size-5" /> : null}
                </span>
                <div className="min-w-0">
                  <h2 id={titleId} className="text-base font-black text-slate-950 sm:text-xl">{title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
                aria-label="بستن جدول"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-5">{children}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}
