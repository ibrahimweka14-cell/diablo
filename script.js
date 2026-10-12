/* =========================================================
DIABLO WEBSITE JAVASCRIPT
========================================================= */

/* =========================================================
CONFIG
========================================================= */

const DIABLO_AI_URL =
"https://lucky-mountain-88cbdiablo-ai.ibrahimweka14.workers.dev/chat";
const DIABLO_TRANSCRIBE_URL = DIABLO_AI_URL.replace(/\/chat$/, "/transcribe");

/*
المكتبة الإلكترونية الرسمية لوزارة التربية والتعليم.
*/
const OFFICIAL_BOOKS_URL =
"https://ellibrary.moe.gov.eg/books/";

let aiMessages = [];
let aiSelectedImageDataUrl = "";
let aiSelectedImageName = "";
let aiCameraStream = null;
let aiCameraFacingMode = "environment";

/* =========================================================
GENERAL HELPERS
========================================================= */

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = String(text ?? "");

    return div.innerHTML;

}

function setModalState(open) {

    document.body.classList.toggle(
        "modal-open",
        open
    );

}


/* =========================
   AI IMAGE / CAMERA INPUT
========================= */
function handleAIImageSelection(input) {
    const file = input && input.files && input.files[0];
    const preview = document.getElementById("ai-image-preview");
    const removeButton = document.getElementById("ai-image-remove");
    if (!file || !preview) return;
    if (!file.type || !file.type.startsWith("image/")) {
        preview.textContent = "اختار ملف صورة من فضلك.";
        input.value = "";
        return;
    }
    if (file.size > 12 * 1024 * 1024) {
        preview.textContent = "حجم الصورة كبير. اختار صورة أقل من 12 ميجابايت.";
        input.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = function() {
        const image = new Image();
        image.onload = function() {
            const maxSide = 1600;
            const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            aiSelectedImageDataUrl = canvas.toDataURL("image/jpeg", 0.82);
            aiSelectedImageName = file.name;
            preview.innerHTML = "";
            const thumb = document.createElement("img");
            thumb.src = aiSelectedImageDataUrl;
            thumb.alt = "معاينة الصورة المضافة";
            const label = document.createElement("span");
            label.textContent = "تم اختيار الصورة: " + file.name;
            preview.append(thumb, label);
            if (removeButton) removeButton.classList.remove("hidden");
        };
        image.onerror = function() { preview.textContent = "تعذر قراءة الصورة. جرّب صورة تانية."; };
        image.src = reader.result;
    };
    reader.onerror = function() { preview.textContent = "تعذر تحميل الصورة من الجهاز."; };
    reader.readAsDataURL(file);
}

async function openAICamera() {
    const modal = document.getElementById("ai-camera-modal");
    const video = document.getElementById("ai-camera-video");
    const status = document.getElementById("ai-camera-status");
    if (!modal || !video || !status) return;
    modal.hidden = false;
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    status.textContent = "جاري فتح الكاميرا… وافق على طلب الإذن لو ظهر.";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = "المتصفح لا يدعم فتح الكاميرا مباشرة. افتح الموقع عبر HTTPS وبمتصفح حديث، أو استخدم إضافة صورة.";
        return;
    }
    try {
        stopAICameraStream();
        aiCameraStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: aiCameraFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = aiCameraStream;
        await new Promise((resolve, reject) => {
            if (video.readyState >= 2 && video.videoWidth) return resolve();
            const timer = setTimeout(() => reject(new Error("الكاميرا اتفتحت لكن الصورة لسه ما ظهرتش. اقفل أي تطبيق بيستخدمها وجرب تاني.")), 8000);
            video.onloadedmetadata = () => { clearTimeout(timer); video.play().then(resolve).catch(reject); };
        });
        status.textContent = "الكاميرا جاهزة. وجّهها للسؤال واضغط «التقاط الصورة».";
    } catch (error) {
        console.error("DIABLO camera error:", error);
        const messages = {
            NotAllowedError: "إذن الكاميرا مرفوض. اسمح للمتصفح باستخدام الكاميرا من إعدادات الموقع ثم جرّب تاني.",
            NotFoundError: "مش لاقي كاميرا متصلة بالجهاز.",
            NotReadableError: "الكاميرا مستخدمة في تطبيق تاني أو تعذر تشغيلها.",
            OverconstrainedError: "الكاميرا مش قادرة تحقق الإعدادات المطلوبة. جرّب تاني."
        };
        status.textContent = messages[error.name] || "تعذر فتح الكاميرا. تأكد من الإذن وأن الموقع يعمل عبر HTTPS، أو استخدم إضافة صورة.";
    }
}

function stopAICameraStream() {
    if (aiCameraStream) {
        aiCameraStream.getTracks().forEach(track => track.stop());
        aiCameraStream = null;
    }
    const video = document.getElementById("ai-camera-video");
    if (video) video.srcObject = null;
}

function closeAICamera() {
    stopAICameraStream();
    const modal = document.getElementById("ai-camera-modal");
    if (modal) { modal.hidden = true; modal.style.display = "none"; }
    if (!document.getElementById("ai-modal")?.classList.contains("show") &&
        !document.getElementById("summarizer-modal")?.classList.contains("show")) {
        document.body.classList.remove("modal-open");
    }
}

async function switchAICamera() {
    aiCameraFacingMode = aiCameraFacingMode === "environment" ? "user" : "environment";
    await openAICamera();
}

function captureAICameraPhoto() {
    const video = document.getElementById("ai-camera-video");
    const preview = document.getElementById("ai-image-preview");
    const removeButton = document.getElementById("ai-image-remove");
    const status = document.getElementById("ai-camera-status");
    if (!video || !video.videoWidth || !video.videoHeight) {
        if (status) status.textContent = "استنى لحد ما صورة الكاميرا تظهر، وبعدها جرّب تاني.";
        return;
    }
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    aiSelectedImageDataUrl = canvas.toDataURL("image/jpeg", 0.84);
    aiSelectedImageName = "diablo-camera-photo.jpg";
    if (preview) {
        preview.innerHTML = "";
        const img = document.createElement("img");
        img.src = aiSelectedImageDataUrl;
        img.alt = "معاينة الصورة الملتقطة بالكاميرا";
        const label = document.createElement("span");
        label.textContent = "تم التقاط الصورة من الكاميرا";
        preview.append(img, label);
    }
    if (removeButton) removeButton.classList.remove("hidden");
    closeAICamera();
}

function removeAIImage() {
    aiSelectedImageDataUrl = "";
    aiSelectedImageName = "";
    const preview = document.getElementById("ai-image-preview");
    const removeButton = document.getElementById("ai-image-remove");
    ["ai-image-input"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    if (preview) preview.innerHTML = "";
    if (removeButton) removeButton.classList.add("hidden");
}

/* =========================================================
DIABLO AI
========================================================= */

function openAI() {

    const modal =
        document.getElementById("ai-modal");

    if (modal) {

        modal.classList.add("show");

        setModalState(true);

        setTimeout(() => {

            const input =
                document.getElementById("ai-question");

            if (input) {
                input.focus();
            }

        }, 100);

    }

}

function closeAI() {

    const modal =
        document.getElementById("ai-modal");

    if (modal) {
        modal.classList.remove("show");
    }

    if (
        !document.getElementById("summarizer-modal")
            ?.classList.contains("show")
    ) {

        setModalState(false);

    }

}

async function askAI() {

    const input =
        document.getElementById("ai-question");

    const answer =
        document.getElementById("ai-answer");

    if (!input || !answer) {
        return;
    }

    const rawQuestion =
        input.value.trim();

       const question = rawQuestion;

    if (!question && !aiSelectedImageDataUrl) {
        answer.style.display = "block";
        answer.textContent = "اكتب سؤالك أو أضف صورة عشان Diablo AI يقدر يساعدك.";
        return;
    }

    const userContent = aiSelectedImageDataUrl
        ? [
            { type: "text", text: (question || "حلل الصورة واشرح محتواها بالتفصيل المناسب للطالب.") + "\nلو الصورة فيها سؤال دراسي، اقرأه واشرح الحل خطوة بخطوة." },
            { type: "image_url", image_url: { url: aiSelectedImageDataUrl, detail: "high" } }
          ]
        : question;

    answer.style.display = "block";

    answer.innerHTML =
        "<strong>🤖 Diablo AI</strong>" +
        "<br><br>" +
        "⏳ جاري التفكير...";

    aiMessages.push({

        role: "user",
        content: userContent
    });

    try {

        const response =
            await fetch(
                DIABLO_AI_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        messages:
                            aiMessages.slice(-12)

                    })

                }
            );

        let data;

        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "الـWorker أرسل ردًا غير مفهوم."
            );

        }

        if (!response.ok) {

            throw new Error(

                data?.error ||

                data?.message ||
                (aiSelectedImageDataUrl
                    ? "لم يستطع خادم الذكاء الاصطناعي معالجة الصورة. قد يحتاج الـ Worker إلى دعم نموذج يقبل الصور؛ جرّب سؤالًا نصيًا أو تواصل مع المطوّر لتحديث الخادم."
                    : "حدث خطأ في Diablo AI.")

            );

        }

        const text =
            extractAIText(data);

        if (!text) {

            throw new Error(
                data?.error ||
                "لم يصل رد مفهوم من Diablo AI."
            );

        }

        aiMessages.push({

            role: "assistant",

            content: text

        });

        answer.innerHTML =
            "<strong>🤖 Diablo AI</strong>" +
            "<br><br>" +
            escapeHTML(text).replace(/\n/g, "<br>");

        input.value = "";
        // Do not keep large base64 image payloads in conversation history.
        if (aiSelectedImageDataUrl) {
            const lastUserMessage = aiMessages[aiMessages.length - 2];
            if (lastUserMessage && lastUserMessage.role === "user") {
                lastUserMessage.content = (question || "سؤال عن صورة") + " [تم إرفاق صورة في الرسالة السابقة]";
            }
            removeAIImage();
        }

    } catch (error) {

        console.error(
            "Diablo AI Error:",
            error
        );

        aiMessages.pop();

        answer.innerHTML =

            "<strong>⚠️ حصلت مشكلة</strong>" +

            "<br><br>" +

            escapeHTML(
                error?.message ||
                "تعذر الاتصال بـ Diablo AI."
            );

    }

}

function extractAIText(data) {

    if (
        typeof data?.answer === "string" &&
        data.answer.trim()
    ) {

        return data.answer.trim();

    }

    if (
        data?.choices?.[0]?.message &&
        typeof data.choices[0].message.content === "string"
    ) {

        return data.choices[0].message.content.trim();

    }

    if (
        typeof data?.response === "string" &&
        data.response.trim()
    ) {

        return data.response.trim();

    }

    if (
        typeof data?.result === "string" &&
        data.result.trim()
    ) {

        return data.result.trim();

    }

    return "";

}

/* =========================================================
EDUCATIONAL STAGES
========================================================= */

