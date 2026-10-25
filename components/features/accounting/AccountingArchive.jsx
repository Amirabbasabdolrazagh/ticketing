"use client";

import { useCallback, useEffect, useState } from "react";
import { FileArchive, Download, Eye, Pencil, Trash2, Plus, Search, RefreshCw, X, Save } from "lucide-react";

const CATEGORIES = [
  ["quarterly_transactions", "معاملات فصلی"],
  ["tax_vat", "مالیات و ارزش افزوده"],
  ["purchase_invoice", "فاکتور خرید"],
  ["sales_invoice", "فاکتور فروش"],
];
const CATEGORY_NAMES = Object.fromEntries(CATEGORIES);
const empty = { title: "", category: "purchase_invoice", documentDate: "", referenceNumber: "", notes: "" };
const displayDate = (value) => value ? new Date(value).toLocaleDateString("fa-IR") : "—";
const displaySize = (value) => value < 1024 * 1024 ? Math.round(value / 1024) + " KB" : (value / 1024 / 1024).toFixed(1) + " MB";

export default function AccountingArchive() {
  const [docs, setDocs] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (category) params.set("category", category);
      if (query) params.set("search", query);
      const response = await fetch("/api/accounting/documents?" + params, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "دریافت اسناد ناموفق بود");
      setDocs(data.documents || []);
      setTotal(data.total || 0);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [page, category, query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(id);
  }, [search]);

  function closeForm() { setEditing(null); setForm(empty); setFile(null); }
  function startCreate() { setMessage(""); setEditing("new"); setForm({ ...empty, documentDate: new Date().toISOString().slice(0, 10) }); setFile(null); }
  function startEdit(doc) {
    setMessage("");
    setEditing(doc._id);
    setForm({
      title: doc.title || "", category: doc.category,
      documentDate: doc.documentDate?.slice(0, 10) || "",
      referenceNumber: doc.referenceNumber || "", notes: doc.notes || "",
    });
    setFile(null);
  }
  async function submit(event) {
    event.preventDefault();
    if (editing === "new" && !file) { setError("انتخاب فایل الزامی است"); return; }
    if (file && file.size > 15 * 1024 * 1024) { setError("حجم فایل بیشتر از ۱۵ مگابایت است"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      let response;
      if (editing === "new") {
        const data = new FormData();
        for (const [key, value] of Object.entries(form)) data.append(key, value);
        data.append("file", file);
        response = await fetch("/api/accounting/documents", { method: "POST", body: data });
      } else {
        response = await fetch("/api/accounting/documents/" + editing, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "ذخیره انجام نشد");
      closeForm(); setMessage("سند با موفقیت ذخیره شد"); setPage(1); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(doc) {
    if (!window.confirm("سند «" + doc.title + "» حذف شود؟ این عملیات قابل بازگشت نیست.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/accounting/documents/" + doc._id, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حذف انجام نشد");
      setMessage("سند حذف شد"); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <section dir="rtl" className="mx-auto w-full max-w-7xl space-y-5 pb-10 text-right">
      <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-blue-100/50 backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"><FileArchive size={15} /> آرشیو خصوصی</span>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">بایگانی اسناد حسابداری</h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">ثبت و مدیریت امن اسناد مالی شرکت در چهار دسته‌بندی اصلی</p>
          </div>
          <button type="button" onClick={startCreate} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-bold text-white shadow-md hover:bg-blue-700"><Plus size={18} /> افزودن سند</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CATEGORIES.map(([id, label]) => (
            <button type="button" key={id} onClick={() => { setCategory(category === id ? "" : id); setPage(1); }}
              className={"min-h-20 rounded-2xl border p-4 text-right text-sm font-bold transition " + (category === id ? "border-blue-500 bg-blue-600 text-white shadow-lg" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-md shadow-blue-100/40 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4">
            <Search size={18} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی عنوان یا شماره سند" className="h-12 w-full bg-transparent text-sm outline-none" />
          </label>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="دسته‌بندی" className="h-12 min-w-44 rounded-2xl border border-slate-200 bg-white px-4 text-sm">
            <option value="">همه دسته‌بندی‌ها</option>
            {CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <button type="button" onClick={load} aria-label="بازخوانی" title="بازخوانی" className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"><RefreshCw size={18} /></button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p>}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[750px] text-right text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500">
              <th className="p-3">عنوان سند</th><th className="p-3">دسته</th><th className="p-3">تاریخ</th><th className="p-3">شماره مرجع</th><th className="p-3">حجم</th><th className="p-3">عملیات</th>
            </tr></thead>
            <tbody>
              {docs.map((doc) => <tr key={doc._id} className="border-b border-slate-100 text-slate-700">
                <td className="max-w-52 truncate p-3 font-bold text-slate-900" title={doc.title}>{doc.title}</td>
                <td className="p-3">{CATEGORY_NAMES[doc.category] || "—"}</td>
                <td className="p-3">{displayDate(doc.documentDate)}</td>
                <td className="p-3">{doc.referenceNumber || "—"}</td>
                <td className="p-3" dir="ltr">{displaySize(doc.size)}</td>
                <td className="p-3"><div className="flex items-center gap-2">
                  <a href={"/api/accounting/documents/" + doc._id + "/file?preview=1"} target="_blank" rel="noopener noreferrer" className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700" title="مشاهده"><Eye size={17} /></a>
                  <a href={"/api/accounting/documents/" + doc._id + "/file"} className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700" download title="دانلود"><Download size={17} /></a>
                  <button type="button" onClick={() => startEdit(doc)} className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700" title="ویرایش"><Pencil size={17} /></button>
                  <button type="button" disabled={busy} onClick={() => remove(doc)} className="flex size-9 items-center justify-center rounded-xl bg-red-50 text-red-700" title="حذف"><Trash2 size={17} /></button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
          {!loading && docs.length === 0 && <p className="py-12 text-center text-slate-500">سندی برای نمایش پیدا نشد.</p>}
          {loading && <p className="py-10 text-center text-slate-500">در حال بارگذاری اسناد...</p>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
          <span>{total.toLocaleString("fa-IR")} سند</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading} className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">قبلی</button>
            <span>صفحه {page.toLocaleString("fa-IR")}</span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 30 >= total || loading} className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">بعدی</button>
          </div>
        </div>
      </div>

      {editing && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 pt-10 backdrop-blur-sm sm:pt-16" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) closeForm(); }}>
        <form onSubmit={submit} className="w-full max-w-xl space-y-4 rounded-3xl border border-white/80 bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">{editing === "new" ? "ثبت سند جدید" : "ویرایش مشخصات سند"}</h2>
            <button type="button" aria-label="بستن" onClick={closeForm}><X size={22} /></button>
          </div>
          <label className="block text-sm font-bold text-slate-700">عنوان سند
            <input required maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-blue-500" />
          </label>
          <label className="block text-sm font-bold text-slate-700">دسته‌بندی
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3">
              {CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">تاریخ سند
              <input type="date" required value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" />
            </label>
            <label className="block text-sm font-bold text-slate-700">شماره مرجع
              <input maxLength={100} value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" />
            </label>
          </div>
          <label className="block text-sm font-bold text-slate-700">یادداشت
            <textarea rows={3} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3" />
          </label>
          {editing === "new" && <label className="block text-sm font-bold text-slate-700">فایل سند (PDF، JPG، PNG یا WEBP، حداکثر ۱۵ مگابایت)
            <input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </label>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white disabled:opacity-50"><Save size={18} /> {busy ? "در حال ذخیره..." : "ذخیره سند"}</button>
            <button type="button" disabled={busy} onClick={closeForm} className="h-12 rounded-xl border border-slate-200 px-5 font-bold text-slate-600">انصراف</button>
          </div>
        </form>
      </div>}
    </section>
  );
}
