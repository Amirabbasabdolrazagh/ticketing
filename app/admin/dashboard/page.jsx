"use client";

import DashboardTableCard from "@/components/features/dashboard/DashboardTableCard";
import ManagementIntelligence from "@/components/features/dashboard/ManagementIntelligence";
import TicketStatusOverview from "@/components/features/dashboard/TicketStatusOverview";
import GetAllTickets from "@/components/features/tickets/getAllTickets/getAllTickets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ListChecks, MessageSquareReply } from "lucide-react";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircle, FaRegClock, FaUsers } from "react-icons/fa6";
import { IoIosCloseCircleOutline, IoIosWarning } from "react-icons/io";
import { IoDocumentText } from "react-icons/io5";
import { MdNotificationImportant, MdOutlineSupportAgent } from "react-icons/md";

const dateTime = (value) => value ? new Date(value).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" }) : "—";
const previewFromTickets = (tickets, badge) => tickets.slice(0, 3).map((ticket) => ({
  id: ticket._id,
  title: ticket.title,
  subtitle: ticket.assignedTo?.name || ticket.creator?.name || ticket.project?.name || "بدون مسئول",
  badge: typeof badge === "function" ? badge(ticket) : badge,
}));

export default function AdminDashboard() {
  const [allTickets, setAllTickets] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customerRejected, setCustomerRejected] = useState([]);
  const [monitoring, setMonitoring] = useState(null);

  useEffect(() => {
    const load = async (url, setter, key) => {
      try {
        const { data } = await axios.get(url);
        if (data.success) setter(data[key]);
      } catch {}
    };
    const loadRejected = async () => {
      try {
        const { data } = await axios.get("/api/tickets/resolution/unresolved");
        if (data.success) setCustomerRejected(data.unresolvedTickets);
      } catch (error) { console.error("دریافت تیکت‌های تأییدنشده ناموفق بود", error); }
    };
    const loadMonitoring = async () => {
      try {
        const { data } = await axios.get("/api/admin/monitoring");
        if (data.success) setMonitoring(data);
      } catch (error) { console.error("دریافت تحلیل مدیریتی ناموفق بود", error); }
    };
    load("/api/tickets", setAllTickets, "tickets");
    load("/api/tickets?limit=10", setRecentTickets, "tickets");
    load("/api/projects", setProjects, "projects");
    load("/api/users", setUsers, "safeInfo");
    loadRejected();
    loadMonitoring();
    const rejectedTimer = window.setInterval(loadRejected, 15000);
    const monitoringTimer = window.setInterval(loadMonitoring, 60000);
    return () => { window.clearInterval(rejectedTimer); window.clearInterval(monitoringTimer); };
  }, []);

  const statusCount = (status) => allTickets.filter((ticket) => ticket.status === status).length;
  const numberOfAgents = users.filter((user) => user.role === "agent").length;
  const numberOfCustomers = users.filter((user) => user.role === "customer").length;
  const openCount = statusCount("open");
  const inProgressCount = statusCount("in-progress");
  const resolvedCount = statusCount("resolved");
  const closedCount = statusCount("closed");
  const highPriorityTickets = allTickets.filter((ticket) => ticket.priority === "high" && ["open", "in-progress"].includes(ticket.status));
  const assignedTickets = allTickets.filter((ticket) => ticket.assignedTo).sort((a, b) => new Date(b.assignedAt || b.createdAt) - new Date(a.assignedAt || a.createdAt));
  const rejectedTickets = customerRejected.map((item) => ({ ...item.ticket, creator: item.customer }));
  const chartData = [
    { status: "open", tickets: openCount },
    { status: "in-progress", tickets: inProgressCount },
    { status: "resolved", tickets: resolvedCount },
    { status: "closed", tickets: closedCount },
  ];

  return (
    <section className="app-page">
      <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 xl:grid-cols-5">
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

      <div className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="dashboard-summary-pair glass-panel min-w-0 p-4 sm:p-5 lg:col-span-6">
          <h2 className="text-base font-black text-slate-950">نمای کلی</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["خدمات فعال", projects.length, IoDocumentText, "bg-cyan-50 text-cyan-700 border-cyan-100"],
              ["پشتیبان‌ها", numberOfAgents, MdOutlineSupportAgent, "bg-violet-50 text-violet-700 border-violet-100"],
              ["مشتری‌ها", numberOfCustomers, FaUsers, "bg-blue-50 text-blue-700 border-blue-100"],
              ["اولویت بالا", highPriorityTickets.length, IoIosWarning, "bg-rose-50 text-rose-700 border-rose-100"],
            ].map(([label, value, Icon, style]) => (
              <div key={label} className={`rounded-2xl border p-3 ${style}`}>
                <div className="flex items-center justify-between gap-2"><Icon size={20} /><b className="text-lg text-slate-950">{value}</b></div>
                <span className="mt-2 block text-xs font-bold">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-summary-pair min-w-0 lg:col-span-6"><TicketStatusOverview data={chartData} /></div>
        <div className="min-w-0 lg:col-span-12"><ManagementIntelligence data={monitoring} /></div>

        <div className="min-w-0 lg:col-span-6">
          <DashboardTableCard title="جدیدترین تیکت‌ها" description="آخرین درخواست‌های ثبت‌شده در سامانه" count={recentTickets.length} icon={ListChecks} tone="blue" previewItems={previewFromTickets(recentTickets, (ticket) => ticket.status === "resolved" ? "حل‌شده" : ticket.status === "in-progress" ? "در حال رسیدگی" : "باز")}>
            <TicketTable tickets={recentTickets} basePath="/admin" />
          </DashboardTableCard>
        </div>
        <div className="min-w-0 lg:col-span-6">
          <DashboardTableCard title="مشاهده و پاسخ پشتیبان" description="کنترل اولین مشاهده و اولین پاسخ تیکت‌های تخصیص‌یافته" count={assignedTickets.length} icon={Eye} tone="emerald" previewItems={previewFromTickets(assignedTickets, (ticket) => ticket.agentFirstReplyAt ? "پاسخ داده" : ticket.agentViewedAt ? "دیده‌شده" : "دیده‌نشده")}>
            <AssignedTicketsTable tickets={assignedTickets} />
          </DashboardTableCard>
        </div>
        <div className="min-w-0 lg:col-span-6">
          <DashboardTableCard title="نیازمند پیگیری" description="تیکت‌های با اولویت بالا که هنوز فعال هستند" count={highPriorityTickets.length} icon={IoIosWarning} tone="amber" previewItems={previewFromTickets(highPriorityTickets, "اولویت بالا")}>
            <TicketTable tickets={highPriorityTickets} basePath="/admin" emptyText="تیکت با اولویت بالا وجود ندارد." />
          </DashboardTableCard>
        </div>
        <div className="min-w-0 lg:col-span-6">
          <DashboardTableCard title="عدم تأیید حل توسط مشتری" description="تیکت‌هایی که مشتری رفع مشکل آن‌ها را تأیید نکرده است" count={rejectedTickets.length} icon={MdNotificationImportant} tone="rose" previewItems={previewFromTickets(rejectedTickets, "نیازمند بازبینی")}>
            <TicketTable tickets={rejectedTickets} basePath="/admin" emptyText="موردی برای پیگیری وجود ندارد." />
          </DashboardTableCard>
        </div>
      </div>
    </section>
  );
}

