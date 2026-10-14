"use client";

import axios from "axios";
import { Download, ExternalLink, LaptopMinimalCheck, LoaderCircle, MonitorCog, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

const statusCopy = {
  requested: "در انتظار تأیید مشتری",
  approved: "دسترسی موقت فعال است",
  declined: "درخواست توسط مشتری رد شد",
  ended: "نشست پایان یافته است",
  expired: "مهلت نشست تمام شد",
};
const activeStatuses = ["requested", "approved"];

const installers = [
  {
    title: "دانلود برای ویندوز",
    detail: "Windows 10 و 11 — نسخهٔ ۶۴ بیتی",
    href: "/downloads/remote-support/ITRasamSupport-Windows-x64.exe",
    fileName: "ITRasamSupport-Windows-x64.exe",
  },
  {
    title: "دانلود برای مک با Apple Silicon",
    detail: "Macهای دارای تراشهٔ M1، M2، M3 و جدیدتر",
    href: "/downloads/remote-support/ITRasamSupport-macOS-Apple-Silicon.zip",
    fileName: "ITRasamSupport-macOS-Apple-Silicon.zip",
  },
  {
    title: "دانلود برای مک Intel",
    detail: "Macهای قدیمی‌تر با پردازندهٔ Intel",
    href: "/downloads/remote-support/ITRasamSupport-macOS-Intel.zip",
    fileName: "ITRasamSupport-macOS-Intel.zip",
  },
];

export default function RemoteSupportPanel({ ticketId, role, className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const { data: result } = await axios.get(`/api/tickets/${ticketId}/remote-support`);
      if (result.success) setData(result);
    } catch (error) {
      if (error.response?.status !== 404) toast.error(error.response?.data?.message || "وضعیت دسترسی دریافت نشد.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    const initialTimer = window.setTimeout(load, 0);
    const timer = window.setInterval(load, 10000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [load]);

  async function requestAccess() {
    setBusy(true);
    try {
      const { data: result } = await axios.post(`/api/tickets/${ticketId}/remote-support`, { requestNote: note });
      if (result.success) {
        setNote("");
        toast.success(result.message);
        await load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "ارسال درخواست ناموفق بود.");
    } finally { setBusy(false); }
  }

  async function update(action) {
    setBusy(true);
    try {
      const { data: result } = await axios.patch(`/api/tickets/${ticketId}/remote-support`, { action });
      if (result.success) {
        toast.success(result.message);
        await load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "تغییر وضعیت ناموفق بود.");
    } finally { setBusy(false); }
  }

  const session = data?.session;
  const isStaff = role === "agent" || role === "admin";
  const isActive = session?.status === "approved";

  return <section className={`ticket-support-card glass-panel h-full w-full overflow-hidden p-4 sm:p-5 ${className}`} dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25"><MonitorCog size={22} /></div>
        <div>
          <h2 className="font-black text-slate-900">دسترسی از راه دور</h2>
          <p className="mt-1 max-w-xl text-xs leading-6 text-slate-500">اتصال فقط با تأیید مشتری فعال می‌شود و حداکثر ۳۰ دقیقه اعتبار دارد. مشتری در هر لحظه می‌تواند مجوز این نشست را پایان دهد.</p>
        </div>
      </div>
      {session && <span className={`rounded-full px-3 py-1 text-xs font-bold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{statusCopy[session.status] || session.status}</span>}
    </div>

    {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} />در حال بررسی وضعیت…</div> : <>
      {session?.requestNote && <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-7 text-slate-700">{session.requestNote}</p>}
      {session?.expiresAt && activeStatuses.includes(session.status) && <p className="mt-3 text-xs text-slate-500">مهلت این درخواست: {new Date(session.expiresAt).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" })}</p>}

      {!isStaff && <details className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 dark:border-blue-400/20 dark:from-blue-500/10 dark:to-transparent">
        <summary className="cursor-pointer list-none">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Download size={18} /></div>
          <div>
            <h3 className="text-sm font-black text-slate-900">نصب برنامهٔ پشتیبانی آی‌تی رسام</h3>
            <p className="mt-1 text-xs leading-6 text-slate-600">فایل مناسب سیستم خود را دانلود و اجرا کنید. پس از درخواست و تأیید شما، پشتیبان فقط برای زمان محدود به سیستم متصل می‌شود.</p>
          </div>
        </div>
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {installers.map((installer) => <a key={installer.href} href={installer.href} download={installer.fileName} className="group rounded-xl border border-slate-200 bg-white px-3 py-3 text-right transition hover:border-blue-400 hover:shadow-sm">
            <span className="flex items-center gap-2 text-sm font-bold text-blue-700"><Download size={16} />{installer.title}</span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">{installer.detail}</span>
          </a>)}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">در Mac اگر هشدار امنیتی دیدید، برنامه را فقط پس از تأیید اینکه از همین سامانه دانلود شده است اجرا کنید.</p>
      </details>}

      {isStaff && data?.canRequest && !activeStatuses.includes(session?.status) && <div className="mt-4 grid gap-3"><label className="text-sm font-bold text-slate-700">توضیح برای مشتری (اختیاری)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} placeholder="برای مثال: برای بررسی تنظیمات شبکه، نیاز به مشاهده موقت صفحه شما دارم." className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-blue-500" /></label><Button onClick={requestAccess} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}ارسال درخواست دسترسی</Button></div>}

      {!isStaff && session?.status === "requested" && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-950">پشتیبان برای رفع مشکل شما درخواست مشاهده و کنترل موقت سیستم را داده است.</p><p className="mt-2 text-xs leading-6 text-amber-800">فقط اگر خودتان رضایت دارید تأیید کنید. پیش از اتصال باید برنامه «پشتیبانی آی‌تی رسام» را روی سیستم اجرا کنید.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => update("approve")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}تأیید دسترسی موقت</Button><Button onClick={() => update("decline")} disabled={busy} variant="outline"><X />رد درخواست</Button></div></div>}

      {isActive && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><LaptopMinimalCheck className="text-emerald-700" size={20} /><p className="ml-auto text-sm font-bold text-emerald-950">مجوز دسترسی موقت فعال است.</p>{data?.canOpenConsole && <Button onClick={() => window.open(data.remoteConsoleUrl, "_blank", "noopener,noreferrer")} className="bg-blue-600"><ExternalLink />باز کردن میز پشتیبانی</Button>}<Button onClick={() => update("end")} disabled={busy} variant="outline"><X />پایان مجوز</Button></div>}

      {isStaff && session?.status === "requested" && <p className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600">در انتظار تأیید مشتری هستید. پس از تأیید، دکمهٔ ورود به میز پشتیبانی فعال می‌شود.</p>}
    </>}
  </section>;
}
