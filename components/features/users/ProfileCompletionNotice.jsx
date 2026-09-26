import { AlertCircle } from "lucide-react";

export default function ProfileCompletionNotice({ required }) {
  if (!required) return null;

  return (
    <div className="mx-4 mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:mx-8">
      <AlertCircle className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-bold">تکمیل اطلاعات الزامی است</p>
        <p className="mt-1 text-sm">
          برای دسترسی به بخش‌های دیگر، نام و نام خانوادگی خود را وارد و ذخیره کنید.
        </p>
      </div>
    </div>
  );
}
