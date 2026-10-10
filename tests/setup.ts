import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import qrcode from 'qrcode';
import jsQR from 'jsqr';
import crypto from 'crypto';
import { beforeEach } from 'vitest';

// ============================================================================
// Types & Data Contracts
// ============================================================================

export interface TestUser {
  id: string;
  username: string;
  normalized_username: string;
  email: string;
  normalized_email: string;
  password_hash: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'pending_verification';
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TestProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  theme_settings: Record<string, any>;
  social_links: Array<Record<string, any>>;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TestLink {
  id: string;
  user_id: string;
  title: string;
  destination_url: string;
  description: string | null;
  icon: string | null;
  thumbnail_url: string | null;
  position: number;
  is_active: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  is_featured: boolean;
  category: string | null;
  custom_label: string | null;
  media_type: string | null;
  media_url: string | null;
  utm_params: Record<string, string> | null;
  click_count: number;
  scheduled_start: Date | null;
  scheduled_end: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TestQrSetting {
  id: string;
  user_id: string;
  foreground_color: string;
  background_color: string;
  gradient_settings: Record<string, any> | null;
  dot_style: string;
  corner_style: string;
  logo_url: string | null;
  error_correction_level: string;
  margin: number;
  resolution: number;
  transparent_background: boolean;
  preset_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TestAnalyticsEvent {
  id: string;
  profile_id: string;
  link_id: string | null;
  event_type: 'profile_view' | 'link_click' | 'qr_scan';
  referrer_category: string;
  device_category: string;
  campaign_id: string | null;
  visitor_hash: string;
  country_code: string | null;
  created_at: Date;
}

export interface TestSession {
  id: string;
  user_id: string;
  data: Record<string, any> | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TestAdminAuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any> | null;
  ip_address_hash: string | null;
  created_at: Date;
}

// ============================================================================
// Reserved Usernames & Blocklists
// ============================================================================

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'login',
  'signup',
  'register',
  'dashboard',
  'settings',
  'api',
  'assets',
  'static',
  'public',
  'r',
  'auth',
  'user',
  'users',
  'profile',
  'profiles',
  'link',
  'links',
  'qr',
  'analytics',
  'help',
  'support',
  'terms',
  'privacy',
  'about',
  'contact',
  'onboarding',
  '404',
]);

// ============================================================================
// SSRF & Security Validation Helpers
// ============================================================================

export function isPrivateOrBlockedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return true;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return true;
    }

    // Check private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    const ipv4Match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(hostname);
    if (ipv4Match) {
      const b1 = parseInt(ipv4Match[1], 10);
      const b2 = parseInt(ipv4Match[2], 10);
      if (b1 === 10) return true;
      if (b1 === 127) return true;
      if (b1 === 169 && b2 === 254) return true;
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
      if (b1 === 192 && b2 === 168) return true;
      if (b1 === 0) return true;
    }

    return false;
  } catch {
    return true;
  }
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateVisitorHash(ip: string, userAgent: string, dateStr?: string): string {
  const day = dateStr || new Date().toISOString().split('T')[0];
  const salt = 'linkpulse_daily_salt_secret';
  return crypto.createHash('sha256').update(`${ip}-${userAgent}-${day}-${salt}`).digest('hex');
}

export function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const botRegex = /(bot|crawl|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|curl|python-requests|wget|headless)/i;
  return botRegex.test(userAgent);
}

// ============================================================================
// jsQR Verification Oracle
// ============================================================================

/**
 * Creates an in-memory RGBA bitmap representation of a QR code using qrcode module,
 * then decodes it using jsQR to verify 100% scannability and URL parity.
 */
