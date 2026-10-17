# تلفن تحت وب ای‌تی رسام

این سرویس همان هویت و پایگاه‌داده سامانه اصلی را استفاده می‌کند اما در کانتینر مستقل `itrasam-phone` روی پورت محلی `3001` اجرا می‌شود.

## پیش‌نیاز مرکز تماس

- یک endpoint مجزای `chan_sip` برای هر دستگاه (نه رمز مشترک داخلی). در Issabel 4 موجود، زیرپروتکل SIP WebSocket در اختیار `chan_sip` است و سامانه endpoint را خودکار در `sip_custom.conf` می‌سازد.
- HTTP/WebSocket در Asterisk روی مسیر `/ws` و فقط از طریق WireGuard/Nginx
- `webrtc=yes` یا معادل آن شامل DTLS-SRTP، ICE، AVPF و `rtcp_mux`
- گواهی معتبر برای WSS
- ضبط سمت Asterisk با `MixMonitor` و ارسال فایل نهایی به API ضبط
- حذف یا محدودسازی CDR و دفترچه شماره برای نقش پشتیبان

پس از آپلود فایل، تبدیل گفتار کامل به‌صورت خودکار آغاز می‌شود. متن تماس، قطعه‌های زمان‌دار، تحلیل کاربردی و فرم دستی پشتیبان به‌صورت مستقل نگهداری می‌شوند. برای تحلیل ساختاریافته می‌توان یک API خصوصی سازگار با OpenAI در `PHONE_CALL_ANALYSIS_URL` تنظیم کرد؛ فایل صوتی و متن نباید به سرویس عمومی بدون قرارداد پردازش داده ارسال شوند.

## امضای فایل ضبط

درگاه ضبط باید بدنه فایل را با SHA-256 هش کند و مقدار زیر را با کلید `PHONE_RECORDING_WEBHOOK_SECRET` و HMAC-SHA256 امضا کند:

`<unix-timestamp>.<call-id>.<sha256-body>`

هدرها: `x-phone-call-id`، `x-phone-timestamp`، `x-phone-signature` و `content-type`.

## استقرار

1. DNS ساب‌دامین را به IP سرور سایت متصل کنید.
2. کلیدها را در `.env` قرار دهید و مقدار `AUTH_COOKIE_DOMAIN=.itrasam.com` را تنظیم کنید.
3. فایل Nginx نمونه را نصب و گواهی TLS صادر کنید.
4. سرویس‌ها را با `docker compose up -d --build` بسازید.
5. مدیر فقط IP خصوصی ایزابل و رمز مدیریتی موقت را در صفحه تلفن وارد می‌کند. سامانه نسخه Asterisk، AMI، HTTPS/WebSocket و SIP را کشف می‌کند و endpoint دستگاه، WSS، دامنه SIP، Caller ID و TURN را از تنظیمات امن زیرساخت می‌سازد؛ رمز ایزابل ذخیره نمی‌شود.

## تماس ورودی مشتری

فایل `deployment/asterisk/itrasam_inbound_router.py` را در مسیر AGI ایزابل قرار دهید و executable کنید. اسکریپت با Python 2.7 پیش‌فرض Issabel 4 و Python 3 سازگار است و به نصب بستهٔ جدید نیاز ندارد. مقادیر `ITRASAM_ROUTER_URL` و `ITRASAM_ROUTER_SECRET` در فایل محافظت‌شدهٔ `/etc/asterisk/itrasam-router.conf` قرار می‌گیرند. نمونه dialplan در `deployment/asterisk/extensions_custom.conf.sample` قرار دارد. این مسیر شماره ورودی را فقط در سمت سرور با مشتری و آخرین تیکت فعال تطبیق می‌دهد، نام مشتری را روی تلفن نشان می‌دهد و تلفن وب و داخلی همان پشتیبان را هم‌زمان زنگ می‌زند؛ تماس ناشناس یا بدون تیکت فعال به IVR اصلی بازمی‌گردد.

هشدار: مسیر WSS بدون مسیر امن رسانه کافی نیست. برای تماس خارج شبکه باید ICE/TURN یا SBC و رنج RTP محدودشده نیز در Asterisk و فایروال تنظیم شود.
