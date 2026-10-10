DIABLO comprehensive additive update

Files:
- index.html
- style.css
- script.js

This update is based on the latest saved pasted HTML/CSS and JavaScript source in the Library. It keeps existing sections and functions and adds: DIABLO PLUS feature hub, PDF/image/text summarization, AI-generated quizzes, AI-generated study plans, local study progress and badges, AI modes, and founder profile. It also adds missing translator/QR functions referenced by the saved HTML.

Important:
- PDF text extraction and image OCR use external CDN libraries (PDF.js and Tesseract.js), so those features require internet access. OCR quality depends on image clarity and language recognition.
- AI quiz, file summary, and smart plan use the existing DIABLO Cloudflare Worker endpoint; the endpoint must be working.
- Study progress is saved in localStorage on the current browser/device only; it is not a cross-device account system.
- Translation uses MyMemory and may be rate-limited.
- Founder section intentionally displays the supplied full name and broad governorate only; it does not publish the exact village or exact age for privacy. You can add a photo later by replacing the placeholder in the founder section.
- Before replacing the live files, test in a staging copy. Existing scripts can depend on browser APIs and external network services.
