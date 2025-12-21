# Progress Pickpoint Dashboard Next.js

## Status Terkini (15 Desember 2025)

### ✅ Selesai

#### Fase 1: Foundation
- ✅ Next.js app directory dengan TypeScript, Tailwind CSS 4, ESLint
- ✅ Halaman dasar: dashboard, users, locations, payments, reports
- ✅ Icons (lucide-react), charts (recharts), toast (react-hot-toast)
- ✅ Prisma scaffolding + Postgres adapter

#### Fase 2: UI Core & Navigasi
- ✅ Sidebar dengan collapse (desktop toggle, mobile overlay)
- ✅ Redirect `/packages` ke `/dashboard`
- ✅ Toggle global untuk hide/show stat cards dan filter
- ✅ 4 kartu statistik utama di dashboard

#### Fase 3: Data Views & Interaksi
- ✅ Halaman users dengan CRUD, search, pagination client-side
- ✅ Komponen `Pagination` reusable
- ✅ Tabel paket di dashboard: search, sorting, page-size selector, pagination
- ✅ Modal Add/Edit/Delete paket dengan optimistic updates
- ✅ Halaman reports dengan multiple charts (recharts)
- ✅ Dummy data seeding jika `/api/packages` gagal

#### Fase 4: Integrasi Scanner
- ✅ Dependencies: `jsqr`, `@zxing/library`, `html5-qrcode`
- ✅ Komponen scanner yang diport dari Vite:
  - `BarcodeScanner` (jsQR dengan manual input fallback)
  - `SimpleScanner` (@zxing/library untuk QR + barcode)
  - `Html5OmniScanner` (html5-qrcode multi-format)
  - `BackgroundScanner` (passive scanner tanpa UI)
- ✅ Integrasi scanner ke modal "Tambah Paket" dan "Ambil Paket"
- ✅ Scan resi mengisi field tracking code otomatis

### 🔄 Dalam Progress

#### Build & Kompilasi
- ⚠️ Build production (Turbopack) ada konflik dengan styled-jsx/client-only
  - **Solusi sementara**: Mode dev berjalan sempurna di `http://localhost:3000`
  - **Root cause**: React Compiler experimental + Turbopack issue di Next.js 16.0.10
  - **Workaround**: Disable React Compiler atau tunggu update Next.js

#### Dependencies
- ✅ Semua dependencies terinstall
- ✅ Prisma Client generated
- ✅ Types resolved (@types/pg, tailwind-merge, scanner libs)

### 📋 Pending / Belum Dimulai

#### QA & Polish
- [ ] Manual testing: sidebar, cards, search, pagination, modals
- [ ] Responsive layout check (mobile/tablet/desktop)
- [ ] Empty states dan loading states
- [ ] Alignment kolom tabel dengan versi Vite reference

#### Fitur Tambahan
- [ ] Geolocation autofill untuk field lokasi
- [ ] Backend wiring: POST/PUT/DELETE `/api/packages`
- [ ] Backend wiring: `/api/packages/track/:code` untuk retrieve scan
- [ ] API `/api/dashboard/stats` dengan data real (bukan dummy)

#### PWA & Mobile (dari Master Plan Fase 7)
- [ ] PWA manifest + service worker
- [ ] Halaman login penghuni (by phone number)
- [ ] Push notification setup (VAPID/FCM)
- [ ] Registrasi penghuni linking ke Customer
- [ ] Tabel history untuk audit events
- [ ] Mobile scanner dalam PWA (offline-capable)

---

## Cara Menjalankan

### Prerequisites
- Node.js 20+
- PostgreSQL database (atau connection string ke Supabase/cloud DB)
- File `.env` dengan variabel:
  ```
  DATABASE_URL="postgresql://..."
  NEXTAUTH_SECRET="..."
  NEXTAUTH_URL="http://localhost:3000"
  ```

### Install Dependencies
```powershell
cd C:\Users\Zafian\Documents\pickpoint\nextjs-app
npm install
```

### Generate Prisma Client
```powershell
npx prisma generate
```

### Jalankan Migration (jika diperlukan)
```powershell
npx prisma migrate dev
```

### Seed Database (opsional)
```powershell
npm run db:seed
```

### Start Development Server
```powershell
npm run dev
```

Server akan berjalan di `http://localhost:3000`

---

## Known Issues

### 1. Build Production Error (Turbopack)
**Error**: `Invalid import 'client-only' cannot be imported from a Server Component`

**Status**: Dev mode berjalan normal; production build masih error

**Workaround**:
- Gunakan `npm run dev` untuk development
- Tunggu update Next.js atau disable Turbopack untuk build

### 2. API Endpoints Belum Sepenuhnya Wired
**Status**: Frontend siap, backend masih menggunakan dummy/mock di beberapa tempat

**To-do**:
- Implement CRUD endpoints di `/api/packages`
- Implement `/api/packages/track/:code` untuk scan retrieval
- Implement `/api/dashboard/stats` dengan query real

### 3. Scanner Permissions
**Catatan**: Scanner memerlukan HTTPS atau localhost untuk akses kamera browser