const stages = {

    secondary: {

        icon: "🎓",

        title:
            "المرحلة الثانوية",

        description:
            "أدوات ومساعدات للمرحلة الثانوية.",

        tools: [

            {
                name: "🧮 حساب النسبة المئوية",
                type: "percentage"
            },

            {
                name: "🎯 الدرجة المطلوبة",
                type: "required"
            },

            {
                name: "📅 عداد الامتحان",
                type: "exam"
            },

            {
                name: "⏱️ مؤقت المذاكرة",
                type: "timer"
            },

            {
                name: "📚 خطة مذاكرة",
                type: "study-plan"
            },

            {
                name: "🤖 Diablo AI",
                type: "ai"
            },

            {
                name: "📝 تلخيص درس",
                type: "summarizer"
            }

        ]

    },

    preparatory: {

        icon: "📚",

        title:
            "المرحلة الإعدادية",

        description:
            "أدوات للمذاكرة والحساب والمراجعة لطلاب الإعدادي.",

        tools: [

            {
                name: "🧮 حساب النسبة المئوية",
                type: "percentage"
            },

            {
                name: "🎯 حساب الدرجات",
                type: "required"
            },

            {
                name: "📅 عداد الامتحان",
                type: "exam"
            },

            {
                name: "⏱️ مؤقت المذاكرة",
                type: "timer"
            },

            {
                name: "📖 مراجعة الدروس",
                type: "review"
            },

            {
                name: "🤖 Diablo AI",
                type: "ai"
            },

            {
                name: "📝 تلخيص درس",
                type: "summarizer"
            }

        ]

    },

    primary: {

        icon: "📖",

        title:
            "المرحلة الابتدائية",

        description:
            "أدوات تعليمية بسيطة ومناسبة لطلاب المرحلة الابتدائية.",

        tools: [

            {
                name: "➕ العمليات الحسابية",
                type: "calculator"
            },

            {
                name: "✖️ جدول الضرب",
                type: "multiplication"
            },

            {
                name: "📏 تحويل الوحدات",
                type: "units"
            },

            {
                name: "🕐 الوقت والتاريخ",
                type: "date"
            },

            {
                name: "📚 أدوات المذاكرة",
                type: "study"
            },

            {
                name: "🤖 Diablo AI",
                type: "ai"
            },

            {
                name: "📝 تلخيص درس",
                type: "summarizer"
            }

        ]

    },

    kindergarten: {

        icon: "🧸",

        title:
            "مرحلة الحضانة",

        description:
            "تعلم الحروف والأرقام والألوان والأشكال بطريقة بسيطة.",

        tools: [

            {
                name: "🔤 الحروف",
                type: "letters"
            },

            {
                name: "🔢 الأرقام",
                type: "numbers"
            },

            {
                name: "🎨 الألوان",
                type: "colors"
            },

            {
                name: "🔺 الأشكال",
                type: "shapes"
            },

            {
                name: "🧩 أنشطة بسيطة",
                type: "activities"
            },

            {
                name: "🎮 ألعاب تعليمية",
                type: "games"
            },

            {
                name: "📝 تلخيص درس",
                type: "summarizer"
            }

        ]

    }

};

/* =========================================================
OPEN STAGE
========================================================= */

function openStage(stageName) {

    const stage =
        stages[stageName];

    if (!stage) {
        return;
    }

    document.getElementById(
        "stage-icon"
    ).textContent =
        stage.icon;

    document.getElementById(
        "stage-title"
    ).textContent =
        stage.title;

    document.getElementById(
        "stage-description"
    ).textContent =
        stage.description;

    const toolsContainer =
        document.getElementById(
            "stage-tools"
        );

    toolsContainer.innerHTML = "";

    stage.tools.forEach(
        function(tool) {

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "stage-tool-button";

            button.textContent =
                tool.name;

            button.onclick =
                function() {

                    openStageTool(
                        tool.type,
                        tool.name
                    );

                };

            toolsContainer.appendChild(
                button
            );

        }
    );

    document
        .getElementById(
            "stage-tool-panel"
        )
        .classList
        .add("hidden");

    document
        .getElementById("stages")
        .classList
        .add("hidden");

    document
        .getElementById("stage-content")
        .classList
        .remove("hidden");

    document
        .getElementById("stage-content")
        .scrollIntoView({
            behavior: "smooth"
        });

}

/* =========================================================
OPEN STAGE TOOL
========================================================= */

function openStageTool(type, title) {

    const panel =
        document.getElementById(
            "stage-tool-panel"
        );

    const content =
        document.getElementById(
            "stage-tool-content"
        );

    if (!panel || !content) {
        return;
    }

    panel.classList.remove("hidden");

    let html = "";

    if (type === "percentage") {

        html = `

            <h3>${escapeHTML(title)}</h3>

            <input
                id="stage-total"
                type="number"
                placeholder="الدرجة الكلية"
            >

            <input
                id="stage-score"
                type="number"
                placeholder="درجتك"
            >

            <button onclick="stagePercentage()">
                احسب النسبة
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "required") {

        html = `

            <h3>${escapeHTML(title)}</h3>

            <input
                id="stage-required-total"
                type="number"
                placeholder="الدرجة الكلية"
            >

            <input
                id="stage-required-current"
                type="number"
                placeholder="درجتك الحالية"
            >

            <input
                id="stage-required-target"
                type="number"
                placeholder="النسبة المطلوبة %"
            >

            <button onclick="stageRequired()">
                احسب
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "exam") {

        html = `

            <h3>${escapeHTML(title)}</h3>

            <input
                id="stage-exam-date"
                type="date"
            >

            <button onclick="stageExam()">
                احسب الوقت المتبقي
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "timer") {

        html = `

            <h3>${escapeHTML(title)}</h3>

            <input
                id="stage-timer"
                type="number"
                placeholder="عدد الدقائق"
            >

            <button onclick="stageStartTimer()">
                ▶️ ابدأ
            </button>

            <button onclick="stageStopTimer()">
                ⏹️ إيقاف
            </button>

            <div id="stage-timer-display"
                 class="stage-tool-result">
                00:00
            </div>

        `;

    }

    else if (
        type === "study-plan" ||
        type === "study"
    ) {

        html = `

            <h3>📚 خطة مذاكرة</h3>

            <input
                id="study-subject"
                type="text"
                placeholder="اسم المادة"
            >

            <input
                id="study-hours"
                type="number"
                placeholder="عدد ساعات المذاكرة"
            >

            <button onclick="makeStudyPlan()">
                إنشاء الخطة
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "review") {

        html = `

            <h3>📖 مراجعة الدروس</h3>

            <textarea
                id="review-text"
                placeholder="اكتب اسم الدرس أو النقاط التي تريد مراجعتها..."
            ></textarea>

            <button onclick="makeReview()">
                إنشاء مراجعة
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "calculator") {

        html = `

            <h3>${escapeHTML(title)}</h3>

            <input
                id="stage-calculator"
                type="text"
                placeholder="مثال: 25 + 15"
            >

            <button onclick="stageCalculator()">
                احسب
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "multiplication") {

        html = `

            <h3>${escapeHTML(title)}</h3>

            <input
                id="multiplication-number"
                type="number"
                min="1"
                max="12"
                placeholder="اكتب رقمًا من 1 إلى 12"
            >

            <button onclick="showMultiplication()">
                عرض الجدول
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "units") {

        html = `

            <h3>${escapeHTML(title)}</h3>

            <input
                id="stage-unit-value"
                type="number"
                placeholder="القيمة"
            >

            <select id="stage-unit-type">

                <option value="km">
                    كيلومتر → متر
                </option>

                <option value="m">
                    متر → كيلومتر
                </option>

                <option value="kg">
                    كيلوجرام → جرام
                </option>

                <option value="g">
                    جرام → كيلوجرام
                </option>

            </select>

            <button onclick="stageUnits()">
                تحويل
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "date") {

        html = `

            <h3>🕐 الوقت والتاريخ</h3>

            <button onclick="showDateTime()">
                اعرض الوقت والتاريخ
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "letters") {

        html = `

            <h3>🔤 الحروف العربية</h3>

            <p>
                أ ب ت ث ج ح خ د ذ ر ز
                س ش ص ض ط ظ ع غ ف ق
                ك ل م ن هـ و ي
            </p>

            <button onclick="letterGame()">
                🎮 اختبر نفسك
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "numbers") {

        html = `

            <h3>🔢 الأرقام</h3>

            <p>
                ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ١٠
            </p>

            <button onclick="numberGame()">
                🎮 اختبر نفسك
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "colors") {

        html = `

            <h3>🎨 الألوان</h3>

            <p>
                🔴 أحمر —
                🔵 أزرق —
                🟢 أخضر —
                🟡 أصفر —
                🟣 بنفسجي
            </p>

            <button onclick="colorGame()">
                🎮 اختبر نفسك
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "shapes") {

        html = `

            <h3>🔺 الأشكال</h3>

            <p>
                🔴 دائرة
                <br>
                🟦 مربع
                <br>
                🔺 مثلث
                <br>
                ▭ مستطيل
            </p>

            <button onclick="shapeGame()">
                🎮 اختبر نفسك
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "activities") {

        html = `

            <h3>🧩 نشاط تعليمي</h3>

            <p>
                حاول معرفة الرقم التالي:
            </p>

            <h2>
                1️⃣ 2️⃣ 3️⃣ 4️⃣ ❓
            </h2>

            <button onclick="activityAnswer()">
                الإجابة
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "games") {

        html = `

            <h3>🎮 لعبة تعليمية</h3>

            <p>
                ما الرقم الذي يأتي بعد 9؟
            </p>

            <button onclick="gameAnswer(10)">
                10
            </button>

            <button onclick="gameAnswer(8)">
                8
            </button>

            <div id="stage-result"
                 class="stage-tool-result"></div>

        `;

    }

    else if (type === "ai") {

        closeStageTool();

        openAI();

        return;

    }

    else if (type === "summarizer") {

        closeStageTool();

        openSummarizer();

        return;

    }

    content.innerHTML =
        html;

    panel.scrollIntoView({
        behavior: "smooth"
    });

}

/* =========================================================
CLOSE STAGE
========================================================= */

function closeStage() {

    clearInterval(stageTimerInterval);

    document
        .getElementById("stage-content")
        .classList
        .add("hidden");

    document
        .getElementById("stages")
        .classList
        .remove("hidden");

    document
        .getElementById("stage-tool-panel")
        .classList
        .add("hidden");

    document
        .getElementById("stages")
        .scrollIntoView({
            behavior: "smooth"
        });

}

function closeStageTool() {

    const panel =
        document.getElementById(
            "stage-tool-panel"
        );

    if (panel) {
        panel.classList.add("hidden");
    }

}

/* =========================================================
STAGE CALCULATIONS
========================================================= */

function stagePercentage() {

    const total =
        Number(
            document.getElementById(
                "stage-total"
            ).value
        );

    const score =
        Number(
            document.getElementById(
                "stage-score"
            ).value
        );

    const result =
        document.getElementById(
            "stage-result"
        );

    if (
        !result ||
        total <= 0 ||
        score < 0 ||
        score > total
    ) {

        if (result) {
            result.textContent =
                "اكتب الدرجات بشكل صحيح.";
        }

        return;
    }

    result.textContent =
        "النسبة = " +
        ((score / total) * 100).toFixed(2) +
        "%";

}

function stageRequired() {

    const total =
        Number(
            document.getElementById(
                "stage-required-total"
            ).value
        );

    const current =
        Number(
            document.getElementById(
                "stage-required-current"
            ).value
        );

    const target =
        Number(
            document.getElementById(
                "stage-required-target"
            ).value
        );

    const result =
        document.getElementById(
            "stage-result"
        );

    if (
        !result ||
        total <= 0 ||
        current < 0 ||
        target < 0 ||
        target > 100
    ) {

        if (result) {
            result.textContent =
                "اكتب البيانات بشكل صحيح.";
        }

        return;
    }

    const needed =
        (total * target / 100) -
        current;

    if (needed <= 0) {

        result.textContent =
            "أنت وصلت بالفعل للنسبة المطلوبة 🎉";

    } else {

        result.textContent =
            "تحتاج إلى " +
            needed.toFixed(2) +
            " درجة.";

    }

}

