"use client";

import axios from "axios";
import { Building2, Cpu, Edit3, HardDrive, Plus, ShieldCheck, TicketCheck, Trash2, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { formatJalaliInput, formatJalaliTyping } from "@/utils/jalaliDate";

const emptyForm = {
  name: "", managerName: "", managerPhone: "", managerEmail: "", managerPassword: "", memberIds: [],
  equipment: [{ name: "", type: "", serial: "", status: "active" }],
  supportContract: { title: "قرارداد پشتیبانی", level: "standard", status: "active", startAt: "", endAt: "", notes: "", features: { onsiteService: false, secureCall: false, remoteSupport: false, prioritySupport: false } },
};

const contractLabels = { basic: "پایه", standard: "استاندارد", premium: "ویژه" };
const contractStatus = { active: "فعال", expiring: "رو به پایان", expired: "منقضی", draft: "پیش‌نویس" };

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const { data } = await axios.get("/api/organizations");
      if (data.success) { setOrganizations(data.organizations); setCustomers(data.customers); }
    } catch (error) { toast.error(error.response?.data?.message || "دریافت سازمان‌ها ناموفق بود"); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const availableCustomers = useMemo(() => customers.filter((customer) => !customer.organization || form.memberIds.includes(customer._id)), [customers, form.memberIds]);

  const startCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (organization) => {
    setEditingId(organization._id);
    setForm({
      name: organization.name,
      managerName: organization.manager?.name || "",
      managerPhone: organization.manager?.phone || "",
      managerEmail: organization.manager?.email || "",
      managerPassword: "",
      memberIds: organization.members.map((member) => member._id),
      equipment: organization.equipment.length
        ? organization.equipment.map((item) => ({ name: item.name || "", type: item.type || "", serial: item.serial || "", status: item.status || "active" }))
        : [{ name: "", type: "", serial: "", status: "active" }],
      supportContract: {
        title: organization.supportContract?.title || "قرارداد پشتیبانی",
        level: organization.supportContract?.level || "standard",
        status: organization.supportContract?.status || "active",
        startAt: formatJalaliInput(organization.supportContract?.startAt),
        endAt: formatJalaliInput(organization.supportContract?.endAt),
        notes: organization.supportContract?.notes || "",
        features: {
          onsiteService: Boolean(organization.supportContract?.features?.onsiteService),
          secureCall: Boolean(organization.supportContract?.features?.secureCall),
          remoteSupport: Boolean(organization.supportContract?.features?.remoteSupport),
          prioritySupport: Boolean(organization.supportContract?.features?.prioritySupport),
        },
      },
    });
    setOpen(true);
  };
  const toggleMember = (id) => setForm((current) => ({ ...current, memberIds: current.memberIds.includes(id) ? current.memberIds.filter((item) => item !== id) : [...current.memberIds, id] }));
  const updateEquipment = (index, key, value) => setForm((current) => ({ ...current, equipment: current.equipment.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const addEquipment = () => setForm((current) => ({ ...current, equipment: [...current.equipment, { name: "", type: "", serial: "", status: "active" }] }));
  const removeEquipment = (index) => setForm((current) => ({ ...current, equipment: current.equipment.length === 1 ? [{ name: "", type: "", serial: "", status: "active" }] : current.equipment.filter((_, itemIndex) => itemIndex !== index) }));
  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, organizationId: editingId, equipment: form.equipment.filter((item) => item.name.trim()) };
      const { data } = editingId ? await axios.patch("/api/organizations", payload) : await axios.post("/api/organizations", payload);
      if (data.success) { toast.success(data.message); setOpen(false); await load(); }
    } catch (error) { toast.error(error.response?.data?.message || "ذخیره سازمان ناموفق بود"); }
    finally { setSaving(false); }
  };

  const totalMembers = organizations.reduce((sum, organization) => sum + organization.members.length, 0);
  const totalEquipment = organizations.reduce((sum, organization) => sum + organization.equipment.length, 0);

  return (
    <section className="app-page space-y-5" dir="rtl">
      <Toaster />
      <header className="glass-panel relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -left-10 -top-16 size-48 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg"><Building2 /></span><div><h1 className="page-heading">پرتال مشتریان سازمانی</h1><p className="mt-1 text-sm text-slate-500">تعریف مدیر، کارکنان، قرارداد و تجهیزات هر سازمان</p></div></div></div>
          <button onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200"><Plus className="size-5" /> افزودن سازمان</button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["سازمان فعال", organizations.filter((item) => item.isActive).length, Building2, "border-blue-100 bg-blue-50 text-blue-600"], ["کارکنان متصل", totalMembers, UsersRound, "border-violet-100 bg-violet-50 text-violet-600"], ["تجهیزات ثبت‌شده", totalEquipment, Cpu, "border-emerald-100 bg-emerald-50 text-emerald-600"]].map(([label, value, Icon, style]) => <article key={label} className={`rounded-3xl border p-5 ${style}`}><div className="flex items-center justify-between"><Icon /><strong className="text-2xl text-slate-950">{value.toLocaleString("fa-IR")}</strong></div><p className="mt-3 text-sm font-black text-slate-700">{label}</p></article>)}
      </div>

      {loading ? <div className="glass-panel grid min-h-52 place-items-center text-slate-400">در حال بارگذاری…</div> : organizations.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {organizations.map((organization) => (
            <article key={organization._id} className="glass-panel overflow-hidden p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-slate-950">{organization.name}</h2><span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">{organization.code}</span></div><p className="mt-2 text-xs text-slate-500">مدیر سازمان: <b className="text-slate-700">{organization.manager?.name}</b></p></div>
                <button onClick={() => startEdit(organization)} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm" aria-label="ویرایش"><Edit3 className="size-4" /></button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat icon={UsersRound} value={organization.members.length} label="کارمند" />
                <Stat icon={TicketCheck} value={organization.ticketCount || 0} label="تیکت" />
                <Stat icon={Cpu} value={organization.equipment.length} label="تجهیز" />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <span className="flex items-center gap-2 text-xs font-black text-emerald-800"><ShieldCheck className="size-5" /> {organization.supportContract?.title}</span>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-emerald-700">{contractLabels[organization.supportContract?.level]} · {contractStatus[organization.supportContract?.status]}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{organization.members.slice(0, 5).map((member) => <span key={member._id} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">{member.name}</span>)}{organization.members.length > 5 && <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-black text-violet-700">+{(organization.members.length - 5).toLocaleString("fa-IR")}</span>}</div>
            </article>
          ))}
        </div>
      ) : <div className="glass-panel grid min-h-52 place-items-center p-8 text-center"><div><Building2 className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-black text-slate-600">هنوز سازمانی تعریف نشده است.</p></div></div>}

      {open && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between"><div><h2 className="text-xl font-black text-slate-950">{editingId ? "ویرایش سازمان" : "ساخت پرتال سازمان"}</h2><p className="mt-1 text-xs text-slate-500">کد سازمان خودکار ساخته می‌شود و مدیر می‌تواند با شماره موبایل یا ایمیل وارد شود.</p></div><button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl bg-slate-100"><X className="size-5" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="نام سازمان"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً شرکت نمونه" /></Field>
          <Field label="نام مدیر سازمان"><input disabled={editingId} value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} /></Field>
          <Field label="شماره موبایل مدیر"><input disabled={editingId} dir="ltr" inputMode="numeric" value={form.managerPhone} onChange={(e) => setForm({ ...form, managerPhone: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="09123456789" /></Field>
          <Field label="ایمیل مدیر (اختیاری)"><input disabled={editingId} dir="ltr" type="email" value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} placeholder="manager@example.com" /></Field>
          {!editingId && <Field label="رمز عبور مدیر"><input dir="ltr" type="password" autoComplete="new-password" value={form.managerPassword} onChange={(e) => setForm({ ...form, managerPassword: e.target.value })} placeholder="حداقل ۸ کاراکتر امن" /></Field>}
          {!editingId && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800 sm:col-span-2">کد یکتای سازمان پس از ثبت، بر اساس نام سازمان، تاریخ ایجاد و یک شناسه امن ساخته می‌شود. اتصال مدیر به بله یا تلگرام اختیاری است.</div>}
        </div>
        <h3 className="mt-6 flex items-center gap-2 font-black text-slate-900"><UsersRound className="size-5 text-blue-600" /> کارکنان سازمان</h3>
        <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 sm:grid-cols-2">{availableCustomers.length ? availableCustomers.map((customer) => <label key={customer._id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${form.memberIds.includes(customer._id) ? "border-blue-300 bg-blue-50" : "border-slate-100"}`}><input type="checkbox" checked={form.memberIds.includes(customer._id)} onChange={() => toggleMember(customer._id)} /><span><b className="block text-xs text-slate-800">{customer.name}</b><small dir="ltr" className="text-slate-400">{customer.phone}</small></span></label>) : <p className="p-4 text-xs text-slate-400">مشتری آزاد برای افزودن وجود ندارد.</p>}</div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="سطح قرارداد"><select value={form.supportContract.level} onChange={(e) => setForm({ ...form, supportContract: { ...form.supportContract, level: e.target.value } })}><option value="basic">پایه</option><option value="standard">استاندارد</option><option value="premium">ویژه</option></select></Field>
          <Field label="وضعیت قرارداد"><select value={form.supportContract.status} onChange={(e) => setForm({ ...form, supportContract: { ...form.supportContract, status: e.target.value } })}><option value="active">فعال</option><option value="expiring">رو به پایان</option><option value="expired">منقضی</option><option value="draft">پیش‌نویس</option></select></Field>
          <Field label="شروع قرارداد (شمسی)"><input dir="ltr" inputMode="numeric" value={form.supportContract.startAt} onChange={(e) => setForm({ ...form, supportContract: { ...form.supportContract, startAt: formatJalaliTyping(e.target.value) } })} placeholder="1405/07/24" /></Field>
          <Field label="پایان قرارداد (شمسی)"><input dir="ltr" inputMode="numeric" value={form.supportContract.endAt} onChange={(e) => setForm({ ...form, supportContract: { ...form.supportContract, endAt: formatJalaliTyping(e.target.value) } })} placeholder="1406/07/24" /></Field>
        </div>
        <section className="mt-6 rounded-3xl border border-violet-100 bg-violet-50/60 p-4">
          <div><h3 className="font-black text-slate-900">امکانات فعال قرارداد</h3><p className="mt-1 text-[11px] text-slate-500">مدیر سازمان فقط به گزینه‌هایی دسترسی دارد که در قرارداد فعال شده‌اند.</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["onsiteService", "خدمات حضوری", "ثبت و پیگیری اعزام کارشناس"], ["secureCall", "تماس امن", "تماس سازمانی با پشتیبانی"], ["remoteSupport", "پشتیبانی از راه دور", "دسترسی ریموت به تجهیزات"], ["prioritySupport", "پشتیبانی ویژه", "اولویت بالاتر در رسیدگی"]].map(([key, label, description]) => <label key={key} className={`cursor-pointer rounded-2xl border p-4 transition ${form.supportContract.features[key] ? "border-violet-300 bg-white shadow-sm" : "border-violet-100 bg-white/50"}`}><span className="flex items-center justify-between gap-3"><span><b className="block text-xs text-slate-800">{label}</b><small className="mt-1 block text-[10px] leading-5 text-slate-500">{description}</small></span><input type="checkbox" checked={form.supportContract.features[key]} onChange={(event) => setForm({ ...form, supportContract: { ...form.supportContract, features: { ...form.supportContract.features, [key]: event.target.checked } } })} className="size-5 accent-violet-600" /></span></label>)}
          </div>
        </section>
        <section className="mt-6 overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 via-white to-blue-50/60">
          <div className="flex flex-col gap-3 border-b border-cyan-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-200"><HardDrive className="size-5" /></span><div><h3 className="font-black text-slate-900">تجهیزات سازمان</h3><p className="mt-1 text-[11px] text-slate-500">هر تجهیز را در یک کارت جداگانه ثبت کنید.</p></div></div>
            <button type="button" onClick={addEquipment} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-xs font-black text-white"><Plus className="size-4" /> افزودن تجهیز</button>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {form.equipment.map((item, index) => <article key={index} className="relative rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black text-cyan-700">تجهیز {(index + 1).toLocaleString("fa-IR")}</span><button type="button" onClick={() => removeEquipment(index)} className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600" aria-label="حذف تجهیز"><Trash2 className="size-4" /></button></div>
              <div className="grid gap-3">
                <Field label="نام تجهیز"><input value={item.name} onChange={(e) => updateEquipment(index, "name", e.target.value)} placeholder="مثلاً سرور حسابداری" /></Field>
                <div className="grid gap-3 sm:grid-cols-2"><Field label="نوع تجهیز"><input value={item.type} onChange={(e) => updateEquipment(index, "type", e.target.value)} placeholder="Server" /></Field><Field label="شماره سریال"><input dir="ltr" value={item.serial} onChange={(e) => updateEquipment(index, "serial", e.target.value)} placeholder="SRV-001" /></Field></div>
                <Field label="وضعیت"><select value={item.status} onChange={(e) => updateEquipment(index, "status", e.target.value)}><option value="active">فعال</option><option value="repair">در تعمیر</option><option value="retired">از رده خارج</option></select></Field>
              </div>
            </article>)}
          </div>
        </section>
        <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row"><button onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 font-bold">انصراف</button><button disabled={saving} onClick={submit} className="flex-1 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg disabled:opacity-60">{saving ? "در حال ذخیره…" : editingId ? "ذخیره تغییرات" : "ساخت پرتال سازمان"}</button></div>
      </div></div>}
    </section>
  );
}

function Stat({ icon: Icon, value, label }) { return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center"><Icon className="mx-auto size-5 text-blue-600" /><b className="mt-2 block text-lg text-slate-950">{value.toLocaleString("fa-IR")}</b><span className="text-[10px] text-slate-500">{label}</span></div>; }
function Field({ label, children }) { return <label className="block text-xs font-black text-slate-700">{label}<span className="mt-2 block [&>input]:h-12 [&>input]:w-full [&>input]:rounded-2xl [&>input]:border [&>input]:border-slate-200 [&>input]:px-4 [&>input]:outline-none [&>select]:h-12 [&>select]:w-full [&>select]:rounded-2xl [&>select]:border [&>select]:border-slate-200 [&>select]:bg-white [&>select]:px-3 [&>textarea]:w-full [&>textarea]:rounded-2xl [&>textarea]:border [&>textarea]:border-slate-200 [&>textarea]:p-3">{children}</span></label>; }
