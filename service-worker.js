/*
=========================================================
 DIABLO AI - Cloudflare Worker
 Chat + Image Analysis + Audio Transcription + Realtime
=========================================================

Required secret:
  OPENAI_API_KEY

Optional variables:
  OPENAI_MODEL
  OPENAI_TRANSCRIPTION_MODEL
  OPENAI_REALTIME_MODEL
  OPENAI_REALTIME_TRANSCRIPTION_MODEL
  OPENAI_REALTIME_VOICE
  ALLOWED_ORIGIN

Never put your API key in frontend files or GitHub.
*/

const DEFAULT_ORIGIN = "https://ibrahimweka14-cell.github.io";

const SYSTEM_PROMPT = `
أنت DIABLO AI، مساعد ذكي وتعليمي يتحدث العربية ويفهم اللهجة المصرية.

قواعدك:
- افهم سؤال المستخدم وسياق المحادثة السابقة.
- أجب مباشرة وبوضوح.
- ساعد في الدراسة والعلوم والرياضيات واللغات والبرمجة والموضوعات العامة.
- عند إرسال صورة، حاول قراءة النص الظاهر فيها وتحليل محتواها.
- لا تدّعِ أنك ChatGPT أو Gemini؛ اسمك DIABLO AI.
- لا تخترع معلومات إذا لم تكن متأكدًا.
- استخدم لغة المستخدم.
- اجعل الإجابة مناسبة للسؤال، ولا تفرض أسلوب شرح محددًا في كل مرة.
`;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function corsHeaders(origin, env) {
  const allowed = (
    env.ALLOWED_ORIGIN || DEFAULT_ORIGIN
  )
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function extractText(response) {
  if (
    typeof response.output_text === "string" &&
    response.output_text.trim()
  ) {
    return response.output_text.trim();
  }

  const parts = [];

  for (const item of response.output || []) {
    if (item.type !== "message") continue;

    for (const content of item.content || []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

/*
=========================================================
 Normalize text and image messages
=========================================================
*/

function normalizeContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return String(content ?? "");
  }

  const normalized = [];

  for (const part of content) {
    if (!part || typeof part !== "object") continue;

    if (
      (part.type === "text" || part.type === "input_text") &&
      typeof part.text === "string"
    ) {
      normalized.push({
        type: "input_text",
        text: part.text.slice(0, 12000)
      });

      continue;
    }

    if (
      part.type === "image_url" &&
      typeof part.image_url?.url === "string"
    ) {
      const imageUrl = part.image_url.url;

      const isHttps = /^https:\/\//i.test(imageUrl);

      const isDataImage =
        /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageUrl);

      if (isHttps || isDataImage) {
        normalized.push({
          type: "input_image",
          image_url: imageUrl,
          detail: ["low", "high", "auto"].includes(
            part.image_url.detail
          )
            ? part.image_url.detail
            : "auto"
        });
      }

      continue;
    }

    if (
      part.type === "input_image" &&
      typeof part.image_url === "string"
    ) {
      const imageUrl = part.image_url;

      if (
        /^https:\/\//i.test(imageUrl) ||
        /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageUrl)
      ) {
        normalized.push({
          type: "input_image",
          image_url: imageUrl,
          detail: ["low", "high", "auto"].includes(part.detail)
            ? part.detail
            : "auto"
        });
      }
    }
  }

  return normalized.length ? normalized : "";
}

/*
=========================================================
 Chat and image analysis
=========================================================
*/