export async function verifyQrCode(
  targetUrl: string,
  options: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; margin?: number; scale?: number } = {}
): Promise<{ scannable: boolean; decodedUrl: string | null; errorCorrectionLevel: string }> {
  const ecLevel = options.errorCorrectionLevel || 'H';
  const qr = qrcode.create(targetUrl, { errorCorrectionLevel: ecLevel });
  const moduleCount = qr.modules.size;
  const margin = options.margin !== undefined ? options.margin : 4;
  const scale = options.scale !== undefined ? options.scale : 4;

  const totalModules = moduleCount + margin * 2;
  const pixelWidth = totalModules * scale;
  const pixelHeight = totalModules * scale;

  const rgbaBuffer = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);

  // Initialize buffer with white background (255, 255, 255, 255)
  rgbaBuffer.fill(255);

  // Render QR modules onto the RGBA buffer
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.modules.get(r, c)) {
        // Module is dark: draw black square of scale x scale
        const startX = (c + margin) * scale;
        const startY = (r + margin) * scale;
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const index = ((startY + py) * pixelWidth + (startX + px)) * 4;
            rgbaBuffer[index] = 0;     // R
            rgbaBuffer[index + 1] = 0; // G
            rgbaBuffer[index + 2] = 0; // B
            rgbaBuffer[index + 3] = 255; // A
          }
        }
      }
    }
  }

  // Execute jsQR algorithm to decode bitmap
  const decoded = jsQR(rgbaBuffer, pixelWidth, pixelHeight);

  if (decoded && decoded.data === targetUrl) {
    return {
      scannable: true,
      decodedUrl: decoded.data,
      errorCorrectionLevel: ecLevel,
    };
  }

  return {
    scannable: false,
    decodedUrl: decoded ? decoded.data : null,
    errorCorrectionLevel: ecLevel,
  };
}

// ============================================================================
// In-Memory Test State & Reset Utilities
// ============================================================================

// Pre-computed bcrypt hashes for seed users to avoid redundant CPU work on beforeEach
const SEED_USER_HASH = bcrypt.hashSync('Password123!', 8);
const SEED_ADMIN_HASH = bcrypt.hashSync('AdminPass123!', 8);
const SEED_OTHER_HASH = bcrypt.hashSync('OtherPass123!', 8);

export class TestDatabase {
  users: Map<string, TestUser> = new Map();
  profiles: Map<string, TestProfile> = new Map();
  links: Map<string, TestLink> = new Map();
  qrSettings: Map<string, TestQrSetting> = new Map();
  analyticsEvents: TestAnalyticsEvent[] = [];
  sessions: Map<string, TestSession> = new Map();
  auditLogs: TestAdminAuditLog[] = [];

  reset() {
    this.users.clear();
    this.profiles.clear();
    this.links.clear();
    this.qrSettings.clear();
    this.analyticsEvents = [];
    this.sessions.clear();
    this.auditLogs = [];

    this.seedDefaults();
  }

  seedDefaults() {
    const now = new Date();
    // Default standard user
    const standardUser: TestUser = {
      id: 'usr_standard_1',
      username: 'StandardUser',
      normalized_username: 'standarduser',
      email: 'standard@example.com',
      normalized_email: 'standard@example.com',
      password_hash: SEED_USER_HASH,
      role: 'user',
      status: 'active',
      email_verified_at: now,
      created_at: now,
      updated_at: now,
    };
    this.users.set(standardUser.id, standardUser);

    const standardProfile: TestProfile = {
      id: 'prof_standard_1',
      user_id: standardUser.id,
      display_name: 'Standard Creator',
      bio: 'Digital artist and builder',
      avatar_url: 'https://example.com/avatar.jpg',
      theme_settings: {
        preset: 'default',
        background_type: 'color',
        background_value: '#0f172a',
        button_shape: 'rounded-full',
        font_family: 'Inter',
      },
      social_links: [
        { platform: 'twitter', url: 'https://x.com/standard' },
        { platform: 'github', url: 'https://github.com/standard' },
      ],
      is_public: true,
      created_at: now,
      updated_at: now,
    };
    this.profiles.set(standardProfile.id, standardProfile);

    const standardQr: TestQrSetting = {
      id: 'qr_standard_1',
      user_id: standardUser.id,
      foreground_color: '#000000',
      background_color: '#ffffff',
      gradient_settings: null,
      dot_style: 'squares',
      corner_style: 'square',
      logo_url: null,
      error_correction_level: 'H',
      margin: 2,
      resolution: 1024,
      transparent_background: false,
      preset_name: 'Classic Black',
      created_at: now,
      updated_at: now,
    };
    this.qrSettings.set(standardQr.id, standardQr);

    // Default admin user
    const adminUser: TestUser = {
      id: 'usr_admin_1',
      username: 'SiteAdmin',
      normalized_username: 'siteadmin',
      email: 'admin@linkpulse.io',
      normalized_email: 'admin@linkpulse.io',
      password_hash: SEED_ADMIN_HASH,
      role: 'admin',
      status: 'active',
      email_verified_at: now,
      created_at: now,
      updated_at: now,
    };
    this.users.set(adminUser.id, adminUser);

    const adminProfile: TestProfile = {
      id: 'prof_admin_1',
      user_id: adminUser.id,
      display_name: 'Platform Administrator',
      bio: 'Managing LinkPulse platform',
      avatar_url: null,
      theme_settings: { preset: 'dark' },
      social_links: [],
      is_public: true,
      created_at: now,
      updated_at: now,
    };
    this.profiles.set(adminProfile.id, adminProfile);

    // User 2 (for tenant isolation tests)
    const otherUser: TestUser = {
      id: 'usr_other_2',
      username: 'OtherCreator',
      normalized_username: 'othercreator',
      email: 'other@example.com',
      normalized_email: 'other@example.com',
      password_hash: SEED_OTHER_HASH,
      role: 'user',
      status: 'active',
      email_verified_at: now,
      created_at: now,
      updated_at: now,
    };
    this.users.set(otherUser.id, otherUser);

    const otherProfile: TestProfile = {
      id: 'prof_other_2',
      user_id: otherUser.id,
      display_name: 'Other Creator',
      bio: 'Another independent creator',
      avatar_url: null,
      theme_settings: { preset: 'minimal' },
      social_links: [],
      is_public: true,
      created_at: now,
      updated_at: now,
    };
    this.profiles.set(otherProfile.id, otherProfile);

    // Initial link for other user
    const otherLink: TestLink = {
      id: 'link_other_1',
      user_id: otherUser.id,
      title: "Other User's Secret Link",
      destination_url: 'https://example.com/other-secret',
      description: 'Private stuff',
      icon: 'lock',
      thumbnail_url: null,
      position: 0,
      is_active: true,
      is_pinned: false,
      is_hidden: false,
      is_featured: false,
      category: null,
      custom_label: null,
      media_type: null,
      media_url: null,
      utm_params: null,
      click_count: 0,
      scheduled_start: null,
      scheduled_end: null,
      created_at: now,
      updated_at: now,
    };
    this.links.set(otherLink.id, otherLink);
  }
}

