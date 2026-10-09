"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { FolderPlus, Trash2, UserRoundCheck, X } from "lucide-react";

const emptyForm = { name: "", customerName: "", location: "", description: "", code: "", passiveAgent: "", activeAgent: "" };
const roleLabel = { passive_agent: "پشتیبان پسیو", active_agent: "پشتیبان اکتیو" };

export default function InstallationProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [passive, setPassive] = useState([]);
  const [active, setActive] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [projectResult, passiveResult, activeResult] = await Promise.all([
      axios.get("/api/installation-projects", { params: { _fresh: Date.now() } }),
      axios.get("/api/users?role=passive_agent"),
      axios.get("/api/users?role=active_agent"),
    ]);
    setProjects(projectResult.data.projects || []);
    setPassive(passiveResult.data.safeInfo || []);
    setActive(activeResult.data.safeInfo || []);
  };

  // Load the independent installation-project records when this admin page opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load().catch(() => toast.error("دریافت پروژه‌ها ناموفق بود")); }, []);

  const supporters = useMemo(() => {
    const unique = new Map();
    [...passive, ...active].forEach((user) => unique.set(user.userId, user));
    return [...unique.values()];
  }, [passive, active]);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const close = () => { if (!saving) { setOpen(false); setForm(emptyForm); } };

  const create = async () => {
    setSaving(true);
    try {
      await axios.post("/api/installation-projects", form);
      toast.success("پروژه اجرایی ساخته شد");
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "ثبت پروژه ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (project) => {
    const approved = window.confirm(`پروژه «${project.name}» و تمام فرم‌های ارزیابی و صورتجلسه وابسته به آن حذف شوند؟ این کار قابل بازگشت نیست.`);
    if (!approved) return;
    setDeletingId(project._id);
    try {
      await axios.delete(`/api/installation-projects/${project._id}`);
      setProjects((old) => old.filter((item) => item._id !== project._id));
      toast.success("پروژه با موفقیت حذف شد");
    } catch (error) {
      toast.error(error.response?.data?.message || "حذف پروژه ناموفق بود");
    } finally {
      setDeletingId(null);
    }
  };

  const agentOption = (user) => `${user.name || "کاربر بدون نام"} — ${roleLabel[user.role] || "پشتیبان"}`;

  return <section dir="rtl" className="app-page space-y-5"><Toaster /><div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7"><div><h1 className="page-heading">پروژه‌های نصب و راه‌اندازی</h1><p className="mt-2 text-sm text-slate-500">مدیریت پروژه‌های اجرایی، کارشناسان پسیو و اکتیو، فرم ارزیابی و صورتجلسه تحویل</p></div><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-500/20"><FolderPlus className="size-5" />پروژه اجرایی جدید</button></div>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-3xl border border-white/80 bg-white p-5 text-slate-900 shadow-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">تعریف پروژه نصب و راه‌اندازی</h2><p className="mt-1 text-sm text-slate-500">این بخش مستقل از خدمات و تیکت‌ها است.</p></div><button type="button" onClick={close} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="بستن"><X className="size-6" /></button></div><div className="grid gap-4 md:grid-cols-2">{[["name", "نام پروژه"], ["customerName", "نام مشتری / شرکت"], ["location", "محل اجرا"], ["code", "کد پروژه"]].map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<input value={form[key]} onChange={(event) => set(key, event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" /></label>)}<label className="text-sm font-bold">پشتیبان پسیو<select value={form.passiveAgent} onChange={(event) => set("passiveAgent", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="">انتخاب کنید</option>{supporters.map((item) => <option key={item.userId} value={item.userId}>{agentOption(item)}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">می‌توانید همان شخصِ بخش اکتیو یا شخص دیگری را انتخاب کنید.</span></label><label className="text-sm font-bold">پشتیبان اکتیو<select value={form.activeAgent} onChange={(event) => set("activeAgent", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="">انتخاب کنید</option>{supporters.map((item) => <option key={item.userId} value={item.userId}>{agentOption(item)}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">انتخاب مشترک برای اکتیو و پسیو مجاز است.</span></label><label className="text-sm font-bold md:col-span-2">توضیحات پروژه<textarea value={form.description} onChange={(event) => set("description", event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="rounded-xl border px-5 py-3 font-bold">انصراف</button><button disabled={saving} type="button" onClick={create} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-slate-400">{saving ? "در حال ثبت..." : "ثبت پروژه"}</button></div></div></div>}
    <div className="glass-panel overflow-x-auto p-3"><table className="w-full min-w-[760px] text-right text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">پروژه</th><th className="p-3">مشتری</th><th className="p-3">پسیو</th><th className="p-3">اکتیو</th><th className="p-3">وضعیت</th><th className="p-3">عملیات</th></tr></thead><tbody>{projects.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">هنوز پروژه اجرایی ثبت نشده است.</td></tr> : projects.map((item) => <tr key={item._id} className="border-b border-slate-100"><td className="p-3 font-bold">{item.name}<small className="mr-2 text-slate-400">{item.code}</small></td><td className="p-3">{item.customerName || "—"}</td><td className="p-3">{item.passiveAgent?.name || "—"}</td><td className="p-3">{item.activeAgent?.name || "—"}</td><td className="p-3">{item.status === "archived" ? "آرشیو شده" : item.status === "in_progress" ? "در حال اجرا" : "در انتظار اجرا"}</td><td className="p-3"><div className="flex items-center gap-2"><Link href={`/admin/installation-projects/${item._id}`} className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700">مشاهده</Link><button type="button" onClick={() => remove(item)} disabled={deletingId === item._id} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700 disabled:opacity-50"><Trash2 className="size-4" />{deletingId === item._id ? "در حال حذف" : "حذف"}</button></div></td></tr>)}</tbody></table></div><div className="glass-panel flex items-start gap-3 p-4 text-sm text-slate-600"><UserRoundCheck className="mt-0.5 size-5 shrink-0 text-blue-600" /><p>برای هر پروژه می‌توانید یک پشتیبان را هم‌زمان برای وظایف اکتیو و پسیو یا دو پشتیبان جدا انتخاب کنید.</p></div></section>;
}
