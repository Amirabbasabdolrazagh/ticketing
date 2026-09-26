"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FaCircle } from "react-icons/fa6";
import { FiPhone } from "react-icons/fi";
import { GrDocumentText } from "react-icons/gr";
import { HiMiniUserCircle } from "react-icons/hi2";
import { LuCalendar, LuClock4 } from "react-icons/lu";
import { RiShieldCheckLine } from "react-icons/ri";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import ProfileCompletionNotice from "@/components/features/users/ProfileCompletionNotice";
import { faLabel, roleLabels } from "@/utils/fa-labels";
import TelegramConnectButton from "@/components/features/users/TelegramConnectButton";

export default function AdminSetting() {
  const router = useRouter();
  const [user, setUser] = useState({});
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [isChange, setIsChange] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const changePassHandler = async () => {
    try {
      if (currentPass.trim() == "" || newPass.trim() == "") {
        toast.error("لطفا پسورد قدیمی و پسورد جدید را وارد کنید");
      }
      const res = await axios.patch("/api/auth/change-password", {
        currentPassword: currentPass,
        newPassword: newPass,
      });
      const data = res.data;
      if (data.success) {
        toast.success(data.message);
        setNewPass("");
        setCurrentPass("");
      } else {
        toast.error(data.message);
        setNewPass("");
        setCurrentPass("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "خطایی رخ داد");
    }
  };
  useEffect(() => {
    async function getUser() {
      try {
        const res = await axios.get("/api/auth/me");
        const data = res.data;

        if (data.success) {
          setUser(data.user);
          setPhone(data.user.phone || "");
          setName(data.user.name || "");
          setRole(data.user.role || "");
          setUserId(data.user.id || "");
          setEmail(data.user.email || "");
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to load user information",
        );
      }
    }

    getUser();
  }, [isChange]);

  const saveHandler = async () => {
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (normalizedName.split(" ").length < 2) {
      toast.error("وارد کردن نام و نام خانوادگی الزامی است");
      return;
    }
    const payload = {};

    if (name !== user.name) {
      payload.name = name;
    }

    if (phone !== user.phone) {
      payload.phone = phone;
    }

    if (role !== user.role) {
      payload.role = role;
    }

    if (Object.keys(payload).length === 0) {
      toast("تغییری برای ذخیره وجود ندارد");
      return;
    }

    try {
      const res = await axios.patch(`/api/users/${userId}`, payload);
      const data = res.data;

      if (data.success) {
        toast.success(data.message);
        setIsChange((prev) => !prev);
        if (!user.profileComplete && data.profileComplete) {
          router.replace(`/${user.role}/dashboard`);
        }
      }
    } catch (error) {
      console.log(error.message);

      toast.error(error.response?.data?.message || "خطایی رخ داد");
    }
  };

  function persianDate(createdAt) {
    if (!createdAt) return "-";

    const date = new Date(createdAt);

    if (isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
      day: "numeric",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  const ConfirmPasswordHadler = async () => {
    let payload = {
      email,
      password,
    };
    try {
      const res = await axios.post("/api/auth/register-email", payload);
      const data = res.data;
      if (data.success) {
        setOpenSheet(false);
        toast.success(data.message);
        setIsChange((prev) => !prev);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };
  return (
    <>
      <Toaster />
      <ProfileCompletionNotice required={user.profileComplete === false} />
      {/* Header */}
      <div className="glass-panel relative mx-auto mt-5 w-full max-w-[96rem] overflow-hidden p-5 text-end sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-20 size-52 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <span className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">مرکز حساب کاربری</span>
          <h1 className="page-heading">تنظیمات</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">اطلاعات شخصی، امنیت حساب و کانال‌های اطلاع‌رسانی خود را مدیریت کنید.</p>
        </div>
      </div>
      <section
        className="mx-auto grid w-full max-w-[96rem] grid-cols-1 gap-5 py-5 lg:grid-cols-12"
        dir="rtl"
      >
        {/* Left Side Preview */}
        <div
          className="
            col-span-1
            glass-panel
            overflow-hidden
            px-4
            py-6
            sm:px-5
            sm:py-8
            lg:col-span-4
            lg:row-span-3
          "
        >
          {/* Top */}
          <div className="flex flex-col items-center justify-center">
            <Avatar className="size-24 ring-4 ring-white shadow-xl sm:size-28 lg:size-32">
              <AvatarFallback
                className="
                bg-gradient-to-br from-blue-500 to-violet-600
                  text-3xl
                  font-bold
                  text-white
                  sm:text-4xl
                "
              >
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <h1
              className="
                mt-4
                text-center
                text-xl
                font-bold
                sm:text-2xl
                lg:text-3xl
              "
            >
              {user.name}
            </h1>

            <Badge
              variant="admin"
              className="mt-3 px-5 py-2 text-sm capitalize"
            >
              {faLabel(roleLabels, user.role)}
            </Badge>

            <p className="my-4 flex items-center gap-2 text-green-500">
              <FaCircle size={10} />
              حساب فعال
            </p>
          </div>

          <Separator />

          {/* Bottom */}
          <div className="my-5 flex flex-col gap-5" >
            <div className="flex items-center  gap-3 sm:gap-5">
              <FiPhone className="shrink-0" size={26} />

              <p className="text-sm sm:text-base">
                <span className="text-gray-400">شماره تماس</span>
                <br />
                <bdi dir="ltr" className="mt-1 inline-block font-mono tracking-wide">
                  {formatPhone(user.phone)}
                </bdi>
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <LuCalendar className="shrink-0" size={26} />

              <p className="text-sm sm:text-base">
                <span className="text-gray-400">تاریخ عضویت</span>
                <br />
                <span>{persianDate(user.createdAt)}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <LuClock4 className="shrink-0" size={26} />

              <p className="text-sm sm:text-base">
                <span className="text-gray-400">آخرین ورود</span>
                <br />
                <span>{persianDate(user.lastLoginAt)}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <RiShieldCheckLine className="shrink-0" size={26} />

              <p className="text-sm sm:text-base">
                <span className="text-gray-400">نقش</span>
                <br />
                <span>{faLabel(roleLabels, user.role)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Top Setting */}
        <div
          className="
            col-span-1
            glass-panel
            px-4
            py-6
            sm:px-5
            sm:py-8
            lg:col-span-8
            lg:row-span-2
          "
        >
          <div className="flex items-center gap-3 sm:gap-5">
            <HiMiniUserCircle size={38} className="shrink-0 text-sky-500" />

            <div>
              <h1 className="text-lg font-semibold">اطلاعات پروفایل</h1>

              <h4 className="text-xs text-gray-500 sm:text-sm">
                ویرایش اطلاعات هویتی و راه‌های ارتباطی
              </h4>
            </div>
          </div>

          <Field className="my-5 gap-3">
            <FieldLabel>نام و نام خانوادگی</FieldLabel>

            <Input
              className="w-full"
              onChange={(e) => setName(e.target.value)}
              value={name}
              placeholder="مثلاً علی رضایی"
              required
            />
            <p className="text-xs text-gray-500">وارد کردن حداقل دو بخش الزامی است.</p>

            <FieldLabel>شماره تماس</FieldLabel>

            <Input
              className="w-full text-left font-mono"
              dir="ltr"
              type="tel"
              inputMode="numeric"
              onChange={(e) => setPhone(e.target.value)}
              value={phone}
            />
            <FieldLabel>نقش</FieldLabel>

            <Select
              items={[
                {
                  value: "admin",
                  label: "مدیر",
                },
                {
                  value: "agent",
                  label: "پشتیبان",
                },
                {
                  value: "customer",
                  label: "مشتری",
                },
              ]}
              value={role}
              onValueChange={setRole}
              disabled
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="انتخاب نقش" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectItem value="admin">مدیر</SelectItem>
                  <SelectItem value="agent">پشتیبان</SelectItem>
                  <SelectItem value="customer">مشتری</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex flex-wrap justify-end gap-2 py-5">
            <Button
              variant="outline"
              className="
                w-full rounded-xl border-0 shadow-md shadow-blue-500/15
                bg-blue-500
                text-white
                hover:bg-blue-600
                hover:text-white
                sm:w-auto
              "
              onClick={saveHandler}
            >
              ذخیره تغییرات
            </Button>
            <TelegramConnectButton linked={user.telegramLinked} baleLinked={user.baleLinked} required />
            {!user.email && (
              <Sheet open={openSheet} onOpenChange={setOpenSheet}>
                <SheetTrigger
                  render={<Button variant="outline">افزودن ایمیل</Button>}
                />
                <SheetContent
                  className="data-[side=bottom]:max-h-[50vh] data-[side=top]:max-h-[50vh]"
                  side="left"
                >
                  <SheetHeader className="flex flex-col justify-end items-center">
                    <SheetTitle>ثبت ایمیل و رمز عبور</SheetTitle>
                  </SheetHeader>
                  <div className="px-5 flex flex-col gap-6" dir="ltr">
                    <FieldLabel>ایمیل</FieldLabel>

                    <Input
                      className="w-full"
                      onChange={(e) => setEmail(e.target.value)}
                      value={email}
                      placeholder="example@gamil.com"
                    />
                    <Separator />
                    <FieldLabel>رمز عبور</FieldLabel>

                    <Input
                      className="w-full"
                      onChange={(e) => setPassword(e.target.value)}
                      value={password}
                      placeholder="رمز عبور را وارد کنید"
                    />
                    <span className="text-center text-xs text-gray-500">
                      رمز باید شامل ۸ کاراکتر با حروف بزرگ و کوچک و اعداد و یک
                      نماد باشد
                    </span>
                  </div>

                  <SheetFooter>
                    <Button
                      variant="outline"
                      className={"bg-blue-400 text-white"}
                      type="button"
                      onClick={ConfirmPasswordHadler}
                    >
                      ذخیره
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Right Bottom Setting */}
        <div
          className="
            col-span-1
            glass-panel
            px-4
            py-6
            sm:px-5
            sm:py-8
            lg:col-span-8
            lg:row-span-1
          "
        >
          <div className="flex items-center gap-3 sm:gap-5">
            <GrDocumentText size={38} className="shrink-0 text-cyan-400" />

            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">اطلاعات حساب</h1>

              <h4 className="text-xs text-gray-500 sm:text-sm">
                مشاهده سوابق و فعالیت‌های حساب
              </h4>
            </div>
          </div>

          <div className="my-5 flex flex-col items-center">
            {/* Member Since */}
            <div
              className="
                my-4
                flex
                w-full
                flex-col
                gap-2
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:gap-5
              "
            >
              <div className="flex items-center gap-3 sm:gap-5">
                <LuCalendar className="shrink-0" size={26} />
                <span>تاریخ عضویت</span>
              </div>

              <p className="text-sm sm:text-base">
                {persianDate(user.createdAt)}
              </p>
            </div>

            <Separator />

            {/* Last Login */}
            <div
              className="
                my-4
                flex
                w-full
                flex-col
                gap-2
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:gap-5
              "
            >
              <div className="flex items-center gap-3 sm:gap-5">
                <LuClock4 className="shrink-0" size={26} />
                <span>آخرین ورود</span>
              </div>

              <p className="text-sm sm:text-base">
                {persianDate(user.lastLoginAt)}
              </p>
            </div>
          </div>
        </div>
        {/* security section */}
        <div className="glass-panel col-span-1 px-4 py-6 sm:px-5 sm:py-8 lg:col-span-8">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900">امنیت و رمز عبور</h2>
            <p className="mt-1 text-xs text-slate-500">برای حفظ امنیت حساب، یک رمز قوی و اختصاصی انتخاب کنید.</p>
          </div>
          <Field>
            <FieldLabel>رمز عبور فعلی</FieldLabel>
            <Input
              placeholder="رمز عبور فعلی را وارد کنید"
              onChange={(e) => setCurrentPass(e.target.value)}
              value={currentPass}
              type="password"
            />
            <FieldLabel>رمز عبور جدید</FieldLabel>
            <Input
              type="password"
              placeholder="رمز عبور جدید را وارد کنید"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </Field>
          <Button
            className="my-4 w-full rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20 hover:bg-sky-700"
            onClick={changePassHandler}
          >
            تغییر رمز عبور
          </Button>
        </div>
      </section>
    </>
  );
}

const formatPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 11
    ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    : phone || "-";
};
