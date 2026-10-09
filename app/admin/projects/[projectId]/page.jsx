"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import GetAllTickets from "@/components/features/tickets/getAllTickets/getAllTickets";
import ProjectJobBriefAdmin from "@/components/features/projects/ProjectJobBriefAdmin";
import ProjectHandoversAdmin from "@/components/features/projects/ProjectHandoversAdmin";
export default function SingleProjectInfo() {
  const [project, setProject] = useState({});
  const [allTickets, setAllTickets] = useState([]);
  const [searchKey, setSearchKey] = useState("");
  const { projectId } = useParams();
  const [status, setStatus] = useState(null);
  const [priority, setPriority] = useState(null);

  useEffect(() => {
    async function Projects() {
      const res = await axios.get(`/api/projects/${projectId}`);
      const data = await res.data;
      if (data.success) {
        setProject(data.projectInfo);
      }
    }
    Projects();
  }, []);

  useEffect(() => {
    async function getTicket() {
      let url = `/api/tickets?project=${projectId}`;
      const query = [];

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
          console.log(data.tickets);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();
  }, [status, priority]);

  const handleStatus = (newStatus) => {
    setStatus(newStatus[0] || null);
  };
  const handlePriority = (newPriority) => {
    setPriority(newPriority[0] || null);
  };
  const handlerSearch = async () => {
    async function getTicket() {
      let url = `/api/tickets?project=${projectId}`;
      const query = [];

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
          console.log(data.tickets);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();
  };
  return (
    <>
      <section className="app-page flex min-h-svh w-full flex-col gap-5">
        {/* top item */}
        <div className="glass-panel relative overflow-hidden p-5 sm:p-7">
          <div className="absolute -left-12 -top-12 size-40 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">پروژه سازمانی</span>
                <h1 className="page-heading">{project.name}</h1>
                <p className="mt-2 text-sm leading-7 text-slate-600">{project.description}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500">پشتیبان پیش‌فرض</p>
                <p className="mt-1 font-black text-slate-800">{project.defaultAgent?.name || "تعیین نشده"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(project.subcategories || []).map((item) => (
                <span key={item} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600">{item}</span>
              ))}
            </div>
          </div>
        </div>

        <ProjectJobBriefAdmin projectId={projectId} />
        <ProjectHandoversAdmin projectId={projectId} />

        {/* searsh section */}
        <div className="flex flex-col justify-center">
          {/* searsh box */}
          <div className="p-8 flex  justify-center gap-2 relative" dir="ltr">
            <Field>
              <FieldLabel htmlFor="input-button-group">جست‌وجو</FieldLabel>
              <ButtonGroup>
                <Input
                  id="input-button-group"
                  placeholder="عبارت موردنظر را وارد کنید..."
                  onChange={(e) => setSearchKey(e.target.value)}
                />
                <Button variant="outline" type="button" onClick={handlerSearch}>
                  جست‌وجو
                </Button>
              </ButtonGroup>
            </Field>
          </div>
          {/* filtering */}
          <div className="flex justify-center" dir="ltr">
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
            <Separator orientation="vertical" className="mx-5" />
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
                low
              </ToggleGroupItem>
              <ToggleGroupItem
                value="medium"
                className="data-pressed:bg-orange-300"
              >
                medium
              </ToggleGroupItem>
              <ToggleGroupItem value="high" className="data-pressed:bg-red-400">
                high
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* ticket table */}
        <div >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">عنوان</TableHead>
                <TableHead className="text-right">نوع پروژه</TableHead>
                <TableHead className="text-right">پشتیبان</TableHead>
                <TableHead className="text-right">مشتری</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">اولویت</TableHead>
              </TableRow>
            </TableHeader>
            {allTickets.map((ticket) => (
              <GetAllTickets {...ticket} key={ticket._id} basePath={"/admin"} />
            ))}
          </Table>
        </div>
      </section>
    </>
  );
}
