# Migration Plan: Pickpoint Vite → Next.js + Prisma (Coolify Ready)

## 📌 Overview
Migrasi penuh dari Vite (frontend) + Vercel serverless API ke Next.js full-stack + Prisma ORM dengan PostgreSQL, siap untuk deployment di Coolify.

## 🗂️ Project Structure untuk Next.js

```
pickpoint/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (public)/
│   │   ├── page.tsx              # Landing
│   │   ├── tracking/
│   │   │   └── page.tsx
│   │   ├── form/
│   │   │   └── page.tsx          # Self registration
│   │   └── payment/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── users/
│   │   │   ├── locations/
│   │   │   ├── packages/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   ├── customers/
│   │   │   └── settings/
│   │   └── mobile/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   ├── logout/
│   │   │   │   └── route.ts
│   │   │   └── register/
│   │   │       └── route.ts
│   │   ├── users/
│   │   │   ├── route.ts          # GET all, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET, PUT, DELETE
│   │   ├── locations/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── packages/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── payments/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── activities/
│   │   │   └── route.ts
│   │   ├── settings/
│   │   │   └── route.ts
│   │   ├── dashboard/
│   │   │   └── stats/
│   │   │       └── route.ts
│   │   └── wa/
│   │       └── send/
│   │           └── route.ts
│   ├── layout.tsx               # Root layout
│   └── globals.css
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── (dari Vite, langsung copy)
│   └── shared/
├── lib/
│   ├── db.ts                    # Prisma client
│   ├── auth.ts                  # Auth helpers
│   ├── constants.ts             # Constants dari Vite
│   ├── types.ts                 # Types dari Vite
│   └── utils.ts
├── middleware.ts                # Auth middleware
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/
├── public/
├── .env
├── .env.example
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml           # Untuk Coolify
└── package.json
```

## 📊 Database Schema (Prisma)

Berdasarkan Vite types dan Supabase schema:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          String    @id @default(cuid())
  email       String    @unique
  password    String
  name        String
  role        Role      @default(STAFF)
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Location {
  id          String      @id @default(cuid())
  name        String
  code        String      @unique
  address     String
  phone       String?
  pricing     Json        # PricingSchema
  deliveryFee Float       @default(0)
  enableMembership Boolean @default(false)
  membershipFee Float     @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  packages    Package[]
  payments    Payment[]
}

model Package {
  id          String        @id @default(cuid())
  trackingCode String       @unique
  locationId  String
  location    Location      @relation(fields: [locationId], references: [id])
  senderName  String
  senderPhone String
  receiverName String
  receiverPhone String
  status      PackageStatus @default(ARRIVED)
  size        PackageSize
  weight      Float?
  description String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  payments    Payment[]
  activities  Activity[]
}

model Payment {
  id          String    @id @default(cuid())
  packageId   String?
  package     Package?  @relation(fields: [packageId], references: [id])
  locationId  String
  location    Location  @relation(fields: [locationId], references: [id])
  amount      Float
  method      String
  status      String    @default("PENDING")
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Activity {
  id          String    @id @default(cuid())
  packageId   String
  package     Package   @relation(fields: [packageId], references: [id], onDelete: Cascade)
  type        String    # "ARRIVED", "PICKED", "DESTROYED", etc
  description String?
  metadata    Json?
  createdAt   DateTime  @default(now())
}

model Setting {
  id          String    @id @default(cuid())
  key         String    @unique
  value       String
  updatedAt   DateTime  @updatedAt
}

enum Role {
  ADMIN
  STAFF
}

enum PackageStatus {
  ARRIVED
  PICKED
  DESTROYED
}

enum PackageSize {
  S
  M
  L
}
```

## 🔄 Migration Steps

### Phase 1: Setup Next.js Project
- [x] Clone Vite repo
- [ ] Create new Next.js project atau convert existing
- [ ] Setup Prisma ORM dengan PostgreSQL
- [ ] Create `.env.local` dengan DATABASE_URL dan secrets
- [ ] Install dependencies: next, prisma, @prisma/client, next-auth, etc

### Phase 2: Database & Backend
- [ ] Create Prisma schema (lihat di atas)
- [ ] Run `prisma migrate dev` untuk create database
- [ ] Setup seed data (optional)
- [ ] Create API routes (`app/api/...`)
- [ ] Implement authentication dengan NextAuth
- [ ] Create API handlers untuk users, locations, packages, payments, etc

### Phase 3: Frontend Components
- [ ] Copy components dari Vite `/src/components` ke `/components`
- [ ] Convert Context (AppContext, ToastContext) untuk Next.js
- [ ] Update imports dan relative paths
- [ ] Create page.tsx files untuk setiap route
- [ ] Update API calls dari `/api/{path}` ke Next.js API routes

### Phase 4: Features Implementation
- [ ] Dashboard dengan statistik
- [ ] User management (CRUD)
- [ ] Location management
- [ ] Package management
- [ ] Payment management
- [ ] Reports & analytics
- [ ] Mobile features
- [ ] Barcode/QR scanning
- [ ] WhatsApp integration

### Phase 5: Deployment Prep
- [ ] Create Dockerfile untuk Coolify
- [ ] Create docker-compose.yml untuk PostgreSQL
- [ ] Setup environment variables
- [ ] Create coolify deployment config
- [ ] Test di local dengan Docker
- [ ] Setup CI/CD pipeline (optional)

## 🐳 Dockerfile untuk Coolify

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]
```

## 📦 Dependencies yang Diperlukan

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.x",
    "next-auth": "^5.x",
    "lucide-react": "^0.344.0",
    "recharts": "^2.12.3",
    "tailwind-merge": "^2.2.1",
    "clsx": "^2.1.0",
    "zod": "^3.22.4",
    "react-router-dom": "^6.x",
    "html5-qrcode": "^2.3.8",
    "react-webcam": "^7.2.0"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "prisma": "^5.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pickpoint"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# API
API_BASE_URL="http://localhost:3000"

# WhatsApp
WHATSAPP_API_KEY="your-whatsapp-api-key"
WHATSAPP_ACCOUNT_ID="your-account-id"

# Debug
DEBUG="false"
```

## 🚀 Execution Plan

1. **Setup Next.js Project** (1-2 jam)
   - Initialize atau convert project
   - Setup Prisma
   - Configure environment

2. **Database Layer** (2-3 jam)
   - Create schema
   - Migrations
   - Seed data (optional)

3. **API Routes** (3-4 jam)
   - Auth endpoints
   - CRUD endpoints
   - Integration dengan Prisma

4. **Frontend Pages** (3-4 jam)
   - Copy & adapt components
   - Update routing
   - Create page.tsx files

5. **Features** (4-6 jam)
   - Implement core features
   - Testing
   - Debugging

6. **Deployment** (1-2 jam)
   - Docker setup
   - Environment configuration
   - Coolify deployment

**Total Estimated Time**: 14-22 jam dengan asumsi smooth migration

## ✅ Success Criteria
- [x] All routes accessible
- [ ] Authentication working (login/logout)
- [ ] CRUD operations functional (users, locations, packages, payments)
- [ ] Dashboard showing real data
- [ ] Mobile features working
- [ ] Docker image builds successfully
- [ ] Deployable to Coolify
- [ ] All tests passing
