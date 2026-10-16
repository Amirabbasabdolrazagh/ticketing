const persianFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

export function normalizeDateDigits(value) {
  return String(value || "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .trim();
}

export function formatJalaliTyping(value) {
  const digits = normalizeDateDigits(value).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
}

function persianParts(date) {
  const parts = Object.fromEntries(
    persianFormatter
      .formatToParts(date)
      .filter((part) => ["year", "month", "day"].includes(part.type))
      .map((part) => [part.type, Number(part.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function formatJalaliInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const { year, month, day } = persianParts(date);
  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

export function parseJalaliDate(value) {
  if (!value) return null;
  const normalized = normalizeDateDigits(value);
  const match = normalized.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1200 || year > 1700 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const start = Date.UTC(year + 621, 2, 1);
  const end = Date.UTC(year + 622, 3, 15);
  for (let timestamp = start; timestamp <= end; timestamp += 86400000) {
    const date = new Date(timestamp);
    const parts = persianParts(date);
    if (parts.year === year && parts.month === month && parts.day === day) return date;
  }
  return null;
}
