# Analisis Struktur Pickpoint Vite

## 📋 Informasi Dasar
- **Framework**: Vite + React
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Chart**: Recharts
- **Database**: Supabase (PostgreSQL)
- **QR/Barcode**: html5-qrcode, jsqr, @zxing/library, react-webcam

## 📁 Struktur Folder

```
pickpoint/
├── src/
│   ├── components/
│   │   ├── AdminApp.tsx          (Main admin dashboard)
│   │   ├── Dashboard.tsx         (Admin dashboard view)
│   │   ├── Users.tsx             (User management)
│   │   ├── Locations.tsx         (Location management)
│   │   ├── Packages.tsx          (Package management)
│   │   ├── PaymentPage.tsx       (Payment page)
│   │   ├── Landing.tsx           (Landing page)
│   │   ├── Tracking.tsx          (Package tracking - public)
│   │   ├── SelfRegistration.tsx  (Self registration - public)
│   │   ├── Login.tsx             (Login page)
│   │   ├── Reports.tsx           (Reports)
│   │   ├── Settings.tsx          (Settings)
│   │   ├── Customers.tsx         (Customer management)
│   │   ├── BarcodeScanner.tsx    (Barcode scanner)
│   │   ├── QRScanner.tsx         (QR scanner)
│   │   ├── Html5OmniScanner.tsx  (HTML5 scanner)
│   │   ├── SimpleScanner.tsx     (Simple scanner)
│   │   ├── MobileStaffApp.tsx    (Mobile staff app)
│   │   ├── MobileAddPackage.tsx  (Mobile add package)
│   │   ├── StaffMobile.tsx       (Staff mobile)
│   │   └── BackgroundScanner.tsx (Background scanner)
│   ├── context/
│   │   ├── AppContext.tsx        (App global state)
│   │   └── ToastContext.tsx      (Toast notifications)
│   ├── services/
│   │   └── (API services untuk Supabase)
│   ├── config/
│   │   └── environment.ts        (Environment config)
│   ├── constants.ts
│   ├── types.ts                  (TypeScript types)
│   ├── App.tsx                   (Main app router)
│   ├── index.tsx                 (Entry point)
│   └── index.css
├── api/
│   └── (Backend API code - perlu dikonversi ke Next.js API routes)
├── vite.config.ts
├── tailwind.config.cjs
├── postcss.config.cjs
├── tsconfig.json
└── package.json
```

## 🎯 Routes & Pages

### Admin Routes
- `/admin` → AdminApp (Main dashboard)
  - `/admin/dashboard` → Dashboard
  - `/admin/users` → Users management
  - `/admin/locations` → Locations management
  - `/admin/packages` → Packages management
  - `/admin/payments` → Payment management
  - `/admin/reports` → Reports
  - `/admin/settings` → Settings
  - `/admin/customers` → Customers management
  - `/admin/mobile` → Mobile staff app

### Public Routes
- `/` → Landing page (public) atau redirect ke /admin (dashboard domain)
- `/tracking` → Package tracking (public)
- `/form` → Self registration (public)
- `/payment` → Payment page (public)
- `/login` → Login page

### Mobile Routes
- `/mobile` → Mobile staff app

## 📊 Key Types (dari types.ts)

```typescript
- Role: 'ADMIN' | 'STAFF'
- PackageStatus: 'ARRIVED' | 'PICKED' | 'DESTROYED'
- PackageSize: 'S' | 'M' | 'L'
- PricingType: 'FLAT' | 'PROGRESSIVE' | 'SIZE' | 'QUANTITY'

Interfaces:
- PricingSchema
- Location
- User
- Package
- Payment
- Report
```

## 🔐 Authentication
- Menggunakan Supabase Auth
- Context-based state management (AppContext)
- Role-based access control (ADMIN, STAFF)

## 🎨 UI Components
- Tailwind CSS untuk styling
- Lucide React untuk icons
- Custom Toast notifications (ToastContext)
- Recharts untuk charts/graphs

## 📱 Features

### Admin Features
- Dashboard dengan statistik
- User management (CRUD)
- Location management dengan pricing schema
- Package management (CRUD, status tracking)
- Payment tracking dan reports
- Customer management
- Settings/configuration
- Reports & analytics
- Mobile app untuk staff

### Mobile Features
- Package scanning (QR/Barcode)
- Background scanning
- Add package dari mobile
- Multiple scanner libraries support

### Public Features
- Landing page
- Package tracking
- Self registration
- Payment page

## 🔄 Context & State Management
- AppContext: Global app state, user info, locations, packages, etc.
- ToastContext: Toast notifications

## 🗄️ API Integration
- Supabase untuk database dan auth
- Backend di `/api` folder (perlu dikonversi ke Next.js API routes)

## 📝 Migrasi ke Next.js + Prisma Strategy

1. **Folder Structure**
   - `app/` → Next.js App Router
   - `components/` → React components (sama)
   - `lib/` → utilities, constants, services
   - `prisma/` → Prisma schema dan migrations
   - `api/` → Next.js API routes
   - `public/` → static assets

2. **Database**
   - Replace Supabase dengan PostgreSQL + Prisma ORM
   - Adapt schema dari Supabase ke Prisma schema

3. **Authentication**
   - Keep React context atau migrate to NextAuth.js
   - Maintain role-based access control

4. **Routing**
   - Convert React Router routes to Next.js App Router
   - Create page.tsx files untuk setiap route

5. **API**
   - Convert existing API calls to Next.js API routes
   - Create `/api` folder dengan route handlers

6. **State Management**
   - Keep AppContext dan ToastContext (atau upgrade to global state solution)
   - Adapt untuk Next.js client/server components

## ✅ Next Steps
1. Analyze API routes dan backend code di `/api` folder
2. Create Prisma schema berdasarkan existing database
3. Start converting components ke Next.js format
4. Setup API routes di Next.js
5. Implement authentication dengan NextAuth
6. Test routing dan functionality