async function chat(request, env) {
  if (!env.OPENAI_API_KEY) {
    return json({
      error:
        "خادم DIABLO غير مكتمل الإعداد. أضف OPENAI_API_KEY في Cloudflare Secrets."
    }, 503);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      error: "صيغة الطلب غير صحيحة."
    }, 400);
  }

  if (!Array.isArray(body.messages) || !body.messages.length) {
    return json({
      error: "اكتب رسالة أو أرفق صورة أولًا."
    }, 400);
  }

  if (body.messages.length > 20) {
    body.messages = body.messages.slice(-20);
  }

  let instructions = SYSTEM_PROMPT;
  const input = [];

  for (const msg of body.messages) {
    if (
      !msg ||
      !["system", "developer", "user", "assistant"].includes(msg.role)
    ) {
      continue;
    }

    if (msg.role === "system" || msg.role === "developer") {
      const text = normalizeContent(msg.content);

      if (typeof text === "string" && text) {
        instructions += "\n\n" + text.slice(0, 5000);
      }

      continue;
    }

    const content = normalizeContent(msg.content);

    if (
      typeof content === "string"
        ? !content.trim()
        : !content.length
    ) {
      continue;
    }

    input.push({
      role: msg.role,
      content
    });
  }

  if (!input.length) {
    return json({
      error: "لم أستطع قراءة محتوى الرسالة."
    }, 400);
  }

  const model = env.OPENAI_MODEL || "gpt-4.1-mini";

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 55000);

  try {
    const upstream = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          instructions,
          input,
          max_output_tokens: 1800,
          store: false
        })
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error(
        "OpenAI API error",
        upstream.status,
        data?.error?.code || data?.error?.type || "unknown"
      );

      const apiMessage = String(
        data?.error?.message || ""
      ).slice(0, 250);

      let message;

      if (upstream.status === 401) {
        message =
          "مفتاح الذكاء الاصطناعي غير صحيح. راجع إعدادات Cloudflare.";
      } else if (upstream.status === 429) {
        message =
          "وصلنا لحد الاستخدام أو الرصيد المتاح. راجع رصيد API وحدود الاستخدام.";
      } else if (
        upstream.status === 400 ||
        upstream.status === 404
      ) {
        message =
          "إعدادات الطلب أو اسم النموذج غير مناسب. تأكد أن النموذج متاح ويدعم الصور عند الحاجة.";
      } else {
        message = "حصلت مشكلة في خدمة الذكاء الاصطناعي.";
      }

      if (apiMessage) {
        message += " التفاصيل: " + apiMessage;
      }

      return json({
        error: message
      }, upstream.status === 429 ? 429 : 502);
    }

    const answer = extractText(data);

    if (!answer) {
      return json({
        error: "وصل رد فارغ من النموذج. جرّب مرة أخرى."
      }, 502);
    }

    return json({
      answer,
      model
    });

  } catch (error) {
    if (error?.name === "AbortError") {
      return json({
        error: "الرد استغرق وقتًا طويلًا. جرّب سؤالًا أقصر."
      }, 504);
    }

    console.error(
      "DIABLO chat error",
      error?.name || "unknown"
    );

    return json({
      error: "تعذر الاتصال بخدمة الذكاء الاصطناعي."
    }, 502);

  } finally {
    clearTimeout(timeout);
  }
}

/*
=========================================================
 Realtime voice: create a temporary client secret
=========================================================
*/

async function realtimeToken(request, env) {
  if (!env.OPENAI_API_KEY) {
    return json({
      error:
        "أضف OPENAI_API_KEY كـ Secret في Cloudflare أولًا."
    }, 503);
  }

  const realtimeModel =
    env.OPENAI_REALTIME_MODEL || "gpt-realtime";

  const payload = {
    expires_after: {
      anchor: "created_at",
      seconds: 600
    },

    session: {
      type: "realtime",
      model: realtimeModel,

      instructions:
        "أنت DIABLO AI، مساعد عربي ودود. تحدث باللهجة المصرية عند مخاطبة المستخدم بالعربية. استمع جيدًا وأجب بصوت طبيعي. لا تدّع أنك ChatGPT أو Gemini.",

      audio: {
        input: {
          transcription: {
            model:
              env.OPENAI_REALTIME_TRANSCRIPTION_MODEL ||
              "gpt-4o-mini-transcribe",
            language: "ar"
          },

          turn_detection: {
            type: "server_vad",
            create_response: true,
            interrupt_response: true
          }
        },

        output: {
          voice: env.OPENAI_REALTIME_VOICE || "marin"
        }
      }
    }
  };

  try {
    const upstream = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await upstream.json().catch(() => ({}));

    const secretValue =
      data?.value ||
      data?.client_secret?.value ||
      "";

    if (!upstream.ok || !secretValue) {
      console.error(
        "Realtime token error",
        upstream.status,
        data?.error?.code || data?.error?.type || "unknown"
      );

      const detail = String(
        data?.error?.message || data?.message || ""
      ).slice(0, 240);

      let message;

      if (upstream.status === 401) {
        message = "مفتاح API غير صحيح أو غير مصرح.";
      } else if (upstream.status === 429) {
        message = "وصلنا لحد استخدام خدمة الصوت أو الرصيد المتاح.";
      } else if (upstream.status === 404) {
        message = "خدمة الصوت أو النموذج المحدد غير متاح.";
      } else {
        message = "تعذر إنشاء رمز الاتصال الصوتي.";
      }

      if (detail) {
        message += " التفاصيل: " + detail;
      } else {
        message += " راجع إعداد OPENAI_REALTIME_MODEL.";
      }

      return json({
        error: message
      }, 502);
    }

    return json({
      value: secretValue,
      expires_at: data.expires_at,
      model: realtimeModel
    });

  } catch (error) {
    console.error(
      "Realtime token network error",
      error?.name || "unknown"
    );

    return json({
      error: "تعذر الاتصال بخدمة المحادثة الصوتية."
    }, 502);
  }
}