function stageExam() {

    const value =
        document.getElementById(
            "stage-exam-date"
        ).value;

    const result =
        document.getElementById(
            "stage-result"
        );

    if (!value) {

        result.textContent =
            "اختار تاريخ الامتحان.";

        return;
    }

    const exam =
        new Date(
            value + "T00:00:00"
        );

    const now =
        new Date();

    const difference =
        exam - now;

    if (difference <= 0) {

        result.textContent =
            "موعد الامتحان وصل أو انتهى.";

        return;
    }

    const days =
        Math.ceil(
            difference / 86400000
        );

    result.textContent =
        "متبقي " +
        days +
        " يوم 📅";

}

/* =========================================================
STAGE TIMER
========================================================= */

let stageTimerInterval = null;
let stageTimerSeconds = 0;

function stageStartTimer() {

    const minutes =
        Number(
            document.getElementById(
                "stage-timer"
            ).value
        );

    const display =
        document.getElementById(
            "stage-timer-display"
        );

    if (
        !display ||
        minutes <= 0
    ) {

        if (display) {
            display.textContent =
                "اكتب عدد الدقائق";
        }

        return;
    }

    clearInterval(stageTimerInterval);

    stageTimerSeconds =
        Math.floor(minutes * 60);

    updateStageTimer();

    stageTimerInterval =
        setInterval(
            function() {

                stageTimerSeconds--;

                updateStageTimer();

                if (
                    stageTimerSeconds <= 0
                ) {

                    clearInterval(
                        stageTimerInterval
                    );

                    stageTimerInterval =
                        null;

                    alert(
                        "⏰ انتهى وقت المذاكرة!"
                    );

                }

            },
            1000
        );

}

function updateStageTimer() {

    const display =
        document.getElementById(
            "stage-timer-display"
        );

    if (!display) {
        return;
    }

    const minutes =
        Math.floor(
            stageTimerSeconds / 60
        );

    const seconds =
        stageTimerSeconds % 60;

    display.textContent =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");

}

function stageStopTimer() {

    clearInterval(stageTimerInterval);

    stageTimerInterval = null;

}

/* =========================================================
STAGE CALCULATOR
========================================================= */

function stageCalculator() {

    const input =
        document.getElementById(
            "stage-calculator"
        ).value.trim();

    const result =
        document.getElementById(
            "stage-result"
        );

    if (!input) {

        result.textContent =
            "اكتب عملية حسابية.";

        return;
    }

    if (
        !/^[0-9+\-*/().%\s]+$/.test(input)
    ) {

        result.textContent =
            "العملية غير مسموحة.";

        return;
    }

    try {

        const answer =
            Function(
                '"use strict"; return (' +
                input +
                ')'
            )();

        if (
            typeof answer !== "number" ||
            !Number.isFinite(answer)
        ) {

            throw new Error();

        }

        result.textContent =
            "الناتج = " +
            answer;

    } catch {

        result.textContent =
            "تأكد من كتابة العملية بشكل صحيح.";

    }

}

/* =========================================================
MULTIPLICATION
========================================================= */

function showMultiplication() {

    const number =
        Number(
            document.getElementById(
                "multiplication-number"
            ).value
        );

    const result =
        document.getElementById(
            "stage-result"
        );

    if (
        number < 1 ||
        number > 12
    ) {

        result.textContent =
            "اختار رقمًا من 1 إلى 12.";

        return;
    }

    let html = "";

    for (
        let i = 1;
        i <= 12;
        i++
    ) {

        html +=
            number +
            " × " +
            i +
            " = " +
            (number * i) +
            "<br>";

    }

    result.innerHTML =
        html;

}

/* =========================================================
STAGE UNITS
========================================================= */

function stageUnits() {

    const value =
        Number(
            document.getElementById(
                "stage-unit-value"
            ).value
        );

    const type =
        document.getElementById(
            "stage-unit-type"
        ).value;

    const result =
        document.getElementById(
            "stage-result"
        );

    if (isNaN(value)) {

        result.textContent =
            "اكتب قيمة صحيحة.";

        return;
    }

    if (type === "km") {

        result.textContent =
            value * 1000 +
            " متر";

    }

    else if (type === "m") {

        result.textContent =
            value / 1000 +
            " كيلومتر";

    }

    else if (type === "kg") {

        result.textContent =
            value * 1000 +
            " جرام";

    }

    else if (type === "g") {

        result.textContent =
            value / 1000 +
            " كيلوجرام";

    }

}

/* =========================================================
STUDY PLAN
========================================================= */

function makeStudyPlan() {

    const subject =
        document.getElementById(
            "study-subject"
        ).value.trim();

    const hours =
        Number(
            document.getElementById(
                "study-hours"
            ).value
        );

    const result =
        document.getElementById(
            "stage-result"
        );

    if (
        !subject ||
        hours <= 0
    ) {

        result.textContent =
            "اكتب المادة وعدد الساعات.";

        return;
    }

    result.innerHTML =

        "📚 <strong>خطة مذاكرة</strong>" +
        "<br><br>" +

        "المادة: " +
        escapeHTML(subject) +
        "<br>" +

        "⏱️ الوقت: " +
        hours +
        " ساعة" +
        "<br><br>" +

        "قسّم الوقت إلى جلسات مذاكرة قصيرة " +
        "مع فواصل للراحة.";

}

/* =========================================================
REVIEW
========================================================= */

function makeReview() {

    const text =
        document.getElementById(
            "review-text"
        ).value.trim();

    const result =
        document.getElementById(
            "stage-result"
        );

    if (!text) {

        result.textContent =
            "اكتب اسم الدرس أولًا.";

        return;
    }

    result.innerHTML =

        "📖 مراجعة: " +
        escapeHTML(text) +

        "<br><br>" +

        "✅ اقرأ النقاط الأساسية" +
        "<br>" +

        "✅ اكتب أهم القوانين أو الأفكار" +
        "<br>" +

        "✅ اختبر نفسك بدون النظر للكتاب.";

}

/* =========================================================
DATE & TIME
========================================================= */

function showDateTime() {

    const result =
        document.getElementById(
            "stage-result"
        );

    const now =
        new Date();

    result.textContent =
        now.toLocaleString("ar-EG");

}

/* =========================================================
KINDERGARTEN
========================================================= */

function letterGame() {

    document.getElementById(
        "stage-result"
    ).textContent =
        "🎯 ما الحرف الذي يأتي بعد أ؟ الإجابة: ب";

}

function numberGame() {

    document.getElementById(
        "stage-result"
    ).textContent =
        "🎯 ما الرقم الذي يأتي بعد ٣؟ الإجابة: ٤";

}

function colorGame() {

    document.getElementById(
        "stage-result"
    ).textContent =
        "🎨 لون السماء غالبًا؟ الإجابة: أزرق 🔵";

}

function shapeGame() {

    document.getElementById(
        "stage-result"
    ).textContent =
        "🔺 الشكل الذي له 3 أضلاع هو: المثلث.";

}

function activityAnswer() {

    document.getElementById(
        "stage-result"
    ).textContent =
        "🎉 الإجابة هي 5️⃣";

}

function gameAnswer(answer) {

    document.getElementById(
        "stage-result"
    ).textContent =

        answer === 10
            ? "🎉 ممتاز! إجابة صحيحة."
            : "❌ حاول مرة أخرى.";

}

/* =========================================================
USEFUL TOOLS
========================================================= */

function calculatePercentage() {

    const total =
        Number(
            document.getElementById(
                "percent-total"
            ).value
        );

    const score =
        Number(
            document.getElementById(
                "percent-score"
            ).value
        );

    const result =
        document.getElementById(
            "percentage-result"
        );

    if (
        total <= 0 ||
        score < 0 ||
        score > total
    ) {

        result.textContent =
            "اكتب الدرجات بشكل صحيح.";

        return;
    }

    result.textContent =
        "النسبة = " +
        ((score / total) * 100).toFixed(2) +
        "%";

}

function calculateRequired() {

    const total =
        Number(
            document.getElementById(
                "required-total"
            ).value
        );

    const current =
        Number(
            document.getElementById(
                "required-current"
            ).value
        );

    const target =
        Number(
            document.getElementById(
                "required-percent"
            ).value
        );

    const result =
        document.getElementById(
            "required-result"
        );

    if (
        total <= 0 ||
        current < 0 ||
        target < 0 ||
        target > 100
    ) {

        result.textContent =
            "اكتب البيانات بشكل صحيح.";

        return;
    }

    const targetScore =
        total * target / 100;

    const needed =
        targetScore - current;

    if (needed <= 0) {

        result.textContent =
            "أنت وصلت بالفعل للنسبة المطلوبة أو تجاوزتها 🎉";

    } else {

        result.textContent =
            "تحتاج إلى " +
            needed.toFixed(2) +
            " درجة.";

    }

}

/* =========================================================
TIMER
========================================================= */

let timerInterval = null;
let timerSeconds = 0;

function startTimer() {

    const minutes =
        Number(
            document.getElementById(
                "timer-minutes"
            ).value
        );

    const display =
        document.getElementById(
            "timer-display"
        );

    if (
        !display ||
        minutes <= 0
    ) {

        if (display) {
            display.textContent =
                "اكتب عدد الدقائق";
        }

        return;
    }

    clearInterval(timerInterval);

    timerSeconds =
        Math.floor(minutes * 60);

    updateTimer();

    timerInterval =
        setInterval(
            function() {

                timerSeconds--;

                updateTimer();

                if (
                    timerSeconds <= 0
                ) {

                    clearInterval(
                        timerInterval
                    );

                    timerInterval = null;

                    alert(
                        "⏰ انتهى وقت المذاكرة!"
                    );

                }

            },
            1000
        );

}

function updateTimer() {

    const display =
        document.getElementById(
            "timer-display"
        );

    if (!display) {
        return;
    }

    const minutes =
        Math.floor(
            timerSeconds / 60
        );

    const seconds =
        timerSeconds % 60;

    display.textContent =

        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");

}

function stopTimer() {

    clearInterval(timerInterval);

    timerInterval = null;

}

/* =========================================================
EXAM COUNTDOWN
========================================================= */

function examCountdown() {

    const date =
        document.getElementById(
            "exam-date"
        ).value;

    const result =
        document.getElementById(
            "exam-result"
        );

    if (!date) {

        result.textContent =
            "اختار تاريخ الامتحان.";

        return;
    }

    const exam =
        new Date(
            date + "T00:00:00"
        );

    const now =
        new Date();

    const difference =
        exam - now;

    if (difference <= 0) {

        result.textContent =
            "موعد الامتحان وصل أو انتهى.";

        return;
    }

    const days =
        Math.ceil(
            difference / 86400000
        );

    result.textContent =
        "متبقي " +
        days +
        " يوم على الامتحان 📅";

}

/* =========================================================
AGE
========================================================= */

function calculateAge() {

    const value =
        document.getElementById(
            "birth-date"
        ).value;

    const result =
        document.getElementById(
            "age-result"
        );

    if (!value) {

        result.textContent =
            "اختار تاريخ الميلاد.";

        return;
    }

    const birth =
        new Date(value);

    const today =
        new Date();

    let age =
        today.getFullYear() -
        birth.getFullYear();

    const month =
        today.getMonth() -
        birth.getMonth();

    if (
        month < 0 ||
        (
            month === 0 &&
            today.getDate() <
            birth.getDate()
        )
    ) {

        age--;

    }

    result.textContent =
        "عمرك تقريبًا " +
        age +
        " سنة 🎂";

}

/* =========================================================
DATE DIFFERENCE
========================================================= */

function dateDifference() {

    const first =
        document.getElementById(
            "date-one"
        ).value;

    const second =
        document.getElementById(
            "date-two"
        ).value;

    const result =
        document.getElementById(
            "date-result"
        );

    if (!first || !second) {

        result.textContent =
            "اختار التاريخين.";

        return;
    }

    const date1 =
        new Date(first);

    const date2 =
        new Date(second);

    const difference =
        Math.abs(date2 - date1);

    const days =
        Math.ceil(
            difference / 86400000
        );

    result.textContent =
        "الفرق = " +
        days +
        " يوم.";

}

