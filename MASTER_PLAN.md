# PickPoint Dashboard — Master Plan (Recreated)

This master plan reflects the current codebase status and outlines remaining work. It is organized in phases with concrete deliverables and acceptance criteria.

## Phase 1 — Foundation (Complete)
- Next.js app directory initialized with TypeScript, Tailwind CSS 4, ESLint.
- Base pages and layout created: `app/dashboard`, `app/users`, `app/locations`, `app/payments`, `app/reports`.
- Icons, charts, and toast setup: `lucide-react`, `recharts`, `react-hot-toast`.
- Prisma scaffolding and Postgres adapter packages present.

Acceptance:
- `npm run dev` starts successfully and renders the dashboard (subject to compile fixes).

## Phase 2 — Core UI & Navigation (Complete / Minor polish)
- Sidebar with collapse (desktop) and hamburger overlay (mobile) in `app/dashboard/layout.tsx`.
- Unified package management moved to dashboard; `/packages` redirects to `/dashboard`.
- Global toggle to hide/show stat cards and filters.

Acceptance:
- Sidebar toggles work; labels hide when collapsed.
- Hiding cards also hides timeframe filter.

## Phase 3 — Data Views & Interactions (Complete / Pending QA)
- Users page rebuilt with CRUD, search, client-side pagination.
- Pagination component: `components/Pagination.tsx` used across pages.
- Dashboard cards: 8 stats with sparklines, revenue show/hide.
- Reports: `app/reports/page.tsx` renders multiple charts using `/api/dashboard/stats`.
- Package table on dashboard: search, page-size selector, pagination; actions Edit/Delete.
- Add Package modal: resi scan button, receiver+unit search list, phone number, auto location, optional size, photo upload.
- Dummy packages seeded when `/api/packages` fails.

Acceptance:
- Search + pagination behave together; page resets on new search.
- Edit/Delete open modal/confirm and perform optimistic updates.
- Add Package modal validates required fields and adds a row.

## Phase 4 — Integrations (Pending)
- Wire POST/PUT/DELETE to backend APIs for packages.
- Bind location autofill to browser geolocation with graceful fallback.
- Optional resi scanner: barcode/QR via `BarcodeDetector` or `html5-qrcode`/`react-webcam` fallback.

Acceptance:
- Add/Edit/Delete hit real endpoints with proper error handling & toast.
- Location field auto-populates when permission granted; manual override supported.
- Scan fills resi field or prompts file/camera upload fallback.

## Phase 5 — QA & Polish (Pending)
- Manual walkthrough: sidebar toggle, cards hide, timeframe switching, reports rendering.
- Responsive checks: mobile/desktop layout for table and modals.
- Consistent spacing, typography, and table column alignment to Vite reference.

Acceptance:
- No console errors; styles consistent across breakpoints.
- Empty states and loading states present.

## Phase 6 — Documentation & Ops (Pending)
- Update `PROGRESS.md` with latest checkpoints.
- README quickstart: environment vars, `npm run dev`, and optional Docker notes.
- Migration plan notes: align with `MIGRATION_PLAN.md` and `PHASE_1_NEXTJS_SETUP.md`.

Acceptance:
- Clear run instructions; known limitations listed.

---

## Current Gaps & Tasks
1. Verify dev build and fix compile errors left in `app/dashboard/page.tsx`, `layout.tsx`, and any updated pages.
2. Backend wiring: provide or confirm API contracts for `/api/packages` (GET, POST, PUT, DELETE) and `/api/dashboard/stats`.
3. Implement geolocation autofill for location input.
4. Optional barcode/QR scanner integration for resi.
5. QA pass and UI polish.
6. Documentation refresh.

## Phase 7 — PWA & Notifications (New Requirements)

PWA capabilities to support mobile scanner usage and resident-facing login with push notifications.

