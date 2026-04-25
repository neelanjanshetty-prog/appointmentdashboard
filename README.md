# Appointment Dashboard

A production-ready dental clinic SaaS foundation with a Node/Express backend, MongoDB persistence, magic-link authentication, WhatsApp appointment workflows, PDF invoices, inventory tracking, analytics APIs, and a premium Next.js dashboard frontend.

## Features

- Email magic-link login with JWT sessions
- Protected backend CRUD APIs
- Patient, doctor, appointment, follow-up, invoice, and inventory modules
- Patient timeline with appointments and invoices
- Meta WhatsApp API service
- WhatsApp webhook with YES/NO follow-up confirmation flow
- WhatsApp booking bot foundation
- Automatic appointment reminders with `node-cron`
- PDF invoice generation with PDFKit
- Analytics overview API
- Next.js App Router frontend with Tailwind CSS, Framer Motion, Lucide icons, Axios, and Recharts

## Folder Structure

```bash
appointmentdashboard/
  backend/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
    uploads/invoices/
    server.js
  frontend/
    app/
    components/
    lib/
    types/
  README.md
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

For local development, `backend/.env` should include:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/appointmentdashboard
JWT_SECRET=clinic123456
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
PORT=5000
EMAIL_USER=
EMAIL_PASS=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=clinic_verify_token
CLINIC_WHATSAPP_NUMBER=
```

For local MongoDB, use:

```bash
mongodb://127.0.0.1:27017/appointmentdashboard
```

If you do not have a local MongoDB server running, either start MongoDB locally or paste your MongoDB Atlas connection string into `MONGO_URI`.

Production start:

```bash
npm start
```

The backend runs on `PORT`, defaulting to `5000`.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The frontend runs on:

```bash
http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Environment Variables

Backend `.env`:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/appointmentdashboard
JWT_SECRET=clinic123456
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
PORT=5000
EMAIL_USER=
EMAIL_PASS=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=clinic_verify_token
CLINIC_WHATSAPP_NUMBER=
```

For MongoDB Atlas, replace `MONGO_URI` with the Atlas connection string from your Atlas dashboard.

Frontend `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## WhatsApp Setup

The backend sends WhatsApp messages through the Meta Graph API:

```bash
https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
```

Required values:

- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `CLINIC_WHATSAPP_NUMBER`

Webhook endpoints:

```bash
GET  /api/whatsapp/webhook
POST /api/whatsapp/webhook
```

Set the Meta webhook verify token to the same value as `WHATSAPP_VERIFY_TOKEN`.

## Email Setup

Magic login links are sent with Nodemailer using:

- `EMAIL_USER`
- `EMAIL_PASS`

For Gmail, use an app password rather than your normal account password.

Auth endpoints:

```bash
POST /api/auth/send-link
GET  /api/auth/verify?token=...
```

## PDF Invoice Setup

Invoices are generated with PDFKit and saved in:

```bash
backend/uploads/invoices
```

The backend serves uploaded files from:

```bash
/uploads
```

Invoice PDF endpoint:

```bash
GET /api/invoices/:id/pdf
```

WhatsApp invoice endpoint:

```bash
POST /api/invoices/:id/send-whatsapp
```

Set `BACKEND_URL` correctly in production so WhatsApp invoice links point to the deployed backend.

## Follow-Up Confirmation Flow

When a completed appointment needs a follow-up, the frontend calls:

```bash
POST /api/appointments/:id/follow-up
```

The backend creates the follow-up appointment with:

- `status = pending_confirmation`
- `confirmationStatus = pending`
- `confirmationRequestedAt = current date`

The patient receives a WhatsApp message asking them to reply `YES` or `NO`.

If the patient replies `YES`:

- Appointment status becomes `confirmed`
- `confirmationStatus` becomes `confirmed`
- `confirmedAt` is set
- Patient, doctor, and clinic/admin are notified

If the patient replies `NO`:

- Appointment status becomes `declined`
- `confirmationStatus` becomes `declined`
- `declinedAt` is set
- Patient, doctor, and clinic/admin are notified

Pending confirmation appointments are not treated as confirmed until the patient replies `YES`.

## Reminders

The reminder service starts after MongoDB connects. It runs every minute and sends reminders only for appointments with:

- `status = booked`
- `status = confirmed`

It excludes:

- `pending_confirmation`
- `declined`
- `cancelled`

## Railway Deployment

Backend:

1. Create a Railway project.
2. Add the `backend` folder as the service root.
3. Set all backend environment variables in Railway.
4. Use:

```bash
npm install
npm start
```

5. Set `BACKEND_URL` to the Railway backend URL.
6. Set `FRONTEND_URL` to the deployed frontend URL.
7. Configure the Meta WhatsApp webhook to:

```bash
https://your-railway-backend.up.railway.app/api/whatsapp/webhook
```

Frontend:

1. Deploy the `frontend` folder as a separate service if desired.
2. Set:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
```

3. Build command:

```bash
npm run build
```

4. Start command:

```bash
npm start
```

## Hostinger Deployment

Recommended setup:

- Deploy the backend on Railway or another Node-friendly server.
- Deploy the frontend on Hostinger using a Node.js app or static-compatible Next hosting.

Frontend on Hostinger Node hosting:

```bash
cd frontend
npm install
npm run build
npm start
```

Set:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

Backend on Hostinger VPS:

```bash
cd backend
npm install
npm start
```

Use a process manager such as PM2:

```bash
pm2 start server.js --name appointmentdashboard-backend
pm2 save
```

Make sure the backend domain is HTTPS-enabled before using it for WhatsApp webhooks or invoice links.

## Notes For This Local Folder

This project currently lives inside a folder whose name contains a literal backslash. Node 24 and some package export loaders can misread that path. The backend and frontend include small `postinstall` compatibility patch scripts so local install/build/dev commands work from this folder. On a normal deployment path, these scripts are harmless no-ops.
