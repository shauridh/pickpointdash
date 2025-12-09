# Panduan Deployment Pickpoint di Coolify

Panduan lengkap setup deployment untuk DEV dan PROD environment.

## Prerequisites
- [x] Coolify instance running di `https://coolify.pickpoint.my.id`
- [x] GitHub repository: `https://github.com/shauridh/pickpointdash.git`
- [x] Dockerfile dan docker-entrypoint.sh sudah di push ke branch `main`
- [x] Project `Pickpoint` sudah dibuat di Coolify
- [x] Server `localhost` tersedia

## Step 1: Buat Database DEV

### 1.1 Navigasi
```
Coolify Dashboard → Projects → Pickpoint
Pilih environment: production (atau buat environment baru: development)
Klik: + Add Resource → Database → PostgreSQL
```

### 1.2 Form Database DEV
| Field | Value |
|-------|-------|
| **Name** | `pickpoint-dev-db` |
| **Description** | PostgreSQL untuk development Pickpoint |
| **Image** | `postgres:17-alpine` (atau `postgres:16-alpine`) |
| **Server** | `localhost` |
| **Initial Database** | `pickpoint_dev` |
| **Username** | `pickpoint_dev` |
| **Password** | `Ridho6393!` (atau generate strong password) |
| **Port** | `5432` (default) |
| **Persistent Storage** | ✅ Centang (pastikan volume mounted) |
| **Make it publicly available** | ❌ Jangan centang |
| **SSL Mode** | `require` (aman) |

### 1.3 Initialization Script (Opsional)
Di tab **Configuration** → **Initialization scripts** → klik **+ Add**:
```sql
ALTER USER pickpoint_dev WITH PASSWORD 'Ridho6393!';
CREATE DATABASE IF NOT EXISTS pickpoint_dev OWNER pickpoint_dev;
```

### 1.4 Start Database
Klik **Deploy** / **Start** → tunggu status **Running** (hijau)

### 1.5 Catat Connection String
Di tab **Configuration**, salin **Postgres URL (internal)**:
```
postgres://pickpoint_dev:Ridho6393%21@<CONTAINER_ID>:5432/pickpoint_dev?sslmode=require
```
Contoh yang Anda miliki:
```
postgres://pickpoint_dev:Ridho6393%21@bswko8scggkc8gg0g48c0soc:5432/pickpoint_dev?sslmode=require
```
**Simpan di notes** — akan dipakai untuk env var nanti.

---

## Step 2: Buat Database PROD

Ulangi Step 1 dengan nilai berbeda:

| Field | Value |
|-------|-------|
| **Name** | `pickpoint-prod-db` |
| **Description** | PostgreSQL untuk production Pickpoint |
| **Initial Database** | `pickpoint_prod` |
| **Username** | `pickpoint_prod` |
| **Password** | (Generate password BEDA dari DEV) |

**Catat connection string PROD**:
```
postgres://pickpoint_prod:<PASSWORD>@<CONTAINER_ID>:5432/pickpoint_prod?sslmode=require
```

---

## Step 3: Generate NEXTAUTH_SECRET

Di PowerShell (lokal):
```powershell
# Generate DEV secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Output contoh: kX3mD8pLqR5nT7wY9zA2bC4eF6gH8jK0mN1oP3qR5sT=

# Generate PROD secret (jalankan lagi, HARUS BEDA)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Output contoh: uV9wX1yA3zB5cD7eF9gH1iJ3kL5mN7oP9qR1sT3uV5w=
```

Simpan kedua secret di notes terpisah untuk DEV dan PROD.

---

## Step 4: Create Application Service DEV

### 4.1 Navigasi
```
Coolify Dashboard → Projects → Pickpoint
Pilih environment: production (atau development jika pisah env)
Klik: + Add Resource → Application
```

### 4.2 Form Application DEV

#### Tab: Source
| Field | Value |
|-------|-------|
| **Type** | Public Git Repository |
| **Repository URL** | `https://github.com/shauridh/pickpointdash.git` |
| **Branch** | `main` |
| **Base Directory** | `pickpoint` |

#### Tab: General
| Field | Value |
|-------|-------|
| **Name** | `pickpoint-dev` |
| **Server** | `localhost` |
| **Destination** | (pilih yang tersedia, biasanya auto) |

#### Tab: Build Pack
| Field | Value |
|-------|-------|
| **Build Pack** | Dockerfile |
| **Dockerfile Location** | `Dockerfile` (relative ke base dir) |

#### Tab: Network / Domains
| Field | Value |
|-------|-------|
| **Domain** | `dev-portal.pickpoint.my.id` |
| **Port** | `3000` |
| **Expose Port** | ✅ Centang |
| **SSL** | ✅ Auto-generate Let's Encrypt |

