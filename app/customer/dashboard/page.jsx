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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircle, FaRegClock, FaUsers } from "react-icons/fa6";
import { IoIosCloseCircleOutline, IoIosWarning } from "react-icons/io";
import { IoDocumentText } from "react-icons/io5";
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
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
  const [openSheet, setOpenSheet] = useState(false);

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

    async function getRecentTickets() {
      try {
        const res = await axios.get("/api/tickets?limit=10");
        const data = res.data;

        if (data.success) {
          setRecentTicket(data.tickets);
        }
      } catch (error) {}
    }

    getRecentTickets();
    getAllTickets();
  }, []);

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
    (ticket) =>
      ticket.priority === "high" && ["open", "in-progress"].includes(ticket.status),
  );
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
        <div className="grid grid-cols-1 gap-4 py-5 text-center sm:grid-cols-2 xl:grid-cols-5">
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
              <p className="text-sm">برطرف شده</p>
            </div>
          </div>
          <div className="metric-card flex items-center justify-center gap-5 border-slate-200 bg-slate-50/80 px-5">
            <div>
              <IoIosCloseCircleOutline size={35} className=" text-gray-500 " />
            </div>
            <div>
              <h1>{numberOfClosedTicket}</h1>
              <p className="text-sm">بسته شده</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* recent tickets */}
          <div className="col-span-1 lg:col-span-8 min-w-0 row-span-3 p-5 border bg-gray-50 rounded-xl">
            <div className="flex justify-between w-full ">
              <Label className={"text-md"}>تیکت های اخیر</Label>
              <Link href={"/customer/tickets"} className="flex text-blue-400">
                مشاهده همه <MdKeyboardArrowLeft size={20} />
              </Link>
            </div>
            <Separator />
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">عنوان</TableHead>
                    <TableHead className="text-start">وضعیت</TableHead>
                    <TableHead className="text-start">اولویت</TableHead>
                  </TableRow>
                </TableHeader>
                {recentTicket.map((ticket) => (
                  <GetAllTickets
                    {...ticket}
                    key={ticket._id}
                    basePath={"/customer"}
                  />
                ))}
              </Table>
            </div>
          </div>
          {/* quick overview */}
          <div className="col-span-1 lg:col-span-4 min-w-0 row-span-3 p-5 border bg-gray-50 rounded-xl">
            <div className="flex justify-between w-full ">
              <Label className={"text-md"}>نمای کلی</Label>
            </div>
            <Separator />
            <div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <IoDocumentText size={20} className=" text-blue-500 " />
                    </TableCell>
                    <TableCell>همه تیکت ها</TableCell>
                    <TableCell>{numberOfOpenTicket}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <IoDocumentText size={20} className=" text-yellow-500 " />
                    </TableCell>
                    <TableCell>در دست اقدام</TableCell>
                    <TableCell>{numberOfInProgressTicket}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <IoDocumentText size={20} className=" text-green-500 " />
                    </TableCell>
                    <TableCell>برطرف شده</TableCell>
                    <TableCell>{numberOfResolvedTicket}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <IoDocumentText size={20} color="red" />
                    </TableCell>
                    <TableCell>نیازمند پیگیری</TableCell>
                    <TableCell>{highPriorityTicket.length}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          {/* high priority ticketc */}
          <div className="col-span-1 lg:col-span-8 min-w-0 row-span-3 p-5 border bg-gray-50 rounded-xl">
            <div className="flex justify-between w-full ">
              <div className="flex gap-2">
                <IoIosWarning size={20} color="red" />
                <p>
                  <Label className={"text-md"}>نیازمند پیگیری</Label>
                  <span className="text-xs text-gray-500">
                    تیکت‌های با اولویت زیاد که هنوز باز یا در حال بررسی هستند.
                  </span>
                </p>
              </div>
              <Link href={"/customer/tickets"} className="flex text-blue-400">
                مشاهده همه <MdKeyboardArrowLeft size={20} />
              </Link>
            </div>
            <Separator />
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">عنوان</TableHead>
                    <TableHead className="text-start">وضعیت</TableHead>
                    <TableHead className="text-start">اولویت</TableHead>
                  </TableRow>
                </TableHeader>
                {highPriorityTicket.length > 0 ? (
                  highPriorityTicket.map((ticket) => (
                    <GetAllTickets
                      {...ticket}
                      key={ticket._id}
                      basePath={"/customer"}
                    />
                  ))
                ) : (
                  <TableBody>
                    <TableRow>
                      <TableCell>تیکت با اولویت زیاد وجود ندارد.</TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </div>
          </div>
          {/* Ticket Status Distribution */}
          <div className="col-span-1 lg:col-span-4 min-w-0  row-span-3 p-5 border bg-gray-50 rounded-xl">
            <div className="flex justify-between w-full ">
              <Label className={"text-md"}>وضعیت کلی تیکت ها</Label>
            </div>
            <Card className="flex flex-col">
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-[250px]"
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
                    <div key={item.status} className="flex items-center gap-3">
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
        </div>
      </section>
    </>
  );
}
