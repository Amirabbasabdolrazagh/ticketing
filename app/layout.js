import "./globals.css";
import { Vazirmatn } from "next/font/google";
export const metadata = {
  title: {
    default: "سامانه پشتیبانی ای‌تی رسام",
    template: "%s | ای‌تی رسام",
  },
  description: "سامانه مدیریت تیکت و پشتیبانی ای‌تی رسام",
  icons: {
    icon: [{ url: "/images/logo.png?v=2", type: "image/png" }],
    shortcut: "/images/logo.png?v=2",
    apple: "/images/logo.png?v=2",
  },
};
const vazir = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});
export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.className}>
      <body className="flex min-h-svh flex-col">{children}</body>
    </html>
  );
}
