# Hostinger Deployment Guide

This project has two separate Node.js apps:

- `frontend`: Next.js dashboard at `https://admin.paramsdental.com`
- `backend`: Express API at `https://api.paramsdental.com`

The public website at `https://paramsdental.com` is separate and does not need to be changed for this dashboard deployment.

## DNS Records

Create these DNS records in the DNS zone for `paramsdental.com`.

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `admin` | Hostinger target for the frontend Node.js app |
| CNAME | `api` | Hostinger target for the backend Node.js app |

If Hostinger gives an IP address instead of a CNAME target, create `A` records for `admin` and `api` pointing to that IP.

After DNS resolves, enable SSL for both subdomains in Hostinger:

- `https://admin.paramsdental.com`
- `https://api.paramsdental.com`

## MongoDB Atlas

Create a MongoDB Atlas cluster and database for the dashboard.

In Atlas, add Hostinger's outbound server IP address to **Network Access**. If Hostinger does not provide a stable outbound IP on the Business Web Hosting plan, use `0.0.0.0/0` only as a practical fallback and keep the database user password strong.

Create a database user with a strong password and use the Atlas connection string as `MONGO_URI`.

## Backend App

Deploy `backend` as a Hostinger Node.js app.

Recommended Hostinger settings:

- App root: `backend`
- Startup file: `server.js`
- Start command: `npm start`
- Install command: `npm install`
- Node.js version: use the newest Hostinger-supported LTS version available
- Domain/subdomain: `api.paramsdental.com`

Backend environment variables:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/appointmentdashboard
JWT_SECRET=<long-random-secret>
FRONTEND_URL=https://admin.paramsdental.com
BACKEND_URL=https://api.paramsdental.com
EMAIL_USER=<gmail-address>
EMAIL_PASS=<gmail-app-password>
WHATSAPP_TOKEN=<meta-whatsapp-cloud-api-token>
WHATSAPP_PHONE_ID=<meta-whatsapp-phone-number-id>
WHATSAPP_VERIFY_TOKEN=<private-webhook-verify-token>
CLINIC_WHATSAPP_NUMBER=91xxxxxxxxxx
```

`PORT` may be overridden by Hostinger. The backend reads `process.env.PORT || 5000`, so either Hostinger's assigned port or `5000` will work.

The backend health endpoint is:

```text
GET https://api.paramsdental.com/api/health
```

Expected response:

```json
{ "status": "ok", "service": "appointmentdashboard-backend" }
```

## Frontend App

Deploy `frontend` as a separate Hostinger Node.js app.

Recommended Hostinger settings:

- App root: `frontend`
- Build command: `npm run build`
- Start command: `npm start`
- Install command: `npm install`
- Node.js version: use the newest Hostinger-supported LTS version available
- Domain/subdomain: `admin.paramsdental.com`

Frontend environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.paramsdental.com
```

Important: set `NEXT_PUBLIC_API_URL` before running the production build. Next.js embeds public environment variables during build time.

## Local Verification Before Upload

From `backend`:

```bash
npm install
npm start
```

From `frontend`:

```bash
npm install
npm run build
```

## Production Testing Checklist

- Visit `https://api.paramsdental.com/api/health` and confirm the JSON health response.
- Visit `https://admin.paramsdental.com` and confirm the dashboard loads over HTTPS.
- Open browser dev tools on the dashboard and confirm API requests go to `https://api.paramsdental.com`, not localhost.
- Send a magic login link and confirm the email link points to `https://admin.paramsdental.com/verify`.
- Sign in and load patients, doctors, appointments, invoices, inventory, analytics, and prescriptions.
- Confirm there are no CORS errors in the browser console.
- Confirm MongoDB Atlas receives reads/writes from the deployed backend.
- Confirm invoice PDF download URLs use `https://api.paramsdental.com`.
