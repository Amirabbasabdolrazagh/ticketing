"use client";

import TicketMessageEditor from "@/components/features/tickets/ticketMessageEditor/TicketMessageEditor";
import TicketMessages from "@/components/features/tickets/ticketMessages/ticketMessages";
import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup } from "@base-ui/react";
import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TicketAttachment from "@/components/features/tickets/ticketAttachment/TicketAttachment";
import { CalendarClock, Check } from "lucide-react";

export default function TicketDetails() {
  const [ticket, setTicket] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { ticketId } = useParams();
  const [status, setStatus] = useState(null);
  const [priority, setPriority] = useState(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [project, setProject] = useState("");
  const [allProject, setAllProject] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isUpdatedTicket, setIsUpdatedTicket] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [resolveDeadline, setResolveDeadline] = useState("");
  const DeadLineitems = [
    { label: "۱ روز", value: "1" },
    { label: "۲ روز", value: "2" },
    { label: "۳ روز", value: "3" },
    { label: "۴ روز", value: "4" },
    { label: "۵ روز", value: "5" },
    { label: "۶ روز", value: "6" },
    { label: "۷ روز", value: "7" },
  ];
  useEffect(() => {
    async function getTicket() {
      try {
        const res = await axios.get(`/api/tickets/${ticketId}`);
        const data = await res.data;

        if (data.success) {
          setTicket(data.ticket);
          setStatus(data.ticket?.status);
          setPriority(data.ticket?.priority);
          setAssignedTo(data.ticket?.assignedTo || "");
          setProject(data.ticket?.project._id || "");
          setResolveDeadline(data.ticket?.deadline || "");
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();
  }, [ticketId, isUpdatedTicket]);
  useEffect(() => {
    async function getUser() {
      try {
        const res = await axios.get("/api/users?role=agent");
        const data = res.data;

        if (data.success) {
          setAgents(data.safeInfo);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }

    async function getProjects() {
      try {
        const res = await axios.get("/api/projects");
        const data = res.data;

        if (data.success) {
          setAllProject(data.projects);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }

    getUser();
    getProjects();
  }, []);
  useEffect(() => {
    async function getTicket() {
      try {
        const res = await axios.get(`/api/tickets/${ticketId}/messages`);
        const data = await res.data;

        if (data.success) {
          setMessages(data.allmessages);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();

    const interval = window.setInterval(getTicket, 3000);
    const refreshOnFocus = () => getTicket();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [ticketId]);
  const selectdeadLineHandler = (value) => {
    setResolveDeadline(value);
  };
  const sendNewMessageHandler = async () => {
    try {
      const res = await axios.post(`/api/tickets/${ticketId}/messages`, {
        message: newMessage,
      });
      const data = await res.data;

      if (data.success) {
        setMessages((prev) => prev.some((item) => item._id === data.messages._id)
          ? prev
          : [...prev, data.messages]);

        setNewMessage("");

        toast.success(data.message);
      }
    } catch (error) {
      setNewMessage("");
      toast.error(error.response?.data?.message);
    }
  };

  const handleStatus = (value) => {
    setStatus(value[0] || "");
  };
  const handlePriority = (value) => {
    setPriority(value[0] || "");
  };
  const selectAgentHandler = (value) => {
    setAssignedTo(value);
  };
  const selectProjectHandler = (value) => {
    setProject(value);
    const selectedService = allProject.find((item) => item._id === value);
    if (selectedService?.defaultAgent?._id) {
      setAssignedTo(selectedService.defaultAgent._id);
    }
  };

  const changHandler = async () => {
    let payload = {};

    if (status !== ticket.status) {
      payload.status = status;
    }
    if (resolveDeadline !== ticket.deadline) {
      payload.deadline = resolveDeadline;
    }
    if (priority !== ticket.priority) {
      payload.priority = priority;
    }

    if (assignedTo !== String(ticket.assignedTo || "")) {
      payload.assignedTo = assignedTo;
    }

    if (project !== String(ticket.project?._id || "")) {
      payload.project = project;
    }

    if (Object.keys(payload).length === 0) {
      toast("تغییری برای ذخیره وجود ندارد");
      return;
    }
    try {
      const res = await axios.patch(`/api/tickets/${ticketId}`, payload);
      const data = res.data;

      if (data.success) {
        toast.success(data.message);
        setIsUpdatedTicket((prev) => !prev);
        setOpenSheet(false);
      }
    } catch (error) {
      console.log(error.response?.data?.message);
      toast.error(error.response?.data?.message);
    }
  };
  return (
    <>
      <Toaster />
      <section className="app-page flex w-full max-w-5xl flex-col items-center">
        <div className="glass-panel my-5 flex w-full flex-col justify-between gap-5 p-4 sm:p-6">
          <div className="flex w-full flex-wrap justify-between gap-4">
            <div>
              <h1 className="page-heading">{ticket.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 sm:text-sm">
                <span>
                  شماره تیکت: {ticket.ticketNumber || "در انتظار تخصیص"}
                </span>
                <span className="hidden h-4 w-px bg-slate-300 sm:block" />
                <span>ثبت‌کننده: {ticket.creator?.name || "نامشخص"}</span>
                <span className="hidden h-4 w-px bg-slate-300 sm:block" />
                <span>
                  تاریخ و زمان ثبت: {ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleString("fa-IR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "-"}
                </span>
              </div>
              <TicketAttachment ticketId={ticketId} attachment={ticket.attachment} />
            </div>
            <div>
              <Sheet open={openSheet} onOpenChange={setOpenSheet}>
                <SheetTrigger
                  render={<Button variant="outline">ویرایش تیکت</Button>}
                />
                <SheetContent
                  className="h-dvh overflow-y-auto overscroll-contain pb-0 data-[side=bottom]:max-h-[90vh] data-[side=top]:max-h-[90vh]"
                  side="left"
                >
                  <SheetHeader className="flex flex-col justify-end items-center">
                    <SheetTitle>مدیریت تیکت</SheetTitle>
                    <SheetDescription>
                      وضعیت، اولویت، پشتیبان و خدمت تیکت را ویرایش کنید
                    </SheetDescription>
                  </SheetHeader>
                  <Field dir="ltr" className="px-5">
                    <FieldLabel>تعیین وضعیت</FieldLabel>
                    <ToggleGroup
                      variant="outline"
                      value={status ? [status] : []}
                      type="single"
                      onValueChange={handleStatus}
                      className={"py-5"}
                    >
                      <ToggleGroupItem
                        value="open"
                        className="data-pressed:bg-sky-300"
                      >
                        باز
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="in-progress"
                        className="data-pressed:bg-yellow-300"
                      >
                        در حال بررسی
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="resolved"
                        className="data-pressed:bg-green-300"
                      >
                        حل‌شده
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="closed"
                        className="data-pressed:bg-gray-300"
                      >
                        بسته‌شده
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Separator />
                  <Field dir="ltr" className="px-5">
                    <FieldLabel>تعیین اولویت</FieldLabel>
                    <ToggleGroup
                      value={priority ? [priority] : []}
                      type="single"
                      onValueChange={handlePriority}
                      variant="outline"
                      className="text-center py-5"
                    >
                      <ToggleGroupItem
                        value="low"
                        className="data-pressed:bg-yellow-300"
                      >
                        کم
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="medium"
                        className="data-pressed:bg-orange-300"
                      >
                        متوسط
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="high"
                        className="data-pressed:bg-red-400"
                      >
                        زیاد
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Separator />
                  <Field dir="ltr">
                    <FieldLabel className={"px-5"}>تخصیص به پشتیبان</FieldLabel>
                    <Select
                      onValueChange={selectAgentHandler}
                      items={agents.map((agent) => ({
                        value: agent.userId,
                        label: agent.name,
                      }))}
                      value={assignedTo}
                    >
                      <SelectTrigger className="w-[180]">
                        <SelectValue placeholder="انتخاب پشتیبان" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {agents.map((agent) => (
                            <SelectItem key={agent.userId} value={agent.userId}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Separator />
                  <Field dir="rtl" className="mx-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                        <CalendarClock className="size-5" />
                      </span>
                      <div>
                        <FieldLabel className="font-black text-slate-800">مهلت رسیدگی</FieldLabel>
                        <p className="mt-1 text-xs text-slate-500">زمان در لحظه ذخیره تنظیمات شروع می‌شود.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {DeadLineitems.map((item) => {
                        const isSelected = resolveDeadline === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => selectdeadLineHandler(item.value)}
                            className={`relative flex min-h-12 items-center justify-center rounded-xl border px-2 text-xs font-bold transition ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                : "border-white bg-white/80 text-slate-600 hover:border-blue-200 hover:bg-white"
                            }`}
                          >
                            {item.label}
                            {isSelected && <Check className="absolute left-1 top-1 size-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Separator />
                  <Field dir="ltr">
                    <FieldLabel className={"px-5"}>
                      تخصیص به خدمت
                    </FieldLabel>
                    <Select
                      onValueChange={selectProjectHandler}
                      items={allProject.map((project) => ({
                        value: project._id,
                        label: project.name,
                      }))}
                      value={project}
                    >
                      <SelectTrigger className="w-[180]">
                        <SelectValue placeholder="انتخاب خدمت" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {allProject.map((project) => (
                            <SelectItem key={project._id} value={project._id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <SheetFooter className="sticky bottom-0 z-10 border-t border-slate-200/70 bg-white/90 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                    <Button
                      variant="outline"
                      className="w-full bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                      type="button"
                      onClick={changHandler}
                    >
                      ذخیره
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
        <Separator className="my-5" />
        <h1 className=" w-full text-end text-xl">گفت‌وگوها</h1>
        <div className="flex w-full max-w-full flex-col gap-6 py-12">
          {messages.map((message) => (
            <TicketMessages {...message} key={message._id} />
          ))}
        </div>
        <Separator />
        <div className="w-full ">
          <TicketMessageEditor
            setNewMessage={setNewMessage}
            sendNewMessageHandler={sendNewMessageHandler}
            newMessage={newMessage}
          />
        </div>
      </section>
    </>
  );
}