#### Tab: Health Check (Opsional)
| Field | Value |
|-------|-------|
| **Health Check Enabled** | ✅ Centang |
| **Health Check Path** | `/api/health` (jika ada endpoint) |
| **Health Check Port** | `3000` |

### 4.3 Save & Create
Klik **Save** atau **Create** (jangan deploy dulu).

---

## Step 5: Set Environment Variables DEV

### 5.1 Navigasi
```
Service pickpoint-dev → Tab: Environment Variables
Klik: + Add Variable (atau + New)
```

### 5.2 Environment Variables DEV
Tambahkan satu per satu (atau bulk edit jika ada opsi):

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgres://pickpoint_dev:Ridho6393%21@bswko8scggkc8gg0g48c0soc:5432/pickpoint_dev?sslmode=require` | Gunakan connection string dari Step 1.5 |
| `NEXTAUTH_URL` | `https://dev-portal.pickpoint.my.id` | Domain DEV |
| `NEXTAUTH_SECRET` | `kX3mD8pLqR5nT7wY9zA2bC4eF6gH8jK0mN1oP3qR5sT=` | Secret DEV dari Step 3 |
| `NODE_ENV` | `development` | Environment mode |
| `RUN_SEED` | `true` | Supaya seed data otomatis (admin user) |

**Tips**: Jika ada opsi "Show as Secret" atau "Encrypted", centang untuk field sensitive (PASSWORD, SECRET).

### 5.3 Save
Klik **Save** setelah semua env var ditambahkan.

---

## Step 6: Deploy DEV

### 6.1 Deploy
Klik tombol **Deploy** (di kanan atas halaman service `pickpoint-dev`).

### 6.2 Monitor Logs
Buka tab **Logs** → lihat progress:
```
Building image...
[+] Building 45.2s
...
=> exporting to image
=> => naming to coolify/...
Starting container...
==> Running entrypoint: checking environment
DATABASE_URL set. Running Prisma migrate deploy...
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "pickpoint_dev", schema "public" at "bswko8scggkc8gg0g48c0soc:5432"

3 migrations found in prisma/migrations
Applying migration `20241206_init`
Applying migration `20241207_add_phone`
Applying migration `20241208_nextauth`

RUN_SEED=true — running seed script
✓ Super Admin dibuat: admin@pickpoint.id
✓ Location Manager dibuat: budi@pickpoint.id
✓ Lokasi dibuat: Apartment Blok A
✓ Seed data berhasil dibuat

Starting application
> next start
  ▲ Next.js 16.0.7
  - Local:        http://localhost:3000
  ready - started server on 0.0.0.0:3000
```

### 6.3 Troubleshooting
Jika ada error:
- **"DATABASE_URL is not set"**: Cek env var di Step 5
- **Prisma migration error**: Cek database running & connection string benar
- **Build failed**: Cek Dockerfile path & base directory
- **Port already in use**: Ganti port atau stop service lain yang pakai port 3000

---

## Step 7: Verify DEV

### 7.1 Akses Web
Buka browser: `https://dev-portal.pickpoint.my.id`

### 7.2 Login
```
Email: admin@pickpoint.id
Password: admin123456
```

### 7.3 Test Fitur
- ✅ Dashboard muncul (nama user, role)
- ✅ Menu Users → bisa list users
- ✅ Menu Locations → bisa list locations
- ✅ Create user via modal
- ✅ Create location via modal

### 7.4 Test API
```bash
# Health check (jika endpoint ada)
curl https://dev-portal.pickpoint.my.id/api/health

# Get users (butuh auth)
# Login dulu → ambil session cookie → panggil:
curl https://dev-portal.pickpoint.my.id/api/v1/users \
  -H "Cookie: next-auth.session-token=..."
```

---

## Step 8: Create Application Service PROD

Ulangi Step 4-6 dengan nilai PROD:

### 8.1 Form Application PROD
| Field | Value |
|-------|-------|
| **Name** | `pickpoint-prod` |
| **Repository** | (sama seperti DEV) |
| **Branch** | `main` |
| **Base Directory** | `pickpoint` |
| **Domain** | `portal.pickpoint.my.id` |
| **Port** | `3000` |

### 8.2 Environment Variables PROD
| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgres://pickpoint_prod:<PASSWORD>@<PROD_CONTAINER_ID>:5432/pickpoint_prod?sslmode=require` |
| `NEXTAUTH_URL` | `https://portal.pickpoint.my.id` |
| `NEXTAUTH_SECRET` | `uV9wX1yA3zB5cD7eF9gH1iJ3kL5mN7oP9qR1sT3uV5w=` (BEDA dari DEV) |
| `NODE_ENV` | `production` |
| **JANGAN SET** `RUN_SEED` | (atau set `false`) — seed manual jika perlu |

### 8.3 Deploy PROD
Klik **Deploy** → monitor logs seperti Step 6.

### 8.4 Verify PROD
```
URL: https://portal.pickpoint.my.id
Login: admin@pickpoint.id / admin123456
```

