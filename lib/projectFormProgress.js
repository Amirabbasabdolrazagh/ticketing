const TARGET_FIELDS = {
  assessment: 55,
  jobBrief: 70,
  handover: 90,
};

function countCompletedValues(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return 1;
  if (typeof value === "string") return value.trim() ? 1 : 0;
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countCompletedValues(item), 0);
  }
  if (typeof value === "object") {
    return Object.values(value).reduce(
      (total, item) => total + countCompletedValues(item),
      0,
    );
  }
  return 0;
}

export function projectFormProgress(data, type, completed = false) {
  if (completed) return 100;
  const target = TARGET_FIELDS[type] || TARGET_FIELDS.assessment;
  const completedValues = countCompletedValues(data || {});
  if (!completedValues) return 0;
  return Math.min(99, Math.max(1, Math.round((completedValues / target) * 100)));
}
