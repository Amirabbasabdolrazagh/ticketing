import { processTicketAttentionAlerts } from "@/utils/ticketAttention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const configuredSecret = process.env.TICKET_ATTENTION_SECRET || process.env.BALE_WEBHOOK_SECRET;
  const authorization = req.headers.get("authorization");
  if (!configuredSecret) {
    return Response.json({ success: false, message: "تنظیمات هشدار کامل نیست" }, { status: 503 });
  }
  if (authorization !== `Bearer ${configuredSecret}`) {
    return Response.json({ success: false }, { status: 403 });
  }

  try {
    const result = await processTicketAttentionAlerts();
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("TICKET ATTENTION JOB ERROR:", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
