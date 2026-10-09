# Project: LinkPulse - Full-Stack Production Linktree Alternative

## Architecture
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide React, React Router 7.
- **Backend**: Node.js, Express, TypeScript, Zod validation, bcryptjs, cookie-parser, helmet, cors, express-rate-limit.
- **Database & ORM**: MySQL 8 / MariaDB, normalized relational schema, Prisma ORM (`prisma/schema.prisma`), executable SQL migrations (`server/db/migrations/001_initial_schema.sql`), db migration runner (`server/db/migrate.ts`), admin seed script (`server/db/seed-admin.ts`).
- **Security**: HttpOnly cookie-based sessions, case-insensitive uniqueness on `normalized_username` and `normalized_email`, reserved usernames protection, SSRF protection, XSS sanitization, rate limiting, owner authorization middleware.
- **QR Studio**: Real scannable QR generation (`qrcode`), programmatic decode verification (`jsqr`), SVG/Canvas renderers, 8 presets, customizable styles, high error correction (`H`), multi-format export.
- **Analytics**: Privacy-conscious event logging (`analytics_events`), daily-salted visitor hashing (zero raw IP retention), bot filtering, Recharts visualizations.
- **Admin Dashboard**: Backend-protected panel, user suspension with session invalidation, link moderation, audit logging, platform settings.
- **Deployment**: Node.js server production build + Hostinger shared PHP+MySQL API fallback in `deploy/php-api/` with Apache `.htaccess` rewrite rules.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | MySQL Connection Config | Environment variable configuration (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV`) with strict Zod validation | M1 | R1 |
| 2 | Unreachable DB Troubleshooting | Clear startup error diagnostics and setup guide when MySQL is unreachable (no silent fake data fallback) | M1 | R1 |
| 3 | Normalized Schema & Migrations | 11 tables (`users`, `profiles`, `links`, `qr_settings`, `analytics_events`, `password_reset_tokens`, `email_verification_tokens`, `sessions`, `moderation_reports`, `admin_audit_logs`, `platform_settings`) with proper PKs, FKs, and indexes | M1 | R1 |
| 4 | Prisma Schema & SQL DDL | Prisma schema (`prisma/schema.prisma`) and raw SQL migration (`server/db/migrations/001_initial_schema.sql`) with snake_case column mapping | M1 | R1 |
| 5 | Admin Seed CLI | Script `server/db/seed-admin.ts` to bootstrap administrator account safely via environment variables | M1 | R1 |
| 6 | Strictly 3-Field Signup | User-facing signup form with strictly `Username`, `Email address`, and `Password` | M2 | R2 |
| 7 | Case-Insensitive Uniqueness | Server-enforced case-insensitive uniqueness for usernames and emails returning 409 and field-specific errors | M2 | R2 |
| 8 | Reserved Usernames Guard | Rejection of reserved usernames (`admin`, `login`, `signup`, `dashboard`, `settings`, `api`, `assets`, etc.) | M2 | R2 |
| 9 | Bcrypt/Argon2 Password Hashing | Secure password hashing with salt rounds, constant-time verification, zero plaintext exposure | M2 | R2 |
| 10 | HttpOnly Cookie Sessions | Session management with HttpOnly, SameSite=Lax, Secure cookies backed by MySQL `sessions` table (no localStorage auth tokens) | M2 | R2 |
| 11 | Authentication Lifecycle | Login, Logout, Session check (`/api/auth/me`), Forgot Password, Reset Password, Email verification | M2 | R2 |
| 12 | App Security & Hardening | Helmet headers, restricted CORS, CSRF protection, request body size limits, rate limiting (login, signup, reset, analytics) | M2 | R2 |
| 13 | SSRF & XSS Protection | Server-side URL validation blocking private/internal IP ranges (localhost, 10.x, 192.168.x), input sanitization, and Zod schemas | M2 | R2 |
| 14 | Tenant Authorization | Strict owner verification ensuring users can only modify their own profiles, links, and QR settings | M2 | R2 |
| 15 | Dynamic Public Profile URL | Resolve profiles at `/:username` from MySQL without requiring visitor login | M3 | R3 |
| 16 | Custom 404 & Private States | Custom 404 page for non-existent usernames, disabled/private profiles, or suspended accounts | M3 | R3 |
| 17 | Social Sharing & Open Graph | Dynamic meta tags, Open Graph title, description, image, and canonical URLs for public profiles | M3 | R3 |
| 18 | Theme Customization Engine | Light, Dark, Gradient, Glassmorphism themes, custom backgrounds, button styles, borders, shadows, and curated fonts | M3 | R3 |
| 19 | Social Icons Bar | Configurable social platform icon links (GitHub, Twitter/X, Instagram, LinkedIn, YouTube, Discord, etc.) | M3 | R3 |
| 20 | Username Change Flow | Username modification with validation, conflict checking, and user confirmation | M3 | R3 |
| 21 | Responsive Profile & Live Preview | Mobile-first profile design with split-screen real-time interactive preview in the dashboard | M3 | R3 |
| 22 | User Dashboard Shell | Desktop sidebar and mobile bottom navigation with sections: Overview, Links, Appearance, QR Studio, Analytics, Profile, Settings | M4 | R4 |
| 23 | Link CRUD & Organization | Add, edit, delete, duplicate, search/filter, copy destination URL, and custom labels | M4 | R4 |
| 24 | Drag-and-Drop Reordering | Smooth tactile drag-and-drop reordering with persistent position updates in database | M4 | R4 |
| 25 | Link State Controls | Active toggle, hidden toggle (hidden without deletion), and pin-to-top with featured highlight styling | M4 | R4 |
| 26 | Server-Side Scheduling | Date-time scheduling (`scheduled_start`, `scheduled_end`) server-enforced on public profile queries | M4 | R4 |
| 27 | Rich Link Media & Embeds | Image thumbnails, Lucide icons, category grouping, and approved video/music embeds (YouTube, Spotify) | M4 | R4 |
| 28 | UTM Builder & Tracked Redirect | UTM parameter builder on links and tracked server-side redirect at `/r/:linkId` with click increment | M4 | R4 |
| 29 | Real Scannable QR Generation | Real QR code generation encoding `${APP_URL}/${username}` using `qrcode` library | M5 | R5 |
| 30 | Programmatic Decode Validation | In-memory verification of generated QR code using `jsqr` confirming scannability and URL match | M5 | R5 |
| 31 | QR Customization Controls | Foreground/background colors, gradients, dot styles, corner finder styles, margin, resolution, transparent background, reset | M5 | R5 |
| 32 | Center Logo with High Error Correction | Center avatar/logo embedding with safe sizing clamp and Level H (30%) error correction | M5 | R5 |
| 33 | 8 QR Design Presets | Classic Black, Midnight, Ocean Blue, Emerald, Violet Glow, Sunset, Minimal White, Brand Colors | M5 | R5 |
| 34 | Multi-Format QR Export | PNG, SVG, high-resolution print export, downloadable profile card, Web Share API with clipboard fallback | M5 | R5 |
| 35 | QR Settings Persistence | Save and load user custom QR styles from MySQL `qr_settings` table | M5 | R5 |
| 36 | Privacy-Conscious Analytics | Profile views, link clicks, and QR visits (`?ref=qr`) logged with daily visitor hash (zero raw IP retention) | M6 | R6 |
| 37 | Bot Filtering & Rate Limiting | User-agent bot filtering and rate-limited event ingestion to prevent skew and abuse | M6 | R6 |
| 38 | Recharts Analytics Dashboard | Interactive charts for views/clicks over time, top performing links, CTR, referrer categories, and device categories | M6 | R6 |
| 39 | Protected Admin Dashboard | Admin-only panel (`403` for standard users) with user search, account suspension/reactivation, and session termination | M6 | R6 |
| 40 | Moderation & Abusive Link Removal | Report handling, abusive link deletion, and moderation action logging | M6 | R6 |
| 41 | Admin Audit Log & Platform Settings | Persistent audit log table for admin actions and global platform configuration | M6 | R6 |
| 42 | Hostinger PHP+MySQL Deployment Fallback | Compatible PHP API in `deploy/php-api/` with Apache `.htaccess`, PDO connection, and matching endpoint contracts | M6 | R6 |
| 43 | Documentation & Deployment Guide | Complete `README.md` covering Node.js setup, migrations, seed, build, and Hostinger deployment steps | M6 | R6 |
| 44 | Full E2E & Adversarial Hardening | Comprehensive integration suite passing 100% of Tiers 1-4 tests, followed by adversarial stress testing (Tier 5) | M7 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema, Migrations & Environment Diagnostic | R1: MySQL config, Zod env validation, unreachable DB diagnostic, Prisma schema, SQL migrations, seed-admin script | none | DONE |
| M2 | Authentication & Security Engine | R2: 3-field signup, case-insensitive uniqueness, reserved names, bcrypt, HttpOnly cookie sessions, auth routes, security middleware (CORS, Helmet, CSRF, rate-limit, SSRF, XSS, tenant isolation) | M1 | IN_PROGRESS |
| M3 | Public Profile Engine, Theming & Live Preview | R3: Dynamic `/:username` resolution, custom 404, Open Graph metadata, theme engine, social links, live preview mockup, username change | M1, M2 | PLANNED |
| M4 | User Dashboard & Advanced Link Management | R4: Dashboard shell, Link CRUD, drag-and-drop reorder, pin, hide, active toggle, scheduling, embeds, UTM builder, `/r/:linkId` redirect | M1, M2, M3 | PLANNED |
| M5 | Advanced QR Code Studio & Persistence | R5: Real scannable QR generation (`${APP_URL}/${username}`), `jsqr` decode validation, 8 presets, styling, logo/H correction, export formats, `qr_settings` persistence | M1, M2 | PLANNED |
| M6 | Privacy Analytics, Admin Dashboard & Hostinger Deployment | R6: Analytics tracking (bot-filtered, no raw IP), Recharts dashboard, protected admin panel, suspension/moderation/audit logs, Hostinger `deploy/php-api/`, README | M1, M2, M4, M5 | PLANNED |
| M7 | Full E2E Test Suite Pass & Adversarial Hardening | Acceptance Criteria: Pass 100% of Tiers 1-4 E2E tests published in TEST_READY.md, followed by Tier 5 adversarial stress testing | M1-M6 | PLANNED |

## Interface Contracts

### M1 (Database/Core) -> M2 (Auth) / M3 (Profile) / M4 (Links) / M5 (QR) / M6 (Analytics/Admin)
- Database Client: `server/db/prisma.ts` exports singleton `prisma: PrismaClient`.
- Raw Database Pool: `server/db/pool.ts` exports `pool: mysql.Pool` for migrations and direct SQL operations.
- Environment Config: `server/config/env.ts` exports parsed `env: EnvConfig` validating all required keys.
- Database Diagnostic: `server/db/check-connection.ts` exports `checkDatabaseConnection(): Promise<{ ok: boolean; error?: string }>`.

### M2 (Auth) -> M3, M4, M5, M6
- Auth Middleware: `requireAuth` sets `req.user: { id: string; username: string; email: string; role: 'user' | 'admin' }`.
- Admin Middleware: `requireAdmin` enforces `req.user.role === 'admin'`, returns 403 otherwise.
- Session Management: `server/services/session.service.ts` (`createSession`, `validateSession`, `destroySession`, `destroyUserSessions`).

### M3 (Profile) & M4 (Links) -> Public Route
- `GET /api/public/:username`: returns `{ profile, user: { username }, links: Link[] }`.
- Filter rule: `links` includes only items where `is_active = 1`, not hidden, and `(scheduled_start IS NULL OR scheduled_start <= NOW()) AND (scheduled_end IS NULL OR scheduled_end >= NOW())`, ordered by `position ASC`.

### M4 (Links) -> Redirect & Analytics
- `GET /r/:linkId`: records `analytics_events` row (`event_type: 'click'`), increments `click_count`, attaches UTM params, returns HTTP 302 redirect.

### M5 (QR Studio) -> Verification
- Server QR generation: encodes `${APP_URL}/${username}`.
- Programmatic QR validator: `verifyQrCode(dataUri: string, expectedUrl: string): Promise<boolean>` using `jsqr`.

### M6 (Analytics) -> Privacy
- Visitor Hash: `generateVisitorHash(ip: string, userAgent: string): string` uses SHA-256 with rotating salt; raw IP is discarded immediately.

## Code Layout
```
d:/My projects/ownlinktree/
├── package.json
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── vitest.config.ts
├── .env.example
├── README.md
├── prisma/
│   └── schema.prisma
├── server/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   ├── prisma.ts
│   │   ├── pool.ts
│   │   ├── check-connection.ts
│   │   ├── migrate.ts
│   │   ├── seed-admin.ts
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── admin.middleware.ts
│   │   ├── security.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── profile.routes.ts
│   │   ├── links.routes.ts
│   │   ├── public.routes.ts
│   │   ├── qr.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── admin.routes.ts
│   │   └── redirect.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── session.service.ts
│   │   ├── link.service.ts
│   │   ├── qr.service.ts
│   │   ├── analytics.service.ts
│   │   └── admin.service.ts
│   └── utils/
│       ├── ssrf.ts
│       ├── visitor-hash.ts
│       └── reserved-usernames.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   └── index.ts
│   ├── api/
│   │   └── client.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── Footer.tsx
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── AdminRoute.tsx
│   │   ├── dashboard/
│   │   │   ├── OverviewSection.tsx
│   │   │   ├── LinksSection.tsx
│   │   │   ├── AppearanceSection.tsx
│   │   │   ├── QrStudioSection.tsx
│   │   │   ├── AnalyticsSection.tsx
│   │   │   └── ProfileSettingsSection.tsx
│   │   ├── profile/
│   │   │   ├── PublicProfileView.tsx
│   │   │   ├── LiveProfilePreview.tsx
│   │   │   └── ThemeRenderer.tsx
│   │   ├── qr/
│   │   │   ├── QrCanvas.tsx
│   │   │   ├── QrControls.tsx
│   │   │   └── QrProfileCard.tsx
│   │   ├── links/
│   │   │   ├── LinkCard.tsx
│   │   │   ├── LinkEditorModal.tsx
│   │   │   └── DragDropList.tsx
│   │   └── common/
│   │       ├── EmptyState.tsx
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   └── pages/
│       ├── LandingPage.tsx
│       ├── LoginPage.tsx
│       ├── SignupPage.tsx
│       ├── OnboardingPage.tsx
│       ├── DashboardPage.tsx
│       ├── PublicProfilePage.tsx
│       ├── AdminPage.tsx
│       ├── ForgotPasswordPage.tsx
│       ├── ResetPasswordPage.tsx
│       └── NotFoundPage.tsx
├── deploy/
│   └── php-api/
│       ├── .htaccess
│       ├── index.php
│       ├── config/
│       │   └── db.php
│       └── api/
│           ├── auth.php
│           ├── public.php
│           ├── links.php
│           ├── qr.php
│           ├── analytics.php
│           └── redirect.php
└── tests/
    ├── setup.ts
    ├── e2e/
    │   ├── tier1-features.test.ts
    │   ├── tier2-boundaries.test.ts
    │   ├── tier3-combinations.test.ts
    │   └── tier4-applications.test.ts
    └── unit/
        ├── auth.test.ts
        ├── qr.test.ts
        ├── links.test.ts
        └── security.test.ts
```