**Solusi**:
- Development: localhost sudah OK
- Production: pastikan deploy dengan HTTPS

---

## Struktur File Utama

```
nextjs-app/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx          # Halaman dashboard dengan stat cards
│   │   ├── PackageTable.tsx  # Tabel paket dengan search/sort/pagination
│   │   └── layout.tsx        # Layout dengan sidebar
│   ├── users/page.tsx        # CRUD users
│   ├── locations/page.tsx    # CRUD lokasi
│   ├── payments/page.tsx     # Halaman payments
│   ├── reports/page.tsx      # Halaman laporan dengan charts
│   └── api/
│       ├── packages/         # API routes untuk paket
│       └── dashboard/stats/  # API stats untuk dashboard
├── components/
│   ├── scanner/
│   │   ├── BarcodeScanner.tsx      # Scanner jsQR
│   │   ├── SimpleScanner.tsx       # Scanner @zxing
│   │   ├── Html5OmniScanner.tsx    # Scanner html5-qrcode
│   │   └── BackgroundScanner.tsx   # Passive scanner
│   ├── Modal.tsx
│   ├── ConfirmDialog.tsx
│   ├── Pagination.tsx
│   └── ToastProvider.tsx
├── lib/
│   ├── db.ts                 # Prisma client instance
│   └── auth.ts               # NextAuth config
└── prisma/
    ├── schema.prisma         # Database schema
    └── seed.ts               # Seed script
```

---

## API Contracts (Proposed)

### Packages
- **GET** `/api/packages` → `{ success: boolean; data: Package[] }`
- **POST** `/api/packages` → `{ trackingCode, senderName, receiverName, ... }`
- **PUT** `/api/packages/:id` → `{ ...updatedFields }`
- **DELETE** `/api/packages/:id` → `{ success: boolean }`
- **GET** `/api/packages/track/:code` → `{ success: boolean; data: Package }`

### Dashboard Stats
- **GET** `/api/dashboard/stats` → `{ success: boolean; data: Stats }`

**Stats** shape:
```typescript
{
  totalUsers: number;
  totalLocations: number;
  totalPackages: number;
  totalRevenue: number;
  revenueDelivery: number;
  revenueSubscription: number;
  revenuePackage: number;
  packagesByStatus: {
    arrived: number;
    picked: number;
    destroyed: number;
  };
}
```

**Package** shape:
```typescript
{
  id: string;
  trackingCode: string;
  senderName: string;
  receiverName: string;
  receiverPhone?: string;
  status: 'ARRIVED' | 'PICKED' | 'DESTROYED';
  size: 'S' | 'M' | 'L';
  location: { id: string; name: string; };
  createdAt: string;
}
```

---

## Next Steps (Prioritas)

1. **QA Manual** ✅
   - Test semua flow: login, dashboard, add/edit/delete paket, scan
   - Verifikasi responsive layout
   - Check empty states & error handling

2. **Fix Production Build** 🔧
   - Investigate Turbopack + styled-jsx issue
   - Atau migrate ke webpack build
   - Atau disable experimental features yang conflict

3. **Backend Wiring** 🔌
   - Implement real API endpoints untuk packages CRUD
   - Hook up stats API dengan query Prisma real
   - Add authentication middleware ke protected routes

4. **Geolocation Autofill** 📍
   - Gunakan `navigator.geolocation` untuk field lokasi
   - Fallback ke manual input jika permission denied

5. **PWA Setup** 📱 (Fase 7)
   - Buat manifest.json
   - Setup service worker untuk offline caching
   - Implement push notifications
   - Build resident login page

---

## Catatan Migrasi dari Vite

Komponen yang sudah diport:
- ✅ Scanner components (4 variants)
- ✅ Pagination
- ✅ Modal & ConfirmDialog
- ⚠️ Dashboard/Packages logic (sebagian, perlu refactor StorageService → Prisma)

Komponen yang belum diport (tidak diperlukan untuk MVP):
- Landing page (login bisa langsung di `/login`)
- MobileStaffApp (bisa dibuat terpisah atau sebagai PWA view)
- SelfRegistration (akan dibuat di Fase 7 PWA)

---

## FAQ

**Q: Kenapa build production error tapi dev jalan?**  
A: Turbopack di Next.js 16 masih experimental; dev mode menggunakan fast refresh yang lebih permisif. Production build lebih strict terhadap client/server component boundaries.

**Q: Apakah scanner bisa digunakan di mobile?**  
A: Ya, asalkan menggunakan HTTPS atau localhost. Browser mobile modern mendukung camera API.

**Q: Bagaimana cara menambahkan user baru?**  
A: Via halaman `/users` setelah login sebagai admin, atau via seed script di `prisma/seed.ts`.

**Q: Data dummy paket hilang setelah refresh?**  
A: Ya, dummy data hanya di state client-side. Perlu implement backend POST untuk persist ke database.

**Q: Bisa deploy ke mana?**  
A: Vercel (recommended), Railway, Render, atau VPS dengan Node.js + PostgreSQL. Pastikan set environment variables yang benar.

---

**Terakhir diupdate**: 15 Desember 2025  
**Status**: Dev server running ✅ | Production build pending fix ⚠️
