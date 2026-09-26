export const statusLabels = {
  all: "همه",
  open: "باز",
  "in-progress": "در حال بررسی",
  resolved: "حل‌شده",
  closed: "بسته‌شده",
  active: "فعال",
  archived: "بایگانی‌شده",
};

export const priorityLabels = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

export const roleLabels = {
  admin: "مدیر",
  agent: "پشتیبان",
  customer: "مشتری",
};

export function faLabel(labels, value, fallback = "-") {
  return labels[value] || value || fallback;
}
