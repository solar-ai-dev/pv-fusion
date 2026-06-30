# Local Admin Bootstrap

This directory contains local-only bootstrap helpers for development.

## promote-local-admin.ps1

Promotes a user row created by the first Google OAuth login to `APPROVED` and `ADMIN` in the local PostgreSQL container.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/promote-local-admin.ps1 -Email "user@example.com"
```

Optional arguments:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/promote-local-admin.ps1 `
  -Email "user@example.com" `
  -Role "ADMIN" `
  -AccountStatus "APPROVED" `
  -DbService "postgres" `
  -DbName "pv_fusion_local" `
  -DbUser "pvfusion"
```

Notes:

- This script is for local Docker Compose PostgreSQL only.
- Do not use it against production or shared databases.
- Run it only after the first Google login creates the `users` row.
- After execution, a browser logout/login or refresh may be required.
- Do not store real email addresses, OAuth client secrets, or DB passwords in the script.