/* =========================================================
CALCULATOR
========================================================= */

function calculate() {

    const input =
        document.getElementById(
            "calculator-input"
        ).value.trim();

    const result =
        document.getElementById(
            "calculator-result"
        );

    if (!input) {

        result.textContent =
            "اكتب عملية حسابية.";

        return;
    }

    if (
        !/^[0-9+\-*/().%\s]+$/.test(input)
    ) {

        result.textContent =
            "العملية غير مسموحة.";

        return;
    }

    try {

        const answer =
            Function(
                '"use strict"; return (' +
                input +
                ')'
            )();

        if (
            typeof answer !== "number" ||
            !Number.isFinite(answer)
        ) {

            throw new Error();

        }

        result.textContent =
            "الناتج = " +
            answer;

    } catch {

        result.textContent =
            "تأكد من كتابة العملية بشكل صحيح.";

    }

}

/* =========================================================
UNITS
========================================================= */

function convertUnit() {

    const value =
        Number(
            document.getElementById(
                "unit-value"
            ).value
        );

    const type =
        document.getElementById(
            "unit-type"
        ).value;

    const result =
        document.getElementById(
            "unit-result"
        );

    if (isNaN(value)) {

        result.textContent =
            "اكتب قيمة صحيحة.";

        return;
    }

    if (type === "km-m") {

        result.textContent =
            value * 1000 +
            " متر";

    }

    else if (type === "m-km") {

        result.textContent =
            value / 1000 +
            " كيلومتر";

    }

    else if (type === "kg-g") {

        result.textContent =
            value * 1000 +
            " جرام";

    }

    else if (type === "g-kg") {

        result.textContent =
            value / 1000 +
            " كيلوجرام";

    }

}

/* =========================================================
OFFICIAL BOOK LIBRARY
========================================================= */

const bookData = {

    secondary: {

        grades: {

            first: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم المتكاملة",
                "التاريخ",
                "البرمجة والذكاء الاصطناعي"
            ],

            second: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "الفيزياء",
                "الكيمياء",
                "التاريخ"
            ],

            third: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "الفيزياء",
                "الكيمياء",
                "الأحياء",
                "الجيولوجيا"
            ]

        }

    },

    preparatory: {

        grades: {

            first: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم",
                "الدراسات الاجتماعية"
            ],

            second: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم",
                "الدراسات الاجتماعية"
            ],

            third: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم",
                "الدراسات الاجتماعية"
            ]

        }

    },

    primary: {

        grades: {

            first: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم"
            ],

            second: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم"
            ],

            third: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم"
            ],

            fourth: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم",
                "الدراسات الاجتماعية"
            ],

            fifth: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم",
                "الدراسات الاجتماعية"
            ],

            sixth: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "العلوم",
                "الدراسات الاجتماعية"
            ]

        }

    },

    kindergarten: {

        grades: {

            kg1: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "أنشطة"
            ],

            kg2: [
                "اللغة العربية",
                "اللغة الإنجليزية",
                "الرياضيات",
                "أنشطة"
            ]

        }

    }

};

function updateBookGrades() {

    const stage =
        document.getElementById(
            "book-stage"
        ).value;

    const grade =
        document.getElementById(
            "book-grade"
        );

    const subject =
        document.getElementById(
            "book-subject"
        );

    grade.innerHTML = `
        <option value="">
            📚 اختر الصف
        </option>
    `;

    subject.innerHTML = `
        <option value="">
            📖 اختر المادة
        </option>
    `;

    if (
        !stage ||
        !bookData[stage]
    ) {
        return;
    }

    const grades =
        bookData[stage].grades;

    Object.keys(grades).forEach(
        function(key) {

            const names = {

                first: "الأول",

                second: "الثاني",

                third: "الثالث",

                fourth: "الرابع",

                fifth: "الخامس",

                sixth: "السادس",

                kg1: "KG 1",

                kg2: "KG 2"

            };

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                key;

            option.textContent =
                names[key] || key;

            grade.appendChild(
                option
            );

        }
    );

}

function updateBookSubjects() {

    const stage =
        document.getElementById(
            "book-stage"
        ).value;

    const grade =
        document.getElementById(
            "book-grade"
        ).value;

    const subject =
        document.getElementById(
            "book-subject"
        );

    subject.innerHTML = `
        <option value="">
            📖 اختر المادة
        </option>
    `;

    if (
        !stage ||
        !grade ||
        !bookData[stage]
    ) {
        return;
    }

    const subjects =
        bookData[stage]
            .grades[grade];

    if (!subjects) {
        return;
    }

    subjects.forEach(
        function(item) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                item;

            option.textContent =
                item;

            subject.appendChild(
                option
            );

        }
    );

}

function showBooks() {

    const stage =
        document.getElementById(
            "book-stage"
        ).value;

    const grade =
        document.getElementById(
            "book-grade"
        ).value;

    const subject =
        document.getElementById(
            "book-subject"
        ).value;

    const result =
        document.getElementById(
            "books-result"
        );

    if (
        !stage ||
        !grade ||
        !subject
    ) {

        result.innerHTML = `
            <div class="book-result-card">
                ⚠️ اختار المرحلة والصف والمادة أولًا.
            </div>
        `;

        return;
    }

    const stageName =
        document
            .getElementById("book-stage")
            .selectedOptions[0]
            .textContent;

    const gradeName =
        document
            .getElementById("book-grade")
            .selectedOptions[0]
            .textContent;

    result.innerHTML = `

        <div class="book-result-card">

            <div class="book-result-icon">
                📖
            </div>

            <h3>
                ${escapeHTML(subject)}
            </h3>

            <p>
                ${escapeHTML(stageName)}
                -
                الصف ${escapeHTML(gradeName)}
            </p>

            <a
                href="${OFFICIAL_BOOKS_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="book-open-btn"
            >
                📚 افتح كتاب المادة
            </a>

            <a
                href="${OFFICIAL_BOOKS_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="book-open-btn secondary-book-link"
            >
                🔎 فتح المكتبة الرسمية
            </a>

            <small>
                المصدر الرسمي: وزارة التربية والتعليم المصرية
            </small>

            <div class="book-note">
                بعد الفتح اختار نفس المرحلة والصف والمادة
                لتحصل على النسخة الإلكترونية المتاحة.
            </div>

        </div>

    `;

}

/* =========================================================
LESSON SUMMARIZER
========================================================= */

function openSummarizer() {

    const modal =
        document.getElementById(
            "summarizer-modal"
        );

    if (!modal) {
        return;
    }

    modal.classList.add("show");

    setModalState(true);

    setTimeout(() => {

        const text =
            document.getElementById(
                "summary-text"
            );

        if (text) {
            text.focus();
        }

    }, 100);

}

function closeSummarizer() {

    const modal =
        document.getElementById(
            "summarizer-modal"
        );

    if (modal) {
        modal.classList.remove("show");
    }

    if (
        !document.getElementById("ai-modal")
            ?.classList.contains("show")
    ) {

        setModalState(false);

    }

}

function switchSummaryMode(mode, button) {

    const textMode =
        document.getElementById(
            "summary-text-mode"
        );

    const voiceMode =
        document.getElementById(
            "summary-voice-mode"
        );

    document
        .querySelectorAll(".summary-tab")
        .forEach(
            tab => tab.classList.remove("active")
        );

    if (button) {
        button.classList.add("active");
    }

    if (mode === "voice") {

        textMode.classList.add("hidden");

        voiceMode.classList.remove("hidden");

    } else {

        voiceMode.classList.add("hidden");

        textMode.classList.remove("hidden");

    }

}

/* =========================================================
SUMMARY API
========================================================= */

async function requestSummary(sourceText) {

    const cleanText =
        String(sourceText || "").trim();

    if (!cleanText) {

        throw new Error(
            "مفيش محتوى كفاية للتلخيص."
        );

    }

    const summaryPrompt =

        "أنت أداة تلخيص دروس داخل منصة Diablo التعليمية. " +
        "لخص النص التالي بالعربية بشكل واضح ومنظم للطالب. " +
        "استخرج أهم الأفكار والقوانين والتعريفات والنقاط المهمة. " +
        "لا تضف معلومات غير موجودة في النص. " +
        "استخدم عناوين ونقاط مختصرة، وفي النهاية اكتب " +
        "قسمًا صغيرًا بعنوان: أهم ما يجب حفظه. " +
        "النص المراد تلخيصه:\n\n" +
        cleanText;

    const response =
        await fetch(
            DIABLO_AI_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    messages: [

                        {
                            role: "user",
                            content: summaryPrompt
                        }

                    ]

                })

            }
        );

    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "الـWorker أرسل ردًا غير مفهوم."
        );

    }

    if (!response.ok) {

        throw new Error(

            data?.error ||
            data?.message ||
            "حصل خطأ أثناء التلخيص."

        );

    }

    const result =
        extractAIText(data);

    if (!result) {

        throw new Error(
            "لم يصل ملخص من Diablo AI."
        );

    }

    return result;

}

async function summarizeText() {

    const input =
        document.getElementById(
            "summary-text"
        );

    const answer =
        document.getElementById(
            "summary-answer"
        );

    if (!input || !answer) {
        return;
    }

    const text =
        input.value.trim();

    if (!text) {

        answer.style.display = "block";

        answer.textContent =
            "الصق نص الدرس الأول.";

        return;
    }

    answer.style.display = "block";

    answer.innerHTML =
        "<strong>📝 جاري تلخيص الدرس...</strong>";

    try {

        const summary =
            await requestSummary(text);

        answer.innerHTML =

            "<strong>📝 ملخص الدرس</strong>" +
            "<br><br>" +

            escapeHTML(summary)
                .replace(/\n/g, "<br>");

    } catch (error) {

        console.error(
            "Summary Error:",
            error
        );

        answer.innerHTML =

            "<strong>⚠️ حصلت مشكلة</strong>" +
            "<br><br>" +

            escapeHTML(
                error?.message ||
                "تعذر إنشاء الملخص."
            );

    }

}

async function summarizeVoiceTranscript() {

    const transcript =
        document.getElementById(
            "voice-transcript"
        );

    const answer =
        document.getElementById(
            "summary-answer"
        );

    if (!transcript || !answer) {
        return;
    }

    const text =
        transcript.value.trim();

    if (!text) {

        answer.style.display = "block";

        answer.textContent =
            "مفيش كلام متسجل للتلخيص. سجل الأول أو اكتب التفريغ النصي.";

        return;
    }

    answer.style.display = "block";

    answer.innerHTML =
        "<strong>📝 جاري تلخيص التسجيل...</strong>";

    try {

        const summary =
            await requestSummary(text);

        answer.innerHTML =

            "<strong>📝 ملخص التسجيل</strong>" +
            "<br><br>" +

            escapeHTML(summary)
                .replace(/\n/g, "<br>");

    } catch (error) {

        console.error(
            "Voice Summary Error:",
            error
        );

        answer.innerHTML =

            "<strong>⚠️ حصلت مشكلة</strong>" +
            "<br><br>" +

            escapeHTML(
                error?.message ||
                "تعذر تلخيص التسجيل."
            );

    }

}

/* =========================================================
VOICE RECORDING + SPEECH RECOGNITION
========================================================= */

let mediaRecorder = null;
let recordedChunks = [];

let speechRecognition = null;
let speechRecognitionSupported = false;

let recordingTimerInterval = null;
let recordingSeconds = 0;

