// =====================================
// Diablo
// =====================================


// ==============================
// البحث
// ==============================

const searchInput =
    document.getElementById("searchInput");

const cards =
    document.querySelectorAll(".tool-card");


searchInput.addEventListener("input", function () {

    const text =
        searchInput.value
            .toLowerCase()
            .trim();

    cards.forEach(function (card) {

        if (
            card.textContent
                .toLowerCase()
                .includes(text)
        ) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }

    });

});


// ==============================
// النافذة
// ==============================

const modal =
    document.getElementById("toolModal");

const toolContent =
    document.getElementById("toolContent");


function openTool(tool) {

    modal.classList.add("active");

    if (tool === "calculator") calculator();

    if (tool === "percentage") percentage();

    if (tool === "discount") discount();

    if (tool === "units") units();

    if (tool === "words") words();

    if (tool === "age") age();

    if (tool === "qr") qr();

    if (tool === "timer") timer();

    if (tool === "dateDifference")
        dateDifference();

    if (tool === "numbers")
        numbers();

    if (tool === "case")
        textCase();

    if (tool === "colors")
        colors();

    if (tool === "length")
        lengthConverter();

    if (tool === "interest")
        interest();

    if (tool === "textCleaner")
        textCleaner();

    if (tool === "advanced")
        advanced();
}


function closeTool() {

    modal.classList.remove("active");

    toolContent.innerHTML = "";

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}


modal.addEventListener(
    "click",
    function (e) {

        if (e.target === modal) {
            closeTool();
        }

    }
);


// ==============================
// 🧮 الحاسبة
// ==============================

