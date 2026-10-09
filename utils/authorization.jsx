export default function authorization(user, allowedRoles) {
  const role = user.role;
  return allowedRoles.includes(role);
}
