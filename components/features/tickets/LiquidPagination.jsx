"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function LiquidPagination({ page, totalPages, total, onPageChange }) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);

  const start = Math.max(1, Math.min(safePage - 2, safeTotalPages - 4));
  const pages = Array.from({ length: Math.min(5, safeTotalPages) }, (_, index) => start + index);

  return (
    <nav className="sticky bottom-4 z-20 mx-auto mt-6 flex w-fit max-w-full flex-wrap items-center justify-center gap-1.5 rounded-[1.6rem] border border-white/80 bg-white/55 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/50 backdrop-blur-2xl" aria-label="صفحه‌بندی تیکت‌ها" dir="ltr">
      <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} className="flex size-10 items-center justify-center rounded-2xl bg-white/70 text-slate-600 transition hover:bg-white disabled:opacity-35" aria-label="صفحه قبل">
        <ChevronLeft className="size-5" />
      </button>
      {pages.map((item) => (
        <button key={item} type="button" onClick={() => onPageChange(item)} aria-current={item === safePage ? "page" : undefined} className={`size-10 rounded-2xl text-sm font-black transition ${item === safePage ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/25" : "bg-white/45 text-slate-600 hover:bg-white"}`}>
          {item.toLocaleString("fa-IR")}
        </button>
      ))}
      <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage === safeTotalPages} className="flex size-10 items-center justify-center rounded-2xl bg-white/70 text-slate-600 transition hover:bg-white disabled:opacity-35" aria-label="صفحه بعد">
        <ChevronRight className="size-5" />
      </button>
      <span className="px-2 text-xs text-slate-500" dir="rtl">
        صفحه {safePage.toLocaleString("fa-IR")} از {safeTotalPages.toLocaleString("fa-IR")} · {(total || 0).toLocaleString("fa-IR")} تیکت
      </span>
    </nav>
  );
}