function calculator() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            🧮 حاسبة Diablo
        </h2>

        <input
            id="calcDisplay"
            class="calculator-display"
            type="text"
            readonly
        >

        <div class="calc-buttons">

            <button onclick="calcAdd('7')">7</button>
            <button onclick="calcAdd('8')">8</button>
            <button onclick="calcAdd('9')">9</button>
            <button onclick="calcAdd('/')">÷</button>

            <button onclick="calcAdd('4')">4</button>
            <button onclick="calcAdd('5')">5</button>
            <button onclick="calcAdd('6')">6</button>
            <button onclick="calcAdd('*')">×</button>

            <button onclick="calcAdd('1')">1</button>
            <button onclick="calcAdd('2')">2</button>
            <button onclick="calcAdd('3')">3</button>
            <button onclick="calcAdd('-')">−</button>

            <button onclick="calcAdd('0')">0</button>
            <button onclick="calcAdd('.')">.</button>
            <button onclick="calcClear()">C</button>
            <button onclick="calcAdd('+')">+</button>

            <button
                class="calc-equal"
                onclick="calcResult()"
            >
                =
            </button>

            <button onclick="calcBackspace()">
                ⌫
            </button>

        </div>
    `;
}


function calcAdd(value) {

    const display =
        document.getElementById("calcDisplay");

    display.value += value;
}


function calcClear() {

    document.getElementById(
        "calcDisplay"
    ).value = "";
}


function calcBackspace() {

    const display =
        document.getElementById("calcDisplay");

    display.value =
        display.value.slice(0, -1);
}


function calcResult() {

    const display =
        document.getElementById("calcDisplay");

    try {

        if (
            !/^[0-9+\-*/.() ]+$/
            .test(display.value)
        ) {

            display.value = "خطأ";

            return;
        }

        const result =
            Function(
                '"use strict"; return (' +
                display.value +
                ')'
            )();

        display.value =
            Number.isFinite(result)
                ? result
                : "خطأ";

    } catch {

        display.value = "خطأ";
    }
}


// ==============================
// 📊 النسبة المئوية
// ==============================

function percentage() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            📊 النسبة المئوية
        </h2>

        <div class="input-group">

            <label>الرقم</label>

            <input
                id="percentNumber"
                type="number"
            >

        </div>

        <div class="input-group">

            <label>النسبة %</label>

            <input
                id="percentValue"
                type="number"
            >

        </div>

        <button
            class="action-btn"
            onclick="calculatePercentage()"
        >
            احسب النسبة
        </button>

        <div
            id="percentResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function calculatePercentage() {

    const number =
        Number(
            document.getElementById(
                "percentNumber"
            ).value
        );

    const percent =
        Number(
            document.getElementById(
                "percentValue"
            ).value
        );

    if (
        !Number.isFinite(number) ||
        !Number.isFinite(percent)
    ) {

        document.getElementById(
            "percentResult"
        ).textContent =
            "❌ أدخل البيانات كاملة";

        return;
    }

    const result =
        number * percent / 100;

    document.getElementById(
        "percentResult"
    ).textContent =
        `${percent}% من ${number} = ${result}`;
}


// ==============================
// 💸 الخصم
// ==============================

function discount() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            💸 حساب الخصم
        </h2>

        <div class="input-group">

            <label>السعر الأصلي</label>

            <input
                id="price"
                type="number"
            >

        </div>

        <div class="input-group">

            <label>نسبة الخصم %</label>

            <input
                id="discountPercent"
                type="number"
            >

        </div>

        <button
            class="action-btn"
            onclick="calculateDiscount()"
        >
            احسب
        </button>

        <div
            id="discountResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function calculateDiscount() {

    const price =
        Number(
            document.getElementById(
                "price"
            ).value
        );

    const percent =
        Number(
            document.getElementById(
                "discountPercent"
            ).value
        );

    if (
        !Number.isFinite(price) ||
        !Number.isFinite(percent)
    ) {

        document.getElementById(
            "discountResult"
        ).textContent =
            "❌ أدخل البيانات كاملة";

        return;
    }

    const value =
        price * percent / 100;

    const finalPrice =
        price - value;

    document.getElementById(
        "discountResult"
    ).innerHTML =

        `قيمة الخصم: ${value}<br>
         السعر بعد الخصم: ${finalPrice}`;
}


// ==============================
// 🔄 الوحدات
// ==============================

function units() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            🔄 تحويل الوحدات
        </h2>

        <div class="input-group">

            <label>اختر التحويل</label>

            <select id="unitType">

                <option value="m-cm">
                    متر → سنتيمتر
                </option>

                <option value="cm-m">
                    سنتيمتر → متر
                </option>

                <option value="km-m">
                    كيلومتر → متر
                </option>

                <option value="m-km">
                    متر → كيلومتر
                </option>

                <option value="kg-g">
                    كيلوجرام → جرام
                </option>

                <option value="g-kg">
                    جرام → كيلوجرام
                </option>

            </select>

        </div>

        <div class="input-group">

            <label>القيمة</label>

            <input
                id="unitValue"
                type="number"
            >

        </div>

        <button
            class="action-btn"
            onclick="convertUnit()"
        >
            تحويل
        </button>

        <div
            id="unitResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function convertUnit() {

    const type =
        document.getElementById(
            "unitType"
        ).value;

    const value =
        Number(
            document.getElementById(
                "unitValue"
            ).value
        );

    if (!Number.isFinite(value)) {

        document.getElementById(
            "unitResult"
        ).textContent =
            "❌ أدخل قيمة صحيحة";

        return;
    }

    let result;
    let unit;

    if (type === "m-cm") {

        result = value * 100;
        unit = "سم";

    }

    if (type === "cm-m") {

        result = value / 100;
        unit = "م";

    }

    if (type === "km-m") {

        result = value * 1000;
        unit = "م";

    }

    if (type === "m-km") {

        result = value / 1000;
        unit = "كم";

    }

    if (type === "kg-g") {

        result = value * 1000;
        unit = "جم";

    }

    if (type === "g-kg") {

        result = value / 1000;
        unit = "كجم";

    }

    document.getElementById(
        "unitResult"
    ).textContent =
        `النتيجة: ${result} ${unit}`;
}


// ==============================
// 🔤 الكلمات
// ==============================

function words() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            🔤 عداد الكلمات والحروف
        </h2>

        <textarea
            id="wordText"
            class="tool-textarea"
            placeholder="اكتب أو الصق النص هنا..."
        ></textarea>

        <button
            class="action-btn"
            onclick="countWords()"
        >
            احسب
        </button>

        <div
            id="wordResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function countWords() {

    const text =
        document.getElementById(
            "wordText"
        ).value;

    const characters =
        text.length;

    const noSpaces =
        text.replace(/\s/g, "").length;

    const wordCount =
        text.trim()
            ? text.trim().split(/\s+/).length
            : 0;

    document.getElementById(
        "wordResult"
    ).innerHTML =

        `الكلمات: ${wordCount}<br>
         الحروف: ${characters}<br>
         بدون مسافات: ${noSpaces}`;
}


// ==============================
// 📅 العمر
// ==============================

function age() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            📅 حساب العمر
        </h2>

        <div class="input-group">

            <label>تاريخ الميلاد</label>

            <input
                id="birthDate"
                type="date"
            >

        </div>

        <button
            class="action-btn"
            onclick="calculateAge()"
        >
            احسب العمر
        </button>

        <div
            id="ageResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function calculateAge() {

    const birth =
        new Date(
            document.getElementById(
                "birthDate"
            ).value
        );

    const today =
        new Date();

    if (isNaN(birth.getTime())) {

        document.getElementById(
            "ageResult"
        ).textContent =
            "❌ اختر تاريخ الميلاد";

        return;
    }

    if (birth > today) {

        document.getElementById(
            "ageResult"
        ).textContent =
            "❌ التاريخ غير صحيح";

        return;
    }

    let years =
        today.getFullYear()
        - birth.getFullYear();

    let months =
        today.getMonth()
        - birth.getMonth();

    let days =
        today.getDate()
        - birth.getDate();

    if (days < 0) {

        months--;

        const previousMonth =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                0
            );

        days +=
            previousMonth.getDate();
    }

    if (months < 0) {

        years--;

        months += 12;
    }

    document.getElementById(
        "ageResult"
    ).innerHTML =

        `عمرك: ${years} سنة<br>
         ${months} شهر و ${days} يوم 🎉`;
}


// ==============================
// 📱 QR CODE
// ==============================

function qr() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            📱 إنشاء QR Code
        </h2>

        <div class="input-group">

            <label>
                اكتب رابط أو نص
            </label>

            <input
                id="qrText"
                type="text"
                placeholder="https://example.com"
            >

        </div>

        <button
            class="action-btn"
            onclick="generateQR()"
        >
            إنشاء QR Code
        </button>

        <div id="qrResult"></div>

    `;
}


