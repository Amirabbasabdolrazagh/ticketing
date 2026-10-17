"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpLeft, PhoneCall, X } from "lucide-react";
import styles from "./incoming-alert.module.css";

const phoneUrl = process.env.NEXT_PUBLIC_PHONE_URL || "/phone";

export default function IncomingPhoneAlert() {
  const [call, setCall] = useState(null);
  const [dismissedId, setDismissedId] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/phone/incoming", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setCall(data.call || null);
    } catch {
      // A temporary connection failure should not dismiss a visible ringing call.
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 2500);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!call || call.callId === dismissedId) return;
    const oldTitle = document.title;
    document.title = `☎ تماس ورودی ${call.customerName} | ای‌تی رسام`;
    return () => { document.title = oldTitle; };
  }, [call, dismissedId]);

  if (!call || call.callId === dismissedId) return null;

  return (
    <aside className={styles.alert} role="alert" aria-live="assertive" dir="rtl">
      <div className={styles.ring} aria-hidden="true"><span /><span /><PhoneCall size={30} /></div>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>تماس ورودی · خط پشتیبانی شما</span>
        <strong>{call.customerName}</strong>
        <p>مشتری پشت خط است. تلفن سازمانی را باز کنید تا تماس به داخلی شما وصل شود.</p>
      </div>
      <a className={styles.open} href={phoneUrl} target="_blank" rel="noopener noreferrer">
        باز کردن تلفن <ArrowUpLeft size={18} />
      </a>
      <button className={styles.close} type="button" onClick={() => setDismissedId(call.callId)} aria-label="بستن اعلان تماس">
        <X size={18} />
      </button>
    </aside>
  );
}
