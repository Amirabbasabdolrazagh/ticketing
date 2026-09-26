"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, CheckCheck, Clock3, MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSeenNotificationIds, markNotificationsSeen } from "@/utils/notificationSeen";

export default function NotificationsPage({ role }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        const { data } = await axios.get("/api/notifications");
        if (active && data.success) {
          const seen = getSeenNotificationIds(role);
          const freshNotifications = data.notifications.filter((item) => !seen.has(item._id));
          setNotifications(freshNotifications);
          markNotificationsSeen(role, freshNotifications.map((item) => item._id));
          window.dispatchEvent(new Event("notifications-read"));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadNotifications();
    return () => {
      active = false;
    };
  }, [role]);

  function clearNotifications() {
    setNotifications([]);
  }

  return (
    <section className="app-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-heading">پیام‌ها و اعلان‌ها</h1>
          <p className="page-description">پیام‌های جدید، هشدارهای ددلاین و رویدادهای مهم تیکت‌ها</p>
        </div>
        <Button variant="outline" onClick={clearNotifications}>
          <CheckCheck className="size-4" />
          پاک کردن همه
        </Button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-slate-500">در حال دریافت پیام‌ها...</p>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-slate-500">
            <BellRing className="size-10 text-slate-300" />
            <p>پیام سیستمی جدیدی ندارید.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/70">
            {notifications.map((notification) => (
              <Link
                key={notification._id}
                href={`/${role}/tickets/${notification.ticket?._id}`}
                className="flex gap-4 bg-blue-50/60 p-4 transition hover:bg-blue-100/70 sm:p-5"
              >
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                  notification.type === "new-message"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {notification.type === "new-message"
                    ? <MessageCircleMore className="size-5" />
                    : <Clock3 className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-7 text-slate-800">{notification.message}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {new Date(notification.createdAt).toLocaleString("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                <span className="mt-2 size-2.5 shrink-0 rounded-full bg-blue-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