function generateQR() {

    const text =
        document.getElementById(
            "qrText"
        ).value.trim();

    const result =
        document.getElementById(
            "qrResult"
        );

    if (!text) {

        result.innerHTML =
            `<div class="result">
                ❌ اكتب النص أو الرابط أولًا
            </div>`;

        return;
    }

    const url =
        "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="
        +
        encodeURIComponent(text);

    result.innerHTML = `

        <img
            class="qr-image"
            src="${url}"
            alt="QR Code"
        >

        <div class="result">
            تم إنشاء QR Code ✅
        </div>

    `;
}


// ==============================
// ⏱️ المؤقت
// ==============================

let timerInterval = null;

let timerSeconds = 0;


function timer() {

    if (timerInterval) {

        clearInterval(timerInterval);

        timerInterval = null;
    }

    toolContent.innerHTML = `

        <h2 class="tool-title">
            ⏱️ مؤقت Diablo
        </h2>

        <div class="input-group">

            <label>
                عدد الدقائق
            </label>

            <input
                id="timerMinutes"
                type="number"
                min="0"
                placeholder="مثال: 5"
            >

        </div>

        <div class="input-group">

            <label>
                عدد الثواني
            </label>

            <input
                id="timerSeconds"
                type="number"
                min="0"
                max="59"
                placeholder="مثال: 30"
            >

        </div>

        <div
            id="timerDisplay"
            class="timer-display"
        >
            00:00
        </div>

        <div class="timer-buttons">

            <button onclick="startTimer()">
                ▶️ تشغيل
            </button>

            <button onclick="pauseTimer()">
                ⏸️ إيقاف
            </button>

            <button onclick="resetTimer()">
                🔄 إعادة
            </button>

        </div>

    `;
}


function startTimer() {

    if (timerInterval) return;

    const minutes =
        Number(
            document.getElementById(
                "timerMinutes"
            ).value
        ) || 0;

    const seconds =
        Number(
            document.getElementById(
                "timerSeconds"
            ).value
        ) || 0;

    if (timerSeconds > 59) {

        alert("الثواني يجب أن تكون من 0 إلى 59");

        return;
    }

    if (timerSeconds === 0 && minutes === 0) {

        alert("أدخل وقتًا أولًا");

        return;
    }

    timerSeconds =
        minutes * 60 + seconds;

    updateTimerDisplay();

    timerInterval =
        setInterval(function () {

            timerSeconds--;

            updateTimerDisplay();

            if (timerSeconds <= 0) {

                clearInterval(timerInterval);

                timerInterval = null;

                timerSeconds = 0;

                updateTimerDisplay();

                alert("⏰ انتهى الوقت!");

            }

        }, 1000);
}


function pauseTimer() {

    if (timerInterval) {

        clearInterval(timerInterval);

        timerInterval = null;
    }
}


function resetTimer() {

    if (timerInterval) {

        clearInterval(timerInterval);

        timerInterval = null;
    }

    timerSeconds = 0;

    const display =
        document.getElementById(
            "timerDisplay"
        );

    if (display) {

        display.textContent =
            "00:00";
    }
}


