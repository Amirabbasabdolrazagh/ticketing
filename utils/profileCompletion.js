export function normalizeFullName(name) {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
}

export function isProfileComplete(name) {
  const normalizedName = normalizeFullName(name);
  return normalizedName.length >= 3 && normalizedName.split(" ").length >= 2;
}

export function isUserProfileComplete(user) {
  if (user?.role === "organization_manager") return Boolean(normalizeFullName(user.name));
  return isProfileComplete(user?.name);
}
