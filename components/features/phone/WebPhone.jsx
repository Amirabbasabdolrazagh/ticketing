"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRightLeft, BarChart3, BookUser, Check, Clock3, Headphones, History,
  Mic, MicOff, Pause, Phone, PhoneCall, PhoneIncoming, PhoneOff, Play,
  LockKeyhole, RefreshCw, Search, Server, Settings, ShieldCheck, Smartphone, Star, UserCheck, X,
} from "lucide-react";
import styles from "./phone.module.css";

const faNumber = new Intl.NumberFormat("fa-IR");
const faDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

function seconds(value = 0) {
  const minutes = Math.floor(value / 60);
  return `${faNumber.format(minutes)}:${faNumber.format(value % 60).padStart(2, "۰")}`;
}

function makeDeviceId() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 32);
}

function safeCallerName(value) {
  const text = String(value || "").trim();
  return !text || /\d{6,}/.test(text) ? "مشتری سازمانی" : text.slice(0, 120);
}

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || data.success === false) throw new Error(data.message || "عملیات ناموفق بود");
  return data;
}

function Metric({ icon: Icon, label, value, tone }) {
  return <article className={`${styles.metric} ${styles[tone] || ""}`}><span><Icon size={20} /></span><div><b>{value}</b><small>{label}</small></div></article>;
}

function ReportModal({ call, onClose, onSaved }) {
  const [form, setForm] = useState({
    issue: call.report?.issue || "", customerRequests: call.report?.customerRequests || "",
    actions: call.report?.actions || "", result: call.report?.result || "",
    outcome: call.report?.outcome || "unknown", satisfaction: call.report?.satisfaction || "", notes: call.report?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api("/api/phone/calls", { method: "PATCH", body: JSON.stringify({ callId: call.callId, report: form }) }); onSaved(); onClose(); }
    catch (error) { alert(error.message); } finally { setBusy(false); }
  };
  const retryTranscription = async () => {
    setBusy(true);
    try { const result = await api("/api/phone/transcriptions", { method: "POST", body: JSON.stringify({ callId: call.callId }) }); alert(result.message); onSaved(); }
    catch (error) { alert(error.message); } finally { setBusy(false); }
  };
  return <div className={styles.modalBackdrop} onMouseDown={onClose}><section className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
    <header><div><small>گزارش پس از تماس</small><h2>{call.customerDisplayName}</h2></div><button onClick={onClose}><X /></button></header>
    {call.recording?.storedName && <div className={styles.audioBox}><div><Play size={18}/><b>فایل کامل مکالمه</b></div><audio controls preload="none" src={`/api/phone/recordings?callId=${encodeURIComponent(call.callId)}`}/></div>}
    <section className={styles.autoReport}>
      <div className={styles.sectionTitle}><div><Activity size={18}/><b>گزارش کاربردی خودکار</b></div><span>{call.analysis?.model || "در انتظار تحلیل"}</span></div>
      {call.analysis?.summary ? <div className={styles.analysisGrid}><article className={styles.full}><small>خلاصه جامع</small><p>{call.analysis.summary}</p></article><article><small>مشکل اصلی</small><p>{call.analysis.issue || "—"}</p></article><article><small>خواسته مشتری</small><p>{call.analysis.customerRequests || "—"}</p></article><article><small>اقدام پشتیبان</small><p>{call.analysis.agentActions || "—"}</p></article><article><small>نتیجه و راهکار</small><p>{call.analysis.resolution || "—"}</p></article><article><small>نشانه رضایت مشتری</small><p>{call.analysis.satisfactionEvidence || "—"}</p></article><article><small>پیگیری بعدی</small><p>{call.analysis.followUp || "—"}</p></article></div> : <p className={styles.mutedText}>پس از دریافت فایل صوتی، متن و تحلیل مکالمه به‌صورت خودکار تولید می‌شود.</p>}
    </section>
    <section className={styles.transcriptBox}>
      <div className={styles.sectionTitle}><div><Headphones size={18}/><b>متن کامل مکالمه</b></div><span>{call.transcription?.status === "completed" ? "تکمیل‌شده" : call.transcription?.status === "processing" ? "در حال پردازش" : call.transcription?.status === "failed" ? "ناموفق" : "در صف"}</span></div>
      {call.transcript ? <div className={styles.transcriptText}>{call.transcript}</div> : <div className={styles.transcriptEmpty}><p>{call.transcription?.error || "متن کامل هنوز آماده نشده است."}</p>{call.recording?.storedName && <button disabled={busy} onClick={retryTranscription}><RefreshCw size={16}/>تلاش مجدد برای تبدیل متن</button>}</div>}
    </section>
    <div className={styles.formGrid}>
      <label><span>موضوع و مشکل</span><textarea value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} /></label>
      <label><span>خواسته‌های مشتری</span><textarea value={form.customerRequests} onChange={(e) => setForm({ ...form, customerRequests: e.target.value })} /></label>
      <label><span>اقدامات پشتیبان</span><textarea value={form.actions} onChange={(e) => setForm({ ...form, actions: e.target.value })} /></label>
      <label><span>نتیجه مکالمه</span><textarea value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} /></label>
      <label><span>وضعیت نهایی</span><select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}><option value="unknown">مشخص نشده</option><option value="resolved">حل شد</option><option value="follow_up">نیازمند پیگیری</option><option value="unresolved">حل نشد</option></select></label>
      <label><span>رضایت مشتری</span><select value={form.satisfaction} onChange={(e) => setForm({ ...form, satisfaction: e.target.value })}><option value="">ثبت نشده</option>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{faNumber.format(n)} از ۵</option>)}</select></label>
      <label className={styles.full}><span>یادداشت داخلی</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
    </div>
    <button className={styles.primary} disabled={busy} onClick={save}><Check size={18} />{busy ? "در حال ثبت…" : "ثبت گزارش مکالمه"}</button>
  </section></div>;
}

