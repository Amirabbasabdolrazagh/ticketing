"use client";

import DashboardTableCard from "@/components/features/dashboard/DashboardTableCard";
import TicketStatusOverview from "@/components/features/dashboard/TicketStatusOverview";
import GetAllTickets from "@/components/features/tickets/getAllTickets/getAllTickets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";
import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircle, FaRegClock } from "react-icons/fa6";
import { IoIosCloseCircleOutline, IoIosWarning } from "react-icons/io";
import { IoDocumentText } from "react-icons/io5";
import toast, { Toaster } from "react-hot-toast";

const preview = (tickets, badge) => tickets.slice(0, 3).map((ticket) => ({
  id: ticket._id,
  title: ticket.title,
  subtitle: ticket.creator?.name || ticket.project?.name || "بدون مشتری",
  badge: typeof badge === "function" ? badge(ticket) : badge,
}));

export default function AgentDashboard() {
  const [allTickets, setAllTickets] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  useEffect(() => {
    const load = async (url, setter) => {
      try {
        const { data } = await axios.get(url);
        if (data.success) setter(data.tickets);
      } catch (error) {
        toast.error(error.response?.data?.message || "دریافت اطلاعات داشبورد ناموفق بود");
      }
    };
    load("/api/tickets", setAllTickets);
    load("/api/tickets?limit=10", setRecentTickets);
  }, []);

  const statusCount = (status) => allTickets.filter((ticket) => ticket.status === status).length;
  const openCount = statusCount("open");
  const inProgressCount = statusCount("in-progress");
  const resolvedCount = statusCount("resolved");
  const closedCount = statusCount("closed");
  const highPriorityTickets = allTickets.filter((ticket) => ticket.priority === "high" && ["open", "in-progress"].includes(ticket.status));
  const chartData = [
    { status: "open", tickets: openCount },
    { status: "in-progress", tickets: inProgressCount },
    { status: "resolved", tickets: resolvedCount },
    { status: "closed", tickets: closedCount },
  ];

  return (
    <>
      <Toaster />
      <section className="app-page">
        <div className="grid grid-cols-1 gap-4 py-3 text-center sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["همه تیکت‌ها", allTickets.length, IoDocumentText, "border-blue-200 bg-blue-50/80 text-blue-500"],
            ["تیکت‌های باز", openCount, FaRegCircle, "border-amber-200 bg-amber-50/80 text-amber-500"],
            ["در دست اقدام", inProgressCount, FaRegClock, "border-violet-200 bg-violet-50/80 text-violet-500"],
            ["برطرف شده", resolvedCount, FaRegCheckCircle, "border-emerald-200 bg-emerald-50/80 text-emerald-500"],
            ["بسته شده", closedCount, IoIosCloseCircleOutline, "border-slate-200 bg-slate-50/80 text-slate-500"],
          ].map(([label, value, Icon, style]) => (
            <div key={label} className={`metric-card dashboard-metric flex items-center justify-center gap-5 px-5 ${style}`}>
              <Icon size={35} /><div><h1>{value}</h1><p className="text-sm text-slate-700">{label}</p></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
          <div className="dashboard-summary-pair glass-panel min-w-0 p-5 lg:col-span-6">
            <h2 className="text-base font-black text-slate-950">نمای کلی</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["تخصیص‌یافته", allTickets.length, "bg-blue-50 text-blue-700 border-blue-100"],
                ["در دست اقدام", inProgressCount, "bg-violet-50 text-violet-700 border-violet-100"],
                ["برطرف شده", resolvedCount, "bg-emerald-50 text-emerald-700 border-emerald-100"],
                ["نیازمند پیگیری", highPriorityTickets.length, "bg-rose-50 text-rose-700 border-rose-100"],
              ].map(([label, value, style]) => <div key={label} className={`rounded-2xl border p-4 ${style}`}><b className="text-xl text-slate-950">{value}</b><span className="mt-2 block text-xs font-bold">{label}</span></div>)}
            </div>
          </div>
          <div className="dashboard-summary-pair min-w-0 lg:col-span-6"><TicketStatusOverview data={chartData} /></div>

          <div className="min-w-0 lg:col-span-6">
            <DashboardTableCard title="جدیدترین تیکت‌ها" description="آخرین تیکت‌های تخصیص‌یافته به شما" count={recentTickets.length} icon={ListChecks} tone="blue" previewItems={preview(recentTickets, (ticket) => ticket.status === "resolved" ? "حل‌شده" : ticket.status === "in-progress" ? "در حال رسیدگی" : "باز")}>
              <TicketTable tickets={recentTickets} />
            </DashboardTableCard>
          </div>
          <div className="min-w-0 lg:col-span-6">
            <DashboardTableCard title="نیازمند پیگیری" description="اولویت‌های بالا که هنوز باز یا در حال رسیدگی هستند" count={highPriorityTickets.length} icon={IoIosWarning} tone="amber" previewItems={preview(highPriorityTickets, "اولویت بالا")}>
              <TicketTable tickets={highPriorityTickets} emptyText="تیکت با اولویت بالا وجود ندارد." />
            </DashboardTableCard>
          </div>
        </div>
      </section>
    </>
  );
}

function TicketTable({ tickets, emptyText = "تیکتی برای نمایش وجود ندارد." }) {
  return (
    <Table className="min-w-[760px]">
      <TableHeader><TableRow><TableHead className="text-right">عنوان</TableHead><TableHead className="text-right">خدمت</TableHead><TableHead className="text-right">پشتیبان</TableHead><TableHead className="text-right">مشتری</TableHead><TableHead className="text-right">وضعیت</TableHead><TableHead className="text-right">مهلت رسیدگی</TableHead><TableHead className="text-right">اولویت</TableHead></TableRow></TableHeader>
      {tickets.length ? tickets.map((ticket) => <GetAllTickets {...ticket} key={ticket._id} basePath="/agent" />) : <TableBody><TableRow><TableCell colSpan={7} className="py-12 text-center text-slate-500">{emptyText}</TableCell></TableRow></TableBody>}
    </Table>
  );
}
