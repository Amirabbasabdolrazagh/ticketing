import { Paperclip } from "lucide-react";

export default function TicketAttachment({ ticketId, attachment }) {
  if (!attachment?.originalName) return null;

  const size = attachment.size
    ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB`
    : "";

  return (
    <div className="mt-4 flex items-center gap-2 text-sm">
      <Paperclip className="size-4" />
      <span>پیوست:</span>
      <a
        className="text-blue-600 underline underline-offset-4 hover:text-blue-800"
        href={`/api/tickets/${ticketId}/attachment`}
      >
        {attachment.originalName}
      </a>
      {size && <span className="text-xs text-gray-500">({size})</span>}
    </div>
  );
}
