import jwt from "jsonwebtoken";
import ConnectDb from "./connectDB";
import User from "@/models/users";
import { isProfileComplete } from "@/utils/profileCompletion";
import { ACCESS_TOKEN_LIFETIME } from "@/lib/accessTokenLifetime";
export default async function refreshAccessToken(refreshToken) {
  try {
    await ConnectDb();
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(payload.userId);
    if (!user) {
      return null;
    }
    if (user.refreshToken === refreshToken) {
      const newAccessToken = jwt.sign(
        {
          userId: user._id.toString(),
          phone: user.phone,
          role: user.role,
          profileComplete: isProfileComplete(user.name),
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: ACCESS_TOKEN_LIFETIME,
        },
      );

      return newAccessToken;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}
