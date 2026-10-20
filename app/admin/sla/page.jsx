"use client";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

const levels = [{ key: "low", name: "کم" }, { key: "medium", name: "متوسط" }, { key: "high", name: "بالا" }];
const blank = () => ({ enabled: false, mode: "24x7", targets: Object.fromEntries(levels.map(({ key }) => [key, { responseMinutes: "", resolveMinutes: "" }])) });

export default function AdminSlaPage() {
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState("");
  const [policy, setPolicy] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get("/api/organizations")
      .then(({ data }) => {
        const items = data.organizations || [];
        setOrganizations(items);
        setOrganizationId(items[0]?._id || "");
      })
      .catch(() => toast.error("دریافت سازمان‌ها ناموفق بود"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`/api/admin/organizations/${organizationId}/sla`)
      .then(({ data }) => {
        if (cancelled) return;
        const stored = data.policy || {};
        setPolicy({
          enabled: Boolean(stored.enabled),
          mode: "24x7",
          targets: Object.fromEntries(levels.map(({ key }) => [key, {
            responseMinutes: stored.targets?.[key]?.responseMinutes ?? "",
            resolveMinutes: stored.targets?.[key]?.resolveMinutes ?? "",
          }])),
        });
      })
      .catch(() => { if (!cancelled) toast.error("دریافت سیاست SLA ناموفق بود"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [organizationId]);

  const activeOrganization = organizations.find((org) => org._id === organizationId);
  const contract = activeOrganization?.supportContract;
  const now = Date.now();
  const contractValid = contract?.status === "active"
    && (!contract.startAt || new Date(contract.startAt).getTime() <= now)
    && (!contract.endAt || new Date(contract.endAt).getTime() >= now);

  function updateTarget(priority, field, value) {
    setPolicy((current) => ({
      ...current, targets: {
        ...current.targets,
        [priority]: { ...current.targets[priority], [field]: value },
      },
    }));
  }
  async function save(event) {
    event.preventDefault();
    if (!organizationId) return;
    const body = { ...policy, targets: Object.fromEntries(levels.map(({ key }) => [key, {
      responseMinutes: Number(policy.targets[key].responseMinutes),
      resolveMinutes: Number(policy.targets[key].resolveMinutes),
    }])) };
    if (body.enabled && !levels.every(({ key }) =>
      Number.isInteger(body.targets[key].responseMinutes)
      && body.targets[key].responseMinutes > 0
      && body.targets[key].resolveMinutes >= body.targets[key].responseMinutes
      && body.targets[key].resolveMinutes <= 43200)) {
      toast.error("زمان‌های پاسخ و رفع باید معتبر باشند؛ سقف هر مهلت ۳۰ روز است.");
      return;
    }
    setSaving(true);
    try {
      const payload = !body.enabled && levels.some(({key}) => !policy.targets[key].responseMinutes || !policy.targets[key].resolveMinutes)
        ? { enabled: false } : body;
      const { data } = await axios.put(`/api/admin/organizations/${organizationId}/sla`, payload);
      setPolicy((current) => ({ ...current, enabled: Boolean(data.policy?.enabled) }));
      toast.success("سیاست SLA سازمان ذخیره شد");
    } catch (error) {
      toast.error(error.response?.data?.message || "ذخیره SLA ناموفق بود");
    } finally { setSaving(false); }
  }

  return (
    <section className="app-page space-y-5" dir="rtl">
      <Toaster />
      <header className="glass-panel p-6">
        <h1 className="page-heading">تنظیم SLA قراردادها</h1>
        <p className="mt-2 text-sm text-slate-600">مهلت اولین پاسخ و رفع مشکل برای هر سازمان، مطابق تعهد واقعی قرارداد؛ بدون تغییر مهلت‌های دستی تیکت‌های قبلی.</p>
        <Link className="mt-3 inline-block text-sm font-bold text-blue-700" href="/admin/contracts">بازگشت به قراردادها</Link>
      </header>
      <form className="glass-panel space-y-5 p-6" onSubmit={save}>
        <label className="block text-sm font-bold" htmlFor="sla-org">سازمان</label>
        <select id="sla-org" className="w-full rounded-xl border bg-white p-3" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
          {organizations.map((org) => <option key={org._id} value={org._id}>{org.name} ({org.code})</option>)}
        </select>
        {!contractValid && activeOrganization && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">قرارداد این سازمان در حال حاضر فعال و معتبر نیست. حتی با روشن بودن سیاست، SLA برای تیکت جدید اعمال نمی‌شود.</p>}
        <label className="flex items-center gap-3 rounded-xl border p-4">
          <input type="checkbox" checked={policy.enabled} onChange={(event) => setPolicy((current) => ({ ...current, enabled: event.target.checked }))} />
          <span className="font-bold">فعال‌سازی SLA برای تیکت‌های جدید این سازمان</span>
        </label>
        <p className="text-xs text-slate-500">روش محاسبه فعلی: ۲۴ ساعت شبانه‌روز، تمام روزهای هفته. مقادیر از پیش تعیین نشده‌اند.</p>
        <div className="grid gap-3 lg:grid-cols-3">
          {levels.map(({key,name}) => <div key={key} className="rounded-2xl border p-4">
            <h2 className="mb-4 font-black">اولویت {name}</h2>
            {[["responseMinutes","اولین پاسخ (دقیقه)"],["resolveMinutes","رفع مشکل (دقیقه)"]].map(([field,label]) => <label className="mb-4 block text-sm" key={field}>
              <span className="mb-2 block text-slate-600">{label}</span>
              <input type="number" min="1" max="43200" step="1" required={policy.enabled} value={policy.targets[key][field]} onChange={(event) => updateTarget(key,field,event.target.value)} className="w-full rounded-xl border p-3" placeholder="طبق قرارداد" />
            </label>)}
          </div>)}
        </div>
        <div className="flex justify-end"><button type="submit" disabled={loading || saving || !organizationId} className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? "در حال ذخیره..." : "ذخیره سیاست SLA"}</button></div>
      </form>
    </section>
  );
}
