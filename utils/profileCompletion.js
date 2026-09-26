export function normalizeFullName(name) {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
}

export function isProfileComplete(name) {
  const normalizedName = normalizeFullName(name);
  return normalizedName.length >= 3 && normalizedName.split(" ").length >= 2;
}
