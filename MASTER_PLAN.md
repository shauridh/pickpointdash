Pickpoint Dashboard: Master Project Plan

Role: Project Manager, Full Stack Developer, QA Engineer
Target Deployment: Coolify (VPS)
Development Tools: VSCode + GitHub Copilot

**Project Scope & Scaling**
- Target Locations: 5-10 lokasi (Phase 1)
- Residents per Location: 100-1000 unit
- Daily Package Volume: 500-1000 paket/hari
- Staff per Location: 2 orang + penambahan sesuai kebutuhan
- Data Retention: 90 hari tanpa transaksi → auto-delete (soft delete dengan audit log)

1. Project Overview & Domains

Platform manajemen penerimaan paket berbayar untuk apartemen/kantor dengan fitur operasional real-time dan pembayaran digital.

Strategi Domain (Monorepo Next.js)

Aplikasi dibangun dalam satu codebase Next.js namun melayani dua audiens berbeda menggunakan Middleware Routing:

Public / Resident (pickpoint.my.id)

Landing Page (Marketing).

Tracking Paket.

Halaman Pembayaran (Midtrans).

User Dashboard (Riwayat & Langganan).

Operational Portal (portal.pickpoint.my.id)

Login Staff/Admin/Mitra.

Input Paket (Mobile & Desktop).

Dashboard Monitoring & KPI.

Setting Harga & Lokasi.

2. Business Requirement (BRD) & Pricing Logic

A. Advanced Pricing Engine

Setiap lokasi (Location) memiliki konfigurasi harga mandiri:

Grace Period (Masa Tenggang):

Setting: 0 hari = Langsung kena charge saat paket diterima.

Setting: 1 hari = Gratis 24 jam dari jam paket diterima (rolling, bukan per-calendar day).

Progresif Waktu (Storage Fee):

Hari Pertama (Day 1): Harga fix (misal: Rp 2.000).

Hari Berikutnya (Next Day): Denda inap per hari (misal: +Rp 1.000/hari).

Kalkulasi: Contoh grace period = 1 hari, priceDayOne = 2.000, priceNextDay = 1.000
- Paket diterima Senin jam 14:00 → Gratis sampai Selasa jam 14:00
- Pickup Selasa jam 14:30 → Charge Rp 2.000 (Hari 1)
- Pickup Rabu jam 16:00 → Charge Rp 2.000 + Rp 1.000 = Rp 3.000 (Hari 1 + Hari 2)

Progresif Kuantitas (Volume/Member):

Paket Ke-1 (Bulan ini): Harga normal.

Paket Ke-2 dst: Harga member/diskon.

Catatan: Counter progresif kuantitas tidak di-reset per bulan, terus menggulung sesuai history resident.

B. Operational Efficiency (Real-Time Ops)

Sistem dirancang untuk kecepatan tinggi dan sinkronisasi antar perangkat.

Mobile Scanner (HP Staff): Digunakan sebagai alat input cepat dan scanner QR.

Desktop Dashboard (PC Staff): Menerima trigger dari HP.

Skenario "Remote Control": Staff scan paket di HP -> Data paket otomatis muncul (Pop-up) di layar PC Staff untuk verifikasi/billing tanpa perlu input ulang di PC.

3. Technical Architecture

Tech Stack (T3 / Modern)

Framework: Next.js 14+ (App Router).

Language: TypeScript.

Styling: Tailwind CSS + Shadcn UI.

Font: Plus Jakarta Sans.

Database: PostgreSQL.

ORM: Prisma.

Real-Time: Soketi (Self-Hosted Pusher alternative on Coolify).

Notification: WhatsApp (3rd Party API) + Email (Resend/Nodemailer).

Payment: Midtrans.

Infrastructure (Coolify)

App Service: Next.js (Nixpacks build).

Database Service: PostgreSQL.

Real-Time Service: Soketi App.

Storage: MinIO (S3 Compatible) untuk foto bukti paket.

4. Database Schema (Prisma Blueprint)

Copy schema ini ke prisma/schema.prisma.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPER_ADMIN
  LOCATION_MANAGER
  STAFF
  RESIDENT
}

enum PackageStatus {
  RECEIVED        // Baru diinput
  NOTIFIED        // WA Terkirim
  CONFIRMED       // User konfirmasi mau ambil
  DELIVERY_REQ    // User minta antar
  COMPLETED       // Selesai (Diambil/Diantar)
  RETURNED        // Retur ke kurir
  ABANDONED       // Hangus
}

enum PaymentMethod {
  CASH
  QRIS
  VA
  SUBSCRIPTION
}

