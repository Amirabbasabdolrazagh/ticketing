"use client";

import { Star } from "lucide-react";

function Stars({ value, interactive = false, onChange, label }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-700">{label}</p>
      <div className="flex gap-1" dir="ltr" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const Icon = interactive ? "button" : "span";
          return (
            <Icon
              key={star}
              {...(interactive ? { type: "button", onClick: () => onChange(star), "aria-label": `${star} ستاره` } : {})}
              className={interactive ? "rounded-lg p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400" : "p-0.5"}
            >
              <Star className={`size-7 ${star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
            </Icon>
          );
        })}
      </div>
    </div>
  );
}

export function StarRatingInput({ label, value, onChange }) {
  return <Stars label={label} value={value} interactive onChange={onChange} />;
}

export default function TicketRatingSummary({ resolution, showFeedback = false }) {
  const legacyRating = resolution?.agentRating && resolution?.processRating
    ? Math.round((resolution.agentRating + resolution.processRating) / 2)
    : resolution?.agentRating || resolution?.processRating;
  const rating = resolution?.rating || legacyRating;
  if (!rating) return null;
  return (
    <section className="glass-panel my-4 w-full border-amber-200 bg-gradient-to-l from-amber-50/90 to-white p-4 sm:p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-black text-slate-900">امتیاز مشتری به رسیدگی تیکت</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${resolution.isResolved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          {resolution.isResolved ? "مشکل برطرف شده" : "مشکل برطرف نشده"}
        </span>
      </div>
      <div className="grid gap-4">
        <Stars label="امتیاز تجربه پشتیبانی" value={rating} />
        {showFeedback && rating <= 3 && resolution.feedback && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
            <p className="mb-2 text-xs font-black text-rose-700">گزارش مشتری درباره امتیاز پایین</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
              {resolution.feedback}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
