"use client";

import { MessageCircleMore } from "lucide-react";
import TicketMessages from "@/components/features/tickets/ticketMessages/ticketMessages";

export default function TicketConversationPanel({ messages = [], children }) {
  return (
    <section className="ticket-conversation glass-panel w-full overflow-hidden" dir="rtl">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <MessageCircleMore className="size-5" />
          </span>
          <div>
            <h2 className="font-black text-foreground">گفت‌وگوی تیکت</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">تمام پیام‌های مشتری و تیم پشتیبانی در یک مسیر</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
          {messages.length.toLocaleString("fa-IR")} پیام
        </span>
      </header>

      <div className="ticket-conversation__messages flex min-h-44 w-full flex-col gap-5 px-4 py-6 text-right sm:px-6">
        {messages.length ? (
          messages.map((message) => <TicketMessages {...message} key={message._id} />)
        ) : (
          <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-border bg-muted/35 px-4 text-center text-sm text-muted-foreground">
            هنوز پیامی در این تیکت ثبت نشده است.
          </div>
        )}
      </div>

      {children && <footer className="border-t border-border bg-muted/20 px-4 py-4 sm:px-6">{children}</footer>}
    </section>
  );
}
