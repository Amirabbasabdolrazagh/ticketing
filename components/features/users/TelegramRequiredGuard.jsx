"use client";

import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TelegramRequiredGuard({ role, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [verification, setVerification] = useState({ pathname: "", allowed: false });
  const bypass = role === "admin" || pathname === `/${role}/setting`;

  useEffect(() => {
    if (bypass) return;

    let active = true;
    axios.get("/api/auth/me").then(({ data }) => {
      if (!active) return;
      if (data.user?.messengerLinked) setVerification({ pathname, allowed: true });
      else router.replace(`/${role}/setting`);
    }).catch(() => router.replace("/auth"));
    return () => { active = false; };
  }, [bypass, pathname, role, router]);

  if (!bypass && !(verification.pathname === pathname && verification.allowed)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">در حال بررسی اتصال پیام‌رسان...</div>;
  }
  return children;
}
