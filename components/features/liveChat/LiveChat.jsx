"use client";

import axios from "axios";
import { ArrowRight, MessageCircle, Send, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

function getPresenceStatus(contactId, presences, now) {
  const presence = presences.find((item) => item.userId === contactId);
  if (!presence) return { color: "bg-red-500", label: "آفلاین" };
  const minutes = (now - new Date(presence.lastSeen).getTime()) / 60000;
  if (minutes < 5) return { color: "bg-green-500", label: "آنلاین" };
  if (minutes < 15) return { color: "bg-orange-400", label: "۵ دقیقه غیرفعال" };
  return { color: "bg-red-500", label: "۱۵ دقیقه غیرفعال" };
}

export default function LiveChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [popup, setPopup] = useState(null);
  const [presences, setPresences] = useState([]);
  const [now, setNow] = useState(0);
  const [unread, setUnread] = useState({});
  const endRef = useRef(null);
  const userRef = useRef(null);
  const selectedRef = useRef(null);
  const receivedMessageIds = useRef(new Set());

  function selectContact(contact) {
    setSelectedContact(contact);
    selectedRef.current = contact;
    if (contact) {
      setUnread((previous) => ({ ...previous, [contact.userId]: 0 }));
    }
  }

  useEffect(() => {
    let popupTimer;
    let eventSource;
    async function connect() {
      try {
        const [{ data: userData }, { data: contactsData }] = await Promise.all([
          axios.get("/api/auth/me"),
          axios.get("/api/live-chat/contacts"),
        ]);
        userRef.current = userData.user;
        setCurrentUser(userData.user);
        setContacts(contactsData.contacts || []);

        eventSource = new EventSource("/api/live-chat");
        eventSource.addEventListener("connected", (event) => {
          const connection = JSON.parse(event.data);
          setPresences(connection.presence || []);
          setNow(connection.serverTime);
          setIsConnected(true);
        });
        eventSource.addEventListener("presence", (event) => {
          const presence = JSON.parse(event.data);
          setNow(new Date(presence.lastSeen).getTime());
          setPresences((previous) => [
            ...previous.filter((item) => item.userId !== presence.userId),
            presence,
          ]);
        });
        eventSource.addEventListener("message", (event) => {
          const message = JSON.parse(event.data);
          if (receivedMessageIds.current.has(message.id)) return;
          receivedMessageIds.current.add(message.id);
          setMessages((previous) => [...previous, message]);
          if (message.senderId !== userRef.current?.id) {
            if (selectedRef.current?.userId !== message.senderId) {
              setUnread((previous) => ({
                ...previous,
                [message.senderId]: (previous[message.senderId] || 0) + 1,
              }));
            }
            setPopup(message);
            clearTimeout(popupTimer);
            popupTimer = setTimeout(() => setPopup(null), 5000);
          }
        });
        eventSource.onerror = () => setIsConnected(false);
      } catch {
        setIsConnected(false);
      }
    }

    connect();
    const heartbeat = setInterval(() => axios.post("/api/live-chat/presence").catch(() => {}), 30000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearTimeout(popupTimer);
      clearInterval(heartbeat);
      clearInterval(clock);
      eventSource?.close();
    };
  }, []);

  useEffect(() => {
    const toggleFromNavigation = () => setIsOpen((open) => !open);
    window.addEventListener("live-chat-toggle", toggleFromNavigation);
    return () => window.removeEventListener("live-chat-toggle", toggleFromNavigation);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("live-chat-state", { detail: { isOpen } }));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedContact) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, selectedContact]);

  async function sendMessage(event) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || !selectedContact || isSending) return;
    try {
      setIsSending(true);
      await axios.post("/api/live-chat", { text: cleanText, recipientId: selectedContact.userId });
      setText("");
    } finally {
      setIsSending(false);
    }
  }

  const activeMessages = selectedContact
    ? messages.filter((message) =>
        (message.senderId === currentUser?.id && message.recipientId === selectedContact.userId) ||
        (message.senderId === selectedContact.userId && message.recipientId === currentUser?.id),
      )
    : [];
  const uniqueActiveMessages = Array.from(
    new Map(activeMessages.map((message) => [message.id, message])).values(),
  );
  const selectedStatus = selectedContact
    ? getPresenceStatus(selectedContact.userId, presences, now)
    : null;

  function openPopupConversation() {
    const contact = contacts.find((item) => item.userId === popup?.senderId);
    if (contact) selectContact(contact);
    setIsOpen(true);
    setPopup(null);
  }

  return (
    <>
      {popup && (
        <button type="button" onClick={openPopupConversation} className="fixed left-5 top-5 z-[100] w-80 rounded-xl border border-blue-200 bg-white p-4 text-right shadow-xl">
          <p className="mb-1 text-sm font-bold">پیام جدید از {popup.senderName}</p>
          <p className="line-clamp-2 text-sm text-gray-600">{popup.text}</p>
        </button>
      )}

      {isOpen && (
        <section className="fixed bottom-28 left-5 z-[90] flex h-[min(32rem,calc(100dvh-8.5rem))] w-[42rem] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border bg-white shadow-2xl lg:bottom-20 lg:h-[32rem]">
          <aside className={`${selectedContact ? "hidden sm:flex" : "flex"} w-full flex-col border-l sm:w-56`}>
            <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-4">
              <Users className="size-5 text-blue-600" />
              <p className="font-bold">{currentUser?.role === "admin" ? "پشتیبان‌ها" : "ادمین‌ها"}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {contacts.length === 0 && <p className="p-4 text-center text-sm text-gray-400">مخاطبی پیدا نشد</p>}
              {contacts.map((contact) => {
                const status = getPresenceStatus(contact.userId, presences, now);
                return (
                  <button key={contact.userId} type="button" onClick={() => selectContact(contact)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-right hover:bg-blue-50 ${selectedContact?.userId === contact.userId ? "bg-blue-50" : ""}`}>
                    <span className={`size-3 shrink-0 rounded-full ${status.color}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{contact.name}</span>
                      <span className="block text-[11px] text-gray-500">{status.label}</span>
                    </span>
                    {!!unread[contact.userId] && <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">{unread[contact.userId]}</span>}
                  </button>
                );
              })}
            </div>
          </aside>

          <div className={`${selectedContact ? "flex" : "hidden sm:flex"} min-w-0 flex-1 flex-col`}>
            <header className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                {selectedContact && <button type="button" className="sm:hidden" onClick={() => selectContact(null)} aria-label="بازگشت"><ArrowRight className="size-5" /></button>}
                <div>
                  <p className="font-bold">{selectedContact ? selectedContact.name : "یک مخاطب انتخاب کنید"}</p>
                  {selectedStatus && <div className="flex items-center gap-1.5 text-xs opacity-90"><span className={`size-2 rounded-full ${selectedStatus.color}`} /><span>{isConnected ? selectedStatus.label : "در حال اتصال..."}</span><span>• ذخیره نمی‌شود</span></div>}
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="بستن چت"><X className="size-5" /></button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
              {!selectedContact && <p className="mt-16 text-center text-sm text-gray-400">از فهرست یک نفر را انتخاب کنید</p>}
              {selectedContact && uniqueActiveMessages.length === 0 && <p className="mt-16 text-center text-sm text-gray-400">هنوز پیامی ردوبدل نشده است</p>}
              {uniqueActiveMessages.map((message) => {
                const isMine = message.senderId === currentUser?.id;
                return <div key={message.id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}><div className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${isMine ? "bg-blue-600 text-white" : "border bg-white"}`}><p className="whitespace-pre-wrap break-words">{message.text}</p><p className={`mt-1 text-[10px] ${isMine ? "text-blue-100" : "text-gray-400"}`}>{new Date(message.sentAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</p></div></div>;
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
              <input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} disabled={!selectedContact} placeholder={selectedContact ? "پیام خود را بنویسید..." : "ابتدا یک مخاطب انتخاب کنید"} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100" />
              <Button type="submit" size="icon" disabled={!text.trim() || !selectedContact || isSending || !isConnected}><Send className="size-4" /></Button>
            </form>
          </div>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((open) => !open)} className="fixed bottom-5 left-5 z-[90] hidden size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 lg:flex" aria-label="چت آنلاین">
        {isOpen ? <X className="size-5" /> : <MessageCircle className="size-6" />}
      </button>
    </>
  );
}
