import TicketMessage from "@/models/ticketMessage";

export async function systemMessage(
  ticketId,
  senderId,
  message,
  visibleTo = ["admin", "agent", "customer"],
) {
  await TicketMessage.create({
    ticket: ticketId,
    sender: senderId,
    message,
    type: "system",
    visibleTo,
  });
}