let isRecording = false;
let shouldRestartSpeechRecognition = false;
let finalTranscript = "";

/*
   دعم Chrome / Android / Edge
*/

const SpeechRecognitionAPI =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognitionAPI) {
    speechRecognitionSupported = true;
}

/* =========================================================
START RECORDING
========================================================= */

async function startRecording() {

    const startButton =
        document.getElementById(
            "start-recording-btn"
        );

    const stopButton =
        document.getElementById(
            "stop-recording-btn"
        );

    const status =
        document.getElementById(
            "voice-status"
        );

    const transcript =
        document.getElementById(
            "voice-transcript"
        );

    if (
        !startButton ||
        !stopButton ||
        !status ||
        !transcript
    ) {
        return;
    }

    if (isRecording) {
        return;
    }

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        status.textContent =
            "⚠️ المتصفح لا يدعم استخدام الميكروفون.";

        return;
    }

    const canTranscribeInBrowser = speechRecognitionSupported;

    startButton.disabled = true;

    stopButton.disabled = true;

    status.textContent =
        "⏳ جاري تجهيز الميكروفون...";

    recordedChunks = [];

    finalTranscript =
        transcript.value.trim();

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

        try {

            mediaRecorder =
                new MediaRecorder(stream);

        } catch (error) {

            console.error(
                "MediaRecorder Error:",
                error
            );

            stream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            startButton.disabled = false;

            status.textContent =
                "⚠️ المتصفح لا يدعم تسجيل الصوت.";

            return;
        }

        mediaRecorder.ondataavailable =
            function(event) {

                if (
                    event.data &&
                    event.data.size > 0
                ) {

                    recordedChunks.push(
                        event.data
                    );

                }

            };

        const activeRecorder = mediaRecorder;
        mediaRecorder.onstop = async function() {
            stream.getTracks().forEach(track => track.stop());
            // If browser speech recognition produced no text, ask the secure Worker to transcribe the saved recording.
            const transcriptBox = document.getElementById("voice-transcript");
            if (!transcriptBox || transcriptBox.value.trim() || !recordedChunks.length) return;
            const blob = new Blob(recordedChunks, { type: activeRecorder?.mimeType || recordedChunks[0]?.type || "audio/webm" });
            if (blob.size > 20 * 1024 * 1024) {
                const voiceStatus = document.getElementById("voice-status");
                if (voiceStatus) voiceStatus.textContent = "التسجيل أكبر من 20 ميجابايت. قصّر التسجيل ثم حاول مرة أخرى.";
                return;
            }
            const voiceStatus = document.getElementById("voice-status");
            if (voiceStatus) voiceStatus.textContent = "⏳ التسجيل اتحفظ. جاري تحويله لنص…";
            try {
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ""));
                    reader.onerror = () => reject(new Error("تعذر قراءة التسجيل من الجهاز."));
                    reader.readAsDataURL(blob);
                });
                const response = await fetch(DIABLO_TRANSCRIBE_URL, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ audioBase64: dataUrl, mimeType: blob.type || "audio/webm" })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.text) throw new Error(result.error || "خدمة تحويل الصوت لنص غير جاهزة.");
                transcriptBox.value = [transcriptBox.value.trim(), result.text.trim()].filter(Boolean).join("\n");
                transcriptBox.dispatchEvent(new Event("input", { bubbles: true }));
                if (voiceStatus) voiceStatus.textContent = "✅ تم تحويل التسجيل لنص. تقدر دلوقتي تلخّص الدرس.";
            } catch (error) {
                console.error("DIABLO transcription error", error);
                if (voiceStatus) voiceStatus.textContent = "⚠️ " + (error?.message || "تعذر تحويل التسجيل لنص.") + " تقدر تكتب النص يدويًا أو تراجع إعدادات خادم DIABLO.";
            }
        };

        mediaRecorder.start(250);

        isRecording = true;

        shouldRestartSpeechRecognition = true;

        stopButton.disabled = false;

        startRecordingTimer();

        status.textContent = canTranscribeInBrowser
            ? "🔴 التسجيل شغال... اتكلم براحتك، والكلام المفروض يظهر في مربع النص."
            : "🔴 التسجيل شغال، لكن المتصفح لا يدعم تحويل الصوت لنص. جرّب Chrome أو اكتب التفريغ يدويًا قبل التلخيص.";

        if (canTranscribeInBrowser) {
            startSpeechRecognition();
        }

    } catch (error) {

        console.error(
            "Microphone Error:",
            error
        );

        isRecording = false;

        shouldRestartSpeechRecognition =
            false;

        startButton.disabled = false;

        stopButton.disabled = true;

        if (
            error &&
            error.name === "NotAllowedError"
        ) {

            status.textContent =
                "⚠️ اسمح للموقع باستخدام الميكروفون من إعدادات المتصفح ثم جرّب مرة تانية.";

        } else if (
            error &&
            error.name === "NotFoundError"
        ) {

            status.textContent =
                "⚠️ لم يتم العثور على ميكروفون.";

        } else {

            status.textContent =
                "⚠️ حصلت مشكلة في تشغيل الميكروفون.";

        }

    }

}

/* =========================================================
STOP RECORDING
========================================================= */

function stopRecording() {

    const startButton =
        document.getElementById(
            "start-recording-btn"
        );

    const stopButton =
        document.getElementById(
            "stop-recording-btn"
        );

    const status =
        document.getElementById(
            "voice-status"
        );

    shouldRestartSpeechRecognition =
        false;

    isRecording = false;

    stopSpeechRecognition();

    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {

        try {

            mediaRecorder.stop();

        } catch (error) {

            console.warn(
                "MediaRecorder stop error:",
                error
            );

        }

    }

    mediaRecorder = null;

    stopRecordingTimer();

    if (startButton) {
        startButton.disabled = false;
    }

    if (stopButton) {
        stopButton.disabled = true;
    }

    if (status) {

        const transcript =
            document.getElementById(
                "voice-transcript"
            );

        const text =
            transcript
                ? transcript.value.trim()
                : "";

        if (text) {

            status.textContent =
                "✅ التسجيل انتهى. النص جاهز للتلخيص.";

        } else {

            status.textContent = !speechRecognitionSupported
                ? "⏹️ التسجيل انتهى، لكن المتصفح لا يدعم تحويل الكلام إلى نص. افتح الموقع في Chrome محدّث، أو اكتب التفريغ يدويًا ثم اضغط لخص التسجيل."
                : "⏹️ التسجيل انتهى، لكن مفيش نص اتعرف عليه. اتأكد من إذن الميكروفون والإنترنت، وجرّب Chrome محدّث أو اكتب التفريغ يدويًا.";

        }

    }

}

/* =========================================================
START SPEECH RECOGNITION
========================================================= */

function startSpeechRecognition() {

    if (!speechRecognitionSupported) {

        const status =
            document.getElementById(
                "voice-status"
            );

        if (status) {

            status.textContent =
                "⚠️ تحويل الكلام إلى نص غير مدعوم في المتصفح. جرّب Google Chrome على Android.";

        }

        return;

    }

    if (speechRecognition) {

        try {

            speechRecognition.onend = null;

            speechRecognition.stop();

        } catch {

            // تجاهل

        }

        speechRecognition = null;

    }

    const Recognition =
        SpeechRecognitionAPI;

    try {

        speechRecognition =
            new Recognition();

    } catch (error) {

        console.error(
            "Speech Recognition Creation Error:",
            error
        );

        return;

    }

    speechRecognition.lang =
        "ar-EG";

    speechRecognition.continuous =
        true;

    speechRecognition.interimResults =
        true;

    speechRecognition.maxAlternatives =
        1;

    const transcript =
        document.getElementById(
            "voice-transcript"
        );

    if (transcript) {

        const existingText =
            transcript.value.trim();

        if (existingText) {

            finalTranscript =
                existingText;

        }

    }

    speechRecognition.onstart = function() {
        const status = document.getElementById("voice-status");
        if (status && isRecording) status.textContent = "🎙️ بسمع كلامك دلوقتي... لو الكلام مش بيظهر، اتأكد من الإنترنت وإذن الميكروفون.";
    };

    speechRecognition.onresult =
        function(event) {

            let interimText = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                const result =
                    event.results[i];

                if (
                    !result ||
                    !result[0]
                ) {
                    continue;
                }

                const spokenText =
                    result[0].transcript.trim();

                if (!spokenText) {
                    continue;
                }

                if (
                    result.isFinal
                ) {

                    if (finalTranscript) {

                        finalTranscript +=
                            " " +
                            spokenText;

                    } else {

                        finalTranscript =
                            spokenText;

                    }

                } else {

                    interimText +=
                        spokenText +
                        " ";

                }

            }

            if (transcript) {

                transcript.value =
                    (
                        finalTranscript +
                        (
                            interimText
                                ? " " + interimText.trim()
                                : ""
                        )
                    ).trim();

                transcript.scrollTop =
                    transcript.scrollHeight;

            }

            const status =
                document.getElementById(
                    "voice-status"
                );

            if (
                status &&
                isRecording
            ) {

                if (interimText) {

                    status.textContent =
                        "🎙️ بسمعك...";

                } else {

                    status.textContent =
                        "🔴 التسجيل شغال...";

                }

            }

        };

    speechRecognition.onerror =
        function(event) {

            console.warn(
                "Speech Recognition Error:",
                event.error
            );

            const status =
                document.getElementById(
                    "voice-status"
                );

            if (
                event.error ===
                "not-allowed"
            ) {

                if (status) {

                    status.textContent =
                        "⚠️ اسمح للمتصفح باستخدام الميكروفون والتعرف على الكلام.";

                }

                shouldRestartSpeechRecognition =
                    false;

                return;
            }

            if (
                event.error ===
                "no-speech"
            ) {

                if (
                    status &&
                    isRecording
                ) {

                    status.textContent =
                        "🎙️ مش سامع كلام... اتكلم بصوت أوضح.";

                }

                return;
            }

            if (event.error === "service-not-allowed" || event.error === "language-not-supported") {
                if (status) status.textContent = "⚠️ خدمة تحويل الكلام لنص غير متاحة في المتصفح أو اللغة الحالية. جرّب Chrome محدّث، أو اكتب النص يدويًا. التسجيل الصوتي وحده لا يحوّل الكلام لنص تلقائيًا.";
                shouldRestartSpeechRecognition = false;
                return;
            }

            if (
                event.error ===
                "network"
            ) {

                if (status) {

                    status.textContent =
                        "⚠️ التعرف على الكلام محتاج اتصال بالإنترنت.";

                }

                return;
            }

            if (
                status &&
                isRecording
            ) {

                status.textContent =
                    "🎙️ التسجيل شغال...";

            }

        };

    speechRecognition.onend =
        function() {

            if (
                shouldRestartSpeechRecognition &&
                isRecording
            ) {

                setTimeout(
                    function() {

                        if (
                            !shouldRestartSpeechRecognition ||
                            !isRecording
                        ) {
                            return;
                        }

                        try {

                            if (
                                speechRecognition
                            ) {

                                speechRecognition.start();

                            }

                        } catch (error) {

                            console.warn(
                                "Speech recognition restart error:",
                                error
                            );

                        }

                    },
                    300
                );

            }

        };

    try {

        speechRecognition.start();

        console.log(
            "DIABLO Speech Recognition started."
        );

    } catch (error) {

        console.warn(
            "Speech recognition could not start:",
            error
        );

    }

}

/* =========================================================
STOP SPEECH RECOGNITION
========================================================= */

function stopSpeechRecognition() {

    shouldRestartSpeechRecognition =
        false;

    if (!speechRecognition) {
        return;
    }

    try {

        speechRecognition.onend =
            null;

        speechRecognition.stop();

    } catch (error) {

        console.warn(
            "Speech recognition stop error:",
            error
        );

    }

    speechRecognition =
        null;

}

