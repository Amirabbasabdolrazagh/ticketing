"use client";

import axios from "axios";
import { ExternalLink, LaptopMinimalCheck, LoaderCircle, MonitorCog, ShieldCheck, X } from "lucide-react";
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

export default function RemoteSupportPanel({ ticketId, role }) {
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
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
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

  return <section className="glass-panel mt-5 w-full overflow-hidden p-4 sm:p-5" dir="rtl">
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

      {isStaff && data?.canRequest && !activeStatuses.includes(session?.status) && <div className="mt-4 grid gap-3"><label className="text-sm font-bold text-slate-700">توضیح برای مشتری (اختیاری)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} placeholder="برای مثال: برای بررسی تنظیمات شبکه، نیاز به مشاهده موقت صفحه شما دارم." className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-blue-500" /></label><Button onClick={requestAccess} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}ارسال درخواست دسترسی</Button></div>}

      {!isStaff && session?.status === "requested" && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-950">پشتیبان برای رفع مشکل شما درخواست مشاهده و کنترل موقت سیستم را داده است.</p><p className="mt-2 text-xs leading-6 text-amber-800">فقط اگر خودتان رضایت دارید تأیید کنید. پیش از اتصال باید برنامه «پشتیبانی آی‌تی رسام» را روی سیستم اجرا کنید.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => update("approve")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}تأیید دسترسی موقت</Button><Button onClick={() => update("decline")} disabled={busy} variant="outline"><X />رد درخواست</Button></div></div>}

      {isActive && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><LaptopMinimalCheck className="text-emerald-700" size={20} /><p className="ml-auto text-sm font-bold text-emerald-950">مجوز دسترسی موقت فعال است.</p>{data?.canOpenConsole && <Button onClick={() => window.open(data.remoteConsoleUrl, "_blank", "noopener,noreferrer")} className="bg-blue-600"><ExternalLink />باز کردن میز پشتیبانی</Button>}<Button onClick={() => update("end")} disabled={busy} variant="outline"><X />پایان مجوز</Button></div>}

      {isStaff && session?.status === "requested" && <p className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600">در انتظار تأیید مشتری هستید. پس از تأیید، دکمهٔ ورود به میز پشتیبانی فعال می‌شود.</p>}
    </>}
  </section>;
}
