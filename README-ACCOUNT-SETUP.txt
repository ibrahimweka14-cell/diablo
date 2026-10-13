DIABLO — إضافة الحسابات وحفظ المحادثات
====================================

الملفات الموجودة في الحزمة:
- index.html / style.css / script.js: ملفات الموقع بعد إضافة واجهة تسجيل الدخول.
- supabase-schema.sql: إعداد جدول المحادثات وسياسات الأمان.

قبل رفع ملفات الموقع
--------------------
1. افتح Supabase Dashboard > مشروع DIABLO > Project Settings > API Keys.
2. انسخ مفتاح anon/public أو publishable key (ليس service_role ولا secret key).
3. افتح script.js وابحث عن:
   PASTE_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE
4. استبدل النص بمفتاح anon/publishable العام فقط، وضعه بين علامتي الاقتباس كما هو. لا تضف مفتاح service_role إلى الموقع مطلقًا.
5. احفظ script.js.

إعداد قاعدة البيانات
--------------------
1. افتح Supabase > SQL Editor > New query.
2. افتح ملف supabase-schema.sql من هذه الحزمة، وانسخ محتواه إلى SQL Editor.
3. اضغط Run. هذا ينشئ جدول diablo_chats وسياسات RLS بحيث كل مستخدم يقرأ ويعدل محادثاته فقط.

رفع الموقع
----------
ارفع/استبدل الملفات التالية في جذر مستودع GitHub Pages:
- index.html
- style.css
- script.js
- manifest.json
- diablo-hero.svg
- founder-photo.jpg
لا ترفع ملف supabase-schema.sql إلى جذر الموقع إن لم تكن محتاجًا إليه هناك؛ يكفي استخدامه داخل SQL Editor.
ثم Commit changes وانتظر النشر، وافتح الموقع واضغط Ctrl+F5.

Google OAuth
------------
- Supabase Auth > Sign In / Providers > Google يجب أن يكون Enabled مع Client ID وClient Secret.
- Google Auth Platform > Audience: لو حالة التطبيق Testing، أضف بريدك إلى Test users. في وضع Testing، المستخدمون غير المدرجين قد لا يستطيعون الدخول.
- في Google OAuth Client، Authorized redirect URI يجب أن يطابق بالضبط:
  https://sdtdcqtbqxbyovrtykei.supabase.co/auth/v1/callback
- في Supabase Authentication > URL Configuration، Site URL هو رابط GitHub Pages، ويجب أن يكون رابط الموقع ضمن Redirect URLs.
- تم نشر Client Secret في محادثة سابقة؛ دوّره/أنشئ واحدًا جديدًا من Google Cloud، وضع الجديد فقط في Supabase. لا تضع Client Secret في GitHub أو في script.js.

الاختبار
--------
1. افتح DIABLO واضغط زر "تسجيل الدخول" داخل نافذة DIABLO AI.
2. أنشئ حسابًا بالبريد وكلمة مرور لا تقل عن 8 أحرف؛ إذا كان تأكيد البريد مفعّلًا، افتح رسالة التأكيد أولًا.
3. جرّب تسجيل الدخول بـ Google.
4. أرسل رسالة نصية إلى DIABLO AI ثم افتح محادثة جديدة.
5. أعد تحميل الموقع وسجّل الدخول بالحساب نفسه؛ يجب أن تظهر المحادثات النصية في القائمة الجانبية.
6. الصور نفسها لا تُرفع إلى قاعدة البيانات؛ تُحفظ محليًا فقط لأسباب الحجم والخصوصية، وتظهر علامة توضح ذلك عند استعادة سجل من السحابة.

ملاحظات مهمة
-------------
- هذه الحزمة تضيف تسجيل الدخول بالبريد/كلمة المرور وGoogle، وتخزين المحادثات النصية في Supabase.
- اشتراكات DIABLO PLUS والدفع الآلي وحدود الصور اليومية لم يتم تفعيلها في هذه الحزمة؛ تحتاج تصميمًا منفصلًا وآمنًا على الخادم.
- لم يتم تعديل Cloudflare Worker ولا مفتاح Groq؛ استمر في استخدام Worker الحالي.
