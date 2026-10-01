"use client";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { ShieldCheck, UserRound } from "lucide-react";

export default function TicketMessages({ message, sender, createdAt }) {
  const persianDate = createdAt
    ? new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(createdAt))
    : "";


  const roleStyles = (role) => {
    if (role === "customer") {
      return { align: "start", variant: "customer" };
    } else if (role === "agent") {
      return { align: "end", variant: "agent" };
    } else if (role === "admin") {
      return { align: "end", variant: "admin" };
    }
    return { align: "start", variant: "muted" };
  };
 
  return (
    <>
    
      <Bubble {...roleStyles(sender?.role)} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <BubbleContent>{message}</BubbleContent>
        <div className={`flex items-center gap-1.5 px-1 text-[11px] text-slate-500 ${
          sender?.role === "customer" ? "justify-start" : "justify-end"
        }`}>
          {sender?.role === "customer" ? <UserRound className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
          <span className="font-bold text-slate-600">{sender?.name || "کاربر"}</span>
          <span>•</span>
          <time>{persianDate}</time>
        </div>
      </Bubble>
    </>
  );
}
