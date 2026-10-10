"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ProjectPrintDocument from "./ProjectPrintDocument";

const fields = (items) => items.map(([label, value]) => ({ label, value }));

function assessmentDocument(item, printable) {
  const data = item.data || {};
  const title = "فرم ارزیابی و ثبت اولیه پروژه";
  return <ProjectPrintDocument key={`assessment-print-${item._id}`} printable={printable} title={title} code="IT-RASAM-NET-FRM-003" projectName={item.project?.name} details={fields([
    ["نام مشتری / شرکت", "customerCompany"], ["نام مدیر / مسئول", "customerManager"], ["سمت", "customerRole"], ["شماره تماس", "customerPhone"], ["آدرس", "customerAddress"], ["تاریخ درخواست", "requestDate"], ["روش دریافت درخواست", "requestMethods"],
  ].map(([label, key]) => [label, data[key]]))} sections={[
    { title: "اطلاعات مجموعه و زیرساخت", fields: fields([["تعداد کاربران", "userCount"], ["تعداد سیستم‌ها", "computerCount"], ["تعداد سرورها", "serverCount"], ["تعداد شعب", "branchCount"], ["نوع زیرساخت", "infrastructureTypes"], ["وضعیت شبکه", "networkStatus"], ["توضیحات شبکه", "networkNotes"], ["تعداد و سیستم‌عامل سرورها", "serverOs"], ["تجهیزات شبکه", "networkEquipment"], ["نوع و وضعیت اینترنت", "internetType"], ["وضعیت پشتیبان‌گیری", "backupStatus"], ["وضعیت امنیت", "securityStatus"]].map(([label, key]) => [label, data[key]])) },
    { title: "درخواست و نیازسنجی", fields: fields([["شرح درخواست", "requestDescription"], ["زمان آغاز مشکل", "issueSince"], ["اولویت", "issuePriority"], ["توقف فعالیت", "businessStopped"], ["نیازهای اعلام‌شده", "statedNeeds"], ["نیازهای شناسایی‌شده", "identifiedNeeds"], ["نیاز به بازدید", "onSiteNeeds"], ["نظر فنی اولیه", "technicalOpinion"], ["بازدید حضوری", "onSiteRequired"], ["علت بازدید", "onSiteReason"], ["دسترسی از راه دور", "remoteRequired"], ["نوع دسترسی", "remoteType"], ["محدوده کار", "scopeItems"], ["شرح محدوده", "scopeDescription"]].map(([label, key]) => [label, data[key]])) },
    { title: "برآورد، ریسک و تأیید ارجاع", fields: fields([["زمان و نیروی موردنیاز", "estimatedTime"], ["تعداد نفر", "requiredPeople"], ["سطح تخصص", "skillLevel"], ["نیاز به حضور", "presenceNeed"], ["برآورد هزینه", "estimatedCost"], ["زمان شروع و مهلت مشتری", "customerStart"], ["اولویت و محدودیت‌ها", "operationalLimits"], ["پیشنهاد کارشناس", "executionSuggestion"], ["موارد لازم پیش از ارجاع", "beforeAssignment"], ["نتیجه ارزیابی", "evaluationResult"], ["توضیحات ارزیابی", "evaluationNotes"], ["کارشناس پیشنهادی", "suggestedAgent"], ["تاریخ ارجاع", "assignmentDate"], ["مسئول پروژه", "projectOwner"], ["مدیر فنی", "technicalManager"], ["نام کارشناس تأییدکننده", "agentConfirmationName"], ["نام مسئول تأییدکننده", "ownerConfirmationName"], ["نام تأییدکننده مدیریت", "managementConfirmationName"]].map(([label, key]) => [label, data[key]])) },
  ]} tables={[
    { title: "مشکلات شناسایی‌شده", rows: data.identifiedProblems, columns: [{ key: "item", label: "مورد" }, { key: "status", label: "وضعیت" }, { key: "priority", label: "اهمیت" }, { key: "notes", label: "توضیحات" }] },
    { title: "ریسک‌ها و محدودیت‌ها", rows: data.risks, columns: [{ key: "risk", label: "ریسک" }, { key: "probability", label: "احتمال" }, { key: "impact", label: "اثر" }, { key: "solution", label: "راهکار" }] },
  ]} parties={[{ title: "کارشناس ارزیابی", name: data.agentConfirmationName }, { title: "نماینده کارفرما", name: data.customerManager, role: data.customerRole }, { title: "مسئول پروژه ای‌تی رسام", name: data.ownerConfirmationName }]} />;
}

export default function ProjectAssessmentsAdmin({ projectId }) {
  const [items, setItems] = useState([]);
  const [printId, setPrintId] = useState(null);
  useEffect(() => {
    let active = true;
    axios.get(`/api/projects/${projectId}/assessments`).then(({ data }) => {
      if (active) setItems(data.assessments || []);
    }).catch(() => { if (active) toast.error("دریافت ارزیابی پروژه ناموفق بود"); });
    return () => { active = false; };
  }, [projectId]);

  const print = (id) => {
    setPrintId(id);
    window.setTimeout(() => window.print(), 150);
  };
  useEffect(() => {
    const clear = () => setPrintId(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  return <section dir="rtl" className="glass-panel space-y-4 p-5">
    <div><h2 className="text-xl font-black">فرم‌های ارزیابی پشتیبان‌ها</h2><p className="mt-1 text-sm text-slate-500">مشاهده وضعیت و چاپ نسخه رسمی ثبت‌شده</p></div>
    {items.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">هنوز فرم ارزیابی برای این پروژه وجود ندارد.</p> : items.map((item) => <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4"><div><strong>{item.assignee?.name || "کارشناس"} — {item.assigneeRole === "passive_agent" ? "پسیو" : "اکتیو"}</strong><p className="mt-1 text-sm text-slate-500">وضعیت: {item.status === "submitted" ? "ارسال‌شده" : item.status === "reviewed" ? "بررسی‌شده" : item.status === "in_progress" ? "در حال تکمیل" : "در انتظار تکمیل"}</p></div><button type="button" onClick={() => print(item._id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">چاپ فرم ارزیابی</button></div>)}
    {items.map((item) => assessmentDocument(item, printId === item._id))}
  </section>;
}
