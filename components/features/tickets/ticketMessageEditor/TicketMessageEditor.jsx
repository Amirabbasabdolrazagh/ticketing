"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";

export default function TicketMessageEditor({
  setNewMessage,
  sendNewMessageHandler,
  newMessage,
}) {
  const changeHandler = (e) => {
    setNewMessage(e.target.value);
  };
  return (
    <div className="my-5">
      <Field>
        <FieldLabel
          htmlFor="textarea-message"
          className="flex justify-end text-xl"
        >
          پیام
        </FieldLabel>
        <FieldDescription>متن پیام خود را در کادر زیر وارد کنید</FieldDescription>
        <Textarea
          id="textarea-message"
          value={newMessage}
          placeholder="پیام خود را بنویسید..."
          className="placeholder:text-end"
          onChange={changeHandler}
        />
        <Button
          className="bg-sky-500 hover:bg-green-500"
          type="button"
          onClick={() => sendNewMessageHandler()}
        >
          ارسال پیام
        </Button>
      </Field>
    </div>
  );
}
