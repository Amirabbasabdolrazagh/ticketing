import { useEffect, useRef } from "react";

export default function OtpInput({ setCode, code }) {
  const inputRefs = useRef([]);
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);
  const handelChang = (e, index) => {
    const value = e.target.value.replace(/\D/g, "").slice(-1);
    const updateCode = [...code];
    updateCode[index] = value;
    setCode(updateCode);
    if (value.length == 1 && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };
  const handlePaste = (e) => {
    const pastedCode = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pastedCode) return;
    e.preventDefault();
    const updateCode = Array.from({ length: 6 }, (_, index) => pastedCode[index] || "");
    setCode(updateCode);
    inputRefs.current[Math.min(pastedCode.length, 6) - 1]?.focus();
  };
  const hadelBackspace = (e, index) => {
   
    if (e.key !== "Backspace") return;
    if (index > 0 && code[index] == "") {
      const updateCode = [...code];
      updateCode[index - 1] = "";
      setCode(updateCode);
      inputRefs.current[index - 1].focus();
    } else {
      const updateCode = [...code];
      updateCode[index] = "";
      setCode(updateCode);
    }
  };

  return (
    <>
      <div
        className="flex w-full justify-center items-center gap-3 box-border h-12 "
        dir="ltr"
        onPaste={handlePaste}
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          className="border rounded-sm flex-1 min-w-0 h-full text-center  focus:bg-gray-50 focus:scale-110"
          ref={(el) => (inputRefs.current[0] = el)}
          onChange={(e) => handelChang(e, 0)}
          onKeyDown={(e) => hadelBackspace(e, 0)}
          value={code[0]}
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="border rounded-sm flex-1 min-w-0 h-full text-center  focus:bg-gray-50 focus:scale-110"
          ref={(el) => (inputRefs.current[1] = el)}
          onChange={(e) => handelChang(e, 1)}
          onKeyDown={(e) => hadelBackspace(e, 1)}
           value={code[1]}
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="border rounded-sm flex-1 min-w-0 h-full text-center  focus:bg-gray-50 focus:scale-110"
          ref={(el) => (inputRefs.current[2] = el)}
          onChange={(e) => handelChang(e, 2)}
          onKeyDown={(e) => hadelBackspace(e, 2)}
           value={code[2]}
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="border  rounded-sm flex-1 min-w-0 h-full text-center  focus:bg-gray-50 focus:scale-110"
          ref={(el) => (inputRefs.current[3] = el)}
          onChange={(e) => handelChang(e, 3)}
          onKeyDown={(e) => hadelBackspace(e, 3)}
           value={code[3]}
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="border rounded-sm flex-1 min-w-0 h-full text-center  focus:bg-gray-50 focus:scale-110"
          ref={(el) => (inputRefs.current[4] = el)}
          onChange={(e) => handelChang(e, 4)}
          onKeyDown={(e) => hadelBackspace(e, 4)}
           value={code[4]}
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="border rounded-sm  flex-1 min-w-0 h-full text-center focus:bg-gray-50 focus:scale-110"
          ref={(el) => (inputRefs.current[5] = el)}
          onChange={(e) => handelChang(e, 5)}
          onKeyDown={(e) => hadelBackspace(e, 5)}
          value={code[5]}
        />
      </div>
    </>
  );
}