### Scope
- PWA installability: manifest and service worker for offline caching of core routes (`/dashboard`, `/reports`, resident portal).
- Mobile scanner in PWA: camera access to scan barcode/QR for resi using `BarcodeDetector` with fallback to `html5-qrcode`.
- Resident login (penghuni): phone-number–based auth (OTP or magic-link) and registration linking to `Customer` records.
- Push notifications: topic/user-targeted notifications keyed by phone number; permission prompt and token management.
- History table: persistent audit/history of notifications and scanner events (who/when/what), visible in an admin page.

### Deliverables
- `public/manifest.json` with app name, icons, display, start_url.
- Service worker (`app/sw.ts` or `public/sw.js`) handling caching strategies and push events.
- Resident login flow page: `app/resident/login/page.tsx` and registration `app/resident/register/page.tsx`.
- Customer linking: extend schema to relate resident by phone number to `Customer` (menu “Customer”).
- Scanner component usable offline with queued submits; sync when online.
- Notification settings page: opt-in, token storage, test notification trigger.
- History page: `app/history/page.tsx` listing events with filters.

### Acceptance Criteria
- App is installable (Add to Home Screen) and works offline for basic views.
- Mobile scanner works inside PWA; resi value fills and submits when back online.
- Resident registers with phone number; login succeeds and profile links to Customer.
- Push notifications can be sent to a specific phone-number user; resident receives them on web/PWA.
- History table records events (scan, add package, notifications) with timestamps and actors.

### Notes
- Push requires a backend for Web Push (VAPID) or integration with a service (e.g., Firebase Cloud Messaging). Phone-number targeting implies mapping from phone → web push token(s).
- OTP delivery requires an SMS gateway; otherwise use email-based OTP for dev.

## Quick Run Steps
```powershell
Set-Location "C:\Users\Zafian\Documents\pickpoint\nextjs-app"
npm install
npm run dev
```
If errors occur, capture and address compile messages in the modified files (dashboard, users, locations, payments).

## API Contracts (Proposed)
- GET `/api/packages`: `{ success: boolean; data: Package[] }`
- POST `/api/packages`: `{ trackingCode, senderName, receiverName, receiverUnit?, phoneNumber?, locationName, status, size?, photoDataUrl? }`
- PUT `/api/packages/:id`: same shape as POST
- DELETE `/api/packages/:id`: `{ success: boolean }`
- GET `/api/dashboard/stats`: `{ success: boolean; data: Stats }`

PWA & Notifications (Proposed):
- POST `/api/resident/register`: `{ phoneNumber, name, unit }`
- POST `/api/resident/login/request-otp`: `{ phoneNumber }`
- POST `/api/resident/login/verify-otp`: `{ phoneNumber, code }`
- POST `/api/push/register-token`: `{ phoneNumber, token }`
- POST `/api/push/send`: `{ phoneNumber, title, body, data? }`
- GET `/api/history`: list events with pagination and filters

## Definitions
- Package: `{ id, trackingCode, senderName, receiverName, location: { name }, status: 'ARRIVED'|'PICKED'|'DESTROYED', size?: 'SMALL'|'MEDIUM'|'LARGE', createdAt }`
- Stats: `{ totalUsers, totalLocations, totalPackages, totalRevenue, revenueDelivery, revenueSubscription, revenuePackage, packagesByStatus: { arrived, picked, destroyed } }`
- Resident: `{ id, phoneNumber, name, unit, customerId?, createdAt }`
- PushToken: `{ id, phoneNumber, token, platform: 'web'|'android'|'ios', createdAt }`
- HistoryEvent: `{ id, type: 'scan'|'notification'|'package-add'|'package-update', actorType: 'admin'|'resident', actorId?, message?, createdAt, meta? }`

## Acceptance Testing Checklist
- Dashboard renders without errors; cards toggle and timeframe filters operate.
- Package table search/pagination function; modals work.
- Reports charts load using stats API or fallback.
- Redirect from `/packages` to `/dashboard` works.
- Geolocation and scanner (if enabled) behave with fallbacks.
- PWA installable; push notifications opt-in & delivery verified.

## Sign-off
When the above checklists pass and documentation is updated, Phase 4–6 can be marked complete and the frontend can be considered 100% pending backend verification.
