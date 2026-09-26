import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import { touchPresence } from "@/lib/liveSupportChat";
import User from "@/models/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin", "agent", "customer"])) {
    return Response.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  const now = new Date();
  await User.updateOne({ _id: user._id }, { $set: { siteLastSeenAt: now } });
  return Response.json({ success: true, presence: touchPresence(user) });
}
