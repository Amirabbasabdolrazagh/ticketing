import axios from "axios";
let phone = null;
export async function sendOtpHandler(prevState, formData) {
  phone = formData.get("phone");
  try {
    const res = await axios.post("/api/auth/sms/send", {
      phone,
    });
    return res.data;
  } catch (error) {
    return {
      success: false,
      message: "خطایی رخ داد",
    };
  }
}

export async function reSendOtpHandler(currentPhone) {
  try {
    const res = await axios.post("/api/auth/sms/send", {
      phone: currentPhone || phone,
    });
    return res.data;
  } catch (error) {
    return {
      success: false,
      message: "خطایی رخ داد",
    };
  }
}
