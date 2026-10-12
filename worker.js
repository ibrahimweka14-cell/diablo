/* DIABLO AI backend for Cloudflare Workers.
 * Required secret: OPENAI_API_KEY
 * Optional variables: OPENAI_MODEL, OPENAI_TRANSCRIPTION_MODEL, ALLOWED_ORIGIN
 * Never put the API key in frontend files or commit it to GitHub.
 */
const DEFAULT_ORIGIN = "https://ibrahimweka14-cell.github.io";
const SYSTEM_PROMPT = `أنت DIABLO AI، مساعد تعليمي عربي ودود. أجب بوضوح وبشكل منظم، وافهم سياق المحادثة السابقة. اشرح المسائل خطوة بخطوة عند طلب ذلك، ولا تخترع معلومات إذا لم تكن متأكدًا. عند تحليل صورة، اقرأ النص الظاهر فيها قدر الإمكان واشرح ما تحتويه. استخدم لغة المستخدم، وادعم الطالب على الفهم لا مجرد نسخ الإجابة. لا تدّعِ أنك ChatGPT أو Gemini؛ أنت DIABLO AI.`;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || DEFAULT_ORIGIN).split(",").map(x => x.trim()).filter(Boolean);
  const headers = { "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS, GET", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function extractText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  const parts = [];
  for (const item of response.output || []) {
    if (item.type === "message") for (const c of item.content || []) if (c.type === "output_text" && c.text) parts.push(c.text);
  }
  return parts.join("\n").trim();
}
function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  const normalized = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    if ((part.type === "text" || part.type === "input_text") && typeof (part.text) === "string") {
      normalized.push({ type: "input_text", text: part.text.slice(0, 12000) });
    } else if (part.type === "image_url" && typeof part.image_url?.url === "string") {
      const url = part.image_url.url;
      if (/^https:\/\//i.test(url) || /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url)) {
        normalized.push({ type: "input_image", image_url: url, detail: ["low", "high", "auto"].includes(part.image_url.detail) ? part.image_url.detail : "auto" });
      }
    } else if (part.type === "input_image" && typeof part.image_url === "string") {
      normalized.push({ type: "input_image", image_url: part.image_url, detail: part.detail || "auto" });
    }
  }
  return normalized.length ? normalized : "";
}
async function chat(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "خادم DIABLO غير مكتمل الإعداد: أضف OPENAI_API_KEY كـ Secret في Cloudflare." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "صيغة الطلب غير صحيحة." }, 400); }
  if (!Array.isArray(body.messages) || !body.messages.length) return json({ error: "اكتب رسالة أو أرفق صورة أولًا." }, 400);
  if (body.messages.length > 20) body.messages = body.messages.slice(-20);
  let instructions = SYSTEM_PROMPT;
  const input = [];
  for (const msg of body.messages) {
    if (!msg || !["system", "developer", "user", "assistant"].includes(msg.role)) continue;
    if (msg.role === "system" || msg.role === "developer") {
      const t = normalizeContent(msg.content);
      if (typeof t === "string" && t) instructions += "\n\n" + t.slice(0, 5000);
      continue;
    }
    const content = normalizeContent(msg.content);
    if (typeof content === "string" ? !content.trim() : !content.length) continue;
    input.push({ role: msg.role, content });
  }
  if (!input.length) return json({ error: "لم أستطع قراءة محتوى الرسالة." }, 400);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions,
        input,
        max_output_tokens: 1800,
        store: false
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("OpenAI Responses API error", upstream.status, data?.error?.code || data?.error?.type || "unknown");
      const apiMessage = String(data?.error?.message || "").slice(0, 220);
      const message = upstream.status === 401 ? "مفتاح الذكاء الاصطناعي غير صحيح. راجع إعدادات Cloudflare." : upstream.status === 429 ? "وصلنا لحد الاستخدام أو الرصيد المتاح. راجع الرصيد وحدود الاستخدام." : upstream.status === 400 || upstream.status === 404 ? "إعدادات الطلب أو اسم النموذج غير مناسب. راجع OPENAI_MODEL وتأكد أنه يدعم الصور عند إرفاق صورة." + (apiMessage ? " التفاصيل: " + apiMessage : "") : "حصلت مشكلة في خدمة الذكاء الاصطناعي. " + (apiMessage || "راجع إعدادات النموذج والخادم.");
      return json({ error: message }, upstream.status === 429 ? 429 : 502);
    }
    const answer = extractText(data);
    if (!answer) return json({ error: "وصل رد فارغ من النموذج. جرّب صياغة السؤال مرة أخرى." }, 502);
    return json({ answer, model: env.OPENAI_MODEL || "gpt-4.1-mini" });
  } catch (err) {
    if (err?.name === "AbortError") return json({ error: "الرد استغرق وقتًا طويلًا. جرّب سؤالًا أقصر." }, 504);
    console.error("DIABLO chat network error", err?.name || "unknown");
    return json({ error: "تعذر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى." }, 502);
  } finally { clearTimeout(timeout); }
}
async function realtimeToken(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "أضف OPENAI_API_KEY كـ Secret في Cloudflare أولًا." }, 503);
  const payload = {
    expires_after: { anchor: "created_at", seconds: 600 },
    session: {
      type: "realtime",
      model: env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
      instructions: "أنت DIABLO AI، مساعد عربي ودود. تحدث باللهجة المصرية عند مخاطبة المستخدم بالعربية. اسمع المستخدم جيدًا، أجب بصوت طبيعي ومختصر، واشرح دراسيًا خطوة بخطوة عند الحاجة. لا تدّع أنك ChatGPT أو Gemini.",
      audio: {
        input: {
          transcription: { model: env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe", language: "ar" },
          turn_detection: { type: "server_vad", create_response: true, interrupt_response: true }
        },
        output: { voice: env.OPENAI_REALTIME_VOICE || "marin" }
      }
    }
  };
  try {
    const upstream = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await upstream.json().catch(() => ({}));
    const secretValue = data?.value || data?.client_secret?.value || "";
    if (!upstream.ok || !secretValue) {
      console.error("Realtime token error", upstream.status, data?.error?.code || data?.error?.type || "unknown");
      const detail = String(data?.error?.message || data?.message || "").slice(0, 240);
      const prefix = upstream.status === 401 ? "مفتاح API غير صحيح أو غير مصرح." : upstream.status === 429 ? "وصلنا لحد استخدام خدمة الصوت أو الرصيد المتاح." : upstream.status === 404 ? "مسار خدمة الصوت غير متاح؛ تأكد من إعدادات حساب API." : "تعذر إنشاء رمز الصوت";
      return json({ error: prefix + ` (HTTP ${upstream.status}).` + (detail ? " التفاصيل: " + detail : " راجع اسم النموذج OPENAI_REALTIME_MODEL وإتاحته في حسابك.") }, upstream.status === 429 ? 429 : 502);
    }
    return json({ value: secretValue, expires_at: data.expires_at, model: payload.session.model });
  } catch (error) {
    console.error("Realtime token network error", error?.name || "unknown");
    return json({ error: "تعذر الاتصال بخدمة المحادثة الصوتية. حاول مرة أخرى." }, 502);
  }
}

