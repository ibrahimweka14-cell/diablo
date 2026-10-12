DIABLO AI — مراجعة وإصلاح الصور والكاميرا والصوت (12 أكتوبر 2026)
=============================================================

مهم جدًا: ملفات الواجهة وحدها لا تكفي. لازم تنشر index.html وstyle.css وscript.js على GitHub Pages، وتنشر worker.js على Cloudflare Worker نفسه. الحزمة لا تستطيع النشر إلى حساباتك من هنا، ولم يتم اختبار اتصال API حقيقي لعدم توفر مفتاح حسابك.

الملفات
- index.html / style.css / script.js: واجهة DIABLO AI.
- worker.js: خادم المحادثة وتحليل الصور وتحويل الصوت إلى نص وإصدار رمز الصوت المباشر.
- wrangler.toml: إعدادات غير سرية.
- founder-photo.jpg: صورة المؤسس.

التعديلات في هذه النسخة
1) الصور: الاحتفاظ بالصورة المحددة حتى نجاح الطلب، وعرض خطأ الخادم الحقيقي بدل فقد الصورة بصمت. الصورة تُرسل كـ data URL إلى Worker، ثم يحولها Worker إلى input_image لواجهة Responses API.
2) الكاميرا: فتح النافذة صراحة، انتظار بيانات الفيديو قبل السماح بالتقاط الصورة، وإيقاف مسارات الكاميرا عند الإغلاق. يلزم HTTPS وإذن الكاميرا وعدم استخدام تطبيق آخر للكاميرا في نفس الوقت.
3) الصوت المباشر: تحسين عرض خطأ HTTP القادم من Worker أو خدمة الصوت بدل رسالة عامة فقط.
4) بديل للصوت: إذا كان نموذج Realtime غير متاح، يمكن استخدام «تحدث واسمع الرد»: اضغط لتسجيل دور واحد، واضغط مرة أخرى لإيقافه وإرساله؛ يحوّل Worker الصوت إلى نص، يرسل النص إلى DIABLO AI، ثم ينطق الإجابة عبر speechSynthesis. هذا وضع محادثة بالتناوب وليس اتصالًا مباشرًا كاملًا.
5) التشخيص: GET /health يعرض رقم النسخة وحالة المسارات وأسماء النماذج غير السرية.

أولًا: نشر Worker
1. افتح Cloudflare Dashboard > Workers & Pages، وافتح Worker المستخدم في الرابط:
   https://lucky-mountain-88cbdiablo-ai.ibrahimweka14.workers.dev
2. استبدل كود Worker بالكامل بمحتوى worker.js ثم اضغط Deploy.
3. في Settings > Variables and Secrets أضف Secret باسم OPENAI_API_KEY. لا تضع المفتاح في ملفات الموقع أو GitHub ولا ترسله في الدردشة.
4. راجع متغيرات Worker:
   OPENAI_MODEL = gpt-4.1-mini
   OPENAI_TRANSCRIPTION_MODEL = gpt-4o-mini-transcribe
   OPENAI_REALTIME_MODEL = gpt-realtime-2.1
   OPENAI_REALTIME_TRANSCRIPTION_MODEL = gpt-4o-mini-transcribe
   OPENAI_REALTIME_VOICE = marin
   ALLOWED_ORIGIN = https://ibrahimweka14-cell.github.io
   هذه أسماء افتراضية؛ يلزم أن تكون النماذج متاحة في حساب API المستخدم.
5. بعد النشر افتح:
   https://lucky-mountain-88cbdiablo-ai.ibrahimweka14.workers.dev/health
   https://lucky-mountain-88cbdiablo-ai.ibrahimweka14.workers.dev/
   يجب أن يظهر JSON وفيه ok:true وversion:"2026-10-12-audit-fix-1". الإصدار يدعم /health و/health/ والرابط الأساسي /.
   إذا ظهر إصدار قديم أو "المسار غير موجود"، فالكود لم يُنشر على الـ Worker الصحيح أو أن العنوان مختلف.

ثانيًا: نشر الموقع
1. ارفع index.html وstyle.css وscript.js وfounder-photo.jpg وmanifest.json وdiablo-hero.svg إلى جذر مستودع GitHub Pages واستبدل الملفات القديمة.
2. اعمل Commit changes.
3. افتح الموقع ثم اضغط Ctrl+F5 لمسح نسخة JavaScript القديمة من الذاكرة المؤقتة.

اختبار الصور والكاميرا
- اختر صورة صغيرة، وانتظر ظهور المعاينة، اكتب سؤالًا واضغط إرسال.
- لو فشل الطلب، ستظهر رسالة من Worker. HTTP 401 يعني مفتاح API، و429 يعني حدود الاستخدام/الرصيد، و400 غالبًا إعداد نموذج أو صيغة طلب.
- اضغط الكاميرا واسمح بالإذن. إذا ظهر NotAllowed فغيّر إذن الكاميرا من إعدادات المتصفح. إذا ظهر NotFound فلا توجد كاميرا متاحة. إذا لم تظهر النسخة الجديدة بعد الرفع فجرّب Ctrl+F5.
- الصورة تُحذف من مربع الإرفاق بعد نجاح الرد فقط؛ عند الفشل تظل متاحة لإعادة المحاولة.

اختبار الصوت
- جرّب «بدء الاتصال المباشر». إذا فشل إصدار الرمز أو الاتصال، ستظهر حالة HTTP/رسالة أوضح.
- استخدم «تحدث واسمع الرد» كبديل: اضغط مرة لبدء التسجيل وتحدث، ثم اضغط مرة ثانية لإيقافه وإرسال الصوت. يتطلب هذا المسار وجود OPENAI_API_KEY وتوفر نموذج التفريغ ونموذج المحادثة.
- نطق الرد يعتمد على دعم المتصفح للصوت العربي.

ملاحظات أمان وتكلفة
- لا تضع OPENAI_API_KEY في script.js أو GitHub.
- لا يوجد هنا حساب مستخدم سحابي أو اشتراك PLUS مفعل تلقائيًا. سجل المحادثات محلي على الجهاز، ولا يحفظ صور المرفقات نفسها لتجنب امتلاء مساحة المتصفح. المحرك الحالي يستخدم OpenAI فقط؛ توجيه متعدد المزوّدين غير منفذ في هذه النسخة.
- راقب استخدام API وتكلفته، واطلب مساعدة ولي أمرك في إعداد الحساب ومتابعة التكلفة.
- فحص الكود محليًا لا يثبت أن الخدمة تعمل مع حسابك. لا بد من نشر Worker واختبار /health ثم إرسال سؤال وصورة وتجربة الصوت.

التوثيق الرسمي
- Responses API: https://developers.openai.com/api/reference/responses/overview
- الصور: https://developers.openai.com/api/docs/guides/images-vision
- Realtime client secrets: https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