/* =========================================================
CLEAR VOICE TRANSCRIPT
========================================================= */

function clearVoiceTranscript() {

    const transcript =
        document.getElementById(
            "voice-transcript"
        );

    if (transcript) {

        transcript.value = "";

    }

    finalTranscript = "";

}

/* =========================================================
RECORDING TIMER
========================================================= */

function startRecordingTimer() {

    recordingSeconds = 0;

    updateRecordingTimer();

    clearInterval(
        recordingTimerInterval
    );

    recordingTimerInterval =
        setInterval(
            function() {

                recordingSeconds++;

                updateRecordingTimer();

            },
            1000
        );

}

function stopRecordingTimer() {

    clearInterval(
        recordingTimerInterval
    );

    recordingTimerInterval =
        null;

}

function updateRecordingTimer() {

    const display =
        document.getElementById(
            "recording-time"
        );

    if (!display) {
        return;
    }

    const minutes =
        Math.floor(
            recordingSeconds / 60
        );

    const seconds =
        recordingSeconds % 60;

    display.textContent =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");

}

/* =========================================================
MODAL OUTSIDE CLICK
========================================================= */

window.addEventListener(
"click",
function(event) {

    const aiModal =
        document.getElementById(
            "ai-modal"
        );

    const summaryModal =
        document.getElementById(
            "summarizer-modal"
        );

    if (
        aiModal &&
        event.target === aiModal
    ) {

        closeAI();

    }

    if (
        summaryModal &&
        event.target === summaryModal
    ) {

        closeSummarizer();

    }

}

);

/* =========================================================
ESCAPE KEY
========================================================= */

window.addEventListener(
"keydown",
function(event) {

    if (event.key !== "Escape") {
        return;
    }

    closeAI();

    closeSummarizer();

}

);

/* =========================================================
DIABLO PWA SERVICE WORKER
========================================================= */

if ("serviceWorker" in navigator) {

    window.addEventListener("load", async () => {

        try {

            const registration =
                await navigator.serviceWorker.register(
                    "./service-worker.js",
                    {
                        scope: "./"
                    }
                );

            console.log(
                "DIABLO Service Worker registered:",
                registration.scope
            );

        } catch (error) {

            console.error(
                "DIABLO Service Worker registration failed:",
                error
            );

        }

    });

}

/* =========================================================
   DIABLO PLUS: FILES, QUIZZES, PLANS, PROGRESS, TRANSLATOR, QR
   Additive module; original tools/functions remain intact.
========================================================= */

function setFeatureMessage(id, message, isError = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.display = "block";
    el.style.color = isError ? "#ff9b9b" : "";
}

async function processStudyFile() {
    const input = document.getElementById("study-file");
    const file = input?.files?.[0];
    if (!file) {
        setFeatureMessage("study-file-status", "اختار ملف PDF أو صورة أو ملف نصي الأول.", true);
        return;
    }
    const status = document.getElementById("study-file-status");
    const result = document.getElementById("study-file-result");
    if (status) status.textContent = "⏳ جاري قراءة الملف...";
    if (result) result.textContent = "";
    try {
        let extracted = "";
        if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
            extracted = await file.text();
        } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
            if (!window.pdfjsLib) throw new Error("مكتبة قراءة PDF لم تُحمّل. تأكد من اتصال الإنترنت ثم حدّث الصفحة.");
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            const buffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
            const pageTexts = [];
            for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
                const page = await pdf.getPage(pageNo);
                const content = await page.getTextContent();
                pageTexts.push(content.items.map(item => item.str).join(" "));
            }
            extracted = pageTexts.join("\n\n");
            if (!extracted.trim()) throw new Error("الـPDF غالبًا عبارة عن صور ممسوحة. جرّب رفع صورة واضحة للصفحة بدلًا منه.");
        } else if (file.type.startsWith("image/")) {
            if (!window.Tesseract) throw new Error("مكتبة قراءة الصور لم تُحمّل. تأكد من اتصال الإنترنت ثم حدّث الصفحة.");
            if (status) status.textContent = "⏳ جاري استخراج الكلام من الصورة، وده ممكن ياخد شوية وقت...";
            const ocr = await window.Tesseract.recognize(file, "ara+eng");
            extracted = ocr?.data?.text || "";
        } else {
            throw new Error("نوع الملف غير مدعوم. استخدم PDF أو صورة أو TXT.");
        }
        extracted = extracted.trim();
        if (extracted.length < 20) throw new Error("النص المستخرج قليل جدًا. جرّب ملف أو صورة أوضح.");
        if (status) status.textContent = "✅ تم استخراج النص. جاري إنشاء الملخص...";
        const summary = await requestSummary(extracted);
        if (result) {
            result.textContent = "ملخص الملف:\n\n" + summary;
            result.style.display = "block";
        }
        if (status) status.textContent = "✅ اكتمل استخراج النص والتلخيص.";
        addStudyPoints("file-summary");
    } catch (error) {
        console.error("DIABLO file summary error:", error);
        setFeatureMessage("study-file-status", "⚠️ " + (error?.message || "تعذر قراءة الملف أو تلخيصه."), true);
    }
}

async function generateLessonQuiz() {
    const topic = document.getElementById("quiz-topic")?.value.trim() || "الدرس المرفق";
    const source = document.getElementById("quiz-source")?.value.trim() || "";
    const out = document.getElementById("quiz-result");
    if (!source && !topic) return setFeatureMessage("quiz-result", "اكتب اسم الدرس أو محتواه الأول.", true);
    if (out) { out.style.display = "block"; out.textContent = "⏳ جاري إعداد الاختبار..."; }
    try {
        const prompt = "أنت منشئ اختبارات تعليمية لمنصة DIABLO. أنشئ 8 أسئلة باللغة العربية عن الموضوع التالي: " + topic + ". " +
            "نوّع بين اختيار من متعدد وصح/غلط وأسئلة قصيرة، وضع الإجابة الصحيحة وتفسيرًا مختصرًا بعد كل سؤال. " +
            "لا تدّعِ أن الأسئلة مأخوذة من منهج رسمي إذا لم يكن ذلك واضحًا. " + (source ? "اعتمد أساسًا على المحتوى التالي ولا تضف معلومات خارجه: \n" + source : "");
        const response = await fetch(DIABLO_AI_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || data?.message || "تعذر إنشاء الاختبار.");
        const text = extractAIText(data);
        if (!text) throw new Error("لم يصل اختبار من Diablo AI.");
        if (out) out.textContent = text;
        addStudyPoints("quiz-generated");
    } catch (error) {
        console.error("DIABLO quiz error:", error);
        setFeatureMessage("quiz-result", "⚠️ " + (error?.message || "حصلت مشكلة أثناء إنشاء الاختبار."), true);
    }
}

async function createSmartStudyPlan() {
    const subjects = document.getElementById("plan-subjects")?.value.trim() || "";
    const days = Math.max(1, Math.min(90, Number(document.getElementById("plan-days")?.value) || 7));
    const hours = Math.max(1, Math.min(12, Number(document.getElementById("plan-hours")?.value) || 3));
    const out = document.getElementById("smart-plan-result");
    if (!subjects) return setFeatureMessage("smart-plan-result", "اكتب المواد والدروس اللي محتاج تذاكرها الأول.", true);
    if (out) { out.style.display = "block"; out.textContent = "⏳ جاري تنظيم خطة المذاكرة..."; }
    try {
        const prompt = "أنشئ خطة مذاكرة عملية باللغة العربية لمدة " + days + " يومًا، بمعدل " + hours + " ساعات يوميًا، بناءً فقط على المواد والدروس التالية: \n" + subjects +
            "\nوزّع الوقت على فترات قصيرة، وأضف مراجعة واستراحات واختبارًا ذاتيًا. لا تفترض مواعيد امتحانات لم يذكرها الطالب.";
        const response = await fetch(DIABLO_AI_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || data?.message || "تعذر إنشاء الخطة.");
        const text = extractAIText(data);
        if (!text) throw new Error("لم تصل خطة من Diablo AI.");
        if (out) out.textContent = text;
        addStudyPoints("plan-created");
    } catch (error) {
        console.error("DIABLO plan error:", error);
        setFeatureMessage("smart-plan-result", "⚠️ " + (error?.message || "حصلت مشكلة أثناء إنشاء الخطة."), true);
    }
}

const DIABLO_PROGRESS_KEY = "diabloStudyProgressV1";
function readStudyProgress() {
    try { return JSON.parse(localStorage.getItem(DIABLO_PROGRESS_KEY) || "{}"); }
    catch { return {}; }
}
function saveStudyProgress(data) {
    try { localStorage.setItem(DIABLO_PROGRESS_KEY, JSON.stringify(data)); }
    catch (error) { console.warn("Progress could not be saved:", error); }
}
function addStudyPoints(action) {
    const data = readStudyProgress();
    data.points = Number(data.points || 0) + 10;
    data.actions = Array.isArray(data.actions) ? data.actions : [];
    data.actions.push({ action, at: new Date().toISOString() });
    saveStudyProgress(data);
    renderStudyProgress();
}
function renderStudyProgress() {
    const data = readStudyProgress();
    const checks = [...document.querySelectorAll(".diablo-task")];
    const done = checks.filter(el => data.tasks?.includes(el.value));
    checks.forEach(el => { el.checked = !!data.tasks?.includes(el.value); });
    const pct = checks.length ? Math.round(done.length / checks.length * 100) : 0;
    const fill = document.getElementById("progress-fill");
    if (fill) fill.style.width = pct + "%";
    const summary = document.getElementById("progress-summary");
    if (summary) summary.textContent = "إنجازك: " + pct + "% — نقاطك: " + Number(data.points || 0);
    const badges = document.getElementById("achievement-badges");
    if (badges) {
        const earned = [];
        if (done.length >= 1) earned.push("🌱 أول خطوة");
        if (done.length >= 2) earned.push("📘 ملتزم بالمراجعة");
        if (done.length >= 4) earned.push("🏆 بطل الإنجاز");
        if (Number(data.points || 0) >= 50) earned.push("⚡ 50 نقطة");
        badges.innerHTML = earned.length ? earned.map(x => '<span class="achievement-badge">' + escapeHTML(x) + '</span>').join("") : '<span class="achievement-badge">ابدأ أول مهمة لفتح شارتك الأولى</span>';
    }
}
function resetStudyProgress() {
    if (!confirm("متأكد إنك عايز تمسح سجل الإنجاز والنقاط المحفوظة على الجهاز ده؟")) return;
    try { localStorage.removeItem(DIABLO_PROGRESS_KEY); } catch {}
    renderStudyProgress();
}

document.addEventListener("change", event => {
    if (!event.target?.classList?.contains("diablo-task")) return;
    const data = readStudyProgress();
    const tasks = new Set(Array.isArray(data.tasks) ? data.tasks : []);
    if (event.target.checked) tasks.add(event.target.value); else tasks.delete(event.target.value);
    data.tasks = [...tasks];
    saveStudyProgress(data);
    renderStudyProgress();
});

async function translateText() {
    const input = document.getElementById("translator-input");
    const language = document.getElementById("translator-language");
    const result = document.getElementById("translator-result");
    if (!input || !language || !result) return;
    const text = input.value.trim();
    if (!text) { result.textContent = "اكتب النص الأول عشان نترجمه."; result.style.display = "block"; return; }
    result.textContent = "⏳ جاري الترجمة..."; result.style.display = "block";
    try {
        const response = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=ar|" + encodeURIComponent(language.value));
        const data = await response.json();
        const translated = data?.responseData?.translatedText;
        if (!response.ok || !translated) throw new Error("لم تصل نتيجة الترجمة.");
        result.textContent = translated;
    } catch (error) {
        console.error("Translator Error:", error);
        result.textContent = "⚠️ حصلت مشكلة أثناء الترجمة. حاول مرة تانية.";
    }
}

