"use client";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  BellRing,
  FolderKanban,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Settings2,
  Sparkles,
  TicketCheck,
  UsersRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getSeenNotificationIds } from "@/utils/notificationSeen";

const roleLabels = {
  admin: "مدیر سیستم",
  agent: "پشتیبان",
  passive_agent: "پشتیبان پسیو",
  active_agent: "پشتیبان اکتیو",
  customer: "مشتری",
};

export default function SideBar() {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await axios.get("/api/auth/me");
        setUser(data.user);
      } catch {
        setUser(null);
      }
    }
    getUser();
  }, []);

  useEffect(() => {
    if (!user?.role) return;

    const heartbeat = () =>
      axios.post("/api/live-chat/presence").catch(() => {});
    heartbeat();
    const presenceInterval = window.setInterval(heartbeat, 30000);
    return () => window.clearInterval(presenceInterval);
  }, [user?.role]);

  useEffect(() => {
    const handleLiveChatState = (event) =>
      setIsLiveChatOpen(Boolean(event.detail?.isOpen));
    window.addEventListener("live-chat-state", handleLiveChatState);
    return () =>
      window.removeEventListener("live-chat-state", handleLiveChatState);
  }, []);

  useEffect(() => {
    if (!user?.role) return;

    async function getUnreadCount() {
      try {
        const { data } = await axios.get("/api/notifications");
        if (data.success) {
          const seen = getSeenNotificationIds(user.role);
          setUnreadCount(
            data.notifications.filter((item) => !seen.has(item._id)).length,
          );
        }
      } catch {
        setUnreadCount(0);
      }
    }

    getUnreadCount();
    const interval = window.setInterval(getUnreadCount, 30000);
    const handleRead = () => setUnreadCount(0);
    window.addEventListener("notifications-read", handleRead);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications-read", handleRead);
    };
  }, [user?.role]);

  const userRole = user?.role;
  const menuItems = [
    ...(["agent", "passive_agent", "active_agent"].includes(userRole) ? [{
      label: "داشبورد",
      description: "نمای کلی فعالیت‌ها",
      href: userRole === "agent" ? `/${userRole}/dashboard` : `/${userRole}`,
      icon: LayoutDashboard,
      active: userRole === "agent" ? pathname === `/${userRole}/dashboard` : pathname === `/${userRole}`,
    }] : []),
    ...(userRole === "agent" || userRole === "customer" ? [{
      label: "تیکت‌ها",
      description: "پیگیری درخواست‌ها",
      href: `/${userRole}/tickets`,
      icon: TicketCheck,
      active: pathname.startsWith(`/${userRole}/tickets`),
    }] : []),
    ...(userRole === "admin"
      ? [
          {
            label: "خدمات",
            description: "دسته‌بندی و تخصیص خدمات",
            href: "/admin/projects",
            icon: FolderKanban,
            active: pathname.startsWith("/admin/projects"),
          },
          {
            label: "کاربران",
            description: "اعضا و دسترسی‌ها",
            href: "/admin/users",
            icon: UsersRound,
            active: pathname.startsWith("/admin/users"),
          },
          {
            label: "مانیتورینگ",
            description: "پایش لحظه‌ای تیم پشتیبانی",
            href: "/admin/monitoring",
            icon: Activity,
            active: pathname.startsWith("/admin/monitoring"),
          },
          {
            label: "بازاریابی و فروش",
            description: "سرنخ‌ها و پیگیری مشتریان",
            href: "/admin/leads",
            icon: UserRoundPlus,
            active: pathname.startsWith("/admin/leads"),
          },
        ]
      : []),
    ...(["admin", "agent", "customer"].includes(userRole)
      ? [
          {
            label: "پیام‌ها",
            description: "پیام‌های جدید و هشدارها",
            href: `/${userRole}/notifications`,
            icon: BellRing,
            active: pathname.startsWith(`/${userRole}/notifications`),
            badge: unreadCount,
          },
        ]
      : []),
    {
      label: "تنظیمات",
      description: "حساب و ترجیحات",
      href: `/${userRole}/setting`,
      icon: Settings2,
      active: pathname.startsWith(`/${userRole}/setting`),
    },
  ];
  const bottomMenuItems =
    userRole === "admin"
      ? menuItems.filter((item) =>
          [
            "/admin/dashboard",
            "/admin/tickets",
            "/admin/monitoring",
            "/admin/notifications",
          ].includes(item.href),
        )
      : userRole === "agent"
        ? menuItems.filter((item) =>
            [
              "/agent/dashboard",
              "/agent/tickets",
              "/agent/notifications",
            ].includes(item.href),
          )
        : userRole === "customer"
          ? menuItems.filter((item) =>
              [
                "/customer/dashboard",
                "/customer/tickets",
                "/customer/notifications",
                "/customer/setting",
              ].includes(item.href),
            )
          : [];

  const moreMenuItems =
    userRole === "admin"
      ? menuItems.filter((item) =>
          [
            "/admin/projects",
            "/admin/users",
            "/admin/leads",
            "/admin/setting",
          ].includes(item.href),
        )
      : userRole === "agent"
        ? menuItems.filter((item) => ["/agent/setting"].includes(item.href))
        : [];

  const isMoreMenuActive =
    isMoreMenuOpen ||
    moreMenuItems.some((item) => item.active) ||
    isLiveChatOpen;

  function toggleLiveChat() {
    window.dispatchEvent(new Event("live-chat-toggle"));
  }

  return (
    <>
      <Sidebar side="right" variant="floating" className="liquid-sidebar">
        <div className="pointer-events-none absolute -right-20 top-24 size-56 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-32 size-52 rounded-full bg-violet-400/25 blur-3xl" />
        <svg
          className="pointer-events-none absolute inset-x-0 top-0 h-72 w-full opacity-40"
          viewBox="0 0 360 280"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M-30 42C62-15 113 91 205 39C290-9 353 22 398 72V-20H-30V42Z"
            fill="url(#menu-wave)"
          />
          <path
            d="M-22 92C62 40 139 134 221 82C287 40 350 69 389 109"
            stroke="white"
            strokeOpacity=".5"
            strokeWidth="2"
          />
          <defs>
            <linearGradient
              id="menu-wave"
              x1="0"
              y1="0"
              x2="340"
              y2="170"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#38BDF8" stopOpacity=".45" />
              <stop offset="1" stopColor="#8B5CF6" stopOpacity=".35" />
            </linearGradient>
          </defs>
        </svg>

        <SidebarHeader className="relative z-10 gap-4 px-5 pb-4 pt-6">
          <div className="flex min-h-20 items-center justify-center rounded-2xl border border-white/70 bg-white/55 px-4 shadow-[0_12px_40px_rgba(30,64,175,0.12)] backdrop-blur-xl">
            <Image
              src="/images/logo.png"
              width={250}
              height={58}
              className="h-auto max-h-14 w-auto object-contain"
              alt="لوگو"
              priority
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/45 p-3 shadow-sm backdrop-blur-xl">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/25">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">
                {user?.name || "در حال بارگذاری..."}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {roleLabels[userRole] || "حساب کاربری"}
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="relative z-10 px-3">
          <SidebarGroup className="px-2 py-3">
            <SidebarGroupLabel className="mb-2 h-8 px-3 text-[11px] font-bold tracking-[0.16em] text-slate-500">
              منوی اصلی
            </SidebarGroupLabel>
            <SidebarMenu className="gap-2.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} prefetch />}
                      isActive={item.active}
                      tooltip={item.label}
                      className="group h-[4.35rem] gap-3 rounded-2xl border border-transparent px-3.5 text-right transition-all duration-300 hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/60 hover:shadow-[0_12px_30px_rgba(30,64,175,0.12)] data-active:border-white/80 data-active:bg-gradient-to-l data-active:from-blue-600 data-active:to-indigo-500 data-active:shadow-[0_14px_32px_rgba(37,99,235,0.32)]"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/75 text-blue-600 shadow-sm transition-transform duration-300 group-hover/menu-button:scale-105 group-data-[active=true]/menu-button:bg-white/20 group-data-[active=true]/menu-button:text-white">
                        <Icon className="size-[1.4rem]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold">
                          {item.label}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-slate-500 group-data-[active=true]/menu-button:text-blue-100">
                          {item.description}
                        </span>
                      </span>
                      {item.badge > 0 && (
                        <span className="flex min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                          {item.badge > 99
                            ? "+۹۹"
                            : item.badge.toLocaleString("fa-IR")}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {isMoreMenuOpen && (
        <>
          <button
            type="button"
            aria-label="بستن منوی بیشتر"
            className="fixed inset-0 z-[80] bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          <div
            className="fixed inset-x-3 bottom-[6.8rem] z-[90] mx-auto max-w-md lg:hidden"
            dir="rtl"
          >
            <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-slate-100/80 px-5 py-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    دسترسی‌های بیشتر
                  </h3>

                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    مدیریت و تنظیمات سیستم
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition active:scale-95"
                  aria-label="بستن"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      onClick={() => setIsMoreMenuOpen(false)}
                      className={`group flex min-h-[5.5rem] items-center gap-3 rounded-2xl border p-3.5 transition active:scale-[0.98] ${
                        item.active
                          ? "border-blue-200 bg-gradient-to-l from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                          : "border-slate-100 bg-white/80 text-slate-700 shadow-sm"
                      }`}
                    >
                      <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                          item.active
                            ? "bg-white/20 text-white"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        <Icon className="size-5" strokeWidth={1.9} />
                      </span>

                      <span className="min-w-0 text-right">
                        <span className="block text-xs font-black">
                          {item.label}
                        </span>

                        <span
                          className={`mt-1 block truncate text-[9px] ${
                            item.active ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}

                {["admin", "agent"].includes(userRole) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      toggleLiveChat();
                    }}
                    className={`group flex min-h-[5.5rem] items-center gap-3 rounded-2xl border p-3.5 text-right transition active:scale-[0.98] ${
                      isLiveChatOpen
                        ? "border-blue-200 bg-gradient-to-l from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                        : "border-slate-100 bg-white/80 text-slate-700 shadow-sm"
                    }`}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                        isLiveChatOpen
                          ? "bg-white/20 text-white"
                          : "bg-violet-50 text-violet-600"
                      }`}
                    >
                      <MessageCircle className="size-5" strokeWidth={1.9} />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-xs font-black">چت داخلی</span>

                      <span
                        className={`mt-1 block text-[9px] ${
                          isLiveChatOpen ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        ارتباط سریع با همکاران
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <nav
        className="liquid-bottom-nav lg:hidden"
        aria-label="منوی اصلی موبایل و تبلت"
      >
        <div className="liquid-bottom-nav__shine" aria-hidden="true" />

        <div
          className="liquid-bottom-nav__items"
          style={{
            "--bottom-nav-count":
              bottomMenuItems.length +
              (["admin", "agent"].includes(userRole) ? 1 : 0),
          }}
        >
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={item.active ? "page" : undefined}
                className={`liquid-bottom-nav__item ${
                  item.active ? "is-active" : ""
                }`}
              >
                <span className="liquid-bottom-nav__bubble">
                  <Icon
                    className="liquid-bottom-nav__icon"
                    strokeWidth={item.active ? 2.25 : 1.9}
                  />

                  {item.badge > 0 && (
                    <span className="liquid-bottom-nav__badge">
                      {item.badge > 99
                        ? "+۹۹"
                        : item.badge.toLocaleString("fa-IR")}
                    </span>
                  )}
                </span>

                <span className="liquid-bottom-nav__label">{item.label}</span>
              </Link>
            );
          })}

          {["admin", "agent"].includes(userRole) && (
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((current) => !current)}
              aria-expanded={isMoreMenuOpen}
              className={`liquid-bottom-nav__item ${
                isMoreMenuActive ? "is-active" : ""
              }`}
            >
              <span className="liquid-bottom-nav__bubble">
                <Menu
                  className="liquid-bottom-nav__icon"
                  strokeWidth={isMoreMenuActive ? 2.25 : 1.9}
                />
              </span>

              <span className="liquid-bottom-nav__label">بیشتر</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