export const testDb = new TestDatabase();
testDb.reset();

export function resetTestDb() {
  testDb.reset();
}

export function createTestSession(userId: string): string {
  const sessionId = 'sess_' + crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  testDb.sessions.set(sessionId, {
    id: sessionId,
    user_id: userId,
    data: null,
    expires_at: expiresAt,
    created_at: now,
    updated_at: now,
  });
  return sessionId;
}

// ============================================================================
// LinkPulse Express Reference Server (Contract Implementation)
// ============================================================================

export function buildLinkPulseTestApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const APP_URL = process.env.APP_URL || 'http://localhost:3000';

  // Session Authentication Middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.cookies['linkpulse_session'];
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = testDb.sessions.get(sessionId);
    if (!session || new Date() > session.expires_at) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const user = testDb.users.get(session.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended. Please contact support.' });
    }

    (req as any).user = user;
    (req as any).session = session;
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      const user = (req as any).user as TestUser;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Administrator access required' });
      }
      next();
    });
  };

  // --------------------------------------------------------------------------
  // AUTH ROUTES (/api/auth)
  // --------------------------------------------------------------------------

  // 1. Signup: strictly 3 fields (username, email, password)
  app.post('/api/auth/signup', (req: Request, res: Response) => {
    const { username, email, password, ...extraFields } = req.body;

    // Reject unrecognized extra fields (Strictly 3 fields rule)
    if (Object.keys(extraFields).length > 0) {
      return res.status(400).json({
        error: 'Signup requires strictly username, email, and password fields.',
      });
    }

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required', field: 'username' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required', field: 'email' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required', field: 'password' });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    // Username format check
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      return res.status(400).json({
        error: 'Username must be between 3 and 30 characters and contain only letters, numbers, hyphens, and underscores.',
        field: 'username',
      });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      return res.status(400).json({ error: 'Invalid email address format', field: 'email' });
    }

    // Password length check
    if (password.length < 8 || password.length > 100) {
      return res.status(400).json({
        error: 'Password must be between 8 and 100 characters',
        field: 'password',
      });
    }

    const normUsername = trimmedUsername.toLowerCase();
    const normEmail = trimmedEmail.toLowerCase();

    // Reserved username check
    if (RESERVED_USERNAMES.has(normUsername)) {
      return res.status(400).json({
        error: `The username '${trimmedUsername}' is reserved and cannot be registered.`,
        field: 'username',
      });
    }

    // Case-insensitive uniqueness check
    for (const u of testDb.users.values()) {
      if (u.normalized_username === normUsername) {
        return res.status(409).json({ error: 'Username is already taken', field: 'username' });
      }
      if (u.normalized_email === normEmail) {
        return res.status(409).json({ error: 'Email is already registered', field: 'email' });
      }
    }

    const now = new Date();
    const newUser: TestUser = {
      id: 'usr_' + crypto.randomUUID(),
      username: trimmedUsername,
      normalized_username: normUsername,
      email: trimmedEmail,
      normalized_email: normEmail,
      password_hash: bcrypt.hashSync(password, 10),
      role: 'user',
      status: 'active',
      email_verified_at: null,
      created_at: now,
      updated_at: now,
    };
    testDb.users.set(newUser.id, newUser);

    // Create default profile
    const newProfile: TestProfile = {
      id: 'prof_' + crypto.randomUUID(),
      user_id: newUser.id,
      display_name: trimmedUsername,
      bio: null,
      avatar_url: null,
      theme_settings: {
        preset: 'default',
        background_type: 'color',
        background_value: '#f8fafc',
        button_shape: 'rounded-full',
        font_family: 'Inter',
      },
      social_links: [],
      is_public: true,
      created_at: now,
      updated_at: now,
    };
    testDb.profiles.set(newProfile.id, newProfile);

    // Create default QR settings
    const newQrSetting: TestQrSetting = {
      id: 'qr_' + crypto.randomUUID(),
      user_id: newUser.id,
      foreground_color: '#000000',
      background_color: '#ffffff',
      gradient_settings: null,
      dot_style: 'squares',
      corner_style: 'square',
      logo_url: null,
      error_correction_level: 'H',
      margin: 2,
      resolution: 1024,
      transparent_background: false,
      preset_name: 'Classic Black',
      created_at: now,
      updated_at: now,
    };
    testDb.qrSettings.set(newQrSetting.id, newQrSetting);

    // Issue session cookie
    const sessionId = createTestSession(newUser.id);
    res.cookie('linkpulse_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        email_verified: false,
        created_at: newUser.created_at.toISOString(),
      },
      message: 'User registered successfully',
    });
  });

  // 2. Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const norm = identifier.trim().toLowerCase();
    let foundUser: TestUser | undefined;
    for (const u of testDb.users.values()) {
      if (u.normalized_username === norm || u.normalized_email === norm) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser || !bcrypt.compareSync(password, foundUser.password_hash)) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    if (foundUser.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended. Please contact support.' });
    }

    const sessionId = createTestSession(foundUser.id);
    res.cookie('linkpulse_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        role: foundUser.role,
        status: foundUser.status,
        email_verified: foundUser.email_verified_at !== null,
      },
      message: 'Logged in successfully',
    });
  });

  // 3. Logout
  app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
    const sessionId = req.cookies['linkpulse_session'];
    if (sessionId) {
      testDb.sessions.delete(sessionId);
    }
    res.clearCookie('linkpulse_session', { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully' });
  });

  // 4. Me
  app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    let profile: TestProfile | undefined;
    for (const p of testDb.profiles.values()) {
      if (p.user_id === user.id) {
        profile = p;
        break;
      }
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified_at !== null,
        created_at: user.created_at.toISOString(),
      },
      profile: profile || null,
    });
  });

  // 5. Password Reset Request
  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    // Prevent email enumeration
    return res.status(200).json({
      message: 'If that email is registered, a password reset link has been sent.',
    });
  });

  // --------------------------------------------------------------------------
  // PROFILE & APPEARANCE ROUTES (/api/profile)
  // --------------------------------------------------------------------------

  app.get('/api/profile', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    for (const p of testDb.profiles.values()) {
      if (p.user_id === user.id) {
        return res.status(200).json({ profile: p });
      }
    }
    return res.status(404).json({ error: 'Profile not found' });
  });

  app.put('/api/profile', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    let profile: TestProfile | undefined;
    for (const p of testDb.profiles.values()) {
      if (p.user_id === user.id) {
        profile = p;
        break;
      }
    }
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const { display_name, bio, avatar_url, theme_settings, social_links, is_public } = req.body;
    if (display_name !== undefined) profile.display_name = sanitizeHtml(String(display_name));
    if (bio !== undefined) profile.bio = bio ? sanitizeHtml(String(bio)) : null;
    if (avatar_url !== undefined) profile.avatar_url = avatar_url;
    if (theme_settings !== undefined) profile.theme_settings = theme_settings;
    if (social_links !== undefined) profile.social_links = social_links;
    if (is_public !== undefined) profile.is_public = Boolean(is_public);
    profile.updated_at = new Date();

    return res.status(200).json({ profile });
  });

  // --------------------------------------------------------------------------
  // PUBLIC PROFILE ROUTE (/api/public/:username)
  // --------------------------------------------------------------------------

  app.get('/api/public/:username', (req: Request, res: Response) => {
    const usernameParam = req.params.username.trim().toLowerCase();

    // Check reserved username
    if (RESERVED_USERNAMES.has(usernameParam)) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let targetUser: TestUser | undefined;
    for (const u of testDb.users.values()) {
      if (u.normalized_username === usernameParam) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser || targetUser.status === 'suspended') {
      return res.status(404).json({ error: 'Profile not found or suspended' });
    }

    let targetProfile: TestProfile | undefined;
    for (const p of testDb.profiles.values()) {
      if (p.user_id === targetUser.id) {
        targetProfile = p;
        break;
      }
    }

    if (!targetProfile || !targetProfile.is_public) {
      return res.status(404).json({ error: 'Profile is private or unavailable' });
    }

    // Filter links according to business logic:
    // is_active = true, is_hidden = false, scheduled_start <= now <= scheduled_end
    const now = new Date();
    const visibleLinks: TestLink[] = [];

    for (const link of testDb.links.values()) {
      if (link.user_id !== targetUser.id) continue;
      if (!link.is_active || link.is_hidden) continue;

      if (link.scheduled_start && link.scheduled_start > now) continue;
      if (link.scheduled_end && link.scheduled_end < now) continue;

      visibleLinks.push(link);
    }

    // Sort by is_pinned DESC, position ASC, created_at DESC
    visibleLinks.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.position !== b.position) return a.position - b.position;
      return b.created_at.getTime() - a.created_at.getTime();
    });

    // Record privacy-conscious analytics event (Profile View)
    const userAgent = req.headers['user-agent'] || '';
    if (!isBot(userAgent)) {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const visitorHash = generateVisitorHash(clientIp, userAgent);
      testDb.analyticsEvents.push({
        id: 'evt_' + crypto.randomUUID(),
        profile_id: targetProfile.id,
        link_id: null,
        event_type: 'profile_view',
        referrer_category: req.query.ref === 'qr' ? 'qr_campaign' : 'direct',
        device_category: /(mobile|iphone|ipod|android|blackberry|opera mini|windows phone)/i.test(userAgent) ? 'mobile' : 'desktop',
        campaign_id: (req.query.ref as string) || null,
        visitor_hash: visitorHash,
        country_code: null,
        created_at: now,
      });
    }

    return res.status(200).json({
      user: {
        username: targetUser.username,
      },
      profile: targetProfile,
      links: visibleLinks,
    });
  });

  // --------------------------------------------------------------------------
  // LINK MANAGEMENT ROUTES (/api/links)
  // --------------------------------------------------------------------------

  app.get('/api/links', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    const userLinks: TestLink[] = [];
    for (const link of testDb.links.values()) {
      if (link.user_id === user.id) {
        userLinks.push(link);
      }
    }
    userLinks.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return a.position - b.position;
    });
    return res.status(200).json({ links: userLinks });
  });

  app.post('/api/links', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    const {
      title,
      destination_url,
      description,
      icon,
      thumbnail_url,
      is_active,
      is_pinned,
      is_hidden,
      is_featured,
      category,
      custom_label,
      utm_params,
      scheduled_start,
      scheduled_end,
    } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!destination_url || typeof destination_url !== 'string') {
      return res.status(400).json({ error: 'Destination URL is required' });
    }

    // SSRF Check
    if (isPrivateOrBlockedUrl(destination_url)) {
      return res.status(400).json({
        error: 'Destination URL cannot point to internal or private IP addresses',
      });
    }

    // Determine next position
    let maxPos = -1;
    for (const link of testDb.links.values()) {
      if (link.user_id === user.id && link.position > maxPos) {
        maxPos = link.position;
      }
    }

    const now = new Date();
    const newLink: TestLink = {
      id: 'link_' + crypto.randomUUID(),
      user_id: user.id,
      title: sanitizeHtml(title),
      destination_url,
      description: description ? sanitizeHtml(description) : null,
      icon: icon || null,
      thumbnail_url: thumbnail_url || null,
      position: maxPos + 1,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      is_pinned: Boolean(is_pinned),
      is_hidden: Boolean(is_hidden),
      is_featured: Boolean(is_featured),
      category: category ? sanitizeHtml(category) : null,
      custom_label: custom_label ? sanitizeHtml(custom_label) : null,
      media_type: null,
      media_url: null,
      utm_params: utm_params || null,
      click_count: 0,
      scheduled_start: scheduled_start ? new Date(scheduled_start) : null,
      scheduled_end: scheduled_end ? new Date(scheduled_end) : null,
      created_at: now,
      updated_at: now,
    };

    testDb.links.set(newLink.id, newLink);
    return res.status(201).json({ link: newLink });
  });

  // Reorder links (Must be defined before /api/links/:id)
  app.put('/api/links/reorder', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    const { linkIds } = req.body;
    if (!Array.isArray(linkIds)) {
      return res.status(400).json({ error: 'linkIds array is required' });
    }

    linkIds.forEach((id: string, index: number) => {
      const link = testDb.links.get(id);
      if (link && link.user_id === user.id) {
        link.position = index;
      }
    });

    return res.status(200).json({ message: 'Links reordered successfully' });
  });

  app.put('/api/links/:id', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    const link = testDb.links.get(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    // Tenant isolation verification
    if (link.user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this link' });
    }

    const {
      title,
      destination_url,
      description,
      is_active,
      is_pinned,
      is_hidden,
      is_featured,
      scheduled_start,
      scheduled_end,
      position,
      utm_params,
    } = req.body;

    if (destination_url !== undefined) {
      if (isPrivateOrBlockedUrl(destination_url)) {
        return res.status(400).json({ error: 'Invalid destination URL: Private addresses blocked' });
      }
      link.destination_url = destination_url;
    }

    if (title !== undefined) link.title = sanitizeHtml(title);
    if (description !== undefined) link.description = description ? sanitizeHtml(description) : null;
    if (is_active !== undefined) link.is_active = Boolean(is_active);
    if (is_pinned !== undefined) link.is_pinned = Boolean(is_pinned);
    if (is_hidden !== undefined) link.is_hidden = Boolean(is_hidden);
    if (is_featured !== undefined) link.is_featured = Boolean(is_featured);
    if (position !== undefined) link.position = Number(position);
    if (utm_params !== undefined) link.utm_params = utm_params;
    if (scheduled_start !== undefined) link.scheduled_start = scheduled_start ? new Date(scheduled_start) : null;
    if (scheduled_end !== undefined) link.scheduled_end = scheduled_end ? new Date(scheduled_end) : null;
    link.updated_at = new Date();

    return res.status(200).json({ link });
  });

  app.delete('/api/links/:id', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    const link = testDb.links.get(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    if (link.user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this link' });
    }

    testDb.links.delete(link.id);
    return res.status(200).json({ message: 'Link deleted successfully' });
  });

  // --------------------------------------------------------------------------
  // UPLOAD ROUTES (/api/upload/image)
  // --------------------------------------------------------------------------

  app.post('/api/upload/image', requireAuth, (req: Request, res: Response) => {
    const { image_data, type, link_id } = req.body || {};
    if (!image_data) {
      return res.status(400).json({ error: 'Image data is required.' });
    }
    const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i.exec(image_data);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image format. Supported formats: PNG, JPG, JPEG, and WebP (up to 5 MB).' });
    }
    const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File exceeds maximum upload size of 5 MB.' });
    }
    const user = (req as any).user as TestUser;
    const safeFilename = `${type || 'link'}-${crypto.randomUUID()}.${match[1].toLowerCase()}`;
    const publicUrl = `/api/uploads/${type === 'avatar' ? 'avatars' : 'links'}/${safeFilename}`;

    if (link_id) {
      const link = testDb.links.get(link_id);
      if (!link) return res.status(404).json({ error: 'Link not found' });
      if (link.user_id !== user.id) return res.status(403).json({ error: 'Not authorized to modify this link' });
      link.thumbnail_url = publicUrl;
    }

    if (type === 'avatar') {
      for (const p of testDb.profiles.values()) {
        if (p.user_id === user.id) {
          p.avatar_url = publicUrl;
          break;
        }
      }
    }

    return res.status(200).json({ url: publicUrl, filename: safeFilename, message: 'Image uploaded successfully.' });
  });

  // --------------------------------------------------------------------------
  // QR STUDIO ROUTES (/api/qr-settings, /api/qr/generate)
  // --------------------------------------------------------------------------

  app.get('/api/qr-settings', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    for (const qr of testDb.qrSettings.values()) {
      if (qr.user_id === user.id) {
        return res.status(200).json({ qr_settings: qr });
      }
    }
    return res.status(404).json({ error: 'QR settings not found' });
  });

  app.put('/api/qr-settings', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    let qr: TestQrSetting | undefined;
    for (const q of testDb.qrSettings.values()) {
      if (q.user_id === user.id) {
        qr = q;
        break;
      }
    }
    if (!qr) return res.status(404).json({ error: 'QR settings not found' });

    const {
      foreground_color,
      background_color,
      gradient_settings,
      dot_style,
      corner_style,
      logo_url,
      error_correction_level,
      margin,
      resolution,
      transparent_background,
      preset_name,
    } = req.body;

    if (foreground_color) qr.foreground_color = foreground_color;
    if (background_color) qr.background_color = background_color;
    if (gradient_settings !== undefined) qr.gradient_settings = gradient_settings;
    if (dot_style) qr.dot_style = dot_style;
    if (corner_style) qr.corner_style = corner_style;
    if (logo_url !== undefined) qr.logo_url = logo_url;
    if (error_correction_level) qr.error_correction_level = error_correction_level;
    if (margin !== undefined) qr.margin = Number(margin);
    if (resolution !== undefined) qr.resolution = Number(resolution);
    if (transparent_background !== undefined) qr.transparent_background = Boolean(transparent_background);
    if (preset_name !== undefined) qr.preset_name = preset_name;
    qr.updated_at = new Date();

    return res.status(200).json({ qr_settings: qr });
  });

  app.post('/api/qr/generate', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    const targetUrl = `${APP_URL}/${user.username}`;
    const qrObj = qrcode.create(targetUrl, { errorCorrectionLevel: 'H' });

    return res.status(200).json({
      url: targetUrl,
      module_count: qrObj.modules.size,
      error_correction_level: 'H',
      message: 'QR Code generated with Level H error correction',
    });
  });

  // --------------------------------------------------------------------------
  // TRACKED REDIRECTION ROUTE (/r/:linkId)
  // --------------------------------------------------------------------------

  app.get('/r/:linkId', (req: Request, res: Response) => {
    const link = testDb.links.get(req.params.linkId);
    if (!link) {
      return res.status(404).send('Link not found');
    }

    // Increment click count
    link.click_count += 1;

    // Find profile
    let profile: TestProfile | undefined;
    for (const p of testDb.profiles.values()) {
      if (p.user_id === link.user_id) {
        profile = p;
        break;
      }
    }

    // Record click analytics event
    const userAgent = req.headers['user-agent'] || '';
    if (profile && !isBot(userAgent)) {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      testDb.analyticsEvents.push({
        id: 'evt_' + crypto.randomUUID(),
        profile_id: profile.id,
        link_id: link.id,
        event_type: 'link_click',
        referrer_category: req.query.ref ? String(req.query.ref) : 'direct',
        device_category: /(mobile|iphone|ipod|android|blackberry|opera mini|windows phone)/i.test(userAgent) ? 'mobile' : 'desktop',
        campaign_id: (req.query.utm_campaign as string) || null,
        visitor_hash: generateVisitorHash(clientIp, userAgent),
        country_code: null,
        created_at: new Date(),
      });
    }

    // Merge UTM parameters onto destination URL if configured
    let redirectUrl = link.destination_url;
    if (link.utm_params && Object.keys(link.utm_params).length > 0) {
      try {
        const parsed = new URL(redirectUrl);
        for (const [k, v] of Object.entries(link.utm_params)) {
          parsed.searchParams.set(k, v);
        }
        redirectUrl = parsed.toString();
      } catch {
        // Fallback to raw destination if URL parsing fails
      }
    }

    return res.redirect(302, redirectUrl);
  });

  // --------------------------------------------------------------------------
  // ANALYTICS ROUTES (/api/analytics)
  // --------------------------------------------------------------------------

  app.get('/api/analytics', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user as TestUser;
    let profile: TestProfile | undefined;
    for (const p of testDb.profiles.values()) {
      if (p.user_id === user.id) {
        profile = p;
        break;
      }
    }

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    let profileViews = 0;
    let linkClicks = 0;
    const events = testDb.analyticsEvents.filter(e => e.profile_id === profile!.id);

    events.forEach(e => {
      if (e.event_type === 'profile_view') profileViews++;
      if (e.event_type === 'link_click') linkClicks++;
    });

    return res.status(200).json({
      summary: {
        total_views: profileViews,
        total_clicks: linkClicks,
        ctr: profileViews > 0 ? (linkClicks / profileViews) * 100 : 0,
      },
      events_count: events.length,
    });
  });

  // --------------------------------------------------------------------------
  // PROTECTED ADMIN ROUTES (/api/admin/*)
  // --------------------------------------------------------------------------

  app.get('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
    const query = ((req.query.q as string) || '').toLowerCase();
    const result: any[] = [];
    for (const u of testDb.users.values()) {
      if (!query || u.normalized_username.includes(query) || u.normalized_email.includes(query)) {
        result.push({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
          created_at: u.created_at,
        });
      }
    }
    return res.status(200).json({ users: result });
  });

  app.post('/api/admin/users/:id/suspend', requireAdmin, (req: Request, res: Response) => {
    const adminUser = (req as any).user as TestUser;
    const targetUser = testDb.users.get(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    targetUser.status = 'suspended';

    // Invalidate all active sessions for this user immediately
    for (const [sessId, session] of testDb.sessions.entries()) {
      if (session.user_id === targetUser.id) {
        testDb.sessions.delete(sessId);
      }
    }

    // Log admin audit entry
    testDb.auditLogs.push({
      id: 'log_' + crypto.randomUUID(),
      admin_user_id: adminUser.id,
      action: 'user_suspend',
      target_type: 'user',
      target_id: targetUser.id,
      details: { reason: req.body.reason || 'Administrative action' },
      ip_address_hash: null,
      created_at: new Date(),
    });

    return res.status(200).json({ message: 'User suspended and sessions revoked successfully' });
  });

  app.post('/api/admin/users/:id/reactivate', requireAdmin, (req: Request, res: Response) => {
    const adminUser = (req as any).user as TestUser;
    const targetUser = testDb.users.get(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    targetUser.status = 'active';

    testDb.auditLogs.push({
      id: 'log_' + crypto.randomUUID(),
      admin_user_id: adminUser.id,
      action: 'user_reactivate',
      target_type: 'user',
      target_id: targetUser.id,
      details: {},
      ip_address_hash: null,
      created_at: new Date(),
    });

    return res.status(200).json({ message: 'User reactivated successfully' });
  });

  app.delete('/api/admin/links/:id', requireAdmin, (req: Request, res: Response) => {
    const adminUser = (req as any).user as TestUser;
    const link = testDb.links.get(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });

    testDb.links.delete(link.id);

    testDb.auditLogs.push({
      id: 'log_' + crypto.randomUUID(),
      admin_user_id: adminUser.id,
      action: 'link_delete',
      target_type: 'link',
      target_id: link.id,
      details: { title: link.title, destination_url: link.destination_url },
      ip_address_hash: null,
      created_at: new Date(),
    });

    return res.status(200).json({ message: 'Link moderated and removed' });
  });

  app.get('/api/admin/audit-logs', requireAdmin, (req: Request, res: Response) => {
    return res.status(200).json({ audit_logs: testDb.auditLogs });
  });

  app.get('/api/admin/platform-settings', requireAdmin, (req: Request, res: Response) => {
    return res.status(200).json({
      settings: {
        allow_registrations: true,
        maintenance_mode: false,
      },
    });
  });

  return app;
}

// Singleton App Instance for Supertest
let testAppInstance: express.Application | null = null;

export function getTestApp(): express.Application {
  if (!testAppInstance) {
    testAppInstance = buildLinkPulseTestApp();
  }
  return testAppInstance;
}

// Reset state before each test file
try {
  if (typeof beforeEach === 'function') {
    beforeEach(() => {
      resetTestDb();
    });
  }
} catch {
  // Ignore if runner context is not yet established
}
