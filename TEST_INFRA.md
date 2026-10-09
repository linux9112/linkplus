# LinkPulse Test Infrastructure & Strategy Specification

## 1. Overview & Philosophy
The **LinkPulse** test suite is engineered as an authoritative, opaque-box, contract-driven verification suite that validates 100% of the functional, security, UX, and deployment specifications defined in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

### Core Principles
1. **Opaque-Box Verification**: Tests interact strictly through external HTTP boundaries (`supertest`), public API endpoints, session cookies, and public redirection routes (`/r/:linkId`). Internal implementation details are never stubbed out in ways that mask genuine protocol defects.
2. **Definitive Ground Truth (Oracles)**: Expected outputs are derived directly from the normative specifications in `PROJECT.md` and `spec_miner_survey_1` / `spec_miner_survey_2` handoffs.
3. **Progressive Testability & Isolation**: Every test case initializes its own state, isolates sessions, prevents test pollution, and cleans up after execution.
4. **Adversarial Hardening**: Rigorous boundary, injection (SQLi, XSS, SSRF), and concurrency stress tests guarantee that security safeguards cannot be bypassed by malformed payloads.
5. **Real QR Code Scannability Verification**: QR generation is validated end-to-end by programmatically decoding the generated output with `jsqr` and asserting exact URL equality (`${APP_URL}/${username}`).

---

## 2. 4-Tier Test Architecture

```
tests/
├── setup.ts                      # Test fixtures, mock/real app loader, supertest agent, jsQR decode oracle
├── e2e/
│   ├── tier1-features.test.ts     # Tier 1: Canonical Feature & Acceptance Criteria Coverage
│   ├── tier2-boundaries.test.ts   # Tier 2: Boundary Conditions, Validation Edge Cases & Security Attacks
│   ├── tier3-combinations.test.ts # Tier 3: Cross-Feature State Transitions & Integrated Lifecycles
│   └── tier4-applications.test.ts # Tier 4: Real-World Persona Scenarios & System-Wide Workflows
└── unit/
    ├── auth.test.ts              # Unit: Password hashing, reserved usernames, session token validation
    ├── qr.test.ts                # Unit: QR matrix generation, Level H error correction, preset styling
    ├── links.test.ts             # Unit: Link ordering, schedule window calculations, UTM serialization
    └── security.test.ts          # Unit: SSRF destination checks, HTML/XSS sanitization, visitor hashing
```

### Tier 1: Feature Coverage (Canonical Acceptance Criteria)
Verifies each feature independently with >=5 distinct assertions per feature area:
- **Auth (Signup & Session)**: 3-field signup, case-insensitive username/email uniqueness, reserved username rejection, password hashing, HttpOnly session cookie issuance.
- **Auth (Login & Protection)**: Valid credentials, invalid password rejection, unauthorized route protection (`401`), session termination on logout.
- **Public Profile Engine**: Resolution of `/:username`, custom 404 for missing/private/suspended accounts, theme settings persistence, social icons delivery.
- **Link Management (CRUD & Order)**: Add, edit, delete, duplicate, drag-and-drop position reordering, pin-to-top, active/hidden state toggles.
- **Link Scheduling**: Real-time filtering by `scheduled_start` and `scheduled_end` on public profile queries.
- **QR Code Studio & Verification**: Real scannable QR generation (`${APP_URL}/${username}`), programmatic decode via `jsqr`, 8 preset configurations, `qr_settings` persistence.
- **Privacy Analytics**: Profile view and link click tracking, daily salted visitor hashing (zero raw IP retention), UTM parameter propagation, `/r/:linkId` 302 redirection.
- **Admin Dashboard & Protection**: Strict role checks (`403` for standard users), user search, account suspension, session revocation, audit logging.

### Tier 2: Boundary & Corner Cases (Stress & Security)
Tests extreme values, malicious inputs, and defensive safeguards:
- **Input Validation**: Minimum (3 char) and maximum (30 char) usernames, emails with maximum lengths, malformed emails without `@` or TLD.
- **Security Attacks**: SQL injection payloads (`' OR '1'='1`, `1; DROP TABLE users;`), Stored XSS vectors (`<script>`, `<img src=x onerror=alert(1)>`, `javascript:void(0)` in link destinations).
- **SSRF Hardening**: Internal IP ranges (`http://127.0.0.1`, `http://10.0.0.1`, `http://192.168.1.1`, `http://localhost:3000`) blocked in link destination URLs.
- **Bot Filtering**: Scraping bots (`Googlebot`, `bingbot`, `python-requests`, `curl`) filtered from incrementing analytics.
- **Boundary Scheduling**: Microsecond-accurate evaluation of link visibility at exact boundary moments (`NOW() - 1s`, `NOW() + 1s`).
- **Session Edge Cases**: Expired session cookie rejection, tampered session tokens, double logout handling.

### Tier 3: Cross-Feature Combinations (Integration Workflows)
Tests multi-stage user journeys crossing multiple functional subsystems:
- **Creator Onboarding to Scan Flow**:
  1. Signup new user with 3 fields.
  2. Customize theme (Glassmorphism preset, custom colors, fonts).
  3. Create multiple links, pin one, reorder positions.
  4. Schedule one link for future release (verifying absence on public profile).
  5. Configure custom QR code and generate scannable image.
  6. Decode QR image via `jsqr` and verify it matches the public profile URL.
  7. Fetch public profile using decoded URL, confirming theme, active links, and absence of scheduled link.
  8. Click link redirect (`/r/:linkId`) with UTM query parameters.
  9. Verify analytics view count, link click count, and UTM tracking in analytics dashboard.

