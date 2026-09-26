export default function (user, allowedRoles) {
  const role = user.role;
  return allowedRoles.includes(role);
}
