"use client";

import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MdLibraryAdd } from "react-icons/md";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import GetAllTickets from "@/components/features/tickets/getAllTickets/getAllTickets";
import LiquidPagination from "@/components/features/tickets/LiquidPagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import toast, { Toaster } from "react-hot-toast";
export default function AllTickets() {
  const [allTickets, setAllTickets] = useState([]);
  const [searchKey, setSearchKey] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState(null);
  const [priority, setPriority] = useState(null);
  const [ticketPriority, setTicketPriority] = useState(null);
  const [openSheet, setOpenSheet] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  useEffect(() => {
    async function getTicket() {
      let url = `/api/tickets?`;
      const query = [];
      query.push(`page=${page}`, "limit=10");

      if (status && status !== "all") {
        query.push(`status=${status}`);
      }
      if (priority && priority !== "all") {
        query.push(`priority=${priority}`);
      }
      if (appliedSearch) {
        query.push(`search=${encodeURIComponent(appliedSearch)}`);
      }
      if (query.length > 0) {
        url += `&${query.join("&")}`;
      }
      try {
        const res = await axios.get(url);
        const data = await res.data;
        if (data.success) {
          setAllTickets(data.tickets);
          setPagination(data.pagination);
         
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();
  }, [status, priority, isChanged, page, appliedSearch]);

  const handleStatus = (newStatus) => {
    setPage(1);
    setStatus(newStatus[0] || null);
  };
  const handlePriority = (newPriority) => {
    setPage(1);
    setPriority(newPriority[0] || null);
  };
  const handlerSearch = async () => {
    setAppliedSearch(searchKey.trim());
    async function getTicket() {
      let url = `/api/tickets?`;
      const query = [];
      query.push("page=1", "limit=10");

      if (status && status !== "all") {
        query.push(`status=${status}`);
      }
      if (priority && priority !== "all") {
        query.push(`priority=${priority}`);
      }
      if (searchKey && searchKey.trim() !== "") {
        query.push(`search=${searchKey}`);
      }
      if (query.length > 0) {
        url += `&${query.join("&")}`;
      }
      try {
        const res = await axios.get(url);
        const data = await res.data;
        if (data.success) {
          setAllTickets(data.tickets);
          setPagination(data.pagination);
          console.log(data.tickets);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();
    setPage(1);
  };
  const handleTicketPriority = (value) => {
    setTicketPriority(value[0] || null);
  };
  const createTicket = async () => {
    const payload = new FormData();
    if (ticketTitle.trim() !== "") {
      payload.append("title", ticketTitle.trim());
    }
    if (ticketMessage.trim() !== "") {
      payload.append("message", ticketMessage.trim());
    }
    if (ticketPriority !== null) {
      payload.append("priority", ticketPriority);
    }
    if (attachment) {
      payload.append("attachment", attachment);
    }

    try {
      setIsCreating(true);
      const res = await axios.post("/api/tickets", payload);
      const data = res.data;
      if (data.success) {
        toast.success(data.message);
        setOpenSheet(false);
        setIsChanged((prev) => !prev);
        setTicketTitle("");
        setTicketMessage("");
        setTicketPriority(null);
        setAttachment(null);
      }
    } catch (error) {
      console.log(error.response?.data?.message);
      
      toast.error(error.response?.data?.message);
    } finally {
      setIsCreating(false);
    }
  };
  return (
    <>
      <Toaster />
      <section className="app-page flex min-h-svh flex-col gap-5">
        {/* top item */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-heading">تیکت‌ها</h1>
          </div>
          <div>
            <Sheet open={openSheet} onOpenChange={setOpenSheet}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    className={"flex items-center gap-3 "}
                  >
                    <MdLibraryAdd />
                    ساخت تیکت جدید
                  </Button>
                }
                className="py-5 hover:bg-sky-400 hover:text-white"
              />
              <SheetContent
                className="overflow-y-auto rounded-[2rem] border border-white/70 bg-gradient-to-br from-white via-blue-50/95 to-violet-50/95 p-1 shadow-[0_30px_100px_rgba(30,64,175,0.3)] backdrop-blur-2xl data-[side=center]:left-1/2 data-[side=center]:top-1/2 data-[side=center]:max-h-[90vh] data-[side=center]:w-[calc(100%-2rem)] data-[side=center]:max-w-2xl data-[side=center]:-translate-x-1/2 data-[side=center]:-translate-y-1/2"
                side="center"
                dir="rtl"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-blue-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-violet-500/20 blur-3xl" />
                <SheetHeader className="relative flex flex-col items-center justify-center gap-2 border-b border-white/80 px-6 pb-5 pt-7 text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-2xl text-white shadow-lg shadow-blue-500/25">
                    <MdLibraryAdd />
                  </span>
                  <SheetTitle className="text-xl font-black text-slate-900">ثبت درخواست جدید</SheetTitle>
                  <SheetDescription className="leading-6">
                    موضوع و شرح درخواست را وارد کنید تا مستقیماً برای پشتیبان ارسال شود.
                  </SheetDescription>
                </SheetHeader>
                <Field className="relative mt-2">
                  <FieldContent  className="px-5">
                    <FieldLabel>عنوان تیکت</FieldLabel>
                    <Input
                      placeholder="عنوان تیکت را وارد کنید"
                      onChange={(e) => setTicketTitle(e.target.value)}
                      value={ticketTitle}
                    />
                  </FieldContent>
                </Field>
                <Separator />
                <Field className="px-5">
                  <FieldLabel htmlFor="ticket-message">متن اصلی پیام</FieldLabel>
                  <textarea
                    id="ticket-message"
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    maxLength={5000}
                    rows={6}
                    placeholder="مشکل یا درخواست خود را با جزئیات بنویسید؛ این متن اولین پیام گفت‌وگو خواهد بود."
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm leading-7 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="text-left text-xs text-slate-400" dir="ltr">{ticketMessage.length}/5000</span>
                </Field>
                <Separator />
                <Field className="px-5">
                  <FieldLabel htmlFor="ticket-attachment">فایل پیوست (حداکثر ۱۰ مگابایت)</FieldLabel>
                  <Input
                    id="ticket-attachment"
                    type="file"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  />
                  {attachment && (
                    <p className="text-xs text-gray-500">{attachment.name}</p>
                  )}
                </Field>
                <Separator />
                <Field  className="px-5">
                  <FieldLabel>تعیین اولویت</FieldLabel>
                  <ToggleGroup
                    value={ticketPriority ? [ticketPriority] : []}
                    type="single"
                    onValueChange={handleTicketPriority}
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
                <SheetFooter className="relative border-t border-white/80 bg-white/40">
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-xl border-0 bg-gradient-to-l from-blue-600 to-violet-600 font-black text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-violet-700 hover:text-white"
                    type="button"
                    onClick={createTicket}
                    disabled={isCreating}
                  >
                    {isCreating ? "در حال ذخیره..." : "ذخیره"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* searsh section */}
        <div className="flex flex-col justify-center">
          {/* searsh box */}
          <div className="mx-auto flex w-full max-w-2xl justify-center gap-2 px-0 py-4 sm:p-8" dir="ltr">
            <Field>
              <FieldLabel htmlFor="input-button-group" className={"flex justify-end"}>جست و جو</FieldLabel>
              <ButtonGroup className="w-full">
                <Input
                  id="input-button-group"
                  className="h-11 placeholder:text-end"
                  placeholder="...عنوان تیکت را وارد کنید"
                  onChange={(e) => setSearchKey(e.target.value)}
                />
                <Button className="h-11 px-5" variant="outline" type="button" onClick={handlerSearch}>
                  جست و جو
                </Button>
              </ButtonGroup>
            </Field>
          </div>
          {/* filtering */}
          <div className="filter-bar justify-center overflow-x-auto" dir="ltr">
            <ToggleGroup
              variant="outline"
              value={status}
              type="single"
              onValueChange={handleStatus}
            >
              <ToggleGroupItem value="all" className="data-pressed:bg-sky-300">
                همه
              </ToggleGroupItem>
              <ToggleGroupItem value="open" className="data-pressed:bg-sky-300">
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
            <Separator orientation="vertical" className="mx-2 hidden h-10 sm:block" />
            <ToggleGroup
              value={priority}
              type="single"
              onValueChange={handlePriority}
              variant="outline"
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
              <ToggleGroupItem value="high" className="data-pressed:bg-red-400">
                زیاد
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* ticket table */}
        <div >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">عنوان</TableHead>
                <TableHead className="text-start">وضعیت</TableHead>
                <TableHead className="text-start">اولویت</TableHead>
              </TableRow>
            </TableHeader>
            {allTickets.map((ticket) => (
              <GetAllTickets
                {...ticket}
                key={ticket._id}
                basePath={"/customer"}
              />
            ))}
          </Table>
        </div>
        <LiquidPagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
      </section>
    </>
  );
}
