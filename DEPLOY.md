# Deploy FinSta to GitHub Pages
1. Copy `config.local.example.js` to `config.local.js` and paste your Supabase URL and anon key. (Keep your own `config.local.js` when you unzip updates; the zips never contain one, so it is never overwritten. Do this for the phone app too, then `npm run sync`.)
2. Put EVERYTHING in this folder at the root of your repo, keeping the folders (`fonts/`, `icons/`, `vendor/`). Delete the old loose files first.
3. Repo Settings -> Pages -> Source: `main` branch, `/ (root)`.
4. Your site URL will look like `https://<user>.github.io/<repo>/`. Add exactly that URL under
   Supabase -> Authentication -> URL Configuration -> Redirect URLs (and as Site URL).
5. In Google Cloud's OAuth client, the authorized redirect URI stays the Supabase one (`https://<project>.supabase.co/auth/v1/callback`).
6. Open the site and hard-refresh once (old cached copies can linger).
