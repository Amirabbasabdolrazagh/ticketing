import jwt from "jsonwebtoken";
import ConnectDb from "@/utils/connectDB";
import User from "@/models/users";
import { cookies } from "next/headers";

export default async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return null;
    }
    let payload;
    try {
      payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      return null;
    }

    await ConnectDb();

    const user = await User.findById(payload.userId).select(
      "+telegramChatId +baleChatId +preferredMessenger",
    );

    if (!user) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
}