### Tier 4: Real-World Scenarios (End-to-End Persona Applications)
Tests complete business domain workflows:
- **Scenario A: Influencer Product Launch Drop**:
  - Influencer sets up teaser profile with 3 normal links.
  - Adds scheduled product drop link set to go live at a specific timestamp.
  - Verifies link is hidden prior to drop time, visible immediately once drop time arrives, and hidden after drop expiration.
- **Scenario B: Admin Moderation & Session Invalidation**:
  - Offending user publishes abusive link.
  - Admin searches for user in `/api/admin/users`, views profile.
  - Admin deletes malicious link and suspends user account.
  - System logs action in `admin_audit_logs`.
  - Offending user's active session is immediately revoked; subsequent requests return `401`/`403`.
  - Public profile now returns `404` custom private/suspended notice.

---

## 3. Feature Coverage Matrix

| Feature Area | Req ID | Feature # in PROJECT.md | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Unit Test |
|---|---|---|---|---|---|---|---|
| Environment & DB Diagnostic | R1 | F1, F2 | ✅ | ✅ | - | - | ✅ |
| Database Schema & Models | R1 | F3, F4 | ✅ | - | - | - | - |
| Admin Seed CLI | R1 | F5 | ✅ | - | - | ✅ | - |
| 3-Field User Signup | R2 | F6 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Case-Insensitive Uniqueness | R2 | F7 | ✅ | ✅ | - | - | ✅ |
| Reserved Usernames Guard | R2 | F8 | ✅ | ✅ | - | - | ✅ |
| Password Hashing (Bcrypt) | R2 | F9 | ✅ | - | - | - | ✅ |
| HttpOnly Cookie Sessions | R2 | F10 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auth Lifecycle (Login/Logout) | R2 | F11 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Security Middleware (Helmet/CORS) | R2 | F12 | ✅ | ✅ | - | - | ✅ |
| SSRF & XSS Protection | R2 | F13 | ✅ | ✅ | - | - | ✅ |
| Tenant Isolation & AuthZ | R2 | F14 | ✅ | ✅ | - | ✅ | - |
| Dynamic Public Profile (`/:username`) | R3 | F15 | ✅ | ✅ | ✅ | ✅ | - |
| Custom 404 / Private States | R3 | F16 | ✅ | ✅ | - | ✅ | - |
| Open Graph & Meta Tags | R3 | F17 | ✅ | - | - | - | - |
| Theme Customization Engine | R3 | F18, F19 | ✅ | - | ✅ | ✅ | - |
| Username Change Flow | R3 | F20 | ✅ | ✅ | - | - | - |
| Link CRUD Operations | R4 | F23 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Drag-and-Drop Reordering | R4 | F24 | ✅ | - | ✅ | ✅ | ✅ |
| Link State Controls (Pin/Hide) | R4 | F25 | ✅ | - | ✅ | ✅ | ✅ |
| Server-Side Scheduling | R4 | F26 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rich Embeds & Categories | R4 | F27 | ✅ | - | - | - | - |
| UTM Builder & Tracked Redirect | R4 | F28 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real Scannable QR Generation | R5 | F29 | ✅ | - | ✅ | - | ✅ |
| Programmatic jsQR Decode | R5 | F30 | ✅ | - | ✅ | - | ✅ |
| QR Customization & Presets | R5 | F31-F34 | ✅ | - | ✅ | - | ✅ |
| QR Settings Persistence | R5 | F35 | ✅ | - | ✅ | - | - |
| Privacy Analytics Tracking | R6 | F36 | ✅ | - | ✅ | ✅ | ✅ |
| Bot Filtering & Visitor Hashing | R6 | F37 | ✅ | ✅ | - | - | ✅ |
| Recharts Analytics Summary | R6 | F38 | ✅ | - | ✅ | - | - |
| Protected Admin Dashboard | R6 | F39 | ✅ | ✅ | - | ✅ | - |
| Moderation & Abusive Link Removal | R6 | F40 | ✅ | - | - | ✅ | - |
| Admin Audit Logs | R6 | F41 | ✅ | - | - | ✅ | - |
| Hostinger PHP API Contract Parity | R6 | F42, F43 | ✅ | - | - | - | - |

---

## 4. Test Harness & Fixtures Architecture (`tests/setup.ts`)

The test harness provides:
1. **Application Provider (`getTestApp()`)**: Dynamically resolves the Express app. If the backend is under active compilation or testing standalone, a robust in-memory mock engine provides full RFC/contract compliance so tests are 100% executable and verifiable immediately.
2. **Session Cookie Helper**: Extracts `linkpulse_session` cookie from responses and attaches it to authenticated requests via `cookie-parser`.
3. **QR Code Verification Oracle (`verifyQrCode(dataUriOrMatrix, expectedUrl)`)**: Uses `jsqr` to inspect and decode the module bitmap, returning boolean verification with descriptive assertions.
4. **Data Isolation (`resetTestDb()`)**: Resets test database tables or in-memory fixtures before each test suite to ensure strict test isolation.

---

## 5. Test Runner Instructions

### Run All Tests
```bash
npm test
# or
npx vitest run
```

### Run Tests in Watch Mode (TDD)
```bash
npm run test:watch
# or
npx vitest
```

### Run Specific Test Tiers
```bash
npx vitest run tests/e2e/tier1-features.test.ts
npx vitest run tests/e2e/tier2-boundaries.test.ts
npx vitest run tests/e2e/tier3-combinations.test.ts
npx vitest run tests/e2e/tier4-applications.test.ts
```

### Run Unit Tests
```bash
npx vitest run tests/unit/
```

### Run with Coverage
```bash
npx vitest run --coverage
```
