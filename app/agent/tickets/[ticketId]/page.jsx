"use client";

import TicketMessageEditor from "@/components/features/tickets/ticketMessageEditor/TicketMessageEditor";
import TicketMessages from "@/components/features/tickets/ticketMessages/ticketMessages";
import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import TicketAttachment from "@/components/features/tickets/ticketAttachment/TicketAttachment";

export default function TicketDetails() {
  const [ticket, setTicket] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { ticketId } = useParams();
  const [isUpdatedTicket, setIsUpdatedTicket] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  useEffect(() => {
    async function getTicket() {
      try {
        const res = await axios.get(`/api/tickets/${ticketId}`);
        const data = await res.data;

        if (data.success) {
          setTicket(data.ticket);
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

  const sendNewMessageHandler = async () => {
    try {
      const res = await axios.post(`/api/tickets/${ticketId}/messages`, {
        message: newMessage,
      });
      const data = await res.data;

      if (data.success) {
        setMessages((prev) => prev.some((item) => item._id === data.messages._id)
          ? prev
          : [...prev, data.messages]);
        setNewMessage("");
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
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
        <Separator className="my-5" />
        <h1 className=" w-full text-end text-xl">گفت‌وگوها</h1>
        <div className="flex w-full max-w-full flex-col gap-6 py-12">
          {messages.map((message) => (
            <TicketMessages {...message} key={message._id} />
          ))}
        </div>
        <Separator />
        <div className="w-full">
          {ticket.status !== "closed" ? (
            <TicketMessageEditor
              setNewMessage={setNewMessage}
              sendNewMessageHandler={sendNewMessageHandler}
              newMessage={newMessage}
            />
          ) : (
            <p className="py-5 text-center text-sm text-gray-500">
              این تیکت بسته شده و امکان ارسال پیام جدید وجود ندارد.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
