"use client";

import TicketMessageEditor from "@/components/features/tickets/ticketMessageEditor/TicketMessageEditor";
import TicketConversationPanel from "@/components/features/tickets/TicketConversationPanel";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import TicketAttachment from "@/components/features/tickets/ticketAttachment/TicketAttachment";
import TicketRatingSummary from "@/components/features/tickets/TicketRating";
import RemoteSupportPanel from "@/components/features/tickets/RemoteSupportPanel";
import PhoneSupportPanel from "@/components/features/tickets/PhoneSupportPanel";

export default function TicketDetails() {
  const [ticket, setTicket] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { ticketId } = useParams();
  const [isUpdatedTicket, setIsUpdatedTicket] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [resolution, setResolution] = useState(null);
  useEffect(() => {
    axios.post(`/api/tickets/${ticketId}/seen`).catch(() => {});
  }, [ticketId]);

  useEffect(() => {
    async function getTicket() {
      try {
        const res = await axios.get(`/api/tickets/${ticketId}`);
        const data = await res.data;

        if (data.success) {
          setTicket(data.ticket);
          setResolution(data.resolution);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();
  }, [ticketId, isUpdatedTicket]);

  useEffect(() => {
    async function getTicket() {
      try {
        const res = await axios.get(`/api/tickets/${ticketId}/messages`);
        const data = await res.data;

        if (data.success) {
          setMessages(data.allmessages);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();

    const interval = window.setInterval(getTicket, 3000);
    const refreshOnFocus = () => getTicket();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [ticketId]);

  const sendNewMessageHandler = async (messageOverride) => {
    const message = typeof messageOverride === "string" ? messageOverride : newMessage;
    if (!message.trim()) {
      toast.error("متن پیام را وارد کنید");
      return false;
    }
    try {
      const res = await axios.post(`/api/tickets/${ticketId}/messages`, {
        message,
      });
      const data = await res.data;

      if (data.success) {
        setMessages((prev) => prev.some((item) => item._id === data.messages._id)
          ? prev
          : [...prev, data.messages]);
        setNewMessage("");
        toast.success(data.message);
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
      return false;
    }
  };

  const resolveTicketHandler = async () => {
    try {
      const res = await axios.patch(`/api/tickets/${ticketId}`, {
        status: "resolved",
      });

      const data = res.data;

      if (data.success) {
        toast.success(data.message);
        setIsUpdatedTicket((prev) => !prev);
        setOpenSheet(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };
  return (
    <>
      <Toaster />
      <section className="app-page flex w-full max-w-5xl flex-col items-center">
        <div className="glass-panel my-5 flex w-full flex-wrap items-end justify-between gap-5 p-4 sm:p-6">
          <div>
            <h1 className="page-heading">{ticket.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 sm:text-sm">
              <span>
                شماره تیکت: {ticket.ticketNumber || "در انتظار تخصیص"}
              </span>
              <span className="hidden h-4 w-px bg-slate-300 sm:block" />
              <span>ثبت‌کننده: {ticket.creator?.name || "نامشخص"}</span>
              <span className="hidden h-4 w-px bg-slate-300 sm:block" />
              <span>
                تاریخ و زمان ثبت: {ticket.createdAt
                  ? new Date(ticket.createdAt).toLocaleString("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "-"}
              </span>
            </div>
            <TicketAttachment ticketId={ticketId} attachment={ticket.attachment} />
          </div>
          <div>
            {ticket.status === "in-progress" && (
              <Button
                onClick={resolveTicketHandler}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                مشکل حل شد
              </Button>
            )}
          </div>
        </div>
        <TicketRatingSummary resolution={resolution} />
        <TicketConversationPanel messages={messages}>
          {ticket.status !== "closed" ? (
            <TicketMessageEditor
              setNewMessage={setNewMessage}
              sendNewMessageHandler={sendNewMessageHandler}
              newMessage={newMessage}
            />
          ) : (
            <p className="py-3 text-center text-sm text-muted-foreground">
              این تیکت بسته شده و امکان ارسال پیام جدید وجود ندارد.
            </p>
          )}
        </TicketConversationPanel>
        <div className="ticket-support-grid grid w-full gap-4 lg:grid-cols-2">
          <RemoteSupportPanel ticketId={ticketId} role="agent" />
          <PhoneSupportPanel ticketId={ticketId} role="agent" />
        </div>
      </section>
    </>
  );
}