function updateTimerDisplay() {

    const display =
        document.getElementById(
            "timerDisplay"
        );

    if (!display) return;

    const minutes =
        Math.floor(timerSeconds / 60);

    const seconds =
        timerSeconds % 60;

    display.textContent =
        String(minutes).padStart(2, "0")
        +
        ":"
        +
        String(seconds).padStart(2, "0");
}


// ==============================
// 📆 الفرق بين تاريخين
// ==============================

function dateDifference() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            📆 الفرق بين تاريخين
        </h2>

        <div class="input-group">

            <label>
                التاريخ الأول
            </label>

            <input
                id="dateOne"
                type="date"
            >

        </div>

        <div class="input-group">

            <label>
                التاريخ الثاني
            </label>

            <input
                id="dateTwo"
                type="date"
            >

        </div>

        <button
            class="action-btn"
            onclick="calculateDateDifference()"
        >
            احسب الفرق
        </button>

        <div
            id="dateDifferenceResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function calculateDateDifference() {

    const first =
        new Date(
            document.getElementById(
                "dateOne"
            ).value
        );

    const second =
        new Date(
            document.getElementById(
                "dateTwo"
            ).value
        );

    if (
        isNaN(first.getTime()) ||
        isNaN(second.getTime())
    ) {

        document.getElementById(
            "dateDifferenceResult"
        ).textContent =
            "❌ اختر التاريخين";

        return;
    }

    const difference =
        Math.abs(
            second - first
        );

    const days =
        Math.round(
            difference /
            (1000 * 60 * 60 * 24)
        );

    document.getElementById(
        "dateDifferenceResult"
    ).innerHTML =

        `الفرق بين التاريخين:
        <strong>${days}</strong> يوم 📅`;
}


// ==============================
// 🔢 تحويل الأرقام
// ==============================

function numbers() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            🔢 تحويل الأرقام
        </h2>

        <div class="input-group">

            <label>
                الرقم العشري
            </label>

            <input
                id="decimalNumber"
                type="number"
                placeholder="مثال: 255"
            >

        </div>

        <button
            class="action-btn"
            onclick="convertNumbers()"
        >
            تحويل
        </button>

        <div
            id="numberResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function convertNumbers() {

    const value =
        Number(
            document.getElementById(
                "decimalNumber"
            ).value
        );

    if (
        !Number.isInteger(value) ||
        value < 0
    ) {

        document.getElementById(
            "numberResult"
        ).textContent =
            "❌ أدخل رقمًا صحيحًا موجبًا";

        return;
    }

    document.getElementById(
        "numberResult"
    ).innerHTML =

        `Binary:
        <strong>${value.toString(2)}</strong>
        <br><br>

        Hex:
        <strong>${value.toString(16).toUpperCase()}</strong>
        <br><br>

        Decimal:
        <strong>${value}</strong>`;
}


// ==============================
// 🔠 تغيير حالة الحروف
// ==============================

function textCase() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            🔠 تغيير حالة الحروف
        </h2>

        <textarea
            id="caseText"
            class="tool-textarea"
            placeholder="اكتب النص الإنجليزي هنا..."
        ></textarea>

        <button
            class="action-btn"
            onclick="makeUpperCase()"
        >
            ABC - أحرف كبيرة
        </button>

        <button
            class="action-btn"
            onclick="makeLowerCase()"
        >
            abc - أحرف صغيرة
        </button>

        <div
            id="caseResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function makeUpperCase() {

    const text =
        document.getElementById(
            "caseText"
        ).value;

    document.getElementById(
        "caseResult"
    ).textContent =
        text.toUpperCase();
}


function makeLowerCase() {

    const text =
        document.getElementById(
            "caseText"
        ).value;

    document.getElementById(
        "caseResult"
    ).textContent =
        text.toLowerCase();
}


// ==============================
// 🎨 مولد الألوان
// ==============================