/*
=========================================================
 Audio transcription
=========================================================
*/

function base64ToBytes(value) {
  const clean = String(value || "")
    .replace(/^data:[^,]*;base64,/, "");

  const binary = atob(clean);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function transcribe(request, env) {
  if (!env.OPENAI_API_KEY) {
    return json({
      error:
        "أضف OPENAI_API_KEY كـ Secret في Cloudflare."
    }, 503);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      error: "تعذر قراءة بيانات التسجيل."
    }, 400);
  }

  if (!body.audioBase64) {
    return json({
      error: "لم يصل تسجيل صوتي."
    }, 400);
  }

  let bytes;

  try {
    bytes = base64ToBytes(body.audioBase64);
  } catch {
    return json({
      error: "ملف الصوت غير صالح."
    }, 400);
  }

  if (!bytes.length) {
    return json({
      error: "ملف الصوت فارغ."
    }, 400);
  }

  if (bytes.length > 20 * 1024 * 1024) {
    return json({
      error:
        "التسجيل أكبر من الحد المسموح. قصّر التسجيل وحاول مرة أخرى."
    }, 413);
  }

  const mime = String(
    body.mimeType || "audio/webm"
  ).split(";")[0];

  let extension = "webm";

  if (mime.includes("mp4")) extension = "m4a";
  else if (mime.includes("mpeg")) extension = "mp3";
  else if (mime.includes("wav")) extension = "wav";
  else if (mime.includes("ogg")) extension = "ogg";

  const form = new FormData();

  form.append(
    "file",
    new Blob([bytes], { type: mime }),
    `diablo-recording.${extension}`
  );

  form.append(
    "model",
    env.OPENAI_TRANSCRIPTION_MODEL ||
      "gpt-4o-mini-transcribe"
  );

  form.append("language", "ar");

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 55000);

  try {
    const upstream = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`
        },
        body: form
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error(
        "Transcription error",
        upstream.status,
        data?.error?.code || "unknown"
      );

      return json({
        error:
          upstream.status === 429
            ? "وصلنا لحد استخدام تحويل الصوت إلى نص."
            : "تعذر تحويل التسجيل. راجع إعدادات النموذج وحجم الملف."
      }, upstream.status === 429 ? 429 : 502);
    }

    const text = String(data.text || "").trim();

    if (!text) {
      return json({
        error: "لم يتم التعرف على كلام واضح في التسجيل."
      }, 422);
    }

    return json({ text });

  } catch (error) {
    return json({
      error:
        error?.name === "AbortError"
          ? "استغرق تحويل التسجيل وقتًا طويلًا."
          : "تعذر الاتصال بخدمة تحويل الصوت إلى نص."
    }, 502);

  } finally {
    clearTimeout(timeout);
  }
}

/*
=========================================================
 Request router
=========================================================
*/

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    const cors = corsHeaders(origin, env);

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return json({
        ok: true,
        service: "DIABLO AI",
        version: "2026-10-11-full-worker",
        chat: true,
        imageInput: true,
        transcription: Boolean(env.OPENAI_API_KEY),
        realtimeVoice: Boolean(env.OPENAI_API_KEY),
        chatModel: env.OPENAI_MODEL || "gpt-4.1-mini",
        realtimeModel: env.OPENAI_REALTIME_MODEL || "gpt-realtime"
      }, 200, cors);
    }

    if (origin && !cors["Access-Control-Allow-Origin"]) {
      return json({
        error:
          "هذا الموقع غير مسموح له باستخدام DIABLO AI. راجع ALLOWED_ORIGIN."
      }, 403, cors);
    }

    if (request.method !== "POST") {
      return json({
        error: "طريقة الطلب غير مدعومة."
      }, 405, cors);
    }

    const contentLength = Number(
      request.headers.get("Content-Length") || 0
    );

    if (contentLength > 28 * 1024 * 1024) {
      return json({
        error: "حجم الطلب كبير جدًا."
      }, 413, cors);
    }

    let response;

    if (url.pathname === "/chat") {
      response = await chat(request, env);

    } else if (url.pathname === "/transcribe") {
      response = await transcribe(request, env);

    } else if (url.pathname === "/realtime-token") {
      response = await realtimeToken(request, env);

    } else {
      return json({
        error: "المسار غير موجود."
      }, 404, cors);
    }

    const headers = new Headers(response.headers);

    for (const [key, value] of Object.entries(cors)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });
  }
};