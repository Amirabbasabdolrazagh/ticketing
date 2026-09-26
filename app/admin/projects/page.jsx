"use client";

import EditProject from "@/components/features/projects/editProject/EditProgect";
import GetAllProjects from "@/components/features/projects/getAllProjects/getAllProjects";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import axios from "axios";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { MdLibraryAdd } from "react-icons/md";

export default function ProjectsInfo() {
  const [showEditModal, setShowEditeModal] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isChangInfo, setIsChangeInfo] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [priority, setPriority] = useState(null);
  const [projectLabel, setProjectLabel] = useState("");
  const [agents, setAgents] = useState([]);
  const [defaultAgent, setDefaultAgent] = useState("");
  const [subcategories, setSubcategories] = useState("");
  const [keywords, setKeywords] = useState("");
  const handlePriority = (value) => {
    setPriority(value[0] || "");
  };
  useEffect(() => {
    async function Projects() {
      const res = await axios.get("/api/projects");
      const data = await res.data;
      if (data.success) {
        setAllProjects(data.projects);
      }
    }
    Projects();
  }, [isChangInfo]);

  useEffect(() => {
    axios.get("/api/users?role=agent").then(({ data }) => {
      if (data.success) {
        setAgents(data.safeInfo);
        const hamid = data.safeInfo.find((agent) => /حمید|hamid/i.test(agent.name || ""));
        if (hamid) setDefaultAgent(hamid.userId);
      }
    });
  }, []);

  const createProject = async () => {
    let payload = {};
    if (projectName.trim() !== "") {
      payload.name = projectName.trim();
    }
    if (projectDescription.trim() !== "") {
      payload.description = projectDescription.trim();
    }
    if (priority !== null) {
      payload.priority = priority;
    }
    if (projectLabel !== "") {
      payload.code = projectLabel;
    }
    if (defaultAgent) payload.defaultAgent = defaultAgent;
    payload.subcategories = subcategories.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
    payload.keywords = keywords.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
    try {
      const res = await axios.post("/api/projects", payload);
      const data = res.data;
      if (data.success) {
        toast.success(data.message);
        setOpenSheet(false);
        setIsChangeInfo((prev) => !prev);
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };
  const editHandler = (_id) => {
    setSelectedProjectId(_id);
    setShowEditeModal(!showEditModal);
  };
  return (
    <>
      <Toaster />
      <section
        className={
          showEditModal
            ? "app-page flex min-h-svh flex-col gap-5 blur-xs"
            : "app-page flex min-h-svh flex-col gap-5"
        }
      >
        <div className="glass-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <h1 className="page-heading">خدمات</h1>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                {allProjects.length.toLocaleString("fa-IR")} خدمت
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">دسته‌بندی هوشمند تیکت‌ها و تعیین پشتیبان پیش‌فرض هر خدمت</p>
          </div>
          <Sheet open={openSheet} onOpenChange={setOpenSheet}>
            <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              ساختار ثابت سه‌خدمتی
            </span>
            <SheetContent
              className="h-dvh overflow-y-auto overscroll-contain pb-0 data-[side=bottom]:max-h-[90vh] data-[side=top]:max-h-[90vh]"
              side="left"
            >
              <SheetHeader className="flex flex-col justify-end items-center">
                <SheetTitle>ساخت خدمت جدید</SheetTitle>
                <SheetDescription>
                  خدمت جدید و پشتیبان پیش‌فرض آن را مشخص کنید.
                </SheetDescription>
              </SheetHeader>
              <Field dir="ltr" className="px-5">
                <FieldLabel>نام خدمت</FieldLabel>
                <Input
                  placeholder="نام خدمت را وارد کنید"
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </Field>
              <Separator />
              <Field dir="ltr" className="px-5">
                <FieldLabel>توضیحات خدمت</FieldLabel>
                <Input
                  placeholder="توضیحات خدمت را وارد کنید"
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
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
              <Field className="px-5">
                <FieldLabel>پشتیبان پیش‌فرض</FieldLabel>
                <select
                  value={defaultAgent}
                  onChange={(event) => setDefaultAgent(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">انتخاب پشتیبان</option>
                  {agents.map((agent) => (
                    <option key={agent.userId} value={agent.userId}>{agent.name}</option>
                  ))}
                </select>
              </Field>
              <Separator />
              <Field className="px-5">
                <FieldLabel>زیرخدمت‌ها</FieldLabel>
                <Input
                  value={subcategories}
                  onChange={(event) => setSubcategories(event.target.value)}
                  placeholder="مثلاً نصب، تعمیر، دسترسی (با ویرگول فارسی جدا کنید)"
                />
              </Field>
              <Separator />
              <Field className="px-5">
                <FieldLabel>کلیدواژه‌های تشخیص خودکار</FieldLabel>
                <Input
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  placeholder="کلمات مرتبط با عنوان تیکت را با ، جدا کنید"
                />
              </Field>
              <Separator />
              <FieldLabel className={" w-full flex justify-end px-5"}>
                کد خدمت
              </FieldLabel>
              <Input
                placeholder="کد انگلیسی خدمت را وارد کنید"
                className={"placeholder:text-center"}
                onChange={(e) => setProjectLabel(e.target.value)}
              />
              <SheetFooter className="sticky bottom-0 border-t bg-white/90 backdrop-blur-xl">
                <Button
                  variant="outline"
                  className={"bg-blue-400 text-white"}
                  type="button"
                  onClick={createProject}
                >
                  ذخیره
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {allProjects ? (
          <>
            <div className="glass-panel overflow-x-auto p-2 sm:p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">عنوان</TableHead>
                    <TableHead className="text-right">توضیحات</TableHead>
                    <TableHead className="text-right">پشتیبان پیش‌فرض</TableHead>
                    <TableHead className="text-right">زیرخدمت‌ها</TableHead>
                    <TableHead className="text-right">اولویت</TableHead>
                  </TableRow>
                </TableHeader>
                {allProjects.map((project) => (
                  <GetAllProjects
                    {...project}
                    key={project._id}
                    editHandler={editHandler}
                  />
                ))}
              </Table>
            </div>
          </>
        ) : (
          ""
        )}
      </section>
      {showEditModal ? (
        <div className="modal-panel fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto">
          <EditProject
            selectedProjectId={selectedProjectId}
            setShowEditeModal={setShowEditeModal}
            setIsChangeInfo={setIsChangeInfo}
            isChangInfo={isChangInfo}
            agents={agents}
          />
        </div>
      ) : (
        ""
      )}
    </>
  );
}