model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  phone         String    @unique // Kunci utama notifikasi
  name          String
  unitNumber    String?   // Indexing untuk pencarian cepat
  role          Role      @default(RESIDENT)
  password      String?
  
  // Relasi
  managedLocations Location[] @relation("Manager")
  staffAt          Location?  @relation("Staff", fields: [staffAtId], references: [id])
  staffAtId        String?
  
  packages         Package[]  @relation("Recipient")
  inputtedPackages Package[]  @relation("ReceivedPackages") // Audit trail: Siapa staff yg input
  
  // Data Retention Tracking
  lastTransactionAt DateTime? // Terakhir punya paket masuk/transaksi
  isDeleted         Boolean   @default(false) // Soft delete flag
  deletedAt         DateTime? // Timestamp saat soft delete
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([phone])
  @@index([unitNumber])
  @@index([lastTransactionAt])
  @@index([isDeleted])
}

model Location {
  id            String    @id @default(cuid())
  name          String
  code          String    @unique // Kode unik lokasi
  address       String
  
  // --- PRICING CONFIGURATION ---
  gracePeriodDays   Int      @default(0) // 0 = Charge immediately
  
  // Time-based Progressive
  priceDayOne       Decimal  @default(0) // Harga hari pertama kena charge
  priceNextDay      Decimal  @default(0) // Harga per hari berikutnya (Denda)
  
  // Qty-based Progressive
  priceFirstPackage Decimal  @default(0) // Harga paket pertama bulan berjalan
  priceNextPackage  Decimal  @default(0) // Harga paket kedua dst
  
  deliveryFee       Decimal  @default(0)
  
  // Relasi
  managerId     String
  manager       User      @relation("Manager", fields: [managerId], references: [id])
  staffs        User[]    @relation("Staff")
  packages      Package[]
  
  createdAt     DateTime  @default(now())
}

model Package {
  id            String        @id @default(cuid())
  trackingNumber String?      // Hasil scan barcode resi
  courierName   String?       // JNE/Gojek/dll
  photoUrl      String?       // Bukti foto
  
  status        PackageStatus @default(RECEIVED)
  receivedAt    DateTime      @default(now())
  pickedUpAt    DateTime?
  
  // Relasi Lokasi & User
  locationId    String
  location      Location      @relation(fields: [locationId], references: [id])
  recipientId   String
  recipient     User          @relation("Recipient", fields: [recipientId], references: [id])
  
  // Audit Trail (Staff yg input)
  receivedById  String?
  receivedBy    User?         @relation("ReceivedPackages", fields: [receivedById], references: [id])
  
  // Billing Snapshot (Disimpan saat checkout agar immutable)
  finalFee      Decimal       @default(0)
  daysStored    Int           @default(0)
  isPaid        Boolean       @default(false)
  paymentMethod PaymentMethod?
  
  // Add-ons
  isDeliveryReq Boolean       @default(false)
  deliveryNote  String?
  
  // Data Retention Tracking
  isDeleted     Boolean       @default(false) // Soft delete flag
  deletedAt     DateTime?     // Timestamp saat soft delete
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  @@index([receivedAt])
  @@index([status])
  @@index([locationId])
  @@index([isDeleted])
}

model GoogleSheetsLog {
  id        String   @id @default(cuid())
  packageId String
  action    String   // "CREATE", "UPDATE_STATUS", "PAYMENT"
  synced    Boolean  @default(false)
  syncedAt  DateTime?
  error     String?
  createdAt DateTime @default(now())
  
  @@index([synced])
  @@index([createdAt])
}


5. Real-Time Logic (Soketi Integration)

Konfigurasi library pusher-js agar menunjuk ke server Soketi VPS Anda, bukan ke server Pusher resmi.

import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Server Instance (Trigger Event)
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: "",
  useTLS: true,
  host: process.env.PUSHER_HOST, // Domain Soketi Anda (ws.pickpoint.my.id)
  port: process.env.PUSHER_PORT,
  scheme: process.env.PUSHER_SCHEME,
});

// Client Instance (Listen Event)
export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST,
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  disableStats: true,
  enabledTransports: ["ws", "wss"],
  cluster: "",
});


Event Channels Strategy

Channel: location-{locationId}

Event: package-new -> Update tabel paket di Dashboard semua staff.

Event: stats-update -> Update angka KPI real-time.

Channel: user-{staffUserId} (Private Channel)

Event: remote-scan -> Trigger Pop-up detail paket di Desktop Staff saat Staff tersebut melakukan scan via HP.