export default function WebPhone() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("phone");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [connection, setConnection] = useState("offline");
  const [sessionState, setSessionState] = useState("idle");
  const [activeName, setActiveName] = useState("");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [reportCall, setReportCall] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [devices, setDevices] = useState([]);
  const [provisionForm, setProvisionForm] = useState({ host: "", password: "" });
  const [provisioning, setProvisioning] = useState(false);
  const remoteAudio = useRef(null);
  const credentialRef = useRef(null);
  const userAgentRef = useRef(null);
  const registererRef = useRef(null);
  const sessionRef = useRef(null);
  const callIdRef = useRef("");

  const load = useCallback(async () => {
    let id = localStorage.getItem("itrasam-phone-device");
    if (!id) { id = makeDeviceId(); localStorage.setItem("itrasam-phone-device", id); }
    setDeviceId(id);
    try {
      const result = await api("/api/phone/bootstrap", { headers: { "x-phone-device-id": id } });
      credentialRef.current = result.sip || null;
      delete result.sip;
      setData(result); setSettings(result.settings); setError("");
      if (result.user.role === "admin") {
        const [dash, deviceList, settingResult] = await Promise.all([api("/api/phone/dashboard"), api("/api/phone/devices"), api("/api/phone/settings")]);
        setAdminData(dash); setDevices(deviceList.devices || []); setSettings(settingResult.settings || result.settings);
        setProvisionForm((current) => ({ ...current, host: settingResult.settings?.issabelHost || process.env.NEXT_PUBLIC_ISSABEL_HOST || "192.168.3.5" }));
      }
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (sessionState !== "active") return;
    const timer = setInterval(() => setDuration((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionState]);

  const sendEvent = useCallback((status, extra = {}) => {
    if (!callIdRef.current) return;
    fetch("/api/phone/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "session-event", callId: callIdRef.current, status, ...extra }) }).catch(() => {});
  }, []);

  const bindSession = useCallback(async (session, incoming = false) => {
    sessionRef.current = session;
    callIdRef.current = session.request?.callId || crypto.randomUUID();
    const identity = safeCallerName(session.remoteIdentity?.displayName);
    setActiveName(identity); setSessionState(incoming ? "incoming" : "ringing"); setDuration(0);
    sendEvent("ringing", { direction: incoming ? "inbound" : "internal", displayName: identity });
    const { SessionState } = await import("sip.js");
    session.stateChange.addListener((state) => {
      if (state === SessionState.Established) {
        setSessionState("active"); sendEvent("answered");
        const receiver = session.sessionDescriptionHandler?.peerConnection?.getReceivers().find((item) => item.track?.kind === "audio");
        if (receiver?.track && remoteAudio.current) { remoteAudio.current.srcObject = new MediaStream([receiver.track]); remoteAudio.current.play().catch(() => {}); }
      }
      if (state === SessionState.Terminated) { setSessionState("idle"); setMuted(false); setHeld(false); sendEvent("completed"); sessionRef.current = null; }
    });
  }, [sendEvent]);

  const connectPhone = async () => {
    if (!credentialRef.current || !data?.settings?.wssUrl || !data?.settings?.sipDomain) return setError("دستگاه یا تنظیمات مرکز تماس هنوز آماده نیست");
    try {
      setConnection("connecting"); setError("");
      const { UserAgent, Registerer } = await import("sip.js");
      const uri = UserAgent.makeURI(`sip:${credentialRef.current.username}@${data.settings.sipDomain}`);
      if (!uri) throw new Error("نشانی داخلی معتبر نیست");
      const ua = new UserAgent({
        uri, transportOptions: { server: data.settings.wssUrl }, authorizationUsername: credentialRef.current.username,
        authorizationPassword: credentialRef.current.password, sessionDescriptionHandlerFactoryOptions: { peerConnectionConfiguration: { iceServers: data.settings.iceServers || [] } },
        delegate: { onInvite: (invitation) => bindSession(invitation, true) },
      });
      const registerer = new Registerer(ua);
      await ua.start(); await registerer.register();
      userAgentRef.current = ua; registererRef.current = registerer; credentialRef.current = null; setConnection("online"); setNotice("تلفن سازمانی آماده است");
    } catch (e) { setConnection("offline"); setError(`اتصال تلفن ناموفق بود: ${e.message}`); }
  };

  const answer = async () => { try { await sessionRef.current?.accept(); } catch (e) { setError(e.message); } };
  const end = async () => {
    const session = sessionRef.current;
    if (!session) return;
    try { if (sessionState === "incoming") await session.reject(); else if (sessionState === "active") await session.bye(); else session.cancel?.(); }
    catch { setSessionState("idle"); }
  };
  const toggleMute = () => {
    const senders = sessionRef.current?.sessionDescriptionHandler?.peerConnection?.getSenders() || [];
    senders.filter((item) => item.track?.kind === "audio").forEach((item) => { item.track.enabled = muted; }); setMuted(!muted);
  };
  const toggleHold = async () => {
    try { const { Web } = await import("sip.js"); await sessionRef.current?.invite({ sessionDescriptionHandlerModifiers: held ? [] : [Web.holdModifier] }); setHeld(!held); }
    catch (e) { setError(e.message); }
  };
  const transferCall = async () => {
    const extension = prompt("داخلی مقصد را وارد کنید");
    if (!extension || !/^\d{2,8}$/.test(extension)) return;
    try {
      const { UserAgent } = await import("sip.js");
      const target = UserAgent.makeURI(`sip:${extension}@${data.settings.sipDomain}`);
      if (!target) throw new Error("داخلی مقصد معتبر نیست");
      await sessionRef.current?.refer(target);
      setNotice("درخواست انتقال تماس ارسال شد");
    } catch (e) { setError(`انتقال تماس ناموفق بود: ${e.message}`); }
  };
  const callCustomer = async (contact) => {
    try { const result = await api("/api/phone/calls", { method: "POST", body: JSON.stringify({ action: "customer-call", customerId: contact.id, ticketId: contact.ticketId, deviceId }) }); setNotice(result.message); callIdRef.current = result.callId; }
    catch (e) { setError(e.message); }
  };
  const requestDevice = async () => {
    try { const result = await api("/api/phone/devices", { method: "POST", body: JSON.stringify({ deviceId, label: `مرورگر ${navigator.platform || "پشتیبان"}`, fingerprint: `${navigator.userAgent}|${screen.width}x${screen.height}` }) }); setNotice(result.message); load(); }
    catch (e) { setError(e.message); }
  };
  const approveDevice = async (device) => {
    const sipUsername = prompt("نام کاربری SIP اختصاصی این دستگاه را وارد کنید", device.user?.pbxExtension || "");
    if (!sipUsername) return;
    const sipSecret = prompt("رمز SIP قوی و اختصاصی این دستگاه را وارد کنید");
    if (!sipSecret) return;
    try { await api("/api/phone/devices", { method: "PATCH", body: JSON.stringify({ deviceId: device._id, action: "approve", sipUsername, sipSecret }) }); setNotice("دستگاه فعال شد"); load(); }
    catch (e) { setError(e.message); }
  };
  const revokeDevice = async (device) => { if (!confirm("دسترسی این دستگاه قطع شود؟")) return; try { await api("/api/phone/devices", { method: "PATCH", body: JSON.stringify({ deviceId: device._id, action: "revoke" }) }); load(); } catch (e) { setError(e.message); } };
  const saveSettings = async () => { try { await api("/api/phone/settings", { method: "PATCH", body: JSON.stringify(settings) }); setNotice("تنظیمات تلفن ذخیره شد"); load(); } catch (e) { setError(e.message); } };
  const discoverIssabel = async () => {
    if (!provisionForm.host || !provisionForm.password) return setError("IP و رمز مدیریتی ایزابل را وارد کنید");
    setProvisioning(true); setError(""); setNotice("");
    try {
      const result = await api("/api/phone/provision", { method: "POST", body: JSON.stringify(provisionForm) });
      setSettings(result.settings); setProvisionForm((current) => ({ ...current, password: "" })); setNotice(result.message); await load();
    } catch (e) { setError(e.message); }
    finally { setProvisioning(false); }
  };

  const contacts = useMemo(() => (data?.contacts || []).filter((item) => `${item.name} ${item.ticketTitle} ${item.ticketNumber}`.toLowerCase().includes(query.toLowerCase())), [data?.contacts, query]);
  const chartMax = Math.max(1, ...(adminData?.chart || []).map((item) => item.total));
  const roleHome = ["passive_agent", "active_agent"].includes(data?.user?.role)
    ? `/${data.user.role}`
    : `/${data?.user?.role || "agent"}/dashboard`;
  const supportBaseUrl = (process.env.NEXT_PUBLIC_SUPPORT_URL || "https://support.itrasam.com").replace(/\/$/, "");
  if (!data) return <main className={styles.loading}><Headphones size={42} /><b>در حال آماده‌سازی تلفن امن…</b>{error && <p>{error}</p>}</main>;

  return <main className={styles.shell}>
    <audio ref={remoteAudio} autoPlay />
    <aside className={styles.sidebar}>
      <div className={styles.brand}><div>IR</div><span><b>تلفن ای‌تی رسام</b><small>مرکز تماس امن سازمانی</small></span></div>
      <nav>
        {[{id:"phone",label:"تلفن",icon:PhoneCall},{id:"contacts",label:"دفترچه",icon:BookUser},{id:"history",label:"گزارش تماس",icon:History},...(data.user.role === "admin" ? [{id:"dashboard",label:"داشبورد مدیر",icon:BarChart3},{id:"devices",label:"دستگاه‌ها",icon:Smartphone},{id:"settings",label:"تنظیمات",icon:Settings}] : [])].map(({id,label,icon:Icon}) => <button key={id} className={tab === id ? styles.activeNav : ""} onClick={() => setTab(id)}><Icon size={21}/><span>{label}</span></button>)}
      </nav>
      <div className={styles.profile}><span>{data.user.name?.[0]}</span><div><b>{data.user.name}</b><small>داخلی {data.user.extension || "تعریف نشده"}</small></div><i className={connection === "online" ? styles.online : ""}/></div>
    </aside>

    <section className={styles.content}>
      <header className={styles.topbar}><div><small>Phone.itrasam.com</small><h1>{tab === "phone" ? "تلفن تحت وب" : tab === "contacts" ? "دفترچه مشتریان" : tab === "history" ? "گزارش تماس‌ها" : tab === "dashboard" ? "داشبورد هوشمند تماس" : tab === "devices" ? "مدیریت دستگاه‌ها" : "تنظیمات مرکز تماس"}</h1></div><div className={styles.topbarActions}><a className={styles.backToSite} href={`${supportBaseUrl}${roleHome}`}><ArrowLeft size={18}/><span>بازگشت به سامانه</span></a><div className={styles.presence}><span className={connection === "online" ? styles.onlineDot : styles.offlineDot}/>{connection === "online" ? "آماده پاسخ‌گویی" : connection === "connecting" ? "در حال اتصال" : "آفلاین"}<button onClick={load} title="به‌روزرسانی وضعیت"><RefreshCw size={17}/></button></div></div></header>
      {(notice || error) && <div className={`${styles.notice} ${error ? styles.noticeError : ""}`}><span>{error || notice}</span><button onClick={() => {setNotice("");setError("");}}><X size={18}/></button></div>}

      {tab === "phone" && <>
        <section className={styles.metrics}><Metric icon={PhoneCall} label="کل تماس‌ها" value={faNumber.format(data.metrics.total)} tone="blue"/><Metric icon={UserCheck} label="پاسخ داده‌شده" value={faNumber.format(data.metrics.answered)} tone="green"/><Metric icon={PhoneOff} label="بی‌پاسخ" value={faNumber.format(data.metrics.missed)} tone="red"/><Metric icon={Clock3} label="میانگین مکالمه" value={seconds(data.metrics.averageDuration)} tone="violet"/></section>
        <section className={styles.phoneGrid}>
          <article className={styles.dialer}>
            <div className={styles.deviceState}><span><ShieldCheck size={20}/> دستگاه امن</span><b className={data.device?.status === "active" ? styles.good : styles.wait}>{data.device?.status === "active" ? "تأییدشده" : data.device?.status === "pending" ? "در انتظار مدیر" : "ثبت نشده"}</b></div>
            <div className={styles.phoneOrb}><Phone size={34}/><h2>{sessionState === "idle" ? "آماده تماس" : activeName}</h2><p>{sessionState === "active" ? seconds(duration) : sessionState === "incoming" ? "تماس ورودی" : sessionState === "ringing" ? "در حال شماره‌گیری" : "شماره مشتری همیشه محرمانه می‌ماند"}</p></div>
            {data.device?.status !== "active" ? <button className={styles.primary} onClick={requestDevice}><Smartphone size={19}/>ثبت این دستگاه</button> : connection !== "online" ? <button className={styles.primary} onClick={connectPhone}><PhoneCall size={19}/>فعال‌کردن تلفن</button> : sessionState === "incoming" ? <div className={styles.callButtons}><button className={styles.answer} onClick={answer}><PhoneIncoming/></button><button className={styles.hangup} onClick={end}><PhoneOff/></button></div> : sessionState !== "idle" ? <div className={styles.callButtons}><button className={muted ? styles.controlOn : ""} onClick={toggleMute}>{muted ? <MicOff/> : <Mic/>}</button><button className={held ? styles.controlOn : ""} onClick={toggleHold}>{held ? <Play/> : <Pause/>}</button>{data.settings.allowTransfer && <button onClick={transferCall} title="انتقال تماس"><ArrowRightLeft/></button>}<button className={styles.hangup} onClick={end}><PhoneOff/></button></div> : <div className={styles.ready}><Activity size={19}/>برای شروع، مشتری را از دفترچه انتخاب کنید</div>}
            <p className={styles.consent}>{data.settings.recordingEnabled ? `● ${data.settings.recordingConsentText}` : "ضبط مکالمه غیرفعال است"}</p>
          </article>
          <article className={styles.quickContacts}><header><div><h2>تماس سریع</h2><p>مشتریان دارای تیکت و قرارداد فعال</p></div><button onClick={() => setTab("contacts")}>مشاهده همه</button></header>{contacts.slice(0,5).map((contact) => <div className={styles.contactRow} key={contact.id}><span>{contact.name[0]}</span><div><b>{contact.name}</b><small>{contact.ticketTitle} · {contact.ticketNumber}</small></div><button disabled={connection !== "online"} onClick={() => callCustomer(contact)}><Phone size={18}/></button></div>)}{!contacts.length && <div className={styles.empty}>مخاطب مجازی وجود ندارد</div>}</article>
        </section>
      </>}

      {tab === "contacts" && <section className={styles.panel}><div className={styles.panelHead}><div><h2>دفترچه محرمانه مشتریان</h2><p>نام، تیکت و وضعیت نمایش داده می‌شود؛ شماره تلفن هرگز نمایش داده نمی‌شود.</p></div><label className={styles.search}><Search size={18}/><input placeholder="جست‌وجوی نام یا تیکت" value={query} onChange={(e) => setQuery(e.target.value)}/></label></div><div className={styles.contactCards}>{contacts.map((contact) => <article key={contact.id}><div className={styles.avatar}>{contact.name[0]}</div><div><h3>{contact.name}</h3><p>{contact.ticketTitle}</p><small>{contact.ticketNumber} · {contact.service}</small></div><span className={styles.statusPill}>{contact.status}</span><button disabled={connection !== "online"} onClick={() => callCustomer(contact)}><Phone size={19}/>تماس امن</button></article>)}</div></section>}

      {tab === "history" && <section className={styles.panel}><div className={styles.panelHead}><div><h2>سوابق و گزارش تماس</h2><p>شماره‌ها پنهان‌اند و دسترسی گزارش‌ها براساس نقش کنترل می‌شود.</p></div></div><div className={styles.callList}>{(data.calls || []).map((call) => <article key={call.callId}><span className={`${styles.callIcon} ${call.status === "missed" || call.status === "failed" ? styles.failed : ""}`}>{call.direction === "inbound" ? <PhoneIncoming/> : <PhoneCall/>}</span><div><h3>{call.customerDisplayName}</h3><p>{call.ticket?.title || "تماس سازمانی"}</p></div><div><b>{seconds(call.durationSeconds)}</b><small>{faDate.format(new Date(call.startedAt))}</small></div><span className={styles.statusPill}>{call.status}</span>{call.recording?.storedName && <a className={styles.iconButton} href={`/api/phone/recordings?callId=${encodeURIComponent(call.callId)}`} target="_blank"><Play size={17}/></a>}<button className={styles.reportButton} onClick={() => setReportCall(call)}>گزارش مکالمه</button></article>)}</div></section>}

      {tab === "dashboard" && adminData && <><section className={styles.metrics}><Metric icon={PhoneCall} label="تماس ۳۰ روز" value={faNumber.format(adminData.metrics.total)} tone="blue"/><Metric icon={Activity} label="نرخ پاسخ" value={`${faNumber.format(adminData.metrics.answeredRate)}٪`} tone="green"/><Metric icon={PhoneOff} label="بی‌پاسخ" value={faNumber.format(adminData.metrics.missed)} tone="red"/><Metric icon={Star} label="رضایت" value={adminData.metrics.satisfaction ? faNumber.format(adminData.metrics.satisfaction.toFixed(1)) : "—"} tone="violet"/></section><section className={styles.adminGrid}><article className={styles.chart}><header><h2>روند تماس‌های ۱۴ روز اخیر</h2><p>مقایسه کل تماس و تماس پاسخ‌داده‌شده</p></header><div className={styles.bars}>{adminData.chart.map((item) => <div key={item.date}><span style={{height:`${Math.max(5,(item.total/chartMax)*100)}%`}}><i style={{height:`${item.total ? (item.answered/item.total)*100 : 0}%`}}/></span><small>{new Date(item.date).toLocaleDateString("fa-IR",{day:"numeric"})}</small></div>)}</div><div className={styles.legend}><span><i className={styles.blueKey}/>کل تماس</span><span><i className={styles.greenKey}/>پاسخ‌داده‌شده</span></div></article><article className={styles.insight}><ShieldCheck/><h2>کنترل کیفیت مکالمه</h2><p>{faNumber.format(adminData.metrics.recordings)} مکالمه دارای فایل ضبط‌شده است. گزارش ساختاریافته، نتیجه و رضایت مشتری برای هر تماس در سوابق قابل بررسی است.</p><div><span>میانگین زمان تماس</span><b>{seconds(adminData.metrics.averageDuration)}</b></div><div><span>دستگاه فعال</span><b>{faNumber.format(adminData.devices.filter((item)=>item.status==="active").length)}</b></div></article></section></>}

      {tab === "devices" && <section className={styles.panel}><div className={styles.panelHead}><div><h2>دستگاه‌های تلفن</h2><p>برای هر مرورگر credential جدا ساخته و همان دستگاه مستقل لغو می‌شود.</p></div></div><div className={styles.deviceList}>{devices.map((device) => <article key={device._id}><Smartphone/><div><h3>{device.label}</h3><p>{device.user?.name} · داخلی {device.user?.pbxExtension || "—"}</p><small>{device.userAgent || "مشخصات مرورگر ثبت نشده"}</small></div><span className={styles.statusPill}>{device.status}</span>{device.status === "pending" ? <button className={styles.approve} onClick={() => approveDevice(device)}>تأیید و تخصیص</button> : device.status === "active" ? <button className={styles.danger} onClick={() => revokeDevice(device)}>قطع دسترسی</button> : null}</article>)}</div></section>}

      {tab === "settings" && settings && <section className={styles.panel}><div className={styles.panelHead}><div><h2>راه‌اندازی خودکار ایزابل</h2><p>سامانه قابلیت‌های Asterisk را شناسایی می‌کند؛ مدیر نیازی به دانستن WSS، SIP، Proxy یا TURN ندارد.</p></div><span className={`${styles.setupStatus} ${settings.provisioningStatus === "ready" ? styles.setupReady : ""}`}>{settings.provisioningStatus === "ready" ? "آماده بهره‌برداری" : settings.provisioningStatus === "action_required" ? "نیازمند تکمیل زیرساخت" : "بررسی نشده"}</span></div><div className={styles.autoSetup}><div className={styles.setupIntro}><Server/><div><b>اتصال امن به سرور ایزابل</b><p>رمز فقط هنگام بررسی در حافظه استفاده می‌شود و در پایگاه‌داده ذخیره نمی‌شود.</p></div></div><div className={styles.connectionFields}><label><span>IP داخلی ایزابل</span><input dir="ltr" inputMode="decimal" value={provisionForm.host} onChange={(e)=>setProvisionForm({...provisionForm,host:e.target.value})} placeholder="192.168.3.5"/></label><label><span>رمز مدیریتی ایزابل</span><div className={styles.passwordField}><LockKeyhole size={18}/><input dir="ltr" type="password" autoComplete="new-password" value={provisionForm.password} onChange={(e)=>setProvisionForm({...provisionForm,password:e.target.value})} placeholder="••••••••••••"/></div></label><button className={styles.primary} disabled={provisioning} onClick={discoverIssabel}><RefreshCw size={18}/>{provisioning ? "در حال شناسایی…" : "شناسایی و تنظیم خودکار"}</button></div>{settings.detectedAt && <div className={styles.discoveryResult}><div><small>نسخه شناسایی‌شده</small><b>{settings.detectedAsteriskVersion || "Asterisk"}</b></div><div><small>AMI</small><b>{settings.detectedCapabilities?.amiEnabled ? "فعال" : "نیازمند فعال‌سازی"}</b></div><div><small>WSS/HTTPS</small><b>{settings.detectedCapabilities?.httpsEnabled && settings.detectedCapabilities?.websocketEnabled ? "فعال" : "نیازمند فعال‌سازی"}</b></div><div><small>PJSIP</small><b>{settings.detectedCapabilities?.pjsipEnabled ? "فعال" : "نیازمند فعال‌سازی"}</b></div></div>}</div><div className={styles.settingsForm}><label><span>مدت نگهداری ضبط (روز)</span><input type="number" value={settings.retentionDays || 365} onChange={(e)=>setSettings({...settings,retentionDays:e.target.value})}/></label><label className={styles.check}><input type="checkbox" checked={settings.recordingEnabled !== false} onChange={(e)=>setSettings({...settings,recordingEnabled:e.target.checked})}/><span>ضبط مکالمات فعال باشد</span></label><label className={styles.check}><input type="checkbox" checked={settings.allowHold !== false} onChange={(e)=>setSettings({...settings,allowHold:e.target.checked})}/><span>نگه‌داشتن تماس فعال باشد</span></label><label className={styles.check}><input type="checkbox" checked={settings.allowTransfer !== false} onChange={(e)=>setSettings({...settings,allowTransfer:e.target.checked})}/><span>انتقال تماس فعال باشد</span></label><label className={styles.full}><span>متن اطلاع‌رسانی ضبط</span><textarea value={settings.recordingConsentText || ""} onChange={(e)=>setSettings({...settings,recordingConsentText:e.target.value})}/></label></div><button className={styles.primary} onClick={saveSettings}><Check size={18}/>ذخیره سیاست‌های تماس</button></section>}
    </section>
    {reportCall && <ReportModal call={reportCall} onClose={() => setReportCall(null)} onSaved={load}/>}
  </main>;
}
