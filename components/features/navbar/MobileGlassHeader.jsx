import Image from "next/image";
import ThemeToggle from "@/components/features/theme/ThemeToggle";

export default function MobileGlassHeader() {
  return (
    <header className="mobile-glass-header lg:hidden">
      <div className="mobile-glass-header__glow" aria-hidden="true" />
      <ThemeToggle className="absolute left-3 top-1/2 z-10 -translate-y-1/2" />
      <Image
        src="/images/logo.png"
        width={260}
        height={87}
        alt="پشتیبانی آی‌تی رسام"
        priority
        className="mobile-glass-header__logo relative h-auto w-44 object-contain sm:w-52"
      />
    </header>
  );
}