5.1. API Route Structure & Validation

RESTful API dengan versioning:

```
# Package Management
POST   /api/v1/packages                    # Create package (staff input)
GET    /api/v1/packages                    # List packages (filtered by location, status)
GET    /api/v1/packages/{id}               # Get package detail
PATCH  /api/v1/packages/{id}               # Update status, payment
POST   /api/v1/packages/{id}/checkout      # Calculate & create checkout session

# Locations
GET    /api/v1/locations                   # List locations
GET    /api/v1/locations/{id}/pricing      # Get pricing config
PATCH  /api/v1/locations/{id}/pricing      # Update pricing (admin only)

# Users (Auth/Registration)
POST   /api/v1/auth/register               # Resident signup
POST   /api/v1/auth/login                  # Login (staff/resident)
POST   /api/v1/auth/logout                 # Logout
GET    /api/v1/users/{id}                  # Get user profile
PATCH  /api/v1/users/{id}                  # Update profile

# Tracking (Public)
GET    /api/v1/public/track/{trackingNumber}  # Public package tracking
```

Input Validation (Zod):

```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

const phoneSchema = z.string()
  .regex(/^(\+62|0)[0-9]{9,12}$/, "Phone harus format +62... atau 0...")

const createPackageSchema = z.object({
  trackingNumber: z.string().min(3).max(50),
  courierName: z.string().min(2).max(50),
  recipientPhone: phoneSchema,
  recipientName: z.string().min(2).max(100),
  locationId: z.string().cuid(),
  isDeliveryReq: z.boolean().optional().default(false),
})
```

Error Response (Standardized):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [{ "field": "recipientPhone", "message": "Invalid phone format" }]
  }
}
```

5.2. Environment Configuration

Buat `.env.example` di root project:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pickpoint_db

# Soketi (Real-time)
SOKETI_HOST=ws.pickpoint.my.id
SOKETI_PORT=6001
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_KEY=your_public_key
NEXT_PUBLIC_PUSHER_HOST=ws.pickpoint.my.id

# Midtrans Payment
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your_client_key

# Storage (MinIO)
MINIO_ENDPOINT=minio.coolify.io
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET_NAME=pickpoint-photos

# Notification
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_API_TOKEN=your_token
RESEND_API_KEY=your_resend_key

# URLs
NEXT_PUBLIC_APP_URL=https://pickpoint.my.id
NEXT_PUBLIC_PORTAL_URL=https://portal.pickpoint.my.id

# Google Sheets Integration
GOOGLE_SHEETS_API_KEY=your_sheets_api_key
GOOGLE_SHEETS_WEBHOOK_SECRET=your_webhook_secret

# Feature Flags
FEATURE_ENABLED_WA_NOTIFICATION=true
FEATURE_ENABLED_DELIVERY_REQUEST=true
```

5.3. Security & Authentication

- **Session Timeout**: Staff = 8 jam (office hours), Resident = 30 hari (remember me)
- **CORS Policy**: Allow origin dari `pickpoint.my.id` dan `portal.pickpoint.my.id` only
- **Rate Limiting**: 
  - Public API: 10 req/min per IP
  - Auth endpoint: 5 req/min per IP
  - Authenticated API: 100 req/min per user
- **Phone Validation**: Skip OTP verification untuk MVP (simple format validation sudah cukup)

5.4. Notification Templates

WhatsApp Template (Resident):

```
"Hi {nama}, Paket anda {awb}, sudah dapat diambil di pickpoint {location}, {link}"

Contoh:
"Hi Budi, Paket anda JNE123456, sudah dapat diambil di pickpoint Apartment Senayan, https://pickpoint.my.id/track/pkg_abc123"
```

5.5. Google Sheets Real-Time Sync

Objective: Mirror database changes ke Google Sheets untuk reporting/monitoring

Implementation Strategy (Webhook + Google Apps Script):

```
Trigger: Setiap ada Package create/update
1. Prisma middleware intercept operation
2. Call webhook ke Google Apps Script (async, non-blocking)
3. Apps Script append/update row di Sheets
4. Log sync status di GoogleSheetsLog model (track success/error)

Flow:
packageCreate → Middleware → POST to Google Apps Script → Append Sheets → Response

Endpoint:
POST https://script.google.com/macros/d/{SCRIPT_ID}/usercontent

Sheets structure:
Columns: [Timestamp, PackageID, TrackingNumber, Resident, Location, Status, Amount, PaymentMethod, SyncedAt]
```