---

## Step 9: Post-Deployment Checklist

### 9.1 Backups (PENTING untuk PROD)
```
Database pickpoint-prod-db → Tab: Backups
- Enable Scheduled Backups: ✅
- Frequency: Daily (0 2 * * *) — jam 2 pagi
- Retention: 7 days (atau lebih)
- Klik: Save & Test Backup
```

### 9.2 Monitoring
- Aktifkan Metrics jika tersedia (Coolify Settings → Metrics)
- Setup alerts untuk disk usage, CPU, memory
- Monitor logs secara berkala (service logs + DB logs)

### 9.3 Security
- ✅ Pastikan DB tidak publicly accessible
- ✅ NEXTAUTH_SECRET berbeda antara DEV dan PROD
- ✅ Password DB berbeda antara DEV dan PROD
- ✅ SSL/TLS aktif untuk semua domain
- ✅ API tokens disimpan aman (jangan commit ke Git)

### 9.4 DNS
Jika domain belum resolve:
```
# Tambahkan A record di DNS provider:
dev-portal.pickpoint.my.id  →  <IP_VPS_COOLIFY>
portal.pickpoint.my.id      →  <IP_VPS_COOLIFY>
```

### 9.5 Update Code
Setelah push ke GitHub:
```
Coolify → Service (pickpoint-dev / pickpoint-prod)
Klik: Redeploy (atau Enable Auto Deploy jika mau otomatis)
```

---

## Troubleshooting Umum

### Build Error: "Dockerfile not found"
```
Solusi:
- Cek Base Directory sudah diset ke `pickpoint`
- Cek Dockerfile ada di `pickpoint/Dockerfile` di repo
- Cek branch `main` (bukan `master`)
```

### Runtime Error: "Cannot connect to database"
```
Solusi:
- Cek DATABASE_URL benar (host, port, user, password)
- Cek database service running (status hijau)
- Cek network: service dan DB harus di server yang sama
- Test koneksi dari Terminal container:
  psql "postgres://pickpoint_dev:..."
```

### NextAuth Error: "JWT secret not set"
```
Solusi:
- Pastikan NEXTAUTH_SECRET sudah diset di env vars
- Generate ulang jika perlu (Step 3)
- Redeploy service setelah update env
```

### Migration Error: "Permission denied"
```
Solusi:
- Cek user DB memiliki permission:
  ALTER USER pickpoint_dev WITH SUPERUSER;
- Atau pastikan initialization script dijalankan (Step 1.3)
```

### Domain tidak bisa diakses (502 Bad Gateway)
```
Solusi:
- Cek service status = Running
- Cek port 3000 exposed dan bind ke 0.0.0.0 (bukan 127.0.0.1)
- Cek logs untuk error startup
- Cek Coolify proxy running (biasanya Traefik/Caddy)
```

---

## Maintenance

### Update Dependencies
```bash
# Di lokal
cd pickpoint
npm update
npm audit fix

# Test
npm run build
npm run start

# Push
git add package*.json
git commit -m "chore: update dependencies"
git push origin main

# Redeploy di Coolify
```

### Database Migrations (Production)
```bash
# Jangan jalankan seed di production!
# Hanya migrate:
1. SSH/Terminal ke container pickpoint-prod
2. npx prisma migrate deploy
3. Verifikasi: psql dan cek schema
```

### Rollback Deployment
```
Coolify → Service → Deployments (tab)
Klik: Rollback to Previous Version
```

---

## Checklist Final

- [ ] DEV database running & accessible
- [ ] PROD database running & accessible
- [ ] Application `pickpoint-dev` deployed & verified
- [ ] Application `pickpoint-prod` deployed & verified
- [ ] Backup enabled untuk PROD database
- [ ] Domain DNS A record configured
- [ ] SSL certificates active (Let's Encrypt)
- [ ] Admin login working (admin@pickpoint.id)
- [ ] API endpoints tested
- [ ] Monitoring & alerts configured

---

## Next Steps

Setelah deployment sukses:
1. **Fase 3**: Implementasi Packages Management (input, list, checkout)
2. **Fase 4**: Integrasi Soketi (real-time notifications)
3. **Fase 5**: Integrasi WhatsApp & Email notifications
4. **Fase 6**: Integrasi Midtrans (payment gateway)
5. **Fase 7**: Integrasi MinIO (file storage untuk foto paket)

Lihat `MASTER_PLAN.md` untuk roadmap lengkap.

---

## Support

Jika ada masalah:
1. Cek logs di Coolify (tab Logs untuk service & database)
2. Cek dokumentasi Coolify: https://coolify.io/docs
3. Review error messages & search di GitHub Issues Coolify
4. Tanyakan via chat untuk troubleshooting spesifik

---

**Last Updated**: December 9, 2025
**Version**: 1.0.0
