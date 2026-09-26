"use client";

import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { FaTelegramPlane } from "react-icons/fa";
import { BellRing, CheckCircle2, ChevronDown, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TelegramConnectButton({ linked = false, baleLinked = false, required = false }) {
  const [status, setStatus] = useState({ telegram: linked, bale: baleLinked });
  const isLinked = status.telegram || status.bale;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await axios.get("/api/auth/me");
        setStatus({ telegram: Boolean(data.user?.telegramLinked), bale: Boolean(data.user?.baleLinked) });
      } catch {}
    };
    const interval = window.setInterval(checkStatus, 4000);
    window.addEventListener("focus", checkStatus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkStatus);
    };
  }, []);

  const connect = async (messenger) => {
    try {
      const { data } = await axios.post(`/api/${messenger}/link`);
      if (data.success) window.location.href = data.url;
    } catch (error) {
      const label = messenger === "bale" ? "بله" : "تلگرام";
      toast.error(error.response?.data?.message || `اتصال به ${label} انجام نشد`);
    }
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="gap-2 border-sky-400 text-sky-700 hover:bg-sky-50" onClick={() => connect("telegram")}>
        <FaTelegramPlane className="size-5" />
        {status.telegram ? "اتصال مجدد تلگرام" : "اتصال به تلگرام"}
      </Button>
      <Button type="button" variant="outline" className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => connect("bale")}>
        <MessageCircle className="size-5" />
        {status.bale ? "اتصال مجدد بله" : "اتصال به بله"}
      </Button>
    </div>
  );

  if (!required) return actions;

  return (
    <section className="mt-4 w-full overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm" dir="rtl">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-white ${isLinked ? "bg-emerald-500" : "bg-sky-500"}`}>
            {isLinked ? <CheckCircle2 className="size-6" /> : <BellRing className="size-6" />}
          </span>
          <div>
            <h2 className="font-black text-slate-900">{isLinked ? "پیام‌رسان شما متصل است" : "اتصال یک پیام‌رسان الزامی است"}</h2>
            <p className="mt-1 text-xs leading-6 text-slate-600">
              {isLinked ? `اتصال ${status.bale ? "بله" : "تلگرام"} فعال است و اعلان‌ها از همین مسیر ارسال می‌شوند.` : "برای ورود به سایر بخش‌های سامانه، فقط یکی از پیام‌رسان‌های بله یا تلگرام را متصل کنید."}
            </p>
          </div>
        </div>
        {actions}
      </div>
      <details className="group border-t border-sky-100 bg-white/65">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold text-slate-800">
          <span>راهنمای اتصال و دلیل الزامی‌بودن</span>
          <ChevronDown className="size-5 transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-900"><BellRing className="size-4 text-sky-600" /> مراحل اتصال</h3>
            <ol className="mt-3 space-y-2 text-xs leading-6 text-slate-600">
              <li>۱. بله یا تلگرام را انتخاب کنید.</li>
              <li>۲. در صفحه ربات، دکمه شروع را بزنید.</li>
              <li>۳. به سامانه برگردید؛ وضعیت اتصال خودکار بررسی می‌شود.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="size-4 text-emerald-600" /> چرا الزامی است؟</h3>
            <p className="mt-3 text-xs leading-6 text-slate-600">اعلان تخصیص، پاسخ جدید و تغییرات مهم تیکت باید سریع به دست شما برسد. سامانه فقط شناسه گفت‌وگو را برای ارسال اعلان نگه می‌دارد و به پیام‌های شخصی شما دسترسی ندارد.</p>
          </div>
        </div>
      </details>
    </section>
  );
}