Setup Google Apps Script:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  // Append row
  sheet.appendRow([
    new Date(),
    data.packageId,
    data.trackingNumber,
    data.recipientName,
    data.location,
    data.status,
    data.finalFee,
    data.paymentMethod,
    new Date()
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Database Model untuk tracking:

```prisma
model GoogleSheetsLog {
  id        String   @id @default(cuid())
  packageId String
  action    String   // "CREATE", "UPDATE_STATUS", "PAYMENT"
  synced    Boolean  @default(false)
  syncedAt  DateTime?
  error     String?
  createdAt DateTime @default(now())
  
  @@index([synced])
  @@index([createdAt])
}
```

Middleware implementation (app/lib/middleware.ts):

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Hook setelah package create/update
prisma.$use(async (params, next) => {
  const result = await next(params)
  
  if (params.model === 'Package' && ['create', 'update'].includes(params.action)) {
    // Async trigger ke Google Sheets (fire and forget)
    syncToGoogleSheets(result).catch(err => 
      console.error('GoogleSheets sync failed:', err)
    )
  }
  
  return result
})

async function syncToGoogleSheets(packageData: any) {
  try {
    const response = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: packageData.id,
        trackingNumber: packageData.trackingNumber,
        recipientName: packageData.recipient?.name,
        location: packageData.location?.name,
        status: packageData.status,
        finalFee: packageData.finalFee,
        paymentMethod: packageData.paymentMethod
      })
    })
    
    // Log success
    await prisma.googleSheetsLog.create({
      data: {
        packageId: packageData.id,
        action: 'CREATE',
        synced: response.ok,
        syncedAt: response.ok ? new Date() : undefined,
        error: response.ok ? null : await response.text()
      }
    })
  } catch (err) {
    await prisma.googleSheetsLog.create({
      data: {
        packageId: packageData.id,
        action: 'CREATE',
        synced: false,
        error: String(err)
      }
    })
  }
}
```

5.6. Data Retention & Cleanup Strategy

Objective: Compliance dengan privacy regulation + optimized database performance

Retention Rules:
- Resident (User) dengan role RESIDENT dihapus jika 90 hari tanpa transaksi/paket masuk
- Package dihapus jika recipient-nya sudah dihapus atau 90 hari tanpa transaksi
- Photo bukti paket di MinIO juga dihapus (soft delete MinIO atau hard delete)

Implementation: Scheduled Job (Cron)

Jalankan daily cron job via API route (Next.js Route Handler + node-cron):

```
POST /api/admin/cleanup-retention (Protected - Super Admin only)
Trigger: Setiap hari jam 02:00 UTC

Logic:
1. Query User dengan lastTransactionAt < 90 hari lalu & role = RESIDENT
2. Set isDeleted = true, deletedAt = now()
3. Soft delete semua Package milik user tersebut
4. Queue async job untuk delete photo dari MinIO
5. Log audit trail ke database
6. Return: { usersDeleted, packagesDeleted, timestamp }

Database Query Optimization:
- Index pada [User.lastTransactionAt, User.isDeleted]
- Index pada [Package.isDeleted, Package.receivedAt]
- Gunakan batch delete untuk avoid long-running transactions
```

Audit Trail (New Model - Optional):

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  action    String   // "DELETE_USER", "DELETE_PACKAGE"
  targetId  String   // User ID atau Package ID
  reason    String   // "RETENTION_90_DAYS_NO_TRANSACTION"
  createdAt DateTime @default(now())
  
  @@index([action])
  @@index([createdAt])
}
```

6. Implementation Roadmap

Phase 1: Foundation (Hari 1-2)

Init Next.js Project & Setup Shadcn UI + Font Jakarta Sans.

Deploy Soketi & Postgres di Coolify.

Implement Middleware Routing (_sites/portal vs _sites/public).

Milestone: Landing Page Public siap (Dummy Content) untuk submit verifikasi Midtrans.

Phase 2: Core Portal (Hari 3-5)

Auth System (NextAuth/Auth.js) dengan Role based.

CRUD Lokasi & Konfigurasi Harga (Advanced Pricing Logic).

CRUD User (Resident & Staff).

Phase 3: Operational Features (Hari 6-8)

Halaman Input Paket (Desktop & Mobile View).

Integrasi Kamera HP (react-qr-reader).

Integrasi Soketi (Real-time sync & Remote Control).

Logic Pricing Engine (Hitung biaya otomatis saat paket diambil).

Phase 4: Customer & Payment (Hari 9-10)

Notifikasi WhatsApp via API.

Customer Dashboard (Lihat paket, Request delivery).

Integrasi Payment Gateway Midtrans (Snap).