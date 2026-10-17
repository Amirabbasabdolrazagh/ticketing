# تلفن تحت وب ای‌تی رسام

این سرویس همان هویت و پایگاه‌داده سامانه اصلی را استفاده می‌کند اما در کانتینر مستقل `itrasam-phone` روی پورت محلی `3001` اجرا می‌شود.

## پیش‌نیاز مرکز تماس

- یک endpoint مجزای `chan_sip` برای هر دستگاه (نه رمز مشترک داخلی). در Issabel 4 موجود، زیرپروتکل SIP WebSocket در اختیار `chan_sip` است و سامانه endpoint را خودکار در `sip_custom.conf` می‌سازد.
- HTTP/WebSocket در Asterisk روی مسیر `/ws` و فقط از طریق WireGuard/Nginx
- `webrtc=yes` یا معادل آن شامل DTLS-SRTP، ICE، AVPF و `rtcp_mux`
- گواهی معتبر برای WSS
- ضبط سمت Asterisk با `MixMonitor` و ارسال فایل نهایی به API ضبط
- حذف یا محدودسازی CDR و دفترچه شماره برای نقش پشتیبان

پس از آپلود فایل، همان سرویس محلی «شنوا کوچیک» که در فرم‌های پروژه به‌کار می‌رود، متن کامل و قطعه‌های زمان‌دار را تولید می‌کند. مسیر `/analyze` همان سرویس با قواعد واژگانی پایتون پیش‌نویس فرم گزارش را می‌سازد؛ هیچ API هوش مصنوعی برای گزارش تماس فراخوانی نمی‌شود. تشخیص گوینده، رضایت و نتیجه قطعی با متن تک‌کاناله قابل اعتماد نیست و پشتیبان باید گزارش را بازبینی کند.

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

فایل‌های `deployment/asterisk/itrasam_inbound_router.py` و `deployment/asterisk/itrasam_recording_upload.py` را در مسیر `/var/lib/asterisk/agi-bin/` ایزابل قرار دهید و با مالک `asterisk:asterisk` و دسترسی `750` اجرایی کنید. اسکریپت‌ها با Python 2.7 پیش‌فرض Issabel 4 و Python 3 سازگارند. در `/etc/asterisk/itrasam-router.conf` علاوه بر `ITRASAM_ROUTER_URL` و `ITRASAM_ROUTER_SECRET`، کلید `ITRASAM_RECORDING_SECRET` را با مقدار دقیق `PHONE_RECORDING_WEBHOOK_SECRET` سایت قرار دهید؛ دسترسی فایل باید `root:asterisk` و `640` باشد. رمز را در گفتگو یا لاگ چاپ نکنید.

نمونه کامل dialplan در `deployment/asterisk/extensions_custom.conf.sample` است. context قبلی `[itrasam-inbound]` را **جایگزین** کنید، نه اینکه نسخه دوم را به انتهای فایل بیفزایید. پس از تهیه نسخه پشتیبان از `extensions_custom.conf`، context جدید `[itrasam-outbound]` را نیز اضافه کنید، سپس `asterisk -rx 'dialplan reload'` و `asterisk -rx 'dialplan show itrasam-inbound'` را اجرا کنید. مسیر ورودی یک تماس دارای تیکت را تا حدود ۵۰ ثانیه در حالت زنگ نگه می‌دارد؛ اگر تب تلفن بسته باشد، اعلان در پنل اصلی پشتیبان نشان داده می‌شود. پس از بازشدن تب و ثبت داخلی WebRTC، تماس به پشتیبان وصل می‌شود. تماس بی‌پاسخ یا نامطابق به IVR می‌رود. بدون نصب dialplan جدید روی ایزابل، فقط اعلان سایت فعال می‌شود و انتظار تماس کار نمی‌کند.

برای ضبط خروجی نیز پس از اطمینان از نصب context خروجی، `ISSABEL_RECORDING_DIALPLAN_ENABLED=1` را در `.env` سایت بگذارید و کانتینرهای `ticketing` و `phone` را دوباره بسازید. تا قبل از این مرحله، مقدار `0` را نگه دارید تا مسیر تماس خروجی موجود تغییر نکند. `MixMonitor` فایل WAV را در `/var/spool/asterisk/monitor` می‌سازد؛ اسکریپت آپلود با HMAC آن را به API خصوصی می‌فرستد. سرویس صوتی داخلی تلفن با `docker compose up -d --build phone voice-transcription-fast` ساخته می‌شود؛ volume مدل قبلی را با نام ثابت بازاستفاده می‌کند و پورت عمومی ندارد. اگر سرویس صوتی مستقل قدیمی هم فعال است، پس از اطمینان از سلامت نسخه داخلی تلفن، می‌توان آن را برای صرفه‌جویی منابع خاموش کرد؛ ولی اگر فرم‌های پروژه هنوز به پورت ۹۰۰۱ متصل‌اند، تا تغییر آن اتصال سرویس قدیمی را نگه دارید. آپلود ناموفق در فایل ایزابل باقی می‌ماند و باید بررسی/ارسال مجدد شود؛ فایل اصلی خودکار حذف نمی‌شود.

هشدار: مسیر WSS بدون مسیر امن رسانه کافی نیست. برای تماس خارج شبکه باید ICE/TURN یا SBC و رنج RTP محدودشده نیز در Asterisk و فایروال تنظیم شود.
