DIABLO — DAILY LIMITS + PLUS
============================

WHAT THIS UPDATE ADDS
- FREE: 30 AI chat replies/day, 5 image analyses/day (camera photos count as images), 3 audio-to-text transcriptions/day.
- PLUS: 200 AI chat replies/day, 50 image analyses/day, 20 audio-to-text transcriptions/day.
- Daily usage is tracked per signed-in Supabase user on the server, not just in browser storage.
- A usage badge appears in the DIABLO AI composer.
- Existing prices remain: EGP 59 monthly, EGP 499 yearly, EGP 1499 lifetime.

IMPORTANT
- This package does NOT automatically charge a card or verify Vodafone Cash transfers.
- Do not activate PLUS until payment has been checked. Pressing a plan button does not activate PLUS.
- AI usage now requires the user to be signed in, so usage can be tied to an account.
- The daily reset uses UTC date boundaries.
- AI provider failures after a request has been reserved may still consume a request. Groq has its own separate account/model limits.
- Never place SUPABASE_SERVICE_ROLE_KEY or GROQ_API_KEY in website files or GitHub.

PART 1 — SUPABASE DATABASE (DO THIS FIRST)
1. Open the Supabase project used by DIABLO.
2. Open SQL Editor and create a new query.
3. Copy the full contents of database/diablo-usage-schema.sql into the editor.
4. Run it once. It creates the daily usage/subscription tables and the server-only usage function.
5. Do not create policies that allow ordinary users to write to these tables.

PART 2 — CLOUDFLARE WORKER
1. Open the existing DIABLO Worker in Cloudflare Workers & Pages.
2. Open Settings → Variables and Secrets (wording may vary).
3. Keep the existing GROQ_API_KEY secret unchanged.
4. Add these settings:
   - SUPABASE_URL = https://sdtdcqtbqxbyovrtykei.supabase.co
   - SUPABASE_ANON_KEY = the project's public publishable/anon key (the same public key already used by the site)
   - SUPABASE_SERVICE_ROLE_KEY = the project's server-side service_role/secret key. Store this as a SECRET. Never share it or put it in GitHub.
5. In the Worker editor, replace the Worker code with cloudflare-worker/worker.js and deploy.
6. Check the Worker health endpoint. Its JSON should include "usageLimits": true. If false, recheck the three Supabase settings.
7. Set ALLOWED_ORIGIN to https://ibrahimweka14-cell.github.io if the Worker already uses a custom allowlist; otherwise the default origin is configured in the code.

PART 3 — UPDATE THE GITHUB PAGES WEBSITE
Upload/replace ONLY the website files from the website/ folder into the ROOT of the existing GitHub repository:
- index.html
- style.css
- script.js
- manifest.json
- diablo-hero.svg
- founder-photo.jpg
Do not upload the Worker code as script.js. The Worker belongs in Cloudflare, not the website.
After committing, wait for GitHub Pages to update and refresh the site with Ctrl+Shift+R.

PART 4 — TEST
1. Sign in to a DIABLO account.
2. Open DIABLO AI. The usage badge should show FREE and the remaining daily counts.
3. Send a text prompt: the reply count should decrease by one.
4. Send an image: both the reply count and image count should decrease by one.
5. Test audio-to-text: the transcription count should decrease by one.
6. If the badge does not load, open the Worker /health endpoint and check "usageLimits": true, then inspect Cloudflare logs.

HOW TO ACTIVATE PLUS MANUALLY AFTER VERIFIED PAYMENT
The plan table is intentionally not writable from the browser. After you have independently verified payment, open Supabase SQL Editor and run ONE matching statement after replacing EMAIL_HERE with the payer's account email.

MONTHLY (valid for 1 month):
insert into public.diablo_subscriptions (user_id, plan, status, expires_at)
select id, 'plus', 'active', now() + interval '1 month' from auth.users where lower(email) = lower('EMAIL_HERE')
on conflict (user_id) do update set plan=excluded.plan, status=excluded.status, expires_at=excluded.expires_at, updated_at=now();

YEARLY (valid for 1 year):
insert into public.diablo_subscriptions (user_id, plan, status, expires_at)
select id, 'plus', 'active', now() + interval '1 year' from auth.users where lower(email) = lower('EMAIL_HERE')
on conflict (user_id) do update set plan=excluded.plan, status=excluded.status, expires_at=excluded.expires_at, updated_at=now();

LIFETIME (no scheduled expiry; subject to the site's published terms):
insert into public.diablo_subscriptions (user_id, plan, status, expires_at)
select id, 'plus', 'active', null from auth.users where lower(email) = lower('EMAIL_HERE')
on conflict (user_id) do update set plan=excluded.plan, status=excluded.status, expires_at=null, updated_at=now();

If the email matches no account, the SQL inserts no row. Verify the email carefully. These are manual activation examples, not a payment gateway.
