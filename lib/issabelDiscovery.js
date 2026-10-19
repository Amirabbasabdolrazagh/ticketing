import { Client } from "ssh2";

const PRIVATE_IPV4 = /^(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})$/;

export function validateIssabelHost(value) {
  const host = String(value || "").trim();
  if (!PRIVATE_IPV4.test(host)) throw new Error("IP ایزابل باید یک نشانی خصوصی معتبر باشد");
  if (host.split(".").some((part) => Number(part) > 255)) throw new Error("IP ایزابل معتبر نیست");
  return host;
}

function execute(connection, command) {
  return new Promise((resolve, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) return reject(error);
      let stdout = "";
      let stderr = "";
      stream.on("data", (chunk) => { stdout += chunk.toString(); });
      stream.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      stream.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `فرمان بررسی با کد ${code} متوقف شد`)));
    });
  });
}

function sshErrorMessage(error, action = "اتصال به ایزابل برقرار نشد") {
  if (error?.level === "client-authentication") return "رمز SSH کاربر root ایزابل صحیح نیست";
  if (/timed out|timeout/i.test(String(error?.message || ""))) return "پاسخ SSH ایزابل در پورت ۲۲ دریافت نشد؛ تونل WireGuard و فایروال را بررسی کنید";
  return `${action}: ${error?.message || "خطای ناشناخته"}`;
}

export function discoverIssabel({ host, password }) {
  return new Promise((resolve, reject) => {
    const connection = new Client();
    const timer = setTimeout(() => {
      connection.end();
      reject(new Error("مهلت اتصال SSH به ایزابل تمام شد"));
    }, 20000);

    connection.on("ready", async () => {
      try {
        const output = await execute(connection, [
          "printf '%s\\n' '__VERSION__'",
          "asterisk -rx 'core show version' 2>&1 | head -n 1",
          "printf '%s\\n' '__MANAGER__'",
          "asterisk -rx 'manager show settings' 2>&1",
          "printf '%s\\n' '__HTTP__'",
          "asterisk -rx 'http show status' 2>&1",
          "printf '%s\\n' '__PJSIP__'",
          "asterisk -rx 'module show like res_pjsip.so' 2>&1",
          "printf '%s\\n' '__WEBSOCKET__'",
          "asterisk -rx 'module show like websocket' 2>&1",
        ].join("; "));
        clearTimeout(timer);
        connection.end();
        const section = (name, next) => output.split(`__${name}__`)[1]?.split(next ? `__${next}__` : /$^/)[0]?.trim() || "";
        const version = section("VERSION", "MANAGER").split("\n")[0].slice(0, 200);
        const manager = section("MANAGER", "HTTP");
        const http = section("HTTP", "PJSIP");
        const pjsip = section("PJSIP", "WEBSOCKET");
        const websocket = section("WEBSOCKET");
        resolve({
          version,
          capabilities: {
            amiEnabled: /Manager \(AMI\):\s+Yes/i.test(manager),
            httpEnabled: /HTTP Server Enabled|Server Enabled and Bound/i.test(http),
            httpsEnabled: /HTTPS Server Enabled|TLS.*Enabled|8089/i.test(http),
            pjsipEnabled: /res_pjsip\.so/i.test(pjsip) && !/0 modules loaded/i.test(pjsip),
            websocketEnabled: /websocket/i.test(websocket) && !/0 modules loaded/i.test(websocket),
          },
        });
      } catch (error) {
        clearTimeout(timer);
        connection.end();
        reject(error);
      }
    });
    connection.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(sshErrorMessage(error)));
    });
    connection.connect({ host, port: 22, username: "root", password, readyTimeout: 15000, keepaliveInterval: 5000, keepaliveCountMax: 2 });
  });
}

export function provisionWebRtcDevice({ host, password, username, secret, remove = false }) {
  const safeHost = validateIssabelHost(host);
  const safeUsername = String(username || "").trim();
  const safeSecret = String(secret || "");
  if (!/^[a-z0-9-]{4,80}$/.test(safeUsername)) throw new Error("شناسه WebRTC دستگاه معتبر نیست");
  if (!remove && !/^[A-Za-z0-9_-]{20,100}$/.test(safeSecret)) throw new Error("رمز WebRTC دستگاه معتبر نیست");

  const begin = `; BEGIN ITRASAM DEVICE ${safeUsername}`;
  const end = `; END ITRASAM DEVICE ${safeUsername}`;
  const config = `${begin}
[${safeUsername}]
type=friend
host=dynamic
defaultuser=${safeUsername}
secret=${safeSecret}
context=${process.env.PHONE_ADMIN_DIRECT_DIAL_ENABLED === "1" && safeUsername.startsWith("web-admin-") ? "itrasam-admin-direct" : "from-internal"}
transport=wss
avpf=yes
force_avp=yes
icesupport=yes
encryption=yes
dtlsenable=yes
dtlsverify=fingerprint
dtlscertfile=/etc/asterisk/keys/asterisk.pem
dtlssetup=actpass
rtcp_mux=yes
directmedia=no
nat=force_rport,comedia
qualify=no
dtmfmode=rfc2833
disallow=all
allow=ulaw
allow=alaw
${end}
`;
  const encoded = Buffer.from(config).toString("base64");
  const escapedBegin = begin.replace(/[\\/]/g, "\\$&");
  const escapedEnd = end.replace(/[\\/]/g, "\\$&");
  const command = [
    "set -e",
    "FILE=/etc/asterisk/sip_custom.conf",
    "touch \"$FILE\"",
    `sed -i '/^${escapedBegin}$/,/^${escapedEnd}$/d' \"$FILE\"`,
    ...(remove ? [] : [`printf '%s' '${encoded}' | base64 -d >> \"$FILE\"`]),
    "PJSIP_FILE=/etc/asterisk/pjsip_custom.conf",
    "touch \"$PJSIP_FILE\"",
    `sed -i '/^${escapedBegin}$/,/^${escapedEnd}$/d' \"$PJSIP_FILE\"`,
    "asterisk -rx 'pjsip reload' >/dev/null 2>&1 || true",
    "asterisk -rx 'sip reload'",
    ...(remove ? [] : [`asterisk -rx 'sip show peer ${safeUsername}'`]),
  ].join("; ");

  return new Promise((resolve, reject) => {
    const connection = new Client();
    const timer = setTimeout(() => { connection.end(); reject(new Error("مهلت پیکربندی دستگاه روی ایزابل تمام شد")); }, 25000);
    connection.on("ready", async () => {
      try {
        const output = await execute(connection, command);
        clearTimeout(timer); connection.end();
        if (!remove && /Peer .* not found|Unable to find|No such command/i.test(output)) throw new Error("ایزابل فایل SIP سفارشی را بارگذاری نکرد؛ مسیر include باید بررسی شود");
        resolve({ success: true, output: output.slice(-2000) });
      } catch (error) { clearTimeout(timer); connection.end(); reject(error); }
    });
    connection.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(sshErrorMessage(error, "پیکربندی ایزابل ناموفق بود")));
    });
    connection.connect({ host: safeHost, port: 22, username: "root", password, readyTimeout: 15000, keepaliveInterval: 5000, keepaliveCountMax: 2 });
  });
}
