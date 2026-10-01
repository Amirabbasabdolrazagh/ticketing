"use client";

import axios from "axios";
import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

export default function AccountLogoutCard() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  async function logoutHandler() {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      const { data } = await axios.post("/api/auth/logout");
      if (data.success) {
        router.replace("/auth");
        router.refresh();
        return;
      }
      toast.error(data.message || "خروج از حساب انجام نشد");
    } catch (error) {
      toast.error(error.response?.data?.message || "خروج از حساب انجام نشد");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="glass-panel col-span-1 overflow-hidden p-4 sm:p-5 lg:col-span-12">
      <div className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-gradient-to-l from-red-50/90 via-white/80 to-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/80 text-red-600 shadow-sm">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-black text-slate-900">خروج امن از حساب</h2>
            <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
              با خروج از حساب، نشست فعلی شما در این دستگاه پایان می‌یابد.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={logoutHandler}
          disabled={isLoggingOut}
          className="h-12 w-full rounded-xl bg-red-600 px-6 font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-700 sm:w-auto"
        >
          <LogOut className="size-5" />
          {isLoggingOut ? "در حال خروج..." : "خروج از حساب"}
        </Button>
      </div>
    </div>
  );
}
