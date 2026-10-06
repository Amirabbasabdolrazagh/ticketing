"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Headphones,
  MessageSquareReply,
  RefreshCw,
  Star,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

function faNumber(value = 0) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function formatDateTime(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    date: date.toLocaleDateString("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    time: date.toLocaleTimeString("fa-IR", {
      timeZone: "Asia/Tehran",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

function formatDuration(ms) {
  if (ms === null || ms === undefined) return "—";

  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours) {
    return `${faNumber(hours)} ساعت و ${faNumber(minutes)} دقیقه`;
  }

  if (minutes) {
    return `${faNumber(minutes)} دقیقه و ${faNumber(remainingSeconds)} ثانیه`;
  }

  return `${faNumber(remainingSeconds)} ثانیه`;
}

function DateTime({ value, empty = "—" }) {
  const formatted = formatDateTime(value);

  if (!formatted) {
    return <span className="text-slate-400">{empty}</span>;
  }

  return (
    <div className="whitespace-nowrap">
      <div className="font-bold text-slate-700">{formatted.date}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{formatted.time}</div>
    </div>
  );
}

function MetricCard({ icon: Icon, value, label, className = "" }) {
  return (
    <div
      className={`metric-card flex min-h-[118px] items-center gap-4 px-5 ${className}`}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        <Icon className="size-5" />
      </div>

      <div>
        <div className="text-2xl font-black text-slate-900">
          {faNumber(value)}
        </div>
        <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function statusLabel(status) {
  const labels = {
    open: "باز",
    "in-progress": "در دست اقدام",
    resolved: "برطرف‌شده",
    closed: "بسته‌شده",
  };

  return labels[status] || status || "نامشخص";
}

function statusClass(status) {
  const classes = {
    open: "bg-blue-100 text-blue-700",
    "in-progress": "bg-violet-100 text-violet-700",
    resolved: "bg-emerald-100 text-emerald-700",
    closed: "bg-slate-100 text-slate-700",
  };

  return classes[status] || "bg-slate-100 text-slate-700";
}

function priorityLabel(priority) {
  const labels = {
    low: "کم",
    medium: "متوسط",
    high: "بالا",
  };

  return labels[priority] || priority || "—";
}

function priorityClass(priority) {
  if (priority === "high") return "bg-rose-100 text-rose-700";
  if (priority === "medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function customerResolution(ticket) {
  if (ticket.customerResolution?.isResolved === true) {
    return {
      label: "تأیید مشتری",
      className: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    };
  }

  if (ticket.customerResolution?.isResolved === false) {
    return {
      label: "رد توسط مشتری",
      className: "bg-rose-100 text-rose-700",
      icon: XCircle,
    };
  }

  if (ticket.status === "resolved") {
    return {
      label: "منتظر تأیید مشتری",
      className: "bg-amber-100 text-amber-700",
      icon: Clock3,
    };
  }

  return {
    label: "—",
    className: "bg-slate-100 text-slate-500",
    icon: Clock3,
  };
}

export default function AdminMonitoringPage() {
  const [data, setData] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [streamConnected, setStreamConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState("");

  const loadMonitoring = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);

      const response = await axios.get("/api/admin/monitoring", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.data?.success) {
        throw new Error("Monitoring request failed");
      }

      setData(response.data);
      setLastUpdate(response.data.serverTime || new Date().toISOString());
      setError("");

      setSelectedAgentId((current) => {
        if (
          current &&
          response.data.agents?.some((agent) => agent.id === current)
        ) {
          return current;
        }

        return response.data.agents?.[0]?.id || "";
      });
    } catch (err) {
      console.error("MONITORING LOAD ERROR:", err);
      setError("دریافت اطلاعات مانیتورینگ ناموفق بود");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  useEffect(() => {
    const eventSource = new EventSource("/api/admin/monitoring/stream");

    const handleConnected = (event) => {
      setStreamConnected(true);

      try {
        const payload = JSON.parse(event.data);
        setLastUpdate(payload.serverTime || new Date().toISOString());
      } catch {}
    };

    const handleMonitoringUpdate = () => {
      setStreamConnected(true);
      loadMonitoring({ silent: true });
    };

    const handlePing = (event) => {
      setStreamConnected(true);

      try {
        const payload = JSON.parse(event.data);
        setLastUpdate(payload.serverTime || new Date().toISOString());
      } catch {}
    };

    eventSource.addEventListener("connected", handleConnected);

    eventSource.addEventListener("monitoring-update", handleMonitoringUpdate);

    eventSource.addEventListener("ping", handlePing);

    eventSource.onopen = () => {
      setStreamConnected(true);
    };

    eventSource.onerror = () => {
      setStreamConnected(false);
    };

    return () => {
      eventSource.removeEventListener("connected", handleConnected);

      eventSource.removeEventListener(
        "monitoring-update",
        handleMonitoringUpdate,
      );

      eventSource.removeEventListener("ping", handlePing);

      eventSource.close();
    };
  }, [loadMonitoring]);

  const selectedAgent = useMemo(() => {
    return (
      data?.agents?.find((agent) => agent.id === selectedAgentId) ||
      data?.agents?.[0] ||
      null
    );
  }, [data, selectedAgentId]);

  const urgentTickets = useMemo(() => {
    if (!selectedAgent) return [];

    return selectedAgent.tickets.filter((ticket) => {
      const active = ["open", "in-progress"].includes(ticket.status);

      return (
        ticket.alerts?.escalation4h ||
        (active && !ticket.agentViewedAt) ||
        (active && ticket.priority === "high" && !ticket.agentFirstReplyAt) ||
        ticket.customerResolution?.isResolved === false
      );
    });
  }, [selectedAgent]);

  if (loading) {
    return (
      <section className="app-page" dir="rtl">
        <div className="glass-panel flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto size-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-bold text-slate-600">
              در حال دریافت اطلاعات مانیتورینگ...
            </p>
          </div>
        </div>
      </section>
    );
  }

  const summary = data?.summary || {};
  return (
    <section className="app-page" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Activity className="size-6" />
          </div>

          <div>
            <h1 className="page-heading">مانیتورینگ پشتیبان‌ها</h1>
            <p className="page-description">
              پایش لحظه‌ای عملکرد تیم پشتیبانی و وضعیت رسیدگی به تیکت‌ها
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${
              streamConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {streamConnected ? (
              <Wifi className="size-4" />
            ) : (
              <WifiOff className="size-4" />
            )}

            {streamConnected ? "اتصال زنده برقرار است" : "در حال اتصال مجدد"}
          </div>

          <button
            type="button"
            onClick={() => loadMonitoring()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="size-4" />
            همگام‌سازی
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      {/* 8 KPI - 4 + 4 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          value={summary.totalAgents}
          label="پشتیبان"
          className="border-blue-200 bg-blue-50/80 text-blue-600"
        />

        <MetricCard
          icon={Headphones}
          value={summary.totalTickets}
          label="کل تیکت‌ها"
          className="border-slate-200 bg-white/90 text-slate-600"
        />

        <MetricCard
          icon={Activity}
          value={summary.openTickets}
          label="تیکت فعال"
          className="border-violet-200 bg-violet-50/80 text-violet-600"
        />

        <MetricCard
          icon={EyeOff}
          value={summary.unseenTickets}
          label="مشاهده‌نشده"
          className="border-rose-200 bg-rose-50/80 text-rose-600"
        />

        <MetricCard
          icon={MessageSquareReply}
          value={summary.withoutFirstReply}
          label="بدون اولین پاسخ"
          className="border-amber-200 bg-amber-50/80 text-amber-600"
        />

        <MetricCard
          icon={CheckCircle2}
          value={summary.resolvedTickets}
          label="حل‌شده"
          className="border-emerald-200 bg-emerald-50/80 text-emerald-600"
        />

        <MetricCard
          icon={XCircle}
          value={summary.customerRejected}
          label="عدم تأیید مشتری"
          className="border-rose-200 bg-rose-50/80 text-rose-600"
        />

        <MetricCard
          icon={AlertTriangle}
          value={summary.escalatedTickets}
          label="نیازمند پیگیری"
          className="border-orange-200 bg-orange-50/80 text-orange-600"
        />
      </div>

      {/* Agents + selected agent */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Agent list */}
        <div className="glass-panel overflow-hidden xl:col-span-4">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  لیست پشتیبان‌ها
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  پشتیبان موردنظر را برای مشاهده جزئیات انتخاب کنید
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {faNumber(data?.agents?.length)} نفر
              </span>
            </div>
          </div>

          <div className="p-3">
            <div className="max-h-[680px] space-y-2 overflow-y-auto pl-1">
              {data?.agents?.map((agent) => {
                const active = selectedAgent?.id === agent.id;

                return (
                  <button
                    type="button"
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`group w-full rounded-2xl border p-4 text-right transition-all ${
                      active
                        ? "border-blue-300 bg-gradient-to-l from-blue-50 via-blue-50/60 to-white shadow-[0_10px_35px_rgba(37,99,235,0.10)]"
                        : "border-transparent bg-white/55 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-full border-2 font-black ${
                          active
                            ? "border-blue-300 bg-blue-100 text-blue-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {agent.name?.trim()?.charAt(0) || "پ"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-black text-slate-900">
                            {agent.name}
                          </span>

                          {active ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black text-blue-700">
                              انتخاب‌شده
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {agent.phone ||
                            agent.email ||
                            "اطلاعات تماس ثبت نشده"}
                        </div>
                      </div>

                      <div
                        className={`flex size-8 items-center justify-center rounded-xl transition ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                        }`}
                      >
                        ‹
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white/80 px-2 py-2 text-center">
                        <div className="text-sm font-black text-slate-900">
                          {faNumber(agent.stats.openTickets)}
                        </div>
                        <div className="mt-0.5 text-[9px] text-slate-500">
                          فعال
                        </div>
                      </div>

                      <div className="rounded-xl bg-rose-50/90 px-2 py-2 text-center">
                        <div className="text-sm font-black text-rose-600">
                          {faNumber(agent.stats.unseenTickets)}
                        </div>
                        <div className="mt-0.5 text-[9px] text-slate-500">
                          مشاهده‌نشده
                        </div>
                      </div>

                      <div className="rounded-xl bg-emerald-50/90 px-2 py-2 text-center">
                        <div className="text-sm font-black text-emerald-700">
                          {faNumber(agent.stats.resolvedTickets)}
                        </div>
                        <div className="mt-0.5 text-[9px] text-slate-500">
                          حل‌شده
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!data?.agents?.length ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  پشتیبانی ثبت نشده است
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Selected agent */}
        <div className="space-y-5 xl:col-span-8">
          {selectedAgent ? (
            <>
              {/* Agent profile */}
              <div className="glass-panel overflow-hidden">
                <div className="relative overflow-hidden p-5 sm:p-6">
                  <div className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-blue-100/60 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 right-10 size-56 rounded-full bg-violet-100/40 blur-3xl" />

                  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-cyan-50 text-xl font-black text-blue-700 shadow-md">
                        {selectedAgent.name?.trim()?.charAt(0) || "پ"}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black text-slate-950">
                            {selectedAgent.name}
                          </h2>

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                            پشتیبان
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {selectedAgent.phone ? (
                            <span>{selectedAgent.phone}</span>
                          ) : null}

                          {selectedAgent.email ? (
                            <span>{selectedAgent.email}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-[150px] rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400">
                          عضویت از
                        </div>
                        <div className="mt-1 text-xs font-black text-slate-700">
                          <DateTime
                            value={selectedAgent.createdAt}
                            empty="ثبت نشده"
                          />
                        </div>
                      </div>

                      <div className="min-w-[150px] rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400">
                          آخرین فعالیت سایت
                        </div>
                        <div className="mt-1 text-xs font-black text-slate-700">
                          <DateTime
                            value={selectedAgent.siteLastSeenAt}
                            empty="ثبت نشده"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent KPIs */}
                <div className="grid grid-cols-2 border-t border-slate-100 bg-white/45 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="border-b border-l border-slate-100 p-4 lg:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <Headphones className="size-4" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">
                          {faNumber(selectedAgent.stats.totalTickets)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          تیکت دریافتی
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-l border-slate-100 p-4 lg:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                        <Eye className="size-4" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">
                          {faNumber(selectedAgent.stats.viewedTickets)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          مشاهده‌شده
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-l border-slate-100 p-4 sm:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <EyeOff className="size-4" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-rose-600">
                          {faNumber(selectedAgent.stats.unseenTickets)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          مشاهده‌نشده
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-l border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <MessageSquareReply className="size-4" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">
                          {faNumber(selectedAgent.stats.withoutFirstReply)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          بدون پاسخ
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 p-4 sm:col-span-1">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-emerald-700">
                          {faNumber(selectedAgent.stats.resolvedTickets)}
                        </div>
                        <div className="text-[10px] text-slate-500">حل‌شده</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time averages + customer satisfaction */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="glass-panel p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Clock3 className="size-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">
                        میانگین زمان‌ها
                      </h3>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        بر اساس زمان‌های ثبت‌شده واقعی
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-emerald-50/70 p-4">
                      <div className="flex items-center gap-3">
                        <Eye className="size-5 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-600">
                          اولین مشاهده
                        </span>
                      </div>

                      <span className="text-left font-black text-emerald-700">
                        {formatDuration(selectedAgent.stats.averageFirstViewMs)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-blue-50/70 p-4">
                      <div className="flex items-center gap-3">
                        <MessageSquareReply className="size-5 text-blue-600" />
                        <span className="text-xs font-bold text-slate-600">
                          اولین پاسخ
                        </span>
                      </div>

                      <span className="text-left font-black text-blue-700">
                        {formatDuration(
                          selectedAgent.stats.averageFirstReplyMs,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                        <Star className="size-5" />
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900">
                          رضایت مشتری
                        </h3>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          امتیاز ثبت‌شده برای این پشتیبان
                        </p>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-2xl font-black text-slate-900">
                        {selectedAgent.stats.averageRating !== null
                          ? selectedAgent.stats.averageRating.toLocaleString(
                              "fa-IR",
                            )
                          : "—"}

                        {selectedAgent.stats.averageRating !== null ? (
                          <span className="mr-1 text-xs font-bold text-slate-400">
                            از ۵
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-6 ${
                          selectedAgent.stats.averageRating >= star
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-100 text-slate-200"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    بر اساس{" "}
                    <span className="font-black text-slate-700">
                      {faNumber(selectedAgent.stats.ratingCount)}
                    </span>{" "}
                    امتیاز
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <div className="text-lg font-black text-emerald-700">
                        {faNumber(selectedAgent.stats.customerConfirmed)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        تأیید رفع مشکل
                      </div>
                    </div>

                    <div className="rounded-2xl bg-rose-50 p-3">
                      <div className="text-lg font-black text-rose-700">
                        {faNumber(selectedAgent.stats.customerRejected)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        عدم تأیید مشتری
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Urgent tickets */}
              {urgentTickets.length > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/75 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle className="size-5 text-rose-600" />

                    <h3 className="font-black text-rose-900">
                      نیازمند اقدام فوری
                    </h3>

                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">
                      {faNumber(urgentTickets.length)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-rose-600/80">
                    تیکت‌های مشاهده‌نشده، اولویت بالا، Escalation یا مواردی که
                    مشتری رفع مشکل را تأیید نکرده است
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {urgentTickets.slice(0, 8).map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/admin/tickets/${ticket.id}`}
                        className="rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
                      >
                        {ticket.ticketNumber || ticket.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/65 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                    <CheckCircle2 className="size-5" />
                    مورد فوری برای این پشتیبان وجود ندارد
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-panel flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <Headphones className="mx-auto size-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-500">
                  پشتیبانی برای نمایش انتخاب نشده است
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket details */}
      <div className="glass-panel overflow-hidden p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-slate-900">
              جزئیات تیکت‌های {selectedAgent?.name || ""}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              زمان تخصیص، اولین مشاهده و اولین پاسخ بر اساس اطلاعات ثبت‌شده سرور
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {faNumber(selectedAgent?.tickets?.length)} تیکت
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-right text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/80 text-xs text-slate-500">
                <th className="px-4 py-3 font-bold">تیکت</th>
                <th className="px-4 py-3 font-bold">تخصیص</th>
                <th className="px-4 py-3 font-bold">اولین مشاهده</th>
                <th className="px-4 py-3 font-bold">اولین پاسخ</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">اولویت</th>
                <th className="px-4 py-3 font-bold">تأیید مشتری</th>
              </tr>
            </thead>

            <tbody>
              {selectedAgent?.tickets?.length ? (
                selectedAgent.tickets.map((ticket) => {
                  const resolution = customerResolution(ticket);
                  const ResolutionIcon = resolution.icon;

                  return (
                    <tr
                      key={ticket.id}
                      className="border-b border-slate-100 transition hover:bg-blue-50/30"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="font-black text-blue-700 hover:underline"
                        >
                          {ticket.ticketNumber || ticket.title}
                        </Link>

                        <div className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                          {ticket.title}
                        </div>

                        {ticket.project?.name ? (
                          <div className="mt-1 text-[10px] text-slate-400">
                            {ticket.project.name}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-xs">
                        <DateTime value={ticket.assignedAt} />
                      </td>

                      <td className="px-4 py-4">
                        {ticket.agentViewedAt ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                              <Eye className="size-4" />
                              مشاهده شد
                            </div>

                            <div className="mt-1.5 text-xs">
                              <DateTime value={ticket.agentViewedAt} />
                            </div>

                            {ticket.firstViewDurationMs !== null ? (
                              <div className="mt-1 text-[10px] font-bold text-slate-400">
                                + {formatDuration(ticket.firstViewDurationMs)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">
                            <EyeOff className="size-3.5" />
                            مشاهده‌نشده
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {ticket.agentFirstReplyAt ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                              <MessageSquareReply className="size-4" />
                              پاسخ داده
                            </div>

                            <div className="mt-1.5 text-xs">
                              <DateTime value={ticket.agentFirstReplyAt} />
                            </div>

                            {ticket.firstReplyDurationMs !== null ? (
                              <div className="mt-1 text-[10px] font-bold text-slate-400">
                                + {formatDuration(ticket.firstReplyDurationMs)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                            بدون پاسخ
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClass(
                            ticket.status,
                          )}`}
                        >
                          {statusLabel(ticket.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${priorityClass(
                            ticket.priority,
                          )}`}
                        >
                          {priorityLabel(ticket.priority)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${resolution.className}`}
                        >
                          <ResolutionIcon className="size-3.5" />
                          {resolution.label}
                        </span>

                        {ticket.customerResolution?.rating ? (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-amber-600">
                            <Star className="size-3 fill-current" />
                            {faNumber(ticket.customerResolution.rating)} از ۵
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Headphones className="size-5" />
                    </div>

                    <div className="mt-3 text-sm font-bold text-slate-500">
                      برای این پشتیبان هنوز تیکتی ثبت نشده است
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last sync */}
      <div className="flex flex-col gap-1 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          اطلاعات این صفحه از دیتابیس دریافت می‌شود و تغییرات از طریق اتصال زنده
          اعمال می‌شوند
        </span>

        <span>
          آخرین همگام‌سازی:{" "}
          {lastUpdate ? (
            <span className="font-bold text-slate-500">
              {formatDateTime(lastUpdate)?.date} -{" "}
              {formatDateTime(lastUpdate)?.time}
            </span>
          ) : (
            "—"
          )}
        </span>
      </div>
    </section>
  );
}
