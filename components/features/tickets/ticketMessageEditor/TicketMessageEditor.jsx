"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export default function TicketMessageEditor({
  setNewMessage,
  sendNewMessageHandler,
  newMessage,
}) {
  const changeHandler = (e) => {
    setNewMessage(e.target.value);
  };
  return (
    <div>
      <Field>
        <FieldLabel
          htmlFor="textarea-message"
          className="flex justify-start text-sm font-black"
        >
          پیام
        </FieldLabel>
        <FieldDescription className="text-right">متن پیام خود را در کادر زیر وارد کنید</FieldDescription>
        <Textarea
          id="textarea-message"
          value={newMessage}
          placeholder="پیام خود را بنویسید..."
          rows={3}
          className="min-h-24 resize-y bg-background/80 text-right placeholder:text-right"
          onChange={changeHandler}
        />
        <Button
          className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
          type="button"
          onClick={() => sendNewMessageHandler()}
        >
          <Send className="size-4" /> ارسال پیام
        </Button>
      </Field>
    </div>
  );
}
