/* DIABLO AI backend for Cloudflare Workers.
 * Required secret: GROQ_API_KEY
 * Optional variables: GROQ_MODEL, GROQ_VISION_MODEL, GROQ_TRANSCRIPTION_MODEL, ALLOWED_ORIGIN
 * Keep provider keys in Cloudflare Secrets only; never put them in frontend files or GitHub.
 */
const DEFAULT_ORIGIN = "https://ibrahimweka14-cell.github.io";
const SYSTEM_PROMPT = `أنت DIABLO AI، مساعد تعليمي عربي ودود. أجب بوضوح وبشكل منظم، وافهم سياق المحادثة السابقة. اشرح المسائل خطوة بخطوة عند طلب ذلك، ولا تخترع معلومات إذا لم تكن متأكدًا. عند تحليل صورة، اقرأ النص الظاهر فيها قدر الإمكان واشرح ما تحتويه. عند تلخيص تسجيل مدرس، حافظ على الأمثلة التي ذكرها، والقوانين والتعريفات والأرقام المهمة، ولا تخترع أمثلة على أنها من كلام المدرس. استخدم لغة المستخدم، وادعم الطالب على الفهم لا مجرد نسخ الإجابة. لا تدّعِ أنك ChatGPT أو Gemini؛ أنت DIABLO AI.`;

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
function normalizeForChat(content) {
  if (typeof content === "string") return content.slice(0, 20000);
  if (!Array.isArray(content)) return String(content ?? "");
  const parts = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    if ((part.type === "text" || part.type === "input_text") && typeof part.text === "string") {
      parts.push({ type: "text", text: part.text.slice(0, 12000) });
    } else if (part.type === "image_url" && typeof part.image_url?.url === "string") {
      const url = part.image_url.url;
      if (/^https:\/\//i.test(url) || /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url)) {
        parts.push({ type: "image_url", image_url: { url } });
      }
    } else if (part.type === "input_image" && typeof part.image_url === "string") {
      parts.push({ type: "image_url", image_url: { url: part.image_url } });
    }
  }
  return parts.length ? parts : "";
}
function messageHasImage(content) {
  return Array.isArray(content) && content.some(p =>
    p && (p.type === "image_url" || p.type === "input_image") &&
    (typeof p.image_url === "string" || typeof p.image_url?.url === "string")
  );
}
async function chat(request, env) {
  if (!env.GROQ_API_KEY) return json({ error: "خادم DIABLO غير مكتمل الإعداد: أضف GROQ_API_KEY كـ Secret في Cloudflare." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "صيغة الطلب غير صحيحة." }, 400); }
  if (!Array.isArray(body.messages) || !body.messages.length) return json({ error: "اكتب رسالة أو أرفق صورة أولًا." }, 400);
  const incoming = body.messages.slice(-20);
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  let hasImage = false;
  for (const msg of incoming) {
    if (!msg || !["system", "developer", "user", "assistant"].includes(msg.role)) continue;
    if (msg.role === "system" || msg.role === "developer") {
      const c = normalizeForChat(msg.content);
      if (typeof c === "string" && c.trim()) messages[0].content += "\n\n" + c.slice(0, 4000);
      continue;
    }
    const content = normalizeForChat(msg.content);
    if (typeof content === "string" ? !content.trim() : !content.length) continue;
    if (messageHasImage(msg.content)) hasImage = true;
    // Some providers accept only user/assistant/system roles.
    messages.push({ role: msg.role, content });
  }
  if (messages.length < 2) return json({ error: "لم أستطع قراءة محتوى الرسالة." }, 400);
  const model = hasImage
    ? (env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct")
    : (env.GROQ_MODEL || "llama-3.3-70b-versatile");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: 1800, temperature: 0.4 })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Groq chat API error", upstream.status, data?.error?.code || data?.error?.type || "unknown");
      const detail = String(data?.error?.message || "").slice(0, 220);
      let message = "حصلت مشكلة في خدمة الذكاء الاصطناعي.";
      if (upstream.status === 401 || upstream.status === 403) message = "مفتاح Groq غير صحيح أو لا يملك الصلاحية المطلوبة. راجع GROQ_API_KEY في Cloudflare.";
      else if (upstream.status === 429) message = "وصل DIABLO إلى حد استخدام Groq المتاح حاليًا. جرّب لاحقًا أو راجع حدود حسابك.";
      else if (upstream.status === 400 || upstream.status === 404) message = "النموذج غير متاح أو الطلب غير مدعوم في Groq. راجع GROQ_MODEL أو GROQ_VISION_MODEL." + (detail ? " التفاصيل: " + detail : "");
      else if (detail) message += " " + detail;
      return json({ error: message }, upstream.status === 429 ? 429 : 502);
    }
    const answer = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!answer) return json({ error: "وصل رد فارغ من النموذج. جرّب صياغة السؤال مرة أخرى." }, 502);
    return json({ answer, model });
  } catch (err) {
    if (err?.name === "AbortError") return json({ error: "الرد استغرق وقتًا طويلًا. جرّب سؤالًا أقصر." }, 504);
    console.error("DIABLO chat network error", err?.name || "unknown");
    return json({ error: "تعذر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى." }, 502);
  } finally { clearTimeout(timeout); }
}
function base64ToBytes(value) {
  const clean = String(value || "").replace(/^data:[^,]*;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function transcribe(request, env) {
  if (!env.GROQ_API_KEY) return json({ error: "أضف GROQ_API_KEY كـ Secret في Cloudflare أولًا." }, 503);
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
  form.append("model", env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo");
  form.append("language", "ar");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST", signal: controller.signal,
      headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}` }, body: form
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Groq transcription API error", upstream.status, data?.error?.code || "unknown");
      return json({ error: upstream.status === 429 ? "وصلنا إلى حد استخدام Groq لتحويل الصوت لنص." : "تعذر تحويل التسجيل إلى نص. راجع نموذج GROQ_TRANSCRIPTION_MODEL وحجم الملف." }, upstream.status === 429 ? 429 : 502);
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
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true, service: "DIABLO AI", version: "2026-10-13-groq-migration",
        provider: "groq", chat: Boolean(env.GROQ_API_KEY), imageInput: Boolean(env.GROQ_API_KEY),
        transcription: Boolean(env.GROQ_API_KEY), realtimeVoice: false,
        chatModel: env.GROQ_MODEL || "llama-3.3-70b-versatile",
        visionModel: env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
        transcriptionModel: env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo"
      }, 200, cors);
    }
    if (origin && !cors["Access-Control-Allow-Origin"]) return json({ error: "هذا الموقع غير مسموح له باستخدام DIABLO AI." }, 403, cors);
    if (request.method !== "POST") return json({ error: "طريقة الطلب غير مدعومة." }, 405, cors);
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 28 * 1024 * 1024) return json({ error: "حجم الطلب كبير جدًا." }, 413, cors);
    let response;
    if (url.pathname === "/chat") response = await chat(request, env);
    else if (url.pathname === "/transcribe") response = await transcribe(request, env);
    else if (url.pathname === "/realtime-token") response = json({ error: "المحادثة الصوتية المباشرة غير متاحة عبر إعداد Groq الحالي. استخدم التسجيل ثم تحويله إلى نص." }, 501);
    else return json({ error: "المسار غير موجود." }, 404, cors);
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  }
};
