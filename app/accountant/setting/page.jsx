"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, LogOut } from "lucide-react";

export default function AccountantSettingsPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      if (!data.success) throw new Error("دریافت اطلاعات انجام نشد");
      setUser(data.user);
      setName(data.user.name || "");
    }).catch((error) => setMessage(error.message));
  }, []);
  async function updateName(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/users/" + user.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "ویرایش ناموفق بود");
      setMessage("نام با موفقیت ویرایش شد");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  async function changePassword(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تغییر رمز ناموفق بود");
      setCurrentPassword(""); setNewPassword("");
      setMessage("رمز عبور تغییر کرد");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth";
  }
  return <section dir="rtl" className="mx-auto w-full max-w-3xl space-y-5 text-right">
    <div className="rounded-3xl border border-white bg-white/90 p-6 shadow-md sm:p-8">
      <div className="flex items-center gap-3 text-blue-700"><ShieldCheck size={25} /><h1 className="text-2xl font-black text-slate-900">حساب کاربری حسابداری</h1></div>
      <p className="mt-3 text-sm text-slate-500">سطح دسترسی شما فقط به بایگانی اسناد مالی محدود است.</p>
      {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold">{message}</p>}
      <p className="mt-5 text-sm text-slate-500">شماره تماس: <span dir="ltr">{user?.phone || "..."}</span></p>
    </div>
    <form onSubmit={updateName} className="space-y-4 rounded-3xl border border-white bg-white/90 p-6 shadow-md sm:p-8">
      <h2 className="text-lg font-bold">اطلاعات فردی</h2>
      <label className="block text-sm font-semibold">نام و نام خانوادگی
        <input value={name} required onChange={(e) => setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
      <button disabled={!user || busy} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">ذخیره مشخصات</button>
    </form>
    <form onSubmit={changePassword} className="space-y-4 rounded-3xl border border-white bg-white/90 p-6 shadow-md sm:p-8">
      <h2 className="text-lg font-bold">امنیت حساب</h2>
      <label className="block text-sm font-semibold">رمز عبور فعلی
        <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
      <label className="block text-sm font-semibold">رمز عبور جدید
        <input type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
      <p className="text-xs text-slate-500">حداقل ۸ کاراکتر شامل حرف بزرگ، کوچک، عدد و نماد</p>
      <button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">تغییر رمز عبور</button>
    </form>
    <button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700"><LogOut size={18} /> خروج از حساب</button>
  </section>;
}
