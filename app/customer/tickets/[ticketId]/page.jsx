"use client";

import TicketMessageEditor from "@/components/features/tickets/ticketMessageEditor/TicketMessageEditor";
import TicketMessages from "@/components/features/tickets/ticketMessages/ticketMessages";
import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import TicketAttachment from "@/components/features/tickets/ticketAttachment/TicketAttachment";

export default function TicketDetails() {
  const [ticket, setTicket] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { ticketId } = useParams();
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isUpdatedTicket, setIsUpdatedTicket] = useState(false);

  const items = [
    {
      choices: [{ value: "yes" }, { value: "no" }],
      name: "isResolved",
      required: true,
    },
  ];
  useEffect(() => {
    async function getTicket() {
      try {
        const res = await axios.get(`/api/tickets/${ticketId}`);
        const data = await res.data;

        if (data.success) {
          setTicket(data.ticket);
          setNeedsConfirmation(data.needsConfirmation);
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    getTicket();

    const interval = window.setInterval(getTicket, 10000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") getTicket();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
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
  }, [ticketId]);

  const sendNewMessageHandler = async () => {
    try {
      const res = await axios.post(`/api/tickets/${ticketId}/messages`, {
        message: newMessage,
      });
      const data = await res.data;

      if (data.success) {
        setMessages((prev) => [...prev, data.messages]);

        setNewMessage("");

        toast.success(data.message);
      }
    } catch (error) {
      setNewMessage("");
      toast.error(error.response?.data?.message);
    }
  };
  async function handleSubmit(event) {
    event.preventDefault();
    const answer = new FormData(event.currentTarget).get("isResolved");
    const isResolved = answer === "yes";

    try {
      const res = await axios.post(`/api/tickets/${ticketId}/resolution`, {
        isResolved,
      });
      const data = res.data;
      if (data.success) {
        toast.success("نظر شما با موفقیت ثبت شد");
        setNeedsConfirmation(false);
      } else {
        toast.error("خطایی رخ داد");
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  }
  return (
    <>
      <Toaster />
      <section className="app-page flex min-h-svh w-full max-w-5xl flex-col items-center">
        <div className="glass-panel my-5 flex w-full flex-col justify-between gap-5 p-4 sm:p-6">
          <div className=" w-full ">
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
        </div>
        <Separator className="my-5" />
        <h1 className=" w-full text-end text-xl">گفت‌وگوها</h1>
        <div className="flex w-full max-w-full flex-col gap-6 py-12">
          {messages.map((message) => (
            <TicketMessages {...message} key={message._id} />
          ))}
        </div>
        {needsConfirmation && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolution-question-title"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.35)] sm:p-7">
              <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-blue-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 size-36 rounded-full bg-violet-400/20 blur-3xl" />
            <Questionnaire
              className="relative mx-auto max-w-md"
              items={items}
              shortcuts="letters"
              onSubmit={handleSubmit}
            >
              <QuestionnaireItem name="isResolved" required>
                <QuestionnaireTitle id="resolution-question-title" className="text-xl font-black text-slate-900">
                  آیا مشکل شما برطرف شده است؟
                </QuestionnaireTitle>

                <QuestionnaireDescription>
                  لطفاً نتیجه رسیدگی به تیکت را مشخص کنید.
                </QuestionnaireDescription>

                <QuestionnaireChoices>
                  <QuestionnaireChoice value="yes">
                    بله، مشکل حل شده است
                  </QuestionnaireChoice>

                  <QuestionnaireChoice value="no">
                    خیر، مشکل هنوز برطرف نشده است
                  </QuestionnaireChoice>
                </QuestionnaireChoices>

                <QuestionnaireError />
              </QuestionnaireItem>

              <QuestionnaireActions>
                <QuestionnaireSubmit>ثبت پاسخ</QuestionnaireSubmit>
              </QuestionnaireActions>
            </Questionnaire>
            </div>
          </div>
        )}
        <Separator />
        <div className="w-full">
          <TicketMessageEditor
            setNewMessage={setNewMessage}
            sendNewMessageHandler={sendNewMessageHandler}
            newMessage={newMessage}
          />
        </div>
      </section>
    </>
  );
}