function base64ToBytes(value) {
  const clean = String(value || "").replace(/^data:[^,]*;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function transcribe(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "خادم DIABLO غير مكتمل الإعداد: أضف OPENAI_API_KEY كـ Secret في Cloudflare." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "تعذر قراءة ملف الصوت." }, 400); }
  if (!body.audioBase64) return json({ error: "لم يصل تسجيل صوتي." }, 400);
  let bytes;
  try { bytes = base64ToBytes(body.audioBase64); } catch { return json({ error: "ملف الصوت غير صالح." }, 400); }
  if (!bytes.length) return json({ error: "ملف الصوت فارغ." }, 400);
  if (bytes.length > 20 * 1024 * 1024) return json({ error: "التسجيل أكبر من الحد المسموح (20 ميجابايت). قصّر التسجيل وحاول مرة أخرى." }, 413);
  const mime = String(body.mimeType || "audio/webm").split(";")[0];
  const ext = mime.includes("mp4") ? "m4a" : mime.includes("mpeg") ? "mp3" : mime.includes("wav") ? "wav" : mime.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), `diablo-recording.${ext}`);
  form.append("model", env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe");
  form.append("language", "ar");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", signal: controller.signal,
      headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}` }, body: form
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Transcription API error", upstream.status, data?.error?.code || "unknown");
      return json({ error: upstream.status === 429 ? "وصلنا لحد الاستخدام المتاح لتحويل الصوت لنص." : "تعذر تحويل التسجيل إلى نص. تأكد من إعداد نموذج التفريغ وحجم الملف." }, upstream.status === 429 ? 429 : 502);
    }
    const text = String(data.text || "").trim();
    if (!text) return json({ error: "لم يتم التعرف على كلام واضح في التسجيل." }, 422);
    return json({ text });
  } catch (err) {
    return json({ error: err?.name === "AbortError" ? "استغرق تحويل التسجيل وقتًا طويلًا." : "تعذر الاتصال بخدمة تحويل الصوت لنص." }, 502);
  } finally { clearTimeout(timeout); }
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "DIABLO AI", version: "2026-10-11-image-voice-diagnostics", chat: true, imageInput: true, transcription: Boolean(env.OPENAI_API_KEY), realtimeVoice: Boolean(env.OPENAI_API_KEY), chatModel: env.OPENAI_MODEL || "gpt-4.1-mini", realtimeModel: env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1" }, 200, cors);
    if (origin && !cors["Access-Control-Allow-Origin"]) return json({ error: "هذا الموقع غير مسموح له باستخدام DIABLO AI." }, 403, cors);
    if (request.method !== "POST") return json({ error: "طريقة الطلب غير مدعومة." }, 405, cors);
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 28 * 1024 * 1024) return json({ error: "حجم الطلب كبير جدًا." }, 413, cors);
    let response;
    if (url.pathname === "/chat") response = await chat(request, env);
    else if (url.pathname === "/transcribe") response = await transcribe(request, env);
    else if (url.pathname === "/realtime-token") response = await realtimeToken(request, env);
    else return json({ error: "المسار غير موجود." }, 404, cors);
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  }
};