function TicketTable({ tickets, basePath, emptyText = "تیکتی برای نمایش وجود ندارد." }) {
  return (
    <Table className="min-w-[760px]">
      <TableHeader><TableRow><TableHead className="text-right">عنوان</TableHead><TableHead className="text-right">خدمت</TableHead><TableHead className="text-right">پشتیبان</TableHead><TableHead className="text-right">مشتری</TableHead><TableHead className="text-right">وضعیت</TableHead><TableHead className="text-right">اولویت</TableHead></TableRow></TableHeader>
      {tickets.length ? tickets.map((ticket) => <GetAllTickets {...ticket} key={ticket._id} basePath={basePath} />) : <TableBody><TableRow><TableCell colSpan={6} className="py-12 text-center text-slate-500">{emptyText}</TableCell></TableRow></TableBody>}
    </Table>
  );
}

function AssignedTicketsTable({ tickets }) {
  return (
    <Table className="min-w-[760px]">
      <TableHeader><TableRow><TableHead className="text-right">تیکت</TableHead><TableHead className="text-right">پشتیبان</TableHead><TableHead className="text-right">زمان تخصیص</TableHead><TableHead className="text-right">مشاهده</TableHead><TableHead className="text-right">اولین پاسخ</TableHead></TableRow></TableHeader>
      <TableBody>
        {tickets.length ? tickets.map((ticket) => (
          <TableRow key={ticket._id}>
            <TableCell><Link href={`/admin/tickets/${ticket._id}`} className="font-bold text-blue-700 hover:underline">{ticket.ticketNumber || ticket.title}</Link><span className="mt-1 block max-w-[260px] truncate text-xs text-slate-500">{ticket.title}</span></TableCell>
            <TableCell className="font-medium">{ticket.assignedTo?.name || "نامشخص"}</TableCell>
            <TableCell className="text-xs text-slate-600">{dateTime(ticket.assignedAt || ticket.createdAt)}</TableCell>
            <TableCell>{ticket.agentViewedAt ? <div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><Eye className="size-4" /> دیده‌شده</span><small className="mt-1 block text-slate-500">{dateTime(ticket.agentViewedAt)}</small></div> : <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700"><EyeOff className="size-4" /> دیده‌نشده</span>}</TableCell>
            <TableCell>{ticket.agentFirstReplyAt ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><MessageSquareReply className="size-4" /> پاسخ داده</span> : <span className="text-xs font-bold text-amber-700">بدون پاسخ</span>}</TableCell>
          </TableRow>
        )) : <TableRow><TableCell colSpan={5} className="py-12 text-center text-slate-500">تیکت تخصیص‌یافته‌ای وجود ندارد.</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}
