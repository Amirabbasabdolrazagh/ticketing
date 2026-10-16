"use client";

import AccountLogoutCard from "@/components/features/users/AccountLogoutCard";
import TelegramConnectButton from "@/components/features/users/TelegramConnectButton";
import axios from "axios";
import { Building2, KeyRound, Mail, Save, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

const passwordHint = "حداقل ۸ کاراکتر شامل حرف بزرگ، حرف کوچک، عدد و نماد";

export default function OrganizationManagerSettingPage() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState("");

  useEffect(() => {
    axios.get("/api/auth/me").then(({ data }) => {
      if (!data.success) return;
      setAccount(data.user);
      setProfile({ name: data.user.name || "", phone: data.user.phone || "" });
      setEmailForm((current) => ({ ...current, email: data.user.email || "" }));
    }).catch(() => toast.error("دریافت اطلاعات حساب ناموفق بود"));
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    if (!account?.id) return;
    try {
      setSaving("profile");
      const { data } = await axios.patch(`/api/users/${account.id}`, profile);
      if (data.success) {
        toast.success("اطلاعات حساب ذخیره شد");
        setAccount((current) => ({ ...current, ...profile }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "ذخیره اطلاعات ناموفق بود");
    } finally {
      setSaving("");
    }
  }

  async function saveEmail(event) {
    event.preventDefault();
    try {
      setSaving("email");
      const { data } = await axios.post("/api/auth/register-email", emailForm);
      if (data.success) {
        toast.success(account?.email ? "ایمیل تغییر کرد" : "ایمیل به حساب اضافه شد");
        setAccount((current) => ({ ...current, email: emailForm.email.trim().toLowerCase() }));
        setEmailForm((current) => ({ ...current, password: "" }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "ثبت ایمیل ناموفق بود");
    } finally {
      setSaving("");
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    try {
      setSaving("password");
      const { data } = await axios.patch("/api/auth/change-password", passwordForm);
      if (data.success) {
        toast.success("رمز عبور تغییر کرد");
        setPasswordForm({ currentPassword: "", newPassword: "" });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "تغییر رمز عبور ناموفق بود");
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="app-page space-y-5" dir="rtl">
      <Toaster />
      <header className="glass-panel overflow-hidden p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg"><Building2 /></span>
          <div><h1 className="page-heading">تنظیمات مدیر سازمان</h1><p className="mt-1 text-sm text-slate-500">اطلاعات ورود و راه‌های ارتباطی حساب خود را مدیریت کنید.</p></div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard icon={Smartphone} title="اطلاعات حساب" description="نام و شماره موبایل ورود به پرتال">
          <form onSubmit={saveProfile} className="mt-5 space-y-4">
            <Input label="نام و نام خانوادگی" value={profile.name} onChange={(value) => setProfile({ ...profile, name: value })} />
            <Input label="شماره موبایل" dir="ltr" inputMode="numeric" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value.replace(/\D/g, "").slice(0, 11) })} />
            <SubmitButton loading={saving === "profile"} label="ذخیره اطلاعات" />
          </form>
        </SettingsCard>

        <SettingsCard icon={Mail} title={account?.email ? "تغییر ایمیل" : "افزودن ایمیل اختیاری"} description="ورود با شماره موبایل همیشه فعال می‌ماند">
          <form onSubmit={saveEmail} className="mt-5 space-y-4">
            <Input label="ایمیل" dir="ltr" type="email" value={emailForm.email} onChange={(value) => setEmailForm({ ...emailForm, email: value })} placeholder="manager@example.com" />
            <Input label="رمز عبور فعلی برای تأیید" dir="ltr" type="password" value={emailForm.password} onChange={(value) => setEmailForm({ ...emailForm, password: value })} />
            <SubmitButton loading={saving === "email"} label={account?.email ? "تغییر ایمیل" : "افزودن ایمیل"} />
          </form>
        </SettingsCard>

        <SettingsCard icon={KeyRound} title="امنیت و رمز عبور" description={passwordHint}>
          <form onSubmit={changePassword} className="mt-5 space-y-4">
            <Input label="رمز عبور فعلی" dir="ltr" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })} />
            <Input label="رمز عبور جدید" dir="ltr" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })} />
            <SubmitButton loading={saving === "password"} label="تغییر رمز عبور" />
          </form>
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="اعلان در پیام‌رسان (اختیاری)" description="برای دریافت سریع اعلان‌ها می‌توانید بله یا تلگرام را متصل کنید؛ عضویت اجباری نیست.">
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <TelegramConnectButton linked={account?.telegramLinked} baleLinked={account?.baleLinked} />
          </div>
        </SettingsCard>
      </div>

      <AccountLogoutCard />
    </section>
  );
}

function SettingsCard({ icon: Icon, title, description, children }) {
  return <article className="glass-panel h-full p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon className="size-5" /></span><div><h2 className="font-black text-slate-950">{title}</h2><p className="mt-1 text-xs leading-6 text-slate-500">{description}</p></div></div>{children}</article>;
}

function Input({ label, value, onChange, ...props }) {
  return <label className="block text-xs font-black text-slate-700">{label}<input required className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

function SubmitButton({ loading, label }) {
  return <button disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60"><Save className="size-4" />{loading ? "در حال ذخیره…" : label}</button>;
}
