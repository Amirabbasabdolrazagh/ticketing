import Image from "next/image";

export default function MobileGlassHeader() {
  return (
    <header className="mobile-glass-header lg:hidden">
      <div className="mobile-glass-header__glow" aria-hidden="true" />
      <Image
        src="/images/logo.png"
        width={260}
        height={87}
        alt="پشتیبانی آی‌تی رسام"
        priority
        className="relative h-auto w-44 object-contain sm:w-52"
      />
    </header>
  );
}
