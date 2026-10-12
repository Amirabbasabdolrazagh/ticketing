"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Eye, Printer, Trash2, X } from "lucide-react";
import ProjectFormRecord from "./ProjectFormRecord";
import VoiceTextarea from "./VoiceTextarea";
import { assessmentDocument } from "./ProjectAssessmentsAdmin";

const blank = { name: "", customerName: "", location: "", description: "", passiveAgent: "", activeAgent: "" };

export default function ProjectProposalsAdmin({ supporters, onCreated }) {
  const [items, setItems] = useState([]);
  const [viewId, setViewId] = useState(null);
  const [approvalId, setApprovalId] = useState(null);
  const [printId, setPrintId] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    const { data } = await axios.get("/api/assessments", { params: { _fresh: Date.now() } });
    setItems((data.assessments || []).filter((item) => !item.project && item.status === "submitted"));
  };
  useEffect(() => {
    let active = true;
    axios.get("/api/assessments", { params: { _fresh: Date.now() } }).then(({ data }) => {
      if (active) setItems((data.assessments || []).filter((item) => !item.project && item.status === "submitted"));
    }).catch(() => { if (active) toast.error("دریافت ارزیابی‌ها ناموفق بود"); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const clear = () => setPrintId(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);
  const selected = items.find((item) => item._id === viewId);
  const approving = items.find((item) => item._id === approvalId);

  const startApproval = (item) => {
    setForm({
      name: item.data?.projectTitle || "",
      customerName: item.data?.customerCompany || "",
      location: item.data?.customerAddress || "",
      description: item.data?.projectDescription || item.data?.scopeDescription || item.data?.requestDescription || "",
      passiveAgent: item.assigneeRole === "passive_agent" ? item.assignee?._id || "" : "",
      activeAgent: item.assigneeRole === "active_agent" ? item.assignee?._id || "" : "",
    });
    setApprovalId(item._id);
  };
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const approve = async () => {
    if (!form.name.trim() || !form.customerName.trim() || !form.location.trim()) return toast.error("عنوان، مشتری و محل اجرا الزامی‌اند");
    if (!form.passiveAgent && !form.activeAgent) return toast.error("حداقل یک پشتیبان انتخاب کنید");
    setSaving(true);
    try {
      const { data } = await axios.post("/api/installation-projects", { ...form, assessmentId: approvalId });
      if (!data.success) throw new Error(data.message || "ساخت پروژه ناموفق بود");
      toast.success("ارزیابی تأیید و پروژه ساخته شد");
      setApprovalId(null);
      setViewId(null);
      await Promise.all([load(), onCreated?.()]);
    } catch (error) { toast.error(error.response?.data?.message || error.message || "تأیید ارزیابی ناموفق بود"); }
    finally { setSaving(false); }
  };
  const print = (id) => {
    flushSync(() => setPrintId(id));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };
  const removeAssessment = async (item) => {
    if (!window.confirm("این ارزیابی ارسال‌شده و پیوست‌های آن حذف شود؟ این عمل قابل بازگشت نیست.")) return;
    setDeletingId(item._id);
    try {
      const { data } = await axios.delete(`/api/assessments/${item._id}`);
      if (!data.success) throw new Error(data.message || "حذف ارزیابی ناموفق بود");
      setItems((old) => old.filter((entry) => entry._id !== item._id));
      setViewId((id) => id === item._id ? null : id);
      setApprovalId((id) => id === item._id ? null : id);
      toast.success("ارزیابی حذف شد");
    } catch (error) { toast.error(error.response?.data?.message || error.message || "حذف ارزیابی ناموفق بود"); }
    finally { setDeletingId(null); }
  };

  return <section dir="rtl" className="glass-panel space-y-4 p-5 sm:p-6"><div><h2 className="text-xl font-black">ارزیابی‌های آمادهٔ بررسی</h2><p className="mt-1 text-sm text-slate-500">پروژه فقط پس از تأیید شما و تعیین حداقل یک پشتیبان ساخته می‌شود.</p></div>
    {items.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">در حال حاضر فرم جدیدی برای تأیید وجود ندارد.</p> : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={item._id} className="rounded-3xl border border-blue-100 bg-white/85 p-5 shadow-sm"><span className="text-xs font-bold text-blue-600">ارزیابی {item.assigneeRole === "passive_agent" ? "پسیو" : "اکتیو"}</span><h3 className="mt-2 text-lg font-black">{item.data?.projectTitle || "پروژه بدون عنوان"}</h3><p className="mt-1 text-sm text-slate-500">{item.data?.customerCompany || "مشتری ثبت نشده"} · {item.assignee?.name || "پشتیبان"}</p><p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.data?.projectDescription || item.data?.requestDescription || "شرحی ثبت نشده است."}</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setViewId(item._id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"><Eye className="size-4" />مشاهده فرم</button><button type="button" onClick={() => print(item._id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"><Printer className="size-4" />چاپ</button><button type="button" onClick={() => startApproval(item)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">تأیید و تعریف پروژه</button><button type="button" disabled={deletingId === item._id} onClick={() => removeAssessment(item)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-60"><Trash2 className="size-4" />{deletingId === item._id ? "در حال حذف..." : "حذف"}</button></div></article>)}</div>}
    {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">فرم ارزیابی: {selected.data?.projectTitle}</h2><p className="mt-1 text-sm text-slate-500">ثبت‌کننده: {selected.assignee?.name || "—"}</p></div><button type="button" onClick={() => setViewId(null)} aria-label="بستن" className="rounded-xl p-2 hover:bg-slate-100"><X /></button></div><ProjectFormRecord data={selected.data} attachments={selected.attachments} attachmentBaseUrl={`/api/assessments/${selected._id}/attachment?file=`} /><div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => print(selected._id)} className="rounded-xl border px-4 py-2 font-bold">چاپ فرم</button><button type="button" onClick={() => startApproval(selected)} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">تأیید و تعریف پروژه</button></div></div></div>}
    {approving && <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-black">تأیید ارزیابی و ساخت پروژه</h2><p className="mt-1 text-sm text-slate-500">فیلدها از فرم ارزیابی گرفته شده‌اند؛ می‌توانید ویرایششان کنید.</p></div><button type="button" onClick={() => setApprovalId(null)} aria-label="بستن" className="rounded-xl p-2 hover:bg-slate-100"><X /></button></div><div className="grid gap-4 md:grid-cols-2">{[["name", "عنوان پروژه"], ["customerName", "نام مشتری"], ["location", "محل اجرا"]].map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<input value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>)}<div className="rounded-xl bg-blue-50 p-3 text-sm">کد پروژه هنگام تأیید خودکار ساخته می‌شود.</div>{[["passiveAgent", "پشتیبان پسیو"], ["activeAgent", "پشتیبان اکتیو"]].map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<select value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="">انتخاب نشده</option>{supporters.map((person) => <option key={person.userId} value={person.userId}>{person.name || "بدون نام"}</option>)}</select></label>)}<label className="text-sm font-bold md:col-span-2">توضیحات پروژه<VoiceTextarea value={form.description} onChange={(value) => update("description", value)} className="min-h-24 w-full rounded-xl border border-slate-200 p-3" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setApprovalId(null)} className="rounded-xl border px-5 py-3 font-bold">انصراف</button><button type="button" onClick={approve} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "در حال ثبت..." : "تأیید و ساخت پروژه"}</button></div></div></div>}
    {printId && items.filter((item) => item._id === printId).map((item) => assessmentDocument(item, true))}
  </section>;
}
