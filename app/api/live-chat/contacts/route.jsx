import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";

export async function GET() {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user || !authorization(user, ["admin", "agent"])) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const role = user.role === "admin" ? "agent" : "admin";
    const users = await User.find({ role }).select("name role").sort({ name: 1 });
    const contacts = users.map((contact) => ({
      userId: contact._id.toString(),
      name: contact.name || (role === "agent" ? "پشتیبان" : "ادمین"),
      role: contact.role,
    }));

    return Response.json({ success: true, contacts });
  } catch (error) {
    console.log("LIVE CHAT CONTACTS ERROR:", error);
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
