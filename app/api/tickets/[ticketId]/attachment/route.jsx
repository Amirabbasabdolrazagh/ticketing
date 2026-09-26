import { readFile } from "fs/promises";
import path from "path";
import { isValidObjectId } from "mongoose";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const { ticketId } = await params;
    if (!isValidObjectId(ticketId)) {
      return Response.json({ success: false, message: "invalid ticketId" }, { status: 400 });
    }

    await ConnectDb();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ success: false, message: "user unauthorized" }, { status: 401 });
    }

    const ticket = await Ticket.findById(ticketId).select(
      "creator assignedTo attachment",
    );
    if (!ticket) {
      return Response.json({ success: false, message: "ticket not found" }, { status: 404 });
    }

    const userId = user._id.toString();
    const canAccess =
      user.role === "admin" ||
      (user.role === "customer" && ticket.creator?.toString() === userId) ||
      (user.role === "agent" && ticket.assignedTo?.toString() === userId);

    if (!canAccess) {
      return Response.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    if (!ticket.attachment?.storedName) {
      return Response.json({ success: false, message: "attachment not found" }, { status: 404 });
    }

    const safeStoredName = path.basename(ticket.attachment.storedName);
    const filePath = path.join(
      process.cwd(),
      "storage",
      "ticket-attachments",
      safeStoredName,
    );
    const file = await readFile(filePath);
    const encodedName = encodeURIComponent(ticket.attachment.originalName);

    return new Response(file, {
      headers: {
        "Content-Type": ticket.attachment.mimeType || "application/octet-stream",
        "Content-Length": String(file.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return Response.json({ success: false, message: "attachment not found" }, { status: 404 });
    }
    console.log("GET ATTACHMENT ERROR:", error);
    return Response.json({ success: false, message: "server error" }, { status: 500 });
  }
}
