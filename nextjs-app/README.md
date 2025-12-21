# Pickpoint Dashboard - Next.js

Sistem manajemen paket untuk pickup point / loker paket apartemen/kantor.

## 🚀 Quick Start

### 1. Install Dependencies
```powershell
cd nextjs-app
npm install
```

### 2. Setup Database
Buat file `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/pickpoint"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate Prisma Client:
```powershell
npx prisma generate
npx prisma migrate dev
npm run db:seed
```

### 3. Jalankan Development Server
```powershell
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 📦 Fitur Utama

### ✅ Sudah Tersedia
- **Dashboard** dengan 4 kartu statistik (revenue, total paket, users, lokasi)
- **Package Management** dengan search, sorting, pagination, dan scanner QR/barcode
- **Users Management** (CRUD admin/staff)
- **Locations Management** (CRUD lokasi pickup)
- **Payments History** dengan filter dan sorting
- **Reports** dengan visualisasi chart (Recharts)
- **Scanner Integration** (3 jenis: jsQR, ZXing, Html5-qrcode)
- **Responsive Sidebar** dengan collapse/expand dan mobile overlay
- **Toast Notifications** untuk feedback user

### 🔄 Dalam Pengembangan
- PWA Support (manifest + service worker)
- Push Notifications untuk penghuni
- Login penghuni via nomor telepon
- History/Audit Log
- Geolocation autofill

---

## 📁 Struktur Folder

```
nextjs-app/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Halaman dashboard + sidebar layout
│   ├── users/             # CRUD users
│   ├── locations/         # CRUD lokasi
│   ├── payments/          # Riwayat pembayaran
│   ├── reports/           # Laporan dengan charts
│   └── api/               # API routes
├── components/
│   ├── scanner/           # Komponen scanner (4 variants)
│   ├── Modal.tsx
│   ├── Pagination.tsx
│   └── ToastProvider.tsx
├── lib/
│   ├── db.ts              # Prisma client
│   └── auth.ts            # NextAuth config
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Data seeding
└── public/                # Static assets
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js
- **Charts**: Recharts
- **Icons**: Lucide React
- **Scanner**: jsQR, @zxing/library, html5-qrcode
- **Notifications**: React Hot Toast

---

## 🎯 User Roles

### Admin
- Akses penuh ke semua fitur
- CRUD users, locations, customers
- Lihat semua paket dari semua lokasi
- Ubah settings global

### Staff
- Terbound ke lokasi tertentu
- Input paket baru (receive)
- Scan QR untuk pickup/delivery
- Lihat paket di lokasi sendiri saja
- Update status paket

---

## 📱 Scanner Modes

### 1. BarcodeScanner (jsQR)
- Mendukung QR + barcode 1D
- Manual input fallback
- Cocok untuk general purpose

### 2. SimpleScanner (@zxing/library)
- Multi-format (QR, Code128, EAN, UPC, dll)
- Auto-close setelah scan berhasil
- UI lebih besar untuk accuracy

### 3. Html5OmniScanner (html5-qrcode)
- Paling lengkap: QR + banyak barcode format
- Experimental: torch button, barcode detector API
- Configurable qrbox size

### 4. BackgroundScanner (passive)
- Scan otomatis di background tanpa UI modal
- Trigger callback saat detect kode
- Cocok untuk staff mobile app

**Catatan**: Scanner perlu HTTPS atau localhost untuk akses kamera.

---

## 🗄️ Database Schema (Simplified)

### User
- id, name, email, password (hashed)
- role: ADMIN | STAFF
- locationId (untuk staff)

### Location
- id, name, address
- baseRate (tarif dasar per hari)

### Package
- id, trackingCode (resi)
- senderName (kurir), receiverName, receiverPhone
- locationId, status, size
- dates: arrived, picked, destroyed
- feePaid

### Customer
- id, name, phoneNumber, unitNumber
- locationId, isMember
- subscription info

### Payment
- id, amount, paymentType, status
- customerId, packageId
- timestamp

---

## 🔐 Authentication

### Default Login (Seed Data)
```
Admin:
  Email: admin@pickpoint.com
  Password: admin123

Staff:
  Email: staff@pickpoint.com
  Password: staff123
```

**⚠️ Ganti password default setelah deployment!**

---

## 🚦 API Routes

### Packages
- `GET /api/packages` - List semua paket (filter by locationId untuk staff)
- `POST /api/packages` - Terima paket baru
- `PUT /api/packages/:id` - Update status/info paket
- `DELETE /api/packages/:id` - Hapus paket (soft delete)
- `GET /api/packages/track/:code` - Track by resi/QR code

### Dashboard
- `GET /api/dashboard/stats` - Aggregate stats untuk dashboard cards

### Users, Locations, Customers
- Standard REST CRUD endpoints

---

## 🎨 Customization

### Ubah Warna Tema
Edit `app/globals.css`:
```css
@layer base {
  :root {
    --primary: 38 92% 50%;    /* Amber/Orange */
    --secondary: 217 91% 60%; /* Blue */
  }
}
```

### Tambah Stat Card Baru
Edit `app/dashboard/page.tsx`:
```tsx
<div className="bg-white rounded-xl shadow-sm border p-5">
  <p className="text-sm font-medium text-gray-500">Label Baru</p>
  <p className="text-2xl font-bold text-gray-900">{value}</p>
</div>
```

### Tambah Scanner Baru
Lihat contoh di `components/scanner/` dan ikuti pattern:
1. Buat komponen dengan props `{ isOpen, onClose, onScan }`
2. Implementasi camera stream + decoding library
3. Trigger `onScan(code)` saat berhasil
4. Import dan gunakan di modal/form

---

## 🐛 Troubleshooting

### Error: Cannot find module '@prisma/client'
```powershell
npx prisma generate
```

### Error: Camera not accessible
- Pastikan menggunakan HTTPS atau localhost
- Check browser permissions (kamera harus allowed)
- Coba browser lain (Chrome/Edge recommended)

### Build error: styled-jsx client-only
- Known issue dengan Next.js 16 Turbopack + React Compiler
- Workaround: Gunakan dev mode (`npm run dev`)
- Atau tunggu update Next.js stable

### Port 3000 already in use
```powershell
# Stop proses node yang berjalan
Get-Process -Name node | Stop-Process -Force

# Atau gunakan port lain
$env:PORT=3001; npm run dev
```

---

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [NextAuth.js](https://next-auth.js.org)
- [Recharts](https://recharts.org/en-US)

Untuk detail lengkap implementasi dan progress, lihat:
- `PROGRESS.md` - Status terkini dan checklist
- `MASTER_PLAN.md` - Roadmap fase-fase pengembangan

---

**Dibuat dengan ❤️ menggunakan Next.js**