function generateQRCode() {
    const input = document.getElementById("qr-input");
    const result = document.getElementById("qr-result");
    if (!input || !result) return;
    const text = input.value.trim();
    if (!text) { result.textContent = "اكتب رابط أو نص الأول."; return; }
    result.innerHTML = "";
    if (typeof QRCode === "undefined") { result.textContent = "⚠️ مكتبة QR Code لم يتم تحميلها."; return; }
    new QRCode(result, { text, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.H });
}

document.addEventListener("DOMContentLoaded", renderStudyProgress);


/* DIABLO AI chat workspace controller — UI/history layer */
let diabloCurrentChatId = null;
let diabloChatStore = [];
let diabloSending = false;
function diabloLoadChats(){try{const v=JSON.parse(localStorage.getItem('diablo_ai_chats_v2')||'[]');diabloChatStore=Array.isArray(v)?v:[]}catch{diabloChatStore=[]}renderDiabloHistory();}
function diabloSaveChats(){try{localStorage.setItem('diablo_ai_chats_v2',JSON.stringify(diabloChatStore.slice(0,50)))}catch(e){console.warn('Could not save DIABLO chats locally',e)}renderDiabloHistory();}
function diabloCurrentChat(){return diabloChatStore.find(c=>c.id===diabloCurrentChatId)||null;}
function startNewDiabloChat(){diabloCurrentChatId='d'+Date.now();diabloChatStore.unshift({id:diabloCurrentChatId,title:'محادثة جديدة',messages:[],updatedAt:Date.now()});aiMessages=[];renderDiabloChat();diabloSaveChats();document.getElementById('ai-question')?.focus();document.getElementById('diablo-sidebar')?.classList.remove('open');}
function renderDiabloHistory(){const list=document.getElementById('diablo-history-list');if(!list)return;list.innerHTML='';diabloChatStore.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).forEach(c=>{const b=document.createElement('button');b.className='diablo-history-item'+(c.id===diabloCurrentChatId?' active':'');b.innerHTML='<span></span><small>›</small>';b.querySelector('span').textContent=c.title||'محادثة جديدة';b.onclick=()=>loadDiabloChat(c.id);list.appendChild(b)});if(!list.children.length){const p=document.createElement('div');p.style.cssText='padding:12px;color:#7f8798;font-size:12px';p.textContent='لسه مفيش محادثات محفوظة.';list.appendChild(p)}}
function loadDiabloChat(id){const c=diabloChatStore.find(x=>x.id===id);if(!c)return;diabloCurrentChatId=id;aiMessages=(c.messages||[]).map(m=>({role:m.role,content:m.image?[{type:'text',text:String(m.content||m.displayText||'حلل الصورة المرفقة.')},{type:'image_url',image_url:{url:m.image,detail:'high'}}]:m.content}));renderDiabloChat();renderDiabloHistory();document.getElementById('diablo-sidebar')?.classList.remove('open');}
function clearDiabloHistory(){if(!confirm('تمسح كل المحادثات المحفوظة على الجهاز ده؟'))return;diabloChatStore=[];aiMessages=[];diabloCurrentChatId=null;try{localStorage.removeItem('diablo_ai_chats_v2')}catch{}renderDiabloChat();renderDiabloHistory();}
function toggleDiabloSidebar(){document.getElementById('diablo-sidebar')?.classList.toggle('open')}
function useDiabloPrompt(t){const i=document.getElementById('ai-question');if(i){i.value=t;i.focus();i.setSelectionRange(i.value.length,i.value.length)}}
function renderDiabloChat(){const box=document.getElementById('diablo-chat-messages');const welcome=document.getElementById('diablo-welcome');if(!box)return;const c=diabloCurrentChat();const msgs=c?.messages||[];box.innerHTML='';if(welcome)welcome.style.display=msgs.length?'none':'block';msgs.forEach(m=>appendDiabloMessage(m.role,m.displayText||((typeof m.content==='string')?m.content:''),m.image||''));const sc=document.getElementById('diablo-chat-scroll');if(sc)sc.scrollTop=sc.scrollHeight;renderDiabloHistory();}
function appendDiabloMessage(role,text,image=''){const box=document.getElementById('diablo-chat-messages');if(!box)return;const row=document.createElement('div');row.className='diablo-message '+(role==='assistant'?'assistant':'user');const avatar=document.createElement('div');avatar.className='diablo-message-avatar';avatar.textContent=role==='assistant'?'D':'أنت';const body=document.createElement('div');body.className='diablo-message-body';body.textContent=text||'';if(image){const im=document.createElement('img');im.src=image;im.alt='الصورة المرفقة';body.appendChild(im)}row.append(avatar,body);box.appendChild(row);const w=document.getElementById('diablo-welcome');if(w)w.style.display='none';const sc=document.getElementById('diablo-chat-scroll');if(sc)sc.scrollTop=sc.scrollHeight;return body;}
window.openAI=function(){const modal=document.getElementById('ai-modal');if(!modal)return;modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');diabloLoadChats();if(!diabloCurrentChatId||!diabloCurrentChat())startNewDiabloChat();else renderDiabloChat();setTimeout(()=>document.getElementById('ai-question')?.focus(),120)};
window.closeAI=function(){const modal=document.getElementById('ai-modal');if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true')}if(!document.getElementById('summarizer-modal')?.classList.contains('show'))document.body.classList.remove('modal-open');document.getElementById('diablo-sidebar')?.classList.remove('open')};
window.openDiabloPlus=function(){const p=document.getElementById('diablo-plus-modal');if(p)p.hidden=false};window.closeDiabloPlus=function(){const p=document.getElementById('diablo-plus-modal');if(p)p.hidden=true};
window.selectDiabloPlan=function(name,price){const d=document.getElementById('diablo-payment-details');if(!d)return;d.hidden=false;d.textContent='اخترت باقة '+name+' بسعر '+price+' جنيه. الدفع والتفعيل التلقائي لم يتم ربطهما بعد. لا تحوّل أموالًا الآن؛ تواصل مع الإدارة عبر واتساب لتأكيد طريقة الدفع الرسمية، ولا يتم تفعيل الاشتراك إلا بعد التحقق من الدفع.';d.scrollIntoView({behavior:'smooth',block:'nearest'})};
window.askAI=async function(){
 if(diabloSending)return;
 const input=document.getElementById('ai-question');
 const raw=(input?.value||'').trim();
 const image=aiSelectedImageDataUrl;
 if(!raw&&!image){input?.focus();return}
 if(!diabloCurrentChatId||!diabloCurrentChat())startNewDiabloChat();
 const c=diabloCurrentChat();
 const visibleText=raw||(image?'📷 صورة مرفقة — اقرأ الصورة وأجب عن محتواها.':'');
 const promptText=raw || 'اقرأ الصورة المرفقة بعناية. استخرج النص الظاهر فيها، وإذا كانت تحتوي على سؤال فأجب عنه بوضوح.';
 const userContent=image?[{type:'text',text:promptText},{type:'image_url',image_url:{url:image,detail:'high'}}]:promptText;
 c.messages.push({role:'user',content:promptText,displayText:visibleText,image:image||'',updatedAt:Date.now()});
 if(c.messages.length===1)c.title=(raw||'صورة مرفقة').slice(0,42);
 c.updatedAt=Date.now();
 aiMessages.push({role:'user',content:userContent});
 appendDiabloMessage('user',visibleText,image||'');
 if(input)input.value='';
 const typing=document.getElementById('diablo-typing');
 const send=document.getElementById('diablo-send-btn');
 diabloSending=true;if(typing)typing.hidden=false;if(send)send.disabled=true;
 try{
  const requestMessages=aiMessages.slice(-12).map((m,index,arr)=>{
   if(index===arr.length-1 || !Array.isArray(m.content))return m;
   const hasImage=m.content.some(part=>part?.type==='image_url'||part?.type==='input_image');
   if(!hasImage)return m;
   const summary=m.content.filter(part=>part?.type==='text'||part?.type==='input_text').map(part=>part.text||'').join('\n');
   return {role:m.role,content:(summary||'صورة مرفقة في رسالة سابقة')+' [لم تتم إعادة إرسال الصورة السابقة]'};
  });
  const payload=JSON.stringify({messages:requestMessages});
  if(payload.length>24*1024*1024)throw new Error('حجم المحادثة كبير جدًا. ابدأ محادثة جديدة أو أرسل صورة أصغر.');
  const res=await fetch(DIABLO_AI_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:payload});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error||data?.message||`فشل الخادم (HTTP ${res.status}).`);
  const answer=extractAIText(data);if(!answer)throw new Error(data?.error||'الخادم لم يرجع إجابة مفهومة.');
  aiMessages.push({role:'assistant',content:answer});
  c.messages.push({role:'assistant',content:answer,displayText:answer,updatedAt:Date.now()});c.updatedAt=Date.now();
  appendDiabloMessage('assistant',answer);diabloSaveChats();
  if(image)removeAIImage();
 }catch(err){
  console.error('DIABLO AI request failed',err);
  const msg='⚠️ '+(err?.message||'تعذر الاتصال بالخادم.');
  c.messages.push({role:'assistant',content:msg,displayText:msg,updatedAt:Date.now()});appendDiabloMessage('assistant',msg);diabloSaveChats();
  if(image){const p=document.getElementById('diablo-attachment-preview');if(p){p.classList.add('visible');p.textContent='الصورة ما زالت محفوظة. أصلح مشكلة الاتصال ثم اضغط إرسال مرة أخرى.'}}
 }finally{diabloSending=false;if(typing)typing.hidden=true;if(send)send.disabled=false;input?.focus()}
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!document.getElementById('diablo-plus-modal')?.hidden)closeDiabloPlus();else if(document.getElementById('ai-modal')?.classList.contains('show'))closeAI()}if(e.key==='Enter'&&!e.shiftKey&&document.activeElement?.id==='ai-question'){e.preventDefault();askAI()}});
window.handleAIImageSelection=function(input){
 const file=input?.files?.[0];const preview=document.getElementById('diablo-attachment-preview');const remove=document.getElementById('ai-image-remove');
 if(!file)return;
 if(!file.type?.startsWith('image/')){if(preview){preview.textContent='اختار ملف صورة صالحًا.';preview.classList.add('visible')}input.value='';return}
 if(file.size>15*1024*1024){if(preview){preview.textContent='حجم الصورة أكبر من 15 ميجابايت. اختار صورة أصغر.';preview.classList.add('visible')}input.value='';return}
 if(preview){preview.innerHTML='جاري تجهيز الصورة…';preview.classList.add('visible')}
 const reader=new FileReader();
 reader.onerror=()=>{if(preview)preview.textContent='تعذر قراءة الصورة من الجهاز. جرّب صورة أخرى.'};
 reader.onload=()=>{
  const img=new Image();img.onerror=()=>{if(preview)preview.textContent='تعذر فتح الصورة. جرّب صيغة JPG أو PNG.'};
  img.onload=()=>{try{
   const maxSide=1800;const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('تعذر تجهيز الصورة.');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   let quality=.82;let dataUrl=canvas.toDataURL('image/jpeg',quality);
   while(dataUrl.length>5*1024*1024&&quality>.5){quality-=.08;dataUrl=canvas.toDataURL('image/jpeg',quality)}
   if(dataUrl.length>5*1024*1024)throw new Error('الصورة كبيرة جدًا بعد التجهيز. اختار صورة أصغر.');
   aiSelectedImageDataUrl=dataUrl;aiSelectedImageName=file.name;
   if(preview){preview.innerHTML='';const thumb=document.createElement('img');thumb.src=dataUrl;thumb.alt='معاينة الصورة المرفقة';const label=document.createElement('span');label.textContent='الصورة جاهزة للإرسال: '+file.name+' — اكتب سؤالك أو اضغط إرسال لتحليلها.';preview.append(thumb,label);preview.classList.add('visible')}
   if(remove)remove.hidden=false;
  }catch(err){console.error('DIABLO image preparation error',err);if(preview)preview.textContent=err.message||'حصلت مشكلة في تجهيز الصورة.'}
  };img.src=String(reader.result||'');
 };reader.readAsDataURL(file);input.value='';
};
const diabloOriginalRemoveImage=window.removeAIImage;window.removeAIImage=function(){if(typeof diabloOriginalRemoveImage==='function')diabloOriginalRemoveImage();aiSelectedImageDataUrl='';aiSelectedImageName='';const input=document.getElementById('ai-image-input');if(input)input.value='';const p=document.getElementById('diablo-attachment-preview');if(p){p.innerHTML='';p.classList.remove('visible')}const r=document.getElementById('ai-image-remove');if(r)r.hidden=true};

