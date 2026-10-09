# LinkPlus — Premium Full-Stack Bio-Link Platform & QR Studio (MySQL + Express + React)

LinkPlus is a production-ready, full-stack bio-link platform and dynamic QR Studio built with **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Recharts**, **Node.js / Express**, and **MySQL** (via **Prisma ORM** and raw SQL migrations).

---

## 1. Key Features

- **100% Dedicated MySQL Persistence**: Normalized 11-table MySQL schema (`users`, `profiles`, `links`, `qr_settings`, `analytics_events`, `password_reset_tokens`, `email_verification_tokens`, `sessions`, `moderation_reports`, `admin_audit_logs`, `platform_settings`). Never silently switches to fake data or `localStorage`.
- **Simple 3-Field Authentication**: Signup requires strictly `Username`, `Email address`, and `Password`. Enforces case-insensitive uniqueness, blocks reserved usernames (`admin`, `login`, `signup`, `dashboard`, `settings`, `api`, `assets`, etc.), hashes passwords with 12-round `bcrypt`, and issues `HttpOnly`, `SameSite=Lax`, `Secure` session cookies.
- **Customizable Public Profiles (`/:username`)**: Dynamic profile resolution from MySQL, 8 curated theme presets (Midnight Slate, Aurora Glass, Ocean Breeze, Emerald Canopy, Sunset Glow, Minimal Daylight, Neo Brutal Cream, Cyber Matrix), custom backgrounds, button shapes, curated fonts, social icons, Open Graph metadata, and live interactive preview.
- **Advanced Link Management**: Full CRUD, drag-and-drop reordering, pin-to-top, hide without deleting, active toggle, duplicate link, search & category filters, server-enforced scheduled start/expiration dates, YouTube embeds, custom badge labels, UTM parameter builder, and tracked `/r/:linkId` server-side redirects.
- **Real Scannable QR Code Studio**: Generates genuine Level-H (30% error recovery) QR codes pointing to `${APP_URL}/${username}`, verified in real time using `jsQR`. Supports 8 presets, foreground/background colors, gradients, dot & corner finder styles, center logo/avatar with safe size clamping, PNG/SVG/2048px print exports, and downloadable Profile QR Cards.
- **Privacy-Conscious Analytics**: Tracks profile views, link clicks, CTR, QR scans (`?ref=qr`), referrer categories, and device categories in MySQL with bot filtering and daily-salted SHA-256 visitor hashes (no raw IP addresses stored).
- **Protected Admin Dashboard**: Backend-enforced `requireAdmin` middleware (`403` for non-admins), user search, account suspension/reactivation with immediate session revocation, moderation reports queue, abusive link removal, immutable audit log, and configurable platform settings.

---

## 2. Environment Configuration (`.env`)

Copy `.env.example` to `.env` in the project root and enter your real MySQL database host and password:

```bash
cp .env.example .env
```

```env
DB_HOST=your-mysql-host.hostinger.com
DB_PORT=3306
DB_NAME=u199400152_linkgenerator
DB_USER=u199400152_linkgenerator
DB_PASSWORD=YOUR_REAL_DATABASE_PASSWORD
DATABASE_URL=
SESSION_SECRET=replace-with-a-strong-random-32-character-secret
APP_URL=https://your-domain.com
NODE_ENV=development

# Optional SMTP Provider for Password Reset & Email Verification
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your_smtp_password
SMTP_FROM="LinkPulse <noreply@your-domain.com>"

# Optional Admin Bootstrap Credentials (for npm run db:seed-admin)
ADMIN_BOOTSTRAP_USERNAME=siteadmin
ADMIN_BOOTSTRAP_EMAIL=admin@your-domain.com
ADMIN_BOOTSTRAP_PASSWORD=StrongAdminPassword123!
```

> **Note**: When `DATABASE_URL` is left blank, LinkPulse automatically constructs it from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and URL-encoded `DB_PASSWORD`.

---

## 3. Local Development & Database Migration

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run MySQL schema migrations** (creates all 11 tables in `u199400152_linkgenerator`):
   ```bash
   npm run db:migrate
   ```
   *(Alternatively, you can import `server/db/migrations/001_initial_schema.sql` directly via Hostinger **phpMyAdmin**).*

3. **Bootstrap an Administrator account** (optional):
   ```bash
   npm run db:seed-admin
   ```

4. **Start the full-stack development server** (Express API on port `5000` + Vite React client on port `5173`):
   ```bash
   npm run dev
   ```

---

## 4. Verification, Typechecking & Production Build

```bash
# TypeScript verification (Frontend + Backend)
npm run typecheck

# Run automated integration, security, QR decoding, and E2E test suites
npm test

# Build production frontend (dist/client) and backend (dist/server)
npm run build

# Start production server
npm start
```

---

## 5. Hostinger Deployment Guide

### Option A: Hostinger VPS / Cloud / Node.js Web App Hosting (Recommended)
1. Set environment variables (`DB_HOST`, `DB_PORT=3306`, `DB_NAME=u199400152_linkgenerator`, `DB_USER=u199400152_linkgenerator`, `DB_PASSWORD`, `SESSION_SECRET`, `APP_URL=https://your-domain.com`, `NODE_ENV=production`) in your Hostinger panel.
2. Run:
   ```bash
   npm ci
   npm run db:migrate
   npm run build
   npm start
   ```
3. In production mode (`NODE_ENV=production`), `dist/server/index.js` serves both the `/api/*` + `/r/*` endpoints and the compiled React SPA from `dist/client`.

### Option B: Hostinger Shared Hosting (PHP + MySQL Only)
If your Hostinger shared hosting plan only runs Apache/LiteSpeed PHP and MySQL without persistent Node.js processes:
1. Import `server/db/migrations/001_initial_schema.sql` into `u199400152_linkgenerator` using **phpMyAdmin** in Hostinger hPanel.
2. Run `npm run build` locally to generate `dist/client/`.
3. Upload the contents of `dist/client/`, `deploy/php-api/`, and `deploy/php-api/.htaccess` (placed in `public_html/.htaccess`) to your `public_html` directory, and configure `.env` above `public_html` with your Hostinger MySQL credentials.
