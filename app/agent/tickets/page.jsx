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
          console.log(data.tickets);
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
    let payload = {};
    if (ticketTitle.trim() !== "") {
      payload.title = ticketTitle.trim();
    }
    if (ticketPriority !== null) {
      payload.priority = ticketPriority;
    }

    try {
      const res = await axios.post("/api/tickets", payload);
      const data = res.data;
      if (data.success) {
        toast.success(data.message);
        setOpenSheet(false);
        setIsChanged((prev) => !prev);
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
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
          {/* <div>
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
                className="data-[side=bottom]:max-h-[50vh] data-[side=top]:max-h-[50vh]"
                side="left"
              >
                <SheetHeader className="flex flex-col justify-end items-center">
                  <SheetTitle>ساخت تیکت جدید</SheetTitle>
                  <SheetDescription>
                    تیکت جدید را همراه با عنوان و اولویت ثبت کنید.
                  </SheetDescription>
                </SheetHeader>
                <Field>
                  <FieldContent dir="ltr" className="px-5">
                    <FieldLabel>عنوان تیکت</FieldLabel>
                    <Input
                      placeholder="عنوان تیکت را وارد کنید"
                      onChange={(e) => setTicketTitle(e.target.value)}
                    />
                  </FieldContent>
                </Field>
                <Separator />
                <Field dir="ltr" className="px-5">
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
                <SheetFooter>
                  <Button
                    variant="outline"
                    className={"bg-blue-400 text-white"}
                    type="button"
                    onClick={createTicket}
                  >
                    ذخیره
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div> */}
        </div>

        {/* searsh section */}
        <div className="flex flex-col justify-center">
          {/* searsh box */}
          <div className="relative mx-auto flex w-full max-w-2xl justify-center gap-2 px-0 py-4 sm:p-8" dir="ltr">
            <Field>
              <FieldLabel htmlFor="input-button-group" className="flex justify-end">جست و جو</FieldLabel>
              <ButtonGroup className="w-full">
                <Input
                  id="input-button-group"
                  placeholder="...عنوان تیکت را وارد کنید"
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="h-11 placeholder:text-right"
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
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={"text-right"}>عنوان</TableHead>
                <TableHead className={"text-right"}>خدمت</TableHead>
                <TableHead className={"text-right"}>پشتیبان</TableHead>
                <TableHead className={"text-right"}>مشتری</TableHead>
                <TableHead className={"text-right"}>وضعیت</TableHead>
                <TableHead className={"text-right"}>مهلت رسیدگی</TableHead>
                <TableHead className={"text-right"}>اولویت</TableHead>
              </TableRow>
            </TableHeader>
            {allTickets.map((ticket) => (
              <GetAllTickets {...ticket} key={ticket._id} basePath={"/agent"} />
            ))}
          </Table>
        </div>
        <LiquidPagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
      </section>
    </>
  );
}
