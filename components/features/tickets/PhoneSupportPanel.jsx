"use client";

import axios from "axios";
import { BellRing, LoaderCircle, PhoneCall, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

export default function PhoneSupportPanel({ ticketId, role }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const isCustomer = role === "customer";

  const load = useCallback(async () => {
    try {
      const { data: result } = await axios.get(`/api/tickets/${ticketId}/phone`);
      if (result.success) setData(result);
    } catch (error) {
      toast.error(error.response?.data?.message || "وضعیت تماس دریافت نشد.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    const initialTimer = window.setTimeout(load, 0);
    const timer = window.setInterval(load, 10_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [load]);

  async function action(actionName) {
    setBusy(true);
    try {
      const { data: result } = await axios.post(`/api/tickets/${ticketId}/phone`, { action: actionName });
      if (result.success) {
        toast.success(result.message);
        setData(result);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "عملیات تماس ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  const hasOpenRequest = Boolean(data?.callbackRequestedAt);

  return <section className="glass-panel mt-5 w-full overflow-hidden p-4 sm:p-5" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/25"><PhoneCall size={22} /></div>
        <div>
          <h2 className="font-black text-slate-900">ارتباط تلفنی امن</h2>
          <p className="mt-1 max-w-xl text-xs leading-6 text-slate-500">تماس از طریق شماره ثابت شرکت برقرار می‌شود. شماره مشتری در پنل پشتیبان نمایش داده نمی‌شود.</p>
        </div>
      </div>
      {hasOpenRequest && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">درخواست تماس ثبت شده</span>}
    </div>

    {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} />در حال بررسی تماس…</div> : isCustomer ? <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
      <p className="text-sm leading-7 text-slate-700">برای تماس مستقیم، ابتدا تلفن ثبت‌شدهٔ شما زنگ می‌خورد و پس از پاسخ به آخرین پشتیبانی که با شما تماس گرفته وصل می‌شوید. شماره شما نمایش داده نمی‌شود.</p>
      {!data?.hasLastPhoneSupport && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">برای این تیکت هنوز تماس قبلی از پشتیبان ثبت نشده است. می‌توانید درخواست تماس ثبت کنید.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button className="bg-violet-600 hover:bg-violet-700" disabled={busy || !data?.canCallLastSupport} onClick={() => action("call-last-support")}>
          {busy ? <LoaderCircle className="animate-spin" /> : <PhoneCall />} تماس با پشتیبان
        </Button>
        <Button variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50" disabled={busy || !data?.canRequestCallback} onClick={() => action("request-callback")}>
          <BellRing /> {hasOpenRequest ? "ثبت درخواست دوباره" : "درخواست تماس"}
        </Button>
      </div>
    </div> : <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      {hasOpenRequest && <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900"><BellRing size={17} />مشتری درخواست تماس کرده است.</p>}
      <p className="text-sm leading-7 text-slate-700">با شروع تماس، ابتدا داخلی تلفن شما زنگ می‌خورد؛ فقط پس از پاسخ، تماس به مشتری وصل می‌شود.</p>
      {!data?.hasPbxExtension && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">برای حساب شما داخلی تلفن تعریف نشده است. مدیر باید در مدیریت کاربران، داخلی ایزابل را ثبت کند.</p>}
      {data?.hasPbxExtension && !data?.isPhoneSystemConfigured && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">اتصال تلفنی هنوز در سرور سامانه پیکربندی نشده است.</p>}
      <Button className="mt-4 bg-blue-600 hover:bg-blue-700" disabled={busy || !data?.canCallCustomer} onClick={() => action("call-customer")}>
        {busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} تماس امن با مشتری
      </Button>
      {data?.lastPhoneCallAt && <p className="mt-3 text-xs text-slate-500">آخرین درخواست تماس: {new Date(data.lastPhoneCallAt).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" })}</p>}
    </div>}
  </section>;
}
