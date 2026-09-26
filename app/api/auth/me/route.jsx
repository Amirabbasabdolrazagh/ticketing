import getCurrentUser from "@/utils/auth";
import { isProfileComplete } from "@/utils/profileCompletion";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    const safeUser = {
      id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      role: user.role,
      email:user.email,
      isVerify: user.isVerify,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profileComplete: isProfileComplete(user.name),
      telegramLinked: Boolean(user.telegramChatId),
      baleLinked: Boolean(user.baleChatId),
      messengerLinked: Boolean(user.telegramChatId || user.baleChatId),
      preferredMessenger: user.preferredMessenger,
    };
    return Response.json(
      { success: true, message: "user authorized", user: safeUser },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