window.captureAICameraPhoto=function(){
 const video=document.getElementById('ai-camera-video');const status=document.getElementById('ai-camera-status');
 if(!video||!video.videoWidth||!video.videoHeight){if(status)status.textContent='استنى لحد ما صورة الكاميرا تظهر، وبعدها جرّب تاني.';return}
 try{
  const maxSide=1800;const scale=Math.min(1,maxSide/Math.max(video.videoWidth,video.videoHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('تعذر التقاط الصورة.');ctx.drawImage(video,0,0,canvas.width,canvas.height);
  aiSelectedImageDataUrl=canvas.toDataURL('image/jpeg',.82);aiSelectedImageName='diablo-camera-photo.jpg';
  const p=document.getElementById('diablo-attachment-preview');if(p){p.innerHTML='';const im=document.createElement('img');im.src=aiSelectedImageDataUrl;im.alt='معاينة الصورة الملتقطة';const label=document.createElement('span');label.textContent='تم التقاط الصورة — اكتب سؤالك أو اضغط إرسال لتحليلها.';p.append(im,label);p.classList.add('visible')}
  const r=document.getElementById('ai-image-remove');if(r)r.hidden=false;closeAICamera();document.getElementById('ai-question')?.focus();
 }catch(err){console.error(err);if(status)status.textContent=err.message||'تعذر تجهيز صورة الكاميرا.'}
};


/* DIABLO Live Voice — WebRTC using a short-lived token minted by the Worker. */
let diabloVoicePeer=null, diabloVoiceChannel=null, diabloVoiceMic=null, diabloVoiceConnected=false;
const DIABLO_REALTIME_TOKEN_URL=DIABLO_AI_URL.replace(/\/chat\/?$/,'/realtime-token');
window.startDiabloLiveVoice=function(){const modal=document.getElementById('diablo-live-voice-modal');if(modal)modal.hidden=false;const status=document.getElementById('diablo-live-voice-status');if(status)status.textContent='جاهز للاتصال. اضغط «بدء الاتصال» واسمح باستخدام الميكروفون.';};
window.connectDiabloLiveVoice=async function(){
 const status=document.getElementById('diablo-live-voice-status');const btn=document.getElementById('diablo-live-voice-start');
 if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){if(status)status.textContent='المتصفح لا يدعم المحادثة الصوتية المباشرة. جرّب Chrome حديثًا عبر HTTPS.';return}
 if(btn){btn.disabled=true;btn.textContent='جاري الاتصال…'}if(status)status.textContent='جاري تجهيز اتصال صوتي آمن…';
 try{
  const tokenRes=await fetch(DIABLO_REALTIME_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
  const tokenData=await tokenRes.json().catch(()=>({}));
  if(!tokenRes.ok||!tokenData.value)throw new Error(tokenData.error||`تعذر تجهيز رمز الصوت (HTTP ${tokenRes.status}). افتح مسار /health للتأكد من نشر Worker الجديد، ثم راجع OPENAI_API_KEY وOPENAI_REALTIME_MODEL.`);
  diabloVoicePeer=new RTCPeerConnection();
  const remoteAudio=document.getElementById('diablo-live-voice-audio');
  diabloVoicePeer.ontrack=event=>{if(remoteAudio){remoteAudio.srcObject=event.streams[0];remoteAudio.play().catch(()=>{})}};
  diabloVoicePeer.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(diabloVoicePeer?.connectionState)&&status)status.textContent='انقطع الاتصال الصوتي. يمكنك إنهاء المكالمة والمحاولة مرة أخرى.'};
  diabloVoiceChannel=diabloVoicePeer.createDataChannel('oai-events');
  diabloVoiceChannel.onmessage=event=>{try{const data=JSON.parse(event.data);if(data.type==='error'){if(status)status.textContent='حصل خطأ في المحادثة الصوتية: '+(data.error?.message||'حاول مرة أخرى.')}else if(data.type==='input_audio_buffer.speech_started'){if(status)status.textContent='سمعتك… كمل كلامك.'}else if(data.type==='response.audio.delta'){if(status)status.textContent='DIABLO بيرد عليك صوتيًا…'}else if(data.type==='response.done'){if(status)status.textContent='اتفضل اتكلم، DIABLO بيسمعك.'}}catch{}};
  diabloVoiceMic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  diabloVoiceMic.getTracks().forEach(track=>diabloVoicePeer.addTrack(track,diabloVoiceMic));
  const offer=await diabloVoicePeer.createOffer();await diabloVoicePeer.setLocalDescription(offer);
  const sdpRes=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{'Authorization':'Bearer '+tokenData.value,'Content-Type':'application/sdp'},body:offer.sdp});
  const answerSdp=await sdpRes.text();if(!sdpRes.ok)throw new Error(`خدمة الصوت رفضت الاتصال (HTTP ${sdpRes.status}). ${answerSdp.slice(0,180)}`);
  await diabloVoicePeer.setRemoteDescription({type:'answer',sdp:answerSdp});diabloVoiceConnected=true;
  if(status)status.textContent='✅ متصل! اتكلم بشكل طبيعي، وDIABLO هيرد عليك بالصوت.';
  if(btn){btn.textContent='متصل 🎙️';btn.disabled=false}
 }catch(err){console.error('DIABLO realtime voice error',err);if(status)status.textContent='⚠️ '+(err?.message||'تعذر تشغيل المحادثة الصوتية.');cleanupDiabloVoice(false);if(btn){btn.textContent='إعادة المحاولة 🎙️';btn.disabled=false}}
};
function cleanupDiabloVoice(hide=true){try{diabloVoiceChannel?.close()}catch{}try{diabloVoicePeer?.close()}catch{}try{diabloVoiceMic?.getTracks().forEach(t=>t.stop())}catch{}diabloVoiceChannel=null;diabloVoicePeer=null;diabloVoiceMic=null;diabloVoiceConnected=false;const audio=document.getElementById('diablo-live-voice-audio');if(audio){audio.pause();audio.srcObject=null}const btn=document.getElementById('diablo-live-voice-start');if(btn){btn.disabled=false;btn.textContent='بدء الاتصال 🎙️'}if(hide){const modal=document.getElementById('diablo-live-voice-modal');if(modal)modal.hidden=true}}
window.stopDiabloLiveVoice=function(){cleanupDiabloVoice(true)};

/* DIABLO voice fallback: record one turn, transcribe, ask, then speak the reply. */
let diabloFallbackRecorder=null, diabloFallbackChunks=[], diabloFallbackBusy=false;
window.toggleDiabloFallbackRecording=async function(){
 const btn=document.getElementById('diablo-fallback-voice-btn');
 const status=document.getElementById('diablo-live-voice-status');
 if(diabloFallbackBusy)return;
 if(diabloFallbackRecorder&&diabloFallbackRecorder.state==='recording'){
  if(btn)btn.disabled=true;
  if(status)status.textContent='جاري تجهيز التسجيل وإرساله للتحويل إلى نص…';
  diabloFallbackRecorder.stop();return;
 }
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){if(status)status.textContent='المتصفح لا يدعم التسجيل الصوتي. جرّب Chrome حديثًا على HTTPS.';return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const preferred=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported?.(t));
  diabloFallbackChunks=[];
  diabloFallbackRecorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);
  diabloFallbackRecorder.ondataavailable=e=>{if(e.data&&e.data.size)diabloFallbackChunks.push(e.data)};
  diabloFallbackRecorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());if(status)status.textContent='حصل خطأ أثناء التسجيل. جرّب مرة أخرى.';if(btn){btn.disabled=false;btn.textContent='تحدث واسمع الرد'}diabloFallbackRecorder=null};
  diabloFallbackRecorder.onstop=async()=>{
   stream.getTracks().forEach(t=>t.stop());
   if(btn){btn.disabled=true;btn.textContent='جاري معالجة الصوت…'}
   diabloFallbackBusy=true;
   try{
    const blob=new Blob(diabloFallbackChunks,{type:diabloFallbackRecorder?.mimeType||'audio/webm'});
    diabloFallbackRecorder=null;diabloFallbackChunks=[];
    if(!blob.size)throw new Error('التسجيل فارغ. اتكلم شوية ثم جرّب تاني.');
    if(blob.size>20*1024*1024)throw new Error('التسجيل أكبر من 20 ميجابايت. قصّر التسجيل وحاول تاني.');
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('تعذر قراءة التسجيل.'));r.readAsDataURL(blob)});
    const comma=dataUrl.indexOf(',');const audioBase64=comma>=0?dataUrl.slice(comma+1):'';
    const tr=await fetch(DIABLO_TRANSCRIBE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64,mimeType:blob.type||'audio/webm'})});
    const td=await tr.json().catch(()=>({}));if(!tr.ok||!td.text)throw new Error(td.error||`فشل تحويل الصوت إلى نص (HTTP ${tr.status}).`);
    if(status)status.textContent='سمعتك: «'+td.text.slice(0,180)+'» — جاري تجهيز الرد…';
    const cr=await fetch(DIABLO_AI_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:td.text}]})});
    const cd=await cr.json().catch(()=>({}));if(!cr.ok)throw new Error(cd.error||`فشل الحصول على الرد (HTTP ${cr.status}).`);
    const answer=extractAIText(cd);if(!answer)throw new Error('وصل رد فارغ من DIABLO AI.');
    if(status)status.textContent='DIABLO AI: '+answer.slice(0,240);
    if('speechSynthesis' in window){window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(answer);utter.lang='ar-EG';utter.rate=1;window.speechSynthesis.speak(utter)}
   }catch(err){console.error('DIABLO fallback voice error',err);if(status)status.textContent='⚠️ '+(err?.message||'تعذر إكمال المحادثة الصوتية البديلة.');}
   finally{diabloFallbackBusy=false;if(btn){btn.disabled=false;btn.textContent='تحدث واسمع الرد'}}
  };
  diabloFallbackRecorder.start();
  if(btn)btn.textContent='إيقاف التسجيل وإرسال الصوت ■';
  if(status)status.textContent='🎙️ بيسجل دلوقتي… اتكلم، وبعدها اضغط الزر نفسه لإرسال كلامك.';
 }catch(err){console.error(err);if(status)status.textContent=err.name==='NotAllowedError'?'إذن الميكروفون مرفوض. اسمح باستخدامه من إعدادات الموقع.':(err.message||'تعذر تشغيل الميكروفون.');if(btn){btn.disabled=false;btn.textContent='تحدث واسمع الرد'}}
};
