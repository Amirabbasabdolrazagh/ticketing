"use client";
import GetAllTickets from "@/components/features/tickets/getAllTickets/getAllTickets";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import axios from "axios";
import { LabelList, RadialBar, RadialBarChart } from "recharts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircle, FaRegClock, FaUsers } from "react-icons/fa6";
import { IoIosCloseCircleOutline, IoIosWarning } from "react-icons/io";
import { IoDocumentText } from "react-icons/io5";
import {
  MdKeyboardArrowLeft,
  MdNotificationImportant,
  MdOutlineSupportAgent,
} from "react-icons/md";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, MessageSquareReply } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
export const description = "A radial chart with a label";

export default function AdminDashborad() {
  const [allTickets, setAllTickets] = useState([]);
  const [recentTicket, setRecentTicket] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customerRejected, setCustomerRejected] = useState([]);
  useEffect(() => {
    async function getAllTickets() {
      try {
        const res = await axios.get("/api/tickets");
        const data = res.data;

        if (data.success) {
          setAllTickets(data.tickets);
        }
      } catch (error) {}
    }
    async function getAllProjects() {
      try {
        const res = await axios.get("/api/projects");
        const data = res.data;
        if (data.success) {
          setProjects(data.projects);
        }
      } catch (error) {}
    }
    async function getRecentTickets() {
      try {
        const res = await axios.get("/api/tickets?limit=10");
        const data = res.data;

        if (data.success) {
          setRecentTicket(data.tickets);
        }
      } catch (error) {}
    }
    async function unresolvedTickets() {
      try {
        const res = await axios.get("/api/tickets/resolution/unresolved");
        const data = res.data;

        if (data.success) {
          setCustomerRejected(data.unresolvedTickets);
        }
      } catch (error) {
        console.error("دریافت تیکت‌های تأییدنشده ناموفق بود", error);
      }
    }
    async function getallUsers() {
      try {
        const res = await axios.get("/api/users");
        const data = res.data;

        if (data.success) {
          setUsers(data.safeInfo);
        }
      } catch (error) {}
    }
    unresolvedTickets();
    getRecentTickets();
    getAllTickets();
    getallUsers();
    getAllProjects();
    const unresolvedInterval = window.setInterval(unresolvedTickets, 15000);
    return () => window.clearInterval(unresolvedInterval);
  }, []);
  const numberOfAgent = users.filter((user) => user.role === "agent").length;
  const numberOfCustomers = users.filter(
    (user) => user.role === "customer",
  ).length;
  const numberOfTickets = allTickets.length;
  const numberOfOpenTicket = allTickets.filter(
    (ticket) => ticket.status === "open",
  ).length;
  const numberOfInProgressTicket = allTickets.filter(
    (ticket) => ticket.status === "in-progress",
  ).length;
  const numberOfResolvedTicket = allTickets.filter(
    (ticket) => ticket.status === "resolved",
  ).length;
  const numberOfClosedTicket = allTickets.filter(
    (ticket) => ticket.status === "closed",
  ).length;
  const highPriorityTicket = allTickets.filter(
    (ticket) => ticket.priority === "high" && ticket.status === "in-progress",
  );
  const assignedTickets = allTickets
    .filter((ticket) => ticket.assignedTo)
    .sort((a, b) => new Date(b.assignedAt || b.createdAt) - new Date(a.assignedAt || a.createdAt));
  const chartData = [
    {
      status: "open",
      tickets: numberOfOpenTicket,
      fill: "#3b82f6",
    },
    {
      status: "in-progress",
      tickets: numberOfInProgressTicket,
      fill: "#f59e0b",
    },
    {
      status: "resolved",
      tickets: numberOfResolvedTicket,
      fill: "#22c55e",
    },
    {
      status: "closed",
      tickets: numberOfClosedTicket,
      fill: "#64748b",
    },
  ];
  const chartConfig = {
    tickets: {
      label: "تیکت‌ها",
    },
    open: {
      label: "باز",
      color: "var(--chart-1)",
    },
    "in-progress": {
      label: "در حال بررسی",
      color: "var(--chart-2)",
    },
    resolved: {
      label: "حل‌شده",
      color: "var(--chart-3)",
    },
    closed: {
      label: "بسته‌شده",
      color: "var(--chart-4)",
    },
  };
  return (
    <>
      <section className="app-page">
        {/* top chart */}
        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 xl:grid-cols-5">
          <div className="metric-card flex items-center justify-center gap-5 border-blue-200 bg-blue-50/80 px-5">
            <div>
              <IoDocumentText size={35} className=" text-blue-500 " />
            </div>
            <div>
              <h1>{numberOfTickets}</h1>
              <p className="text-sm">همه تیکت ها</p>
            </div>
          </div>
          <div className="metric-card flex items-center justify-center gap-5 border-amber-200 bg-amber-50/80 px-5">
            <div>
              <FaRegCircle size={35} className=" text-yellow-500 " />
            </div>
            <div>
              <h1>{numberOfOpenTicket}</h1>
              <p className="text-sm">تیکت های باز</p>
            </div>
          </div>
          <div className="metric-card flex items-center justify-center gap-5 border-violet-200 bg-violet-50/80 px-5">
            <div>
              <FaRegClock size={35} className=" text-violet-500 " />
            </div>
            <div>
              <h1>{numberOfInProgressTicket}</h1>
              <p className="text-sm">در دست اقدام</p>
            </div>
          </div>
          <div className="metric-card flex items-center justify-center gap-5 border-emerald-200 bg-emerald-50/80 px-5">
            <div>
              <FaRegCheckCircle size={35} className=" text-green-500 " />
            </div>
            <div>
              <h1>{numberOfResolvedTicket}</h1>
              <p className="text-sm">برطرف شده ها</p>
            </div>
          </div>
          <div className="metric-card flex items-center justify-center gap-5 border-slate-200 bg-slate-50/80 px-5">
            <div>
              <IoIosCloseCircleOutline size={35} className=" text-gray-500 " />
            </div>
            <div>
              <h1>{numberOfClosedTicket}</h1>
              <p className="text-sm">بسته شده ها</p>
            </div>
          </div>
        </div>

        <div className="glass-panel overflow-hidden p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label className="text-base font-black">وضعیت مشاهده تیکت‌ها توسط پشتیبان</Label>
              <p className="mt-1 text-xs text-slate-500">کنترل اولین مشاهده و اولین پاسخ تیکت‌های تخصیص‌یافته</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {assignedTickets.length.toLocaleString("fa-IR")} تیکت
            </span>
          </div>
          <Separator className="my-4" />
          <div className="max-h-[430px] overflow-auto" dir="rtl">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">تیکت</TableHead>
                  <TableHead className="text-right">پشتیبان</TableHead>
                  <TableHead className="text-right">زمان تخصیص</TableHead>
                  <TableHead className="text-right">مشاهده</TableHead>
                  <TableHead className="text-right">اولین پاسخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedTickets.length ? assignedTickets.map((ticket) => (
                  <TableRow key={`seen-${ticket._id}`}>
                    <TableCell>
                      <Link href={`/admin/tickets/${ticket._id}`} className="font-bold text-blue-700 hover:underline">
                        {ticket.ticketNumber || ticket.title}
                      </Link>
                      <span className="mt-1 block max-w-[260px] truncate text-xs text-slate-500">{ticket.title}</span>
                    </TableCell>
                    <TableCell className="font-medium">{ticket.assignedTo?.name || "نامشخص"}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {new Date(ticket.assignedAt || ticket.createdAt).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell>
                      {ticket.agentViewedAt ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            <Eye className="size-4" /> دیده‌شده
                          </span>
                          <span className="mt-1.5 block whitespace-nowrap text-[11px] font-medium text-slate-500">
                            {new Date(ticket.agentViewedAt).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                          <EyeOff className="size-4" /> دیده‌نشده
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ticket.agentFirstReplyAt ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><MessageSquareReply className="size-4" /> پاسخ داده</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700">بدون پاسخ</span>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">تیکت تخصیص‌یافته‌ای وجود ندارد.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* recent tickets */}
          <div className="col-span-1 min-w-0 rounded-xl border bg-gray-50 p-4 sm:p-5 lg:col-span-8">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-md">تازه ترین ها</Label>

              <Link
                href="/admin/tickets"
                className="flex items-center text-blue-400 whitespace-nowrap"
              >
                مشاهده همه
                <MdKeyboardArrowLeft size={20} />
              </Link>
            </div>

            <Separator className="my-3" />

            <div
              dir="rtl"
              className="w-full max-w-full overflow-x-auto text-right"
            >
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">عنوان</TableHead>
                    <TableHead className="text-right">خدمت</TableHead>
                    <TableHead className="text-right">پشتیبان</TableHead>
                    <TableHead className="text-right">مشتری</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">اولویت</TableHead>
                  </TableRow>
                </TableHeader>

                {recentTicket.map((ticket) => (
                  <GetAllTickets
                    {...ticket}
                    key={ticket._id}
                    basePath="/admin"
                  />
                ))}
              </Table>
            </div>
          </div>

          {/* quick overview */}
          <div className="col-span-1 min-w-0 rounded-xl border bg-gray-50 p-4 sm:p-5 lg:col-span-4">
            <div className="flex w-full items-center justify-between">
              <Label className="text-md">نمای کلی</Label>
            </div>

            <Separator className="my-3" />

            <div className="w-full overflow-x-auto">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="w-[40px]">
                      <IoDocumentText size={20} className="text-cyan-500" />
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      خدمات فعال
                    </TableCell>

                    <TableCell className="text-left">
                      {projects.length}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <MdOutlineSupportAgent
                        size={20}
                        className="text-violet-500"
                      />
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      پشتیبان ها
                    </TableCell>

                    <TableCell className="text-left">{numberOfAgent}</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <FaUsers size={20} className="text-blue-500" />
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      مشتری ها
                    </TableCell>

                    <TableCell className="text-left">
                      {numberOfCustomers}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <IoIosWarning size={20} className="text-red-500" />
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      تیکت‌های با اولویت بالا
                    </TableCell>

                    <TableCell className="text-left">
                      {highPriorityTicket.length}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* high priority tickets */}
          <div className="col-span-1 min-w-0 rounded-xl border bg-gray-50 p-4 sm:p-5 lg:col-span-8">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-2">
                <IoIosWarning
                  size={20}
                  className="mt-1 shrink-0 text-red-500"
                />

                <div className="flex min-w-0 flex-col">
                  <Label className="text-md">نیازمند پیگیری</Label>

                  <span className="text-xs text-gray-500">
                    تیکت‌های با اولویت بالا که هنوز باز یا در حال بررسی هستند.
                  </span>
                </div>
              </div>

              <Link
                href="/admin/tickets"
                className="flex shrink-0 items-center text-blue-400 whitespace-nowrap"
              >
                مشاهده همه
                <MdKeyboardArrowLeft size={20} />
              </Link>
            </div>

            <Separator className="my-3" />

            <div
              dir="rtl"
              className="w-full max-w-full overflow-x-auto text-right"
            >
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">عنوان</TableHead>
                    <TableHead className="text-right">خدمت</TableHead>
                    <TableHead className="text-right">پشتیبان</TableHead>
                    <TableHead className="text-right">مشتری</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">اولویت</TableHead>
                  </TableRow>
                </TableHeader>

                {highPriorityTicket.length > 0 ? (
                  highPriorityTicket.map((ticket) => (
                    <GetAllTickets
                      {...ticket}
                      key={ticket._id}
                      basePath="/admin"
                    />
                  ))
                ) : (
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-gray-500"
                      >
                        تیکت با اولویت بالا وجود ندارد.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </div>
          </div>

          {/* Ticket Status Distribution */}
          {/* <div className="col-span-1 min-w-0 rounded-xl border bg-gray-50 p-4 sm:p-5 lg:col-span-4">
            <div className="flex w-full items-center justify-between">
              <Label className="text-md">وضعیت تیکت‌ها</Label>
            </div>

            <Separator className="my-3" />

            <Card className="border-0 bg-transparent shadow-none">
              <CardContent className="p-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square w-full max-w-[280px]"
                >
                  <RadialBarChart
                    data={chartData}
                    startAngle={-90}
                    endAngle={380}
                    innerRadius={30}
                    outerRadius={110}
                  >
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent hideLabel nameKey="status" />
                      }
                    />

                    <RadialBar dataKey="tickets" background>
                      <LabelList
                        position="insideStart"
                        dataKey="status"
                        className="fill-white capitalize mix-blend-luminosity"
                        fontSize={11}
                      />
                    </RadialBar>
                  </RadialBarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div> */}
          <div className="col-span-1 min-w-0 rounded-xl border bg-gray-50 p-4 sm:p-5 lg:col-span-4">
            <div className="flex w-full items-center justify-between">
              <Label className="text-md">وضعیت تیکت‌ها</Label>
            </div>

            <Separator className="my-3" />

            <Card className="border-0 bg-transparent shadow-none">
              <CardContent className="p-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square w-full max-w-[280px]"
                >
                  <RadialBarChart
                    data={chartData}
                    startAngle={-90}
                    endAngle={380}
                    innerRadius={30}
                    outerRadius={110}
                  >
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent hideLabel nameKey="status" />
                      }
                    />

                    <RadialBar dataKey="tickets" background>
                      <LabelList
                        position="insideStart"
                        dataKey="status"
                        className="fill-white capitalize mix-blend-luminosity"
                        fontSize={11}
                      />
                    </RadialBar>
                  </RadialBarChart>
                </ChartContainer>

                {/* Legend */}
                <div
                  dir="rtl"
                  className="mt-4 grid grid-cols-2  px-3 gap-x-4 gap-y-3"
                >
                  {chartData.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />

                        <span className="text-xs text-gray-600">
                          {item.status}
                        </span>
                      </div>

                      <span className="text-xs font-semibold">
                        {item.tickets}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Customer rejected resolution */}
          <div className="col-span-1 min-w-0 rounded-xl border bg-gray-50 p-4 sm:p-5 lg:col-span-8">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-2">
                <MdNotificationImportant
                  size={20}
                  className="mt-1 shrink-0 text-red-500"
                />

                <div className="flex min-w-0 flex-col">
                  <Label className="text-md">عدم تأیید حل توسط مشتری</Label>

                  <span className="text-xs text-gray-500">
                    تیکت‌هایی که مشتری رفع مشکل آن‌ها را تأیید نکرده است.
                  </span>
                </div>
              </div>

              <Link
                href="/admin/tickets"
                className="flex shrink-0 items-center text-blue-400 whitespace-nowrap"
              >
                مشاهده همه
                <MdKeyboardArrowLeft size={20} />
              </Link>
            </div>

            <Separator className="my-3" />

            <div
              dir="rtl"
              className="w-full max-w-full overflow-x-auto text-right"
            >
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">عنوان</TableHead>
                    <TableHead className="text-right">خدمت</TableHead>
                    <TableHead className="text-right">پشتیبان</TableHead>
                    <TableHead className="text-right">مشتری</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">اولویت</TableHead>
                  </TableRow>
                </TableHeader>

                {customerRejected.length > 0 ? (
                  customerRejected.map((item) => (
                    <GetAllTickets
                      {...item.ticket}
                      creator={item.customer}
                      key={item._id}
                      basePath="/admin"
                    />
                  ))
                ) : (
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-gray-500"
                      >
                        موردی برای پیگیری وجود ندارد.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