function colors() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            🎨 مولد الألوان
        </h2>

        <div
            id="colorPreview"
            class="color-preview"
        ></div>

        <div
            id="colorCode"
            class="color-code"
        >
            #000000
        </div>

        <button
            class="action-btn"
            onclick="generateColor()"
        >
            🎨 لون جديد
        </button>

    `;

    generateColor();
}


function generateColor() {

    const letters =
        "0123456789ABCDEF";

    let color = "#";

    for (let i = 0; i < 6; i++) {

        color +=
            letters[
                Math.floor(
                    Math.random() *
                    16
                )
            ];
    }

    document.getElementById(
        "colorPreview"
    ).style.background =
        color;

    document.getElementById(
        "colorCode"
    ).textContent =
        color;
}


// ==============================
// 📏 تحويل الطول
// ==============================

function lengthConverter() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            📏 تحويل الطول
        </h2>

        <div class="input-group">

            <label>
                القيمة
            </label>

            <input
                id="lengthValue"
                type="number"
            >

        </div>

        <div class="input-group">

            <label>
                من
            </label>

            <select id="lengthFrom">

                <option value="m">
                    متر
                </option>

                <option value="cm">
                    سنتيمتر
                </option>

                <option value="km">
                    كيلومتر
                </option>

            </select>

        </div>

        <div class="input-group">

            <label>
                إلى
            </label>

            <select id="lengthTo">

                <option value="cm">
                    سنتيمتر
                </option>

                <option value="m">
                    متر
                </option>

                <option value="km">
                    كيلومتر
                </option>

            </select>

        </div>

        <button
            class="action-btn"
            onclick="convertLength()"
        >
            تحويل
        </button>

        <div
            id="lengthResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function convertLength() {

    const value =
        Number(
            document.getElementById(
                "lengthValue"
            ).value
        );

    const from =
        document.getElementById(
            "lengthFrom"
        ).value;

    const to =
        document.getElementById(
            "lengthTo"
        ).value;

    if (!Number.isFinite(value)) {

        document.getElementById(
            "lengthResult"
        ).textContent =
            "❌ أدخل قيمة صحيحة";

        return;
    }

    const meters = {

        m: value,

        cm: value / 100,

        km: value * 1000

    };

    let result;

    if (to === "m") {

        result =
            meters[from];

    } else if (to === "cm") {

        result =
            meters[from] * 100;

    } else {

        result =
            meters[from] / 1000;
    }

    document.getElementById(
        "lengthResult"
    ).textContent =
        `النتيجة: ${result}`;
}


// ==============================
// 💰 الفائدة البسيطة
// ==============================

function interest() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            💰 الفائدة البسيطة
        </h2>

        <div class="input-group">

            <label>
                المبلغ الأصلي
            </label>

            <input
                id="interestPrincipal"
                type="number"
            >

        </div>

        <div class="input-group">

            <label>
                نسبة الفائدة السنوية %
            </label>

            <input
                id="interestRate"
                type="number"
            >

        </div>

        <div class="input-group">

            <label>
                عدد السنوات
            </label>

            <input
                id="interestYears"
                type="number"
            >

        </div>

        <button
            class="action-btn"
            onclick="calculateInterest()"
        >
            احسب
        </button>

        <div
            id="interestResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function calculateInterest() {

    const principal =
        Number(
            document.getElementById(
                "interestPrincipal"
            ).value
        );

    const rate =
        Number(
            document.getElementById(
                "interestRate"
            ).value
        );

    const years =
        Number(
            document.getElementById(
                "interestYears"
            ).value
        );

    if (
        !Number.isFinite(principal) ||
        !Number.isFinite(rate) ||
        !Number.isFinite(years)
    ) {

        document.getElementById(
            "interestResult"
        ).textContent =
            "❌ أدخل البيانات كاملة";

        return;
    }

    const interestValue =
        principal *
        rate *
        years /
        100;

    const total =
        principal +
        interestValue;

    document.getElementById(
        "interestResult"
    ).innerHTML =

        `قيمة الفائدة:
        <strong>${interestValue}</strong>
        <br><br>

        المبلغ النهائي:
        <strong>${total}</strong>`;
}


// ==============================
// 📝 تنظيف النص
// ==============================

function textCleaner() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            📝 منظّم النص
        </h2>

        <textarea
            id="cleanText"
            class="tool-textarea"
            placeholder="اكتب النص هنا..."
        ></textarea>

        <button
            class="action-btn"
            onclick="cleanText()"
        >
            تنظيف النص
        </button>

        <div
            id="cleanResult"
            class="result"
        >
            النتيجة ستظهر هنا
        </div>

    `;
}


function cleanText() {

    const text =
        document.getElementById(
            "cleanText"
        ).value;

    const cleaned =
        text
            .split("\n")
            .map(
                line =>
                    line.trim()
            )
            .filter(
                line =>
                    line !== ""
            )
            .join("\n")
            .replace(
                /[ \t]+/g,
                " "
            );

    document.getElementById(
        "cleanResult"
    ).textContent =
        cleaned || "النص فارغ";
}


// ==============================
// ⭐ أدوات متقدمة
// ==============================

function advanced() {

    toolContent.innerHTML = `

        <h2 class="tool-title">
            ⭐ أدوات Diablo المتقدمة
        </h2>

        <div class="result">

            🚀 قريبًا...

            <br><br>

            أدوات أكثر قوة
            وإمكانيات Premium
            هتضاف هنا.

        </div>

    `;
}