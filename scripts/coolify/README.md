Quick: deploy-to-coolify PowerShell template

What this is
- A PowerShell *template* script (`deploy-coolify.ps1`) that demonstrates automating common Coolify tasks with their API: create project (if missing), create PostgreSQL resources (DEV/PROD), and create application services (template).

Why template
- Coolify API endpoints and payload keys may differ by Coolify versions and installations. The script includes placeholders and conservative error handling; you must verify/adjust payload fields to match your Coolify API.

How to use (recommended)
1. Open PowerShell (on your machine where you have the token). Do NOT paste the token into public chat.

2. Set environment variables for the session (example):

```powershell
# Replace with your Coolify base API; usually 'https://<your-coolify-domain>/api'
$env:COOLIFY_API_BASE = 'https://coolify.pickpoint.my.id/api'

# For interactive security, prompt for token instead of hardcoding
$secure = Read-Host -AsSecureString "Paste Coolify token" 
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$env:COOLIFY_API_TOKEN = $plain
```

3. Run the script (DB only):

```powershell
# From repository root
.\scripts\coolify\deploy-coolify.ps1 -Mode DBOnly
```

4. Or run full flow (DB + services) - but inspect the script and adjust service payloads first:

```powershell
.\scripts\coolify\deploy-coolify.ps1 -Mode Full
```

Important notes
- The script will not (and should not) store your token in the repo. Use environment variables or a safe secret manager.
- The script contains placeholder endpoint paths (`/projects`, `/resources`, `/services`). If your Coolify API uses different paths or requires different JSON structure, edit the payload shapes before running.
- After creation, visit Coolify UI to confirm created resources and to copy the internal Postgres URL for `DATABASE_URL` env on app services.

If you want, I can:
- adapt the script to match exact Coolify API endpoints if you paste one working example API call (e.g., result of `curl -H "Authorization: Bearer <token>" https://coolify.pickpoint.my.id/api/projects`), or
- convert this to a Node.js script that does the same but easier to maintain.

Security reminder: never check your token into source control. Destroy and regenerate token if it was accidentally shared publicly.
