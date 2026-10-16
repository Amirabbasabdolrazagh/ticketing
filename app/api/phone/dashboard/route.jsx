import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import PhoneDevice from "@/models/phoneDevices";

export async function GET() {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (user?.role !== "admin") return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const since = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const [calls, devices] = await Promise.all([
      PhoneCall.find({ startedAt: { $gte: since } }).populate("agent", "name pbxExtension").populate("customer", "name").populate("ticket", "title ticketNumber").sort({ startedAt: -1 }).limit(300).lean(),
      PhoneDevice.find().populate("user", "name role pbxExtension").populate("approvedBy", "name").sort({ createdAt: -1 }).lean(),
    ]);
    const byDay = new Map();
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - offset);
      byDay.set(date.toISOString().slice(0, 10), { date, total: 0, answered: 0 });
    }
    calls.forEach((call) => { const row = byDay.get(new Date(call.startedAt).toISOString().slice(0, 10)); if (row) { row.total += 1; if (call.answeredAt) row.answered += 1; } });
    const completed = calls.filter((call) => call.status === "completed");
    const rated = calls.filter((call) => call.report?.satisfaction);
    return Response.json({ success: true, calls, devices, chart: [...byDay.values()], metrics: {
      total: calls.length,
      answeredRate: calls.length ? Math.round((calls.filter((call) => call.answeredAt).length / calls.length) * 100) : 0,
      missed: calls.filter((call) => call.status === "missed").length,
      averageDuration: completed.length ? Math.round(completed.reduce((sum, call) => sum + (call.durationSeconds || 0), 0) / completed.length) : 0,
      satisfaction: rated.length ? rated.reduce((sum, call) => sum + call.report.satisfaction, 0) / rated.length : null,
      recordings: calls.filter((call) => call.recording?.storedName).length,
    } });
  } catch (error) {
    console.error("PHONE DASHBOARD ERROR", error);
    return Response.json({ success: false, message: "دریافت داشبورد تماس ناموفق بود" }, { status: 500 });
  }
}
