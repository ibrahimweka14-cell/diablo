DIABLO — ملفات الموقع والخادم بعد ترتيب الأسماء
================================================

ملفات الموقع التي تُرفع إلى جذر مستودع GitHub Pages:
- index.html
- style.css
- script.js
- manifest.json
- diablo-hero.svg
- founder-photo.jpg

ملف الخادم:
- worker.js يُنشر داخل Cloudflare Worker، وليس كملف واجهة في GitHub Pages.
- wrangler.toml إعدادات نشر اختيارية عند استخدام Wrangler.

إصلاحات هذه الحزمة:
- توحيد أسماء الملفات لتطابق الروابط داخل index.html.
- تعديل أيقونة وصورة DIABLO لاستخدام diablo-hero.svg الموجود بدل ملف PNG غير المرفق.
- الإبقاء على منطق الواجهة والخادم الموجود في الملفات الأصلية، دون ادعاء أن API قد تم اختباره أو نشره.

إعداد Cloudflare:
- أضف GROQ_API_KEY كـ Secret في إعدادات Worker.
- لا تضع المفتاح داخل index.html أو script.js أو GitHub.
- راجع متغيرات GROQ_MODEL وGROQ_VISION_MODEL وGROQ_TRANSCRIPTION_MODEL في wrangler.toml.
- عنوان الموقع المسموح به مضبوط على https://ibrahimweka14-cell.github.io؛ غيّره إذا كان رابط موقعك مختلفًا.

بعد النشر:
1. انشر worker.js في Cloudflare.
2. افتح /health على عنوان Worker وتأكد أن ok=true.
3. ارفع ملفات الموقع المذكورة إلى جذر مستودع GitHub Pages.
4. نفّذ Commit changes، ثم افتح الموقع واضغط Ctrl+F5.
5. اختبر النص والصورة والكاميرا. ميزات الصوت تعتمد على توفر المفتاح والنموذج وحدود الخدمة؛ لا يُضمن أنها تعمل قبل الاختبار.

تنبيه: هذه الحزمة لا تحتوي على مفاتيح API ولا تنشر الملفات تلقائيًا إلى حساباتك.
