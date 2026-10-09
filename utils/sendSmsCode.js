import axios from "axios";

export default async function sendSmsCode(phone, code) {
  const response = await axios.post(
    process.env.OTP_URL,
    {
      code: process.env.OTP_PATTERN,
      attributes: { code },
      recipient: phone,
      line_number: process.env.SMS_LINE_NUMBER || process.env.OTP_LINE_NUMBER || "90008361",
      number_format: "english",
    },
    {
      headers: {
        Accept: "application/json",
        "Api-Key": process.env.OTP_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  if (response.data?.status !== "success") {
    throw new Error("SMS provider rejected the request");
  }
}
