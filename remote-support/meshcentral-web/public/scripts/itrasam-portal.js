/* آی‌تی رسام — ترجمهٔ بی‌خطرِ عبارت‌های پرتکرار پنل MeshCentral.
   متن‌ها تغییر می‌کنند، اما شناسه‌ها و رفتارهای داخلی MeshCentral دست‌نخورده می‌مانند. */
(function () {
  const dictionary = new Map([
    ["My Devices", "دستگاه‌های مشتریان"], ["My Account", "حساب کاربری"],
    ["My Events", "رویدادها"], ["My Files", "فایل‌ها"], ["My Users", "کاربران"],
    ["My Server", "مدیریت سامانه"], ["Select All", "انتخاب همه"],
    ["Select None", "لغو انتخاب"], ["Group Action", "عملیات گروهی"],
    ["Filter", "جست‌وجو و فیلتر"], ["OS Name", "نام سیستم‌عامل"],
    ["Add Device Group", "افزودن گروه دستگاه"], ["Add Agent Invite", "دعوت و دانلود برنامه"],
    ["No devices in this device group,", "در این گروه هنوز دستگاهی ثبت نشده است،"],
    ["add one.", "یک دستگاه اضافه کنید."], ["Device Groups", "گروه‌های دستگاه"],
    ["New", "جدید"], ["Account Actions", "عملیات حساب"],
    ["Enable web notifications", "فعال‌سازی اعلان‌های مرورگر"],
    ["Localization Settings", "تنظیمات زبان"], ["Notification Settings", "تنظیمات اعلان‌ها"],
    ["Change email address", "تغییر ایمیل"], ["Change password", "تغییر گذرواژه"],
    ["Delete account", "حذف حساب"], ["Create login token", "ساخت توکن ورود"],
    ["Switch theme", "تغییر پوسته"], ["Icons Customization", "تنظیم آیکن‌ها"],
    ["Events", "رویدادها"], ["Reports", "گزارش‌ها"], ["All Logs", "همهٔ رویدادها"],
    ["Show", "نمایش"], ["Last 60", "۶۰ مورد آخر"], ["Terms & Privacy", "قوانین و حریم خصوصی"],
    ["Desktop", "دسکتاپ"], ["Terminal", "ترمینال"], ["Files", "فایل‌ها"],
    ["Information", "اطلاعات"], ["Details", "جزئیات"], ["Console", "کنسول"],
    ["Logout", "خروج"]
  ]);

  function translateTextNode(node) {
    const source = node.nodeValue;
    if (!source || !source.trim()) return;
    const exact = dictionary.get(source.trim());
    if (exact) node.nodeValue = source.replace(source.trim(), exact);
  }

  function translate(root) {
    if (!root || root.nodeType === Node.TEXT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        return parent && !/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/i.test(parent.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
    root.querySelectorAll?.('input[placeholder]').forEach((input) => {
      const translated = dictionary.get(input.placeholder.trim());
      if (translated) input.placeholder = translated;
    });
  }

  const navigationLabels = {
    LeftMenuMyDevices: 'دستگاه‌ها',
    LeftMenuMyAccount: 'حساب کاربری',
    LeftMenuMyEvents: 'رویدادها',
    LeftMenuMyFiles: 'فایل‌ها',
    LeftMenuMyUsers: 'کاربران',
    LeftMenuMyServer: 'مدیریت سامانه'
  };

  function addNavigationLabels() {
    Object.entries(navigationLabels).forEach(([id, label]) => {
      const item = document.getElementById(id);
      if (!item || item.querySelector('.rasam-nav-label')) return;
      const title = document.createElement('span');
      title.className = 'rasam-nav-label';
      title.textContent = label;
      item.appendChild(title);
      item.setAttribute('aria-label', label);
    });
  }

  function start() {
    document.documentElement.lang = 'fa';
    document.body?.classList.remove('night');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    translate(document.body);
    addNavigationLabels();
    new MutationObserver((changes) => changes.forEach((change) => change.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) translate(node);
    }))).observe(document.body, { childList: true, subtree: true });
    window.setTimeout(addNavigationLabels, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());
