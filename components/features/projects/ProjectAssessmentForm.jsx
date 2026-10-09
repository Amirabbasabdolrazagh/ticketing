"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const sections = [
  ["customer", "اطلاعات مشتری / شرکت", ["نام شرکت / مجموعه", "نام مدیر / مسئول", "سمت", "شماره تماس", "آدرس"]],
  ["overview", "اطلاعات اولیه مجموعه", ["تعداد کاربران", "تعداد سیستم‌های کامپیوتری", "تعداد سرورها", "تعداد شعب", "نوع زیرساخت"]],
  ["request", "شرح درخواست مشتری", ["شرح مشکل / درخواست", "زمان شروع مشکل", "میزان اهمیت", "توقف فعالیت مجموعه"]],
  ["needs", "نیازسنجی اولیه", ["نیازهای اعلام‌شده مشتری", "نیازهای شناسایی‌شده توسط کارشناس", "موارد نیازمند بررسی حضوری"]],
  ["infrastructure", "وضعیت فعلی زیرساخت", ["وضعیت شبکه", "وضعیت سرورها", "تجهیزات شبکه", "وضعیت اینترنت", "وضعیت Backup", "وضعیت امنیت"]],
  ["technical", "بررسی اولیه فنی توسط کارشناس", ["نظر اولیه کارشناس", "نیاز به بازدید حضوری و علت", "نیاز به دسترسی Remote و نوع دسترسی"]],
  ["scope", "محدوده احتمالی کار", ["کارهای احتمالی موردنیاز", "شرح اولیه محدوده کار"]],
  ["estimate", "برآورد اولیه", ["زمان تقریبی موردنیاز", "تعداد نفر موردنیاز", "سطح تخصص موردنیاز", "نیاز به حضور در محل", "برآورد اولیه هزینه / دستمزد"]],
  ["schedule", "زمان‌بندی و اولویت", ["زمان موردنظر مشتری برای شروع", "Deadline مشتری", "اولویت پروژه", "محدودیت زمانی / عملیاتی"]],
  ["risks", "ریسک‌ها و محدودیت‌ها", ["ریسک‌ها و توضیحات", "ریسک مهم پیش از شروع"]],
  ["prerequisites", "پیش‌نیازهای شروع کار", ["پیش‌نیازها", "توضیحات"]],
  ["evaluation", "ارزیابی و پیشنهاد کارشناس", ["قابلیت انجام پروژه", "تخصص / نیروی پیشنهادی", "پیشنهاد نحوه انجام", "مواردی که باید مشخص شوند"]],
  ["result", "نتیجه ارزیابی اولیه", ["وضعیت پروژه", "توضیحات مسئول بررسی"]],
];

export default function ProjectAssessmentForm({ assessment }) {
  const [data, setData] = useState(assessment.data || {});
  const [files, setFiles] = useState(assessment.attachments || []);
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setData((old) => ({ ...old, [key]: value }));
  const save = async (status = "in_progress") => {
    setSaving(true);
    try {
      await axios.patch(`/api/projects/${assessment.project._id}/assessments`, { assessmentId: assessment._id, data, status });
      toast.success(status === "submitted" ? "فرم برای ادمین ارسال شد" : "فرم ذخیره شد");
    } catch (error) { toast.error(error.response?.data?.message || "ذخیره فرم ناموفق بود"); } finally { setSaving(false); }
  };
  const upload = async (file) => {
    if (!file) return;
    const form = new FormData(); form.append("assessmentId", assessment._id); form.append("file", file);
    try { const { data: result } = await axios.post(`/api/projects/${assessment.project._id}/assessments/attachment`, form); if (result.success) { setFiles((old) => [...old, result.attachment]); toast.success("پیوست با موفقیت اضافه شد"); } } catch (error) { toast.error(error.response?.data?.message || "افزودن پیوست ناموفق بود"); }
  };
  return <section dir="rtl" className="space-y-5">
    <div className="glass-panel print-header p-5"><div className="mb-3 hidden text-center print:block"><strong className="text-xl">شرکت ای‌تی رسام | IT RASAM</strong><div className="text-xs">فرم ارزیابی و ثبت اولیه پروژه</div></div><h1 className="page-heading">فرم ارزیابی و ثبت اولیه پروژه</h1><p className="mt-2 text-sm text-slate-500">{assessment.project?.name}</p></div>
    {sections.map(([key, title, fields]) => <div key={key} className="glass-panel space-y-4 p-5"><h2 className="text-lg font-bold text-slate-800">{title}</h2><div className="grid gap-4 md:grid-cols-2">{fields.map((label) => <label key={label} className="space-y-2 text-sm font-semibold text-slate-700"><span>{label}</span>{label.includes("شرح") || label.includes("نظر") || label.includes("توضیحات") || label.includes("پیشنهاد") || label.includes("ریسک") ? <textarea value={data[`${key}.${label}`] || ""} onChange={(e) => update(`${key}.${label}`, e.target.value)} className="min-h-28 w-full rounded-xl border border-slate-200 bg-white/70 p-3" /> : <input value={data[`${key}.${label}`] || ""} onChange={(e) => update(`${key}.${label}`, e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white/70 px-3" />}</label>)}</div></div>)}
    {assessment.jobBriefStatus === "issued" && <div className="glass-panel border-blue-200 bg-blue-50/70 p-5"><h2 className="text-lg font-bold text-blue-900">ابلاغ شرح وظایف و برنامه اجرای پروژه</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{assessment.jobBrief?.summary || "شرح کلی توسط مدیر پروژه ثبت نشده است."}</p>{assessment.jobBrief?.startDate && <p className="mt-3 text-sm">شروع: {assessment.jobBrief.startDate} — پایان: {assessment.jobBrief.deadline || "تعیین نشده"}</p>}<button type="button" onClick={async () => { try { await axios.patch(`/api/projects/${assessment.project._id}/assessments`, { assessmentId: assessment._id, jobBrief: assessment.jobBrief, jobBriefStatus: "acknowledged" }); toast.success("ابلاغ دریافت شد"); } catch {} }} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white print:hidden">تأیید دریافت ابلاغ</button></div>}
    <div className="glass-panel space-y-3 p-4"><h2 className="font-bold">پیوست فرم امضاشده مشتری</h2><input type="file" accept="image/*,application/pdf" onChange={(e) => upload(e.target.files?.[0])} className="block w-full rounded-xl border border-slate-200 bg-white/70 p-3" />{files.length > 0 && <div className="flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file.path || file.name}-${index}`} className="rounded-lg bg-slate-100 px-3 py-2 text-xs">{file.name}</span>)}</div>}</div>
    <div className="glass-panel sticky bottom-4 flex flex-wrap justify-end gap-3 p-4 print:hidden"><button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold">چاپ / ذخیره PDF</button><button disabled={saving} onClick={() => save()} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold">ذخیره موقت</button><button disabled={saving} onClick={() => save("submitted")} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">ثبت و ارسال برای ادمین</button></div>
  </section>;
}
