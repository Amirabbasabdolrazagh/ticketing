"use client";

import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { FaTelegramPlane } from "react-icons/fa";
import { BellRing, CheckCircle2, ChevronDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TelegramConnectButton({ linked = false, required = false }) {
  const [verifiedLinked, setVerifiedLinked] = useState(false);
  const isLinked = linked || verifiedLinked;

  useEffect(() => {
    if (!required || isLinked) return;
    const checkStatus = async () => {
      try {
        const { data } = await axios.get("/api/auth/me");
        if (data.user?.telegramLinked) setVerifiedLinked(true);
      } catch {}
    };
    const interval = window.setInterval(checkStatus, 4000);
    window.addEventListener("focus", checkStatus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkStatus);
    };
  }, [isLinked, required]);

  const connectTelegram = async () => {
    try {
      const { data } = await axios.post("/api/telegram/link");
      if (data.success) window.location.href = data.url;
    } catch (error) {
      toast.error(error.response?.data?.message || "اتصال به تلگرام انجام نشد");
    }
  };

  if (!required) {
    return (
      <Button type="button" variant="outline" className="gap-2 border-sky-400 text-sky-600 hover:bg-sky-50" onClick={connectTelegram}>
        <FaTelegramPlane className="size-5" />
        {isLinked ? "اتصال مجدد تلگرام" : "اتصال حساب تلگرام"}
      </Button>
    );
  }

  return (
    <section className="mt-4 w-full overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 shadow-sm" dir="rtl">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-white ${isLinked ? "bg-emerald-500" : "bg-sky-500"}`}>
            {isLinked ? <CheckCircle2 className="size-6" /> : <FaTelegramPlane className="size-6" />}
          </span>
          <div>
            <h2 className="font-black text-slate-900">اتصال تلگرام {isLinked ? "فعال است" : "الزامی است"}</h2>
            <p className="mt-1 text-xs leading-6 text-slate-600">
              {isLinked ? "اتصال یک‌بار انجام شده و تا زمانی که ربات را مسدود نکنید فعال می‌ماند." : "برای ورود به سایر بخش‌های سامانه فقط یک‌بار حساب تلگرام خود را متصل کنید."}
            </p>
          </div>
        </div>
        {!isLinked && (
          <Button type="button" className="gap-2 bg-sky-600 text-white hover:bg-sky-700" onClick={connectTelegram}>
            <FaTelegramPlane className="size-5" />
            اتصال به تلگرام
          </Button>
        )}
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
              <li>۱. روی دکمه «اتصال به تلگرام» بزنید.</li>
              <li>۲. در صفحه ربات، دکمه Start یا شروع را انتخاب کنید.</li>
              <li>۳. به سامانه برگردید؛ وضعیت اتصال خودکار بررسی می‌شود.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="size-4 text-emerald-600" /> چرا الزامی است؟</h3>
            <p className="mt-3 text-xs leading-6 text-slate-600">
              اعلان تخصیص، پاسخ جدید و تغییرات مهم تیکت باید سریع و مطمئن به دست شما برسد. ربات فقط شناسه گفت‌وگو را برای ارسال اعلان نگه می‌دارد و به پیام‌ها یا حساب شخصی تلگرام شما دسترسی ندارد.
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
