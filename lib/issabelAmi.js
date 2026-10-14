import net from "node:net";

const RESPONSE_TIMEOUT_MS = 12_000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`متغیر ${name} تنظیم نشده است.`);
  return value;
}

function safeHeaderValue(value) {
  return String(value ?? "").replace(/[\r\n]/g, "").trim();
}

function createAction(fields) {
  return `${Object.entries(fields)
    .map(([name, value]) => `${name}: ${safeHeaderValue(value)}`)
    .join("\r\n")}\r\n\r\n`;
}

function isSuccess(block) {
  return /^Response:\s*Success\s*$/im.test(block);
}

function responseMessage(block) {
  return block.match(/^Message:\s*(.+)$/im)?.[1]?.trim() || "پاسخ نامعتبر از مرکز تماس دریافت شد.";
}

async function connectAmi() {
  const host = requiredEnv("ISSABEL_AMI_HOST");
  const port = Number(process.env.ISSABEL_AMI_PORT || 5038);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("پورت AMI معتبر نیست.");
  }

  const socket = net.createConnection({ host, port });
  let buffer = "";
  const blocks = [];
  const waiters = [];

  const resolveWaiter = () => {
    while (waiters.length && blocks.length) waiters.shift().resolve(blocks.shift());
  };
  const onData = (chunk) => {
    buffer += chunk.toString("utf8");
    const normalized = buffer.replace(/\r?\n/g, "\n");
    const parts = normalized.split("\n\n");
    buffer = parts.pop().replace(/\n/g, "\r\n");
    for (const part of parts) {
      const block = part.trim();
      if (block) blocks.push(block);
    }
    resolveWaiter();
  };
  const failWaiters = (error) => {
    while (waiters.length) waiters.shift().reject(error);
  };

  socket.on("data", onData);
  socket.on("error", failWaiters);
  socket.on("close", () => failWaiters(new Error("اتصال به مرکز تماس بسته شد.")));

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("اتصال به مرکز تماس برقرار نشد.")), RESPONSE_TIMEOUT_MS);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  function nextBlock() {
    if (blocks.length) return Promise.resolve(blocks.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("پاسخی از مرکز تماس دریافت نشد.")), RESPONSE_TIMEOUT_MS);
      waiters.push({
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  async function responseFor(actionId) {
    while (true) {
      const block = await nextBlock();
      if (!/^Response:/im.test(block)) continue;
      if (!actionId || new RegExp(`^ActionID:\\s*${actionId}$`, "im").test(block)) return block;
    }
  }

  return {
    write: (fields) => socket.write(createAction(fields)),
    responseFor,
    close: () => socket.end(),
  };
}

export async function originateCustomerCall({ extension, customerPhone }) {
  return originateCall({
    channel: `SIP/${String(extension || "").trim()}`,
    extension,
    customerPhone,
    callerLabel: "IT RASAM",
  });
}

export async function originateCustomerToSupportCall({ extension, customerPhone, customerName }) {
  const dialNumber = customerDialNumber(customerPhone);
  return originateCall({
    channel: `Local/${dialNumber}@from-internal/n`,
    extension,
    customerPhone,
    callerLabel: customerName || "مشتری ای تی رسام",
    dialNumber,
    bridgeToSupport: true,
  });
}

function customerDialNumber(customerPhone) {
  const outboundPrefix = (process.env.ISSABEL_OUTBOUND_PREFIX || "").trim();
  const normalizedPhone = String(customerPhone || "").replace(/[^\d+]/g, "");

  if (!/^(?:\+98|0098|0)?9\d{9}$/.test(normalizedPhone)) throw new Error("شماره تماس مشتری معتبر نیست.");
  if (!/^\d{0,8}$/.test(outboundPrefix)) throw new Error("پیش‌شماره مسیر خروجی تلفن معتبر نیست.");
  return `${outboundPrefix}${normalizedPhone}`;
}

async function originateCall({ channel, extension, customerPhone, callerLabel, dialNumber = customerDialNumber(customerPhone), bridgeToSupport = false }) {
  const username = requiredEnv("ISSABEL_AMI_USERNAME");
  const secret = requiredEnv("ISSABEL_AMI_SECRET");
  const callerId = requiredEnv("ISSABEL_COMPANY_CALLER_ID");
  const normalizedExtension = String(extension || "").trim();
  const normalizedCallerLabel = String(callerLabel || "IT RASAM")
    .replace(/[\r\n"<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64) || "IT RASAM";

  if (!/^\d{2,8}$/.test(normalizedExtension)) throw new Error("داخلی تلفن پشتیبان معتبر نیست.");
  if (!/^\+?[\d]{8,16}$/.test(callerId.replace(/[\s-]/g, ""))) throw new Error("Caller ID شرکت معتبر نیست.");

  const client = await connectAmi();
  const actionId = `itrasam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    client.write({ Action: "Login", Username: username, Secret: secret, Events: "off" });
    const login = await client.responseFor();
    if (!isSuccess(login)) throw new Error(`ورود به مرکز تماس ناموفق بود: ${responseMessage(login)}`);

    client.write({
      Action: "Originate",
      ActionID: actionId,
      Channel: channel,
      Context: "from-internal",
      Exten: bridgeToSupport ? normalizedExtension : dialNumber,
      Priority: 1,
      CallerID: `"${normalizedCallerLabel}" <${callerId.replace(/[^\d+]/g, "")}>`,
      Timeout: 30000,
      Async: "true",
    });
    const originate = await client.responseFor(actionId);
    if (!isSuccess(originate)) throw new Error(`برقراری تماس ناموفق بود: ${responseMessage(originate)}`);
    return { actionId, message: responseMessage(originate) };
  } finally {
    try { client.write({ Action: "Logoff" }); } catch {}
    client.close();
  }
}
