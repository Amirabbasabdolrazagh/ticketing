import Organization from "@/models/organizations";
import User from "@/models/users";

export const PHONE_ROLES = ["admin", "agent", "passive_agent", "active_agent"];

export function canUsePhone(user) {
  return Boolean(user && PHONE_ROLES.includes(user.role));
}

export async function customerHasSecureCall(customerId) {
  const customer = await User.findById(customerId).select("organization role").lean();
  if (!customer || customer.role !== "customer") return false;
  if (!customer.organization) return true;
  const now = new Date();
  return Boolean(await Organization.exists({
    _id: customer.organization,
    isActive: true,
    members: customer._id,
    "supportContract.status": "active",
    "supportContract.features.secureCall": true,
    $and: [
      { $or: [{ "supportContract.startAt": null }, { "supportContract.startAt": { $lte: now } }] },
      { $or: [{ "supportContract.endAt": null }, { "supportContract.endAt": { $gte: now } }] },
    ],
  }));
}
