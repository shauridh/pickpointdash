# Pickpoint Dashboard - Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm atau yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local dengan credentials Coolify Anda
   ```

3. **Setup database:**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Push schema ke database
   npm run prisma:push
   
   # Atau gunakan migrations
   npm run prisma:migrate
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   - Public app: http://localhost:3000
   - Portal app: http://localhost:3000/portal
   - API: http://localhost:3000/api/v1

### Project Structure

```
pickpoint/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── v1/                  # API v1 endpoints
│   ├── portal/                  # Operational portal routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── public/                  # Public/resident routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Root page
├── lib/
│   ├── api/                     # API utilities & responses
│   ├── validations/             # Zod schemas
│   ├── prisma.ts               # Prisma client
│   └── utils.ts                # Utility functions
├── prisma/
│   └── schema.prisma           # Database schema
├── middleware.ts               # Domain routing middleware
├── .env.local                  # Local environment variables
├── .env.example               # Environment template
└── package.json
```

## 📚 API Routes

### Health Check
- `GET /api/v1/health` - API health status

### Package Management (Upcoming)
- `POST /api/v1/packages` - Create package
- `GET /api/v1/packages` - List packages
- `GET /api/v1/packages/{id}` - Get package detail
- `PATCH /api/v1/packages/{id}` - Update package
- `POST /api/v1/packages/{id}/checkout` - Checkout & billing

### Authentication (Upcoming)
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout

## 🛠️ Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run lint            # Run ESLint

# Database
npm run prisma:studio  # Open Prisma Studio (GUI)
npm run prisma:migrate # Create migration
npm run prisma:push    # Push schema to DB

# Production
npm run build          # Build for production
npm start              # Start production server
```

## 📋 Roadmap

- [ ] Phase 1: Foundation (Hari 1-2)
  - [x] Next.js setup
  - [ ] Soketi & PostgreSQL deployment
  - [ ] Landing page
  
- [ ] Phase 2: Core Portal (Hari 3-5)
  - [ ] Auth system
  - [ ] Location CRUD
  - [ ] Pricing config
  
- [ ] Phase 3: Operational Features (Hari 6-8)
  - [ ] Package input form
  - [ ] QR scanner
  - [ ] Real-time sync
  - [ ] Pricing calculation
  
- [ ] Phase 4: Customer & Payment (Hari 9-10)
  - [ ] WhatsApp notification
  - [ ] Customer dashboard
  - [ ] Midtrans payment

## 🔐 Environment Variables

Lihat `.env.example` untuk lengkapnya.

### Wajib di-set:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret key
- `NEXTAUTH_URL` - Base URL aplikasi

### Optional (untuk features tertentu):
- `MIDTRANS_SERVER_KEY` - Payment gateway
- `WHATSAPP_API_TOKEN` - WhatsApp notification
- `PUSHER_*` - Real-time (Soketi)

## 🧪 Testing API

### Menggunakan curl:
```bash
# Health check
curl http://localhost:3000/api/v1/health
```

### Menggunakan Postman:
Import collection dari `docs/postman-collection.json` (TBD)

## 📞 Support

Lihat MASTER_PLAN.md untuk detail lengkap spec project.

---

**Last Updated:** December 8, 2025
