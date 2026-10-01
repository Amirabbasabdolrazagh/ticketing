"use client";
import { useActionState, useEffect, useState } from "react";
import { reSendOtpHandler, sendOtpHandler } from "./actions";
import toast, { Toaster } from "react-hot-toast";
import { PulseLoader } from "react-spinners";
import { FaArrowLeft } from "react-icons/fa6";
import OtpInput from "@/components/features/auth/otpInput";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowRight, KeyRound, LockKeyhole, MessageSquareText, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  let initialState = { success: null, message: "" };
  const [phone, setPhone] = useState("");
  const [phoneLoginMethod, setPhoneLoginMethod] = useState("password");
  const [phonePassword, setPhonePassword] = useState("");
  const [phonePasswordLoading, setPhonePasswordLoading] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loadingResend, setLoadingResend] = useState(false);
  const [signwithEmail, setSingWithEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetStep, setResetStep] = useState(null);
  const [resetPhone, setResetPhone] = useState("");
  const [resetCode, setResetCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [state, formAction, isPending] = useActionState(
    sendOtpHandler,
    initialState,
  );
  const router = useRouter();
  const [isSentCode, setIsSentCode] = useState(false);
  const [reSendOtpTime, setReSendotpTime] = useState(90);

  useEffect(() => {
    const method = new URLSearchParams(window.location.search).get("method");
    if (method !== "email") return;
    const timer = window.setTimeout(() => setSingWithEmail(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleReSendOtp = async () => {
    setLoadingResend(true);
    const res = await reSendOtpHandler(phone);
    if (res.success) {
      setLoadingResend(false);
      toast.success(res.message);
      setReSendotpTime(90);
      setCode(["", "", "", "", "", ""]);
    } else {
      setLoadingResend(false);
      toast.error(res.message);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (reSendOtpTime > 0) {
        setReSendotpTime((time) => time - 1);
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reSendOtpTime, isSentCode]);

  useEffect(() => {
    if (!state.message) return;
    const timer = setTimeout(() => {
      if (state.success) {
        toast.success(state.message);
        setIsSentCode(true);
      } else {
        toast.error(state.message);
        setIsSentCode(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [state]);
  const verifyHandler = async () => {
    const verifyCode = code.join("");
    try {
      const res = await axios.post("api/auth/sms/verify", {
        phone,
        code: verifyCode,
      });

      const data = await res.data;

      if (data.success) {
        toast.success(data.message);

        if (!data.user.profileComplete) {
          router.replace(`/${data.user.role}/setting`);
          return;
        }

        if (data.user.role === "admin") {
          // redirect
          router.replace("/admin");
        } else if (data.user.role === "customer") {
          // redirct
          router.replace("/customer");
        } else if (data.user.role === "agent") {
          router.replace("/agent");
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      console.log(error.response?.data);
      console.log(error.response?.status);
      toast.error(error.response?.data.message);
    }
  };
  const verifyEmail = async () => {
    if (!email.trim() || !password) {
      toast.error("Email and password are required");

      return;
    }

    try {
      const res = await axios.post("/api/auth/login", {
        email: email.trim(),
        password,
      });

      const data = res.data;

      if (data.success) {
        toast.success(data.message);
        router.push(
          data.user.profileComplete
            ? `/${data.user.role}/dashboard`
            : `/${data.user.role}/setting`,
        );
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "ورود ناموفق بود");
    }
  };
  const verifyPhonePassword = async (event) => {
    event.preventDefault();
    if (!isValidPhone(phone) || !phonePassword) {
      toast.error("شماره موبایل و رمز عبور را کامل وارد کنید");
      return;
    }
    try {
      setPhonePasswordLoading(true);
      const { data } = await axios.post("/api/auth/login", {
        phone: phone.trim(),
        password: phonePassword,
      });
      toast.success(data.message);
      router.replace(
        data.user.profileComplete
          ? `/${data.user.role}/dashboard`
          : `/${data.user.role}/setting`,
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "ورود ناموفق بود");
    } finally {
      setPhonePasswordLoading(false);
    }
  };
  const requestPasswordReset = async () => {
    try {
      setResetLoading(true);
      const { data } = await axios.post("/api/auth/password-reset/request", {
        phone: resetPhone,
      });
      toast.success(data.message);
      setResetStep("confirm");
    } catch (error) {
      toast.error(error.response?.data?.message || "ارسال کد انجام نشد");
    } finally {
      setResetLoading(false);
    }
  };

  const confirmPasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("تکرار رمز عبور با رمز جدید یکسان نیست");
      return;
    }
    try {
      setResetLoading(true);
      const { data } = await axios.post("/api/auth/password-reset/confirm", {
        phone: resetPhone,
        code: resetCode.join(""),
        newPassword,
      });
      toast.success(data.message);
      setResetStep(null);
      setPhonePassword("");
      setPassword("");
      setResetPhone("");
      setResetCode(["", "", "", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "بازیابی رمز انجام نشد");
    } finally {
      setResetLoading(false);
    }
  };
  const loginMethodSelector = (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-1.5">
      <button
        type="button"
        onClick={() => {
          setPhoneLoginMethod("otp");
          setPhonePassword("");
        }}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition ${phoneLoginMethod === "otp" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-blue-700"}`}
      >
        <MessageSquareText className="size-4" />
        کد یک‌بارمصرف
      </button>
      <button
        type="button"
        onClick={() => setPhoneLoginMethod("password")}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition ${phoneLoginMethod === "password" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-violet-700"}`}
      >
        <LockKeyhole className="size-4" />
        رمز عبور
      </button>
    </div>
  );
  return (
    <>
      <Toaster />
      <section className="fixed inset-0 flex min-h-svh w-full items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.2),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,.16),transparent_38%)] p-4">
        {!isSentCode && !signwithEmail && !resetStep && (
          <div className="glass-panel flex w-full max-w-md flex-col gap-4 p-6 sm:p-8">
            <h1 className="bg-gradient-to-l from-blue-600 to-violet-600 bg-clip-text text-center text-3xl font-black text-transparent">پشتیبانی آی تی رسام</h1>
            <p>ورود | ثبت نام</p>
            <p className="text-sm text-gray-400">
              لطفا شماره موبایل خود را وارد کنید
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                className="h-12 rounded-xl border border-slate-300 bg-white/80 px-3 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                onChange={(e) => setPhone(e.target.value)}
                value={phone}
                inputMode="numeric"
                maxLength={11}
                autoComplete="off"
                placeholder="09xxxxxxxxx"
              />
              {phoneLoginMethod === "otp" ? (
                <>
                  {loginMethodSelector}
                  <form action={formAction}>
                    <input type="hidden" name="phone" value={phone} />
                    <button
                      type="submit"
                      disabled={!isValidPhone(phone) || isPending}
                      className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 px-3 py-3 font-bold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:bg-none disabled:bg-gray-400"
                    >
                      {isPending ? <PulseLoader color="white" /> : "ارسال کد یک‌بارمصرف"}
                    </button>
                  </form>
                </>
              ) : (
                <form onSubmit={verifyPhonePassword} className="flex flex-col gap-3">
                  <div className="relative">
                    <LockKeyhole className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      value={phonePassword}
                      onChange={(event) => setPhonePassword(event.target.value)}
                      placeholder="رمز عبور حساب"
                      autoComplete="current-password"
                      className="h-12 rounded-xl bg-white/80 pr-11"
                    />
                  </div>
                  {loginMethodSelector}
                  <button
                    type="submit"
                    disabled={!isValidPhone(phone) || !phonePassword || phonePasswordLoading}
                    className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-l from-violet-600 to-blue-600 px-3 py-3 font-bold text-white shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed disabled:bg-none disabled:bg-gray-400"
                  >
                    {phonePasswordLoading ? <PulseLoader color="white" /> : "ورود با رمز عبور"}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                    onClick={() => {
                      setResetPhone(phone);
                      setResetStep("request");
                    }}
                  >
                    <KeyRound className="size-4" />
                    رمز عبور را فراموش کرده‌اید؟
                  </Button>
                </form>
              )}
            </div>
            <Link
              href="/auth?method=email"
              onClick={() => {
                setResetStep(null);
                setSingWithEmail(true);
              }}
              className="flex h-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 font-bold text-blue-700 transition hover:bg-blue-100"
            >
              ورود با ایمیل
            </Link>
            <p></p>
          </div>
        )}
        {isSentCode && (
          <div className="glass-panel box-border flex w-full max-w-md flex-col gap-4 p-6 sm:p-8">
            <h1 className="text-2xl text-center">پشتیبانی آی تی رسام</h1>
            <div className="flex flex-row-reverse">
              <FaArrowLeft
                className="border rounded-sm"
                size={20}
                onClick={() => {
                  setIsSentCode(!isSentCode);
                  setPhone("");
                }}
              />
            </div>
            <p className="text-sm text-gray-400">
              کد تایید برای شماره{phone}ارسال شد.
            </p>
            <h1>کد تایید را وارد کنید</h1>
            <div className="flex flex-col gap-3 box-border">
              <OtpInput setCode={setCode} code={code} />
              <button
                disabled={isOtpComplete(code) ? true : false}
                onClick={verifyHandler}
                type="button"
                className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 px-3 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-none disabled:bg-gray-400"
              >
                تایید و ورود
              </button>
              <h3 className="text-xs ">
                ارسال مجدد کد بعد از {getlocalTime(reSendOtpTime)}
              </h3>
              <p
                className="text-sm text-center cursor-pointer"
                onClick={handleReSendOtp}
              >
                {reSendOtpTime > 0 ? (
                  ""
                ) : loadingResend ? (
                  <PulseLoader color="red" />
                ) : (
                  "ارسال مجدد کد"
                )}
              </p>
            </div>
          </div>
        )}
        {signwithEmail && !isSentCode && !resetStep && (
          <div className="glass-panel w-full max-w-md rounded-3xl px-6 py-7 sm:px-8">
            <div>
              <h1 className="text-2xl text-center">پشتیبانی آی تی رسام</h1>
              <p>ورورد با ایمیل</p>
            </div>

            <Field className={"my-3"}>
              <div className="px-5 flex flex-col gap-3">
                <FieldLabel>ایمیل خود را وارد کنید</FieldLabel>

                <Input
                  className="w-full"
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  placeholder="example@gamil.com"
                />

                <FieldLabel>پسورد خود را وارد کنید</FieldLabel>

                <Input
                  className="w-full"
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  type="password"
                  placeholder="رمز عبور را وارد کنید"
                />
                <span className="text-center text-xs text-gray-500">
                  رمز باید شامل ۸ کاراکتر با حروف بزرگ و کوچک و اعداد و یک نماد
                  باشد
                </span>
              </div>

              <Button
                variant="outline"
                className="h-12 w-full bg-gradient-to-l from-blue-600 to-violet-600 text-white"
                type="button"
                onClick={verifyEmail}
              >
                ورود
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setResetPhone("");
                  setResetStep("request");
                }}
              >
                <KeyRound className="size-4" />
                رمز عبور را فراموش کرده‌اید؟
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSingWithEmail(false);
                  setEmail("");
                  setPassword("");
                  router.replace("/auth");
                }}
              >
                ورود با شماره موبایل
              </Button>
            </Field>
          </div>
        )}
        {!isSentCode && resetStep && (
          <div className="relative w-[92%] max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_30px_80px_rgba(67,56,202,0.22)] backdrop-blur-2xl sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-blue-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative">
              <p className="mb-4 text-center text-sm font-black text-blue-700">پشتیبانی آی تی رسام</p>
              <button
                type="button"
                onClick={() => setResetStep(resetStep === "confirm" ? "request" : null)}
                className="mb-5 flex size-10 items-center justify-center rounded-xl border bg-white/70 text-gray-600 transition hover:bg-white"
                aria-label="بازگشت"
              >
                <ArrowRight className="size-5" />
              </button>

              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/25">
                  {resetStep === "request" ? <Phone className="size-7" /> : <ShieldCheck className="size-7" />}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800">بازیابی رمز عبور</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {resetStep === "request" ? "دریافت کد با شماره موبایل" : "تأیید کد و انتخاب رمز جدید"}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-blue-600" />
                <span className={`h-1.5 flex-1 rounded-full ${resetStep === "confirm" ? "bg-blue-600" : "bg-slate-200"}`} />
              </div>

              {resetStep === "request" ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">شماره موبایل حساب</label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        dir="ltr"
                        value={resetPhone}
                        onChange={(event) => setResetPhone(event.target.value)}
                        placeholder="09xxxxxxxxx"
                        maxLength={11}
                        className="h-12 rounded-xl bg-white/70 pr-11 text-left"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={requestPasswordReset}
                    disabled={!isValidPhone(resetPhone) || resetLoading}
                    className="h-12 w-full rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20"
                  >
                    {resetLoading ? <PulseLoader size={7} color="white" /> : "ارسال کد بازیابی"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="rounded-xl bg-blue-50 p-3 text-center text-xs text-blue-700">
                    کد ۶ رقمی به شماره {resetPhone} ارسال شد.
                  </p>
                  <OtpInput setCode={setResetCode} code={resetCode} />
                  <div className="relative">
                    <LockKeyhole className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="رمز عبور جدید"
                      className="h-12 rounded-xl bg-white/70 pr-11"
                    />
                  </div>
                  <div className="relative">
                    <LockKeyhole className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="تکرار رمز عبور جدید"
                      className="h-12 rounded-xl bg-white/70 pr-11"
                    />
                  </div>
                  <p className="text-center text-[11px] leading-5 text-slate-500">
                    حداقل ۸ کاراکتر شامل حرف بزرگ، حرف کوچک، عدد و نماد
                  </p>
                  <Button
                    type="button"
                    onClick={confirmPasswordReset}
                    disabled={isOtpComplete(resetCode) || !newPassword || !confirmPassword || resetLoading}
                    className="h-12 w-full rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20"
                  >
                    {resetLoading ? <PulseLoader size={7} color="white" /> : "ثبت رمز عبور جدید"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export function getlocalTime(number) {
  let min = Math.floor(number / 60);
  let sec = Math.floor(number % 60);
  let calSec;
  if (sec >= 10) {
    calSec = sec;
  } else {
    calSec = "0" + sec;
  }
  return min + ":" + calSec;
}
function isValidPhone(phone) {
  const phoneRegex = /^09\d{9}$/.test(phone);
  return phoneRegex;
}
function isValidEmail(email) {
  const normalizedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return false;
  } else {
    return true;
  }
}
function isOtpComplete(code) {
  let count = 0;
  code.map((i) => {
    if (i == "") {
      count += 1;
    }
  });
  if (count > 0) {
    return true;
  } else {
    return false;
  }
}
