import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  getTestApp,
  resetTestDb,
  createTestSession,
  verifyQrCode,
  testDb,
} from '../setup.js';

describe('Tier 1: Canonical Feature & Acceptance Criteria Coverage', () => {
  let app: any;

  beforeEach(() => {
    resetTestDb();
    app = getTestApp();
  });

  // ==========================================================================
  // Feature Area 1: Signup & Account Registration
  // ==========================================================================
  describe('1. Signup & Account Registration', () => {
    it('1.1 should register a user with strictly 3 fields, create profile & QR settings, and issue HttpOnly session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'NewCreator',
          email: 'newcreator@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('NewCreator');
      expect(res.body.user.email).toBe('newcreator@example.com');
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.status).toBe('active');

      // Verify HttpOnly session cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find((c: string) => c.startsWith('linkpulse_session='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');

      // Verify default profile was created
      const profile = Array.from(testDb.profiles.values()).find(
        p => p.user_id === res.body.user.id
      );
      expect(profile).toBeDefined();
      expect(profile?.display_name).toBe('NewCreator');
      expect(profile?.is_public).toBe(true);

      // Verify default QR settings were created with Level H
      const qrSetting = Array.from(testDb.qrSettings.values()).find(
        q => q.user_id === res.body.user.id
      );
      expect(qrSetting).toBeDefined();
      expect(qrSetting?.error_correction_level).toBe('H');
    });

    it('1.2 should reject signup when unexpected extra fields are provided (strictly 3 fields)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'Hacker',
          email: 'hacker@example.com',
          password: 'Password123!',
          role: 'admin', // Unexpected extra field
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('strictly username, email, and password');
    });

    it('1.3 should enforce case-insensitive username uniqueness returning 409', async () => {
      // 'standarduser' already seeded in lowercase
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'StandardUser', // Different case
          email: 'different@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.field).toBe('username');
      expect(res.body.error).toContain('Username is already taken');
    });

    it('1.4 should enforce case-insensitive email uniqueness returning 409', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'BrandNewName',
          email: 'STANDARD@EXAMPLE.COM', // Uppercase existing email
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.field).toBe('email');
      expect(res.body.error).toContain('Email is already registered');
    });

    it('1.5 should reject reserved usernames (admin, login, signup, api, assets, dashboard)', async () => {
      const reservedNames = ['admin', 'login', 'signup', 'dashboard', 'api', 'assets'];

      for (const name of reservedNames) {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            username: name,
            email: `${name}@test.com`,
            password: 'Password123!',
          });

        expect(res.status).toBe(400);
        expect(res.body.field).toBe('username');
        expect(res.body.error).toContain('reserved');
      }
    });
  });

  // ==========================================================================
  // Feature Area 2: Authentication Lifecycle & Protection
  // ==========================================================================
  describe('2. Authentication Lifecycle & Protection', () => {
    it('2.1 should authenticate with valid credentials and issue session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'standard@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('StandardUser');
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('linkpulse_session='))).toBe(true);
    });

    it('2.2 should reject invalid password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'standard@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid email/username or password');
    });

    it('2.3 should reject non-existent user with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'ghost@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
    });

    it('2.4 should reject unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authentication required');
    });

    it('2.5 should successfully log out and invalidate the session', async () => {
      const sessionId = createTestSession('usr_standard_1');

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`linkpulse_session=${sessionId}`]);

      expect(logoutRes.status).toBe(200);

      // Subsequent call with same session cookie must fail with 401
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`linkpulse_session=${sessionId}`]);

      expect(meRes.status).toBe(401);
    });
  });

  // ==========================================================================
  // Feature Area 3: Public Profile Engine (GET /api/public/:username)
  // ==========================================================================
  describe('3. Public Profile Engine', () => {
    it('3.1 should resolve dynamic public profile without visitor login', async () => {
      const res = await request(app).get('/api/public/StandardUser');

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('StandardUser');
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.display_name).toBe('Standard Creator');
      expect(Array.isArray(res.body.links)).toBe(true);
    });

    it('3.2 should return 404 for non-existent username', async () => {
      const res = await request(app).get('/api/public/nonexistent_user_999');
      expect(res.status).toBe(404);
    });

    it('3.3 should return 404 when profile visibility is disabled (is_public = false)', async () => {
      // Find standard profile and set is_public to false
      const profile = testDb.profiles.get('prof_standard_1');
      if (profile) profile.is_public = false;

      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('private or unavailable');
    });

    it('3.4 should return 404 for reserved routes matching username parameter', async () => {
      const res = await request(app).get('/api/public/admin');
      expect(res.status).toBe(404);
    });

    it('3.5 should deliver social links and theme settings in profile response', async () => {
      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(200);
      expect(res.body.profile.theme_settings.preset).toBe('default');
      expect(res.body.profile.social_links).toHaveLength(2);
      expect(res.body.profile.social_links[0].platform).toBe('twitter');
    });
  });

  // ==========================================================================
  // Feature Area 4: Link CRUD & Organization
  // ==========================================================================
  describe('4. Link Management CRUD & Organization', () => {
    let sessionCookie: string;

    beforeEach(() => {
      const sessionId = createTestSession('usr_standard_1');
      sessionCookie = `linkpulse_session=${sessionId}`;
    });

    it('4.1 should allow authenticated user to create a new link with auto position', async () => {
      const res = await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'My Portfolio',
          destination_url: 'https://standardcreator.dev',
          description: 'Check out my latest work',
        });

      expect(res.status).toBe(201);
      expect(res.body.link.title).toBe('My Portfolio');
      expect(res.body.link.destination_url).toBe('https://standardcreator.dev');
      expect(res.body.link.position).toBe(0);
      expect(res.body.link.is_active).toBe(true);
    });

    it('4.2 should list user links ordered by pinned status and position', async () => {
      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Link 1', destination_url: 'https://example.com/1' });

      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Link 2', destination_url: 'https://example.com/2', is_pinned: true });

      const res = await request(app)
        .get('/api/links')
        .set('Cookie', [sessionCookie]);

      expect(res.status).toBe(200);
      expect(res.body.links).toHaveLength(2);
      // Pinned link should be first
      expect(res.body.links[0].title).toBe('Link 2');
      expect(res.body.links[0].is_pinned).toBe(true);
    });

    it('4.3 should update an existing link properties', async () => {
      const createRes = await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Initial Title', destination_url: 'https://initial.com' });

      const linkId = createRes.body.link.id;

      const updateRes = await request(app)
        .put(`/api/links/${linkId}`)
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Updated Title',
          destination_url: 'https://updated.com',
          is_hidden: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.link.title).toBe('Updated Title');
      expect(updateRes.body.link.is_hidden).toBe(true);
    });

    it('4.4 should delete an existing link', async () => {
      const createRes = await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'To Delete', destination_url: 'https://delete-me.com' });

      const linkId = createRes.body.link.id;

      const deleteRes = await request(app)
        .delete(`/api/links/${linkId}`)
        .set('Cookie', [sessionCookie]);

      expect(deleteRes.status).toBe(200);
      expect(testDb.links.has(linkId)).toBe(false);
    });

    it('4.5 should reorder links via batch reorder endpoint', async () => {
      const l1 = (await request(app).post('/api/links').set('Cookie', [sessionCookie]).send({ title: 'A', destination_url: 'https://a.com' })).body.link;
      const l2 = (await request(app).post('/api/links').set('Cookie', [sessionCookie]).send({ title: 'B', destination_url: 'https://b.com' })).body.link;

      const reorderRes = await request(app)
        .put('/api/links/reorder')
        .set('Cookie', [sessionCookie])
        .send({ linkIds: [l2.id, l1.id] });

      expect(reorderRes.status).toBe(200);
      expect(testDb.links.get(l2.id)?.position).toBe(0);
      expect(testDb.links.get(l1.id)?.position).toBe(1);
    });

    it('4.6 should enforce tenant isolation: User A cannot modify or delete User B links', async () => {
      // User 2 has seeded link 'link_other_1'
      const updateRes = await request(app)
        .put('/api/links/link_other_1')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Hacked Title' });

      expect(updateRes.status).toBe(403);
      expect(updateRes.body.error).toContain('Not authorized');

      const deleteRes = await request(app)
        .delete('/api/links/link_other_1')
        .set('Cookie', [sessionCookie]);

      expect(deleteRes.status).toBe(403);
    });
  });

  // ==========================================================================
  // Feature Area 5: Link Scheduling & Visibility
  // ==========================================================================
  describe('5. Link Scheduling & Visibility', () => {
    let sessionCookie: string;

    beforeEach(() => {
      const sessionId = createTestSession('usr_standard_1');
      sessionCookie = `linkpulse_session=${sessionId}`;
    });

    it('5.1 should show active, unscheduled links on public profile', async () => {
      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Always Active', destination_url: 'https://always.com', is_active: true });

      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(200);
      const found = res.body.links.find((l: any) => l.title === 'Always Active');
      expect(found).toBeDefined();
    });

    it('5.2 should NOT show link scheduled for future start date', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day
      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Future Release',
          destination_url: 'https://future.com',
          scheduled_start: futureDate.toISOString(),
        });

      const res = await request(app).get('/api/public/StandardUser');
      const found = res.body.links.find((l: any) => l.title === 'Future Release');
      expect(found).toBeUndefined();
    });

    it('5.3 should NOT show link whose scheduled end date has passed', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // -1 day
      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Expired Promo',
          destination_url: 'https://expired.com',
          scheduled_end: pastDate.toISOString(),
        });

      const res = await request(app).get('/api/public/StandardUser');
      const found = res.body.links.find((l: any) => l.title === 'Expired Promo');
      expect(found).toBeUndefined();
    });

    it('5.4 should show link when current time is within scheduled window', async () => {
      const startDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hr ago
      const endDate = new Date(Date.now() + 1000 * 60 * 60);   // 1 hr from now
      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Active Promo Now',
          destination_url: 'https://now.com',
          scheduled_start: startDate.toISOString(),
          scheduled_end: endDate.toISOString(),
        });

      const res = await request(app).get('/api/public/StandardUser');
      const found = res.body.links.find((l: any) => l.title === 'Active Promo Now');
      expect(found).toBeDefined();
    });

    it('5.5 should hide link when is_hidden toggle is true even if active', async () => {
      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Hidden Item',
          destination_url: 'https://hidden.com',
          is_active: true,
          is_hidden: true,
        });

      const res = await request(app).get('/api/public/StandardUser');
      const found = res.body.links.find((l: any) => l.title === 'Hidden Item');
      expect(found).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature Area 6: QR Studio & Programmatic jsQR Decode
  // ==========================================================================
  describe('6. QR Studio & Programmatic jsQR Decode', () => {
    let sessionCookie: string;

    beforeEach(() => {
      const sessionId = createTestSession('usr_standard_1');
      sessionCookie = `linkpulse_session=${sessionId}`;
    });

    it('6.1 should generate QR metadata encoding exact user profile URL', async () => {
      const res = await request(app)
        .post('/api/qr/generate')
        .set('Cookie', [sessionCookie]);

      expect(res.status).toBe(200);
      expect(res.body.url).toContain('/StandardUser');
      expect(res.body.error_correction_level).toBe('H');
      expect(res.body.module_count).toBeGreaterThan(20);
    });

    it('6.2 should programmatically decode generated QR bitmap using jsQR oracle', async () => {
      const targetUrl = 'http://localhost:3000/StandardUser';
      const verification = await verifyQrCode(targetUrl, { errorCorrectionLevel: 'H' });

      expect(verification.scannable).toBe(true);
      expect(verification.decodedUrl).toBe(targetUrl);
      expect(verification.errorCorrectionLevel).toBe('H');
    });

    it('6.3 should retrieve user QR settings', async () => {
      const res = await request(app)
        .get('/api/qr-settings')
        .set('Cookie', [sessionCookie]);

      expect(res.status).toBe(200);
      expect(res.body.qr_settings.foreground_color).toBe('#000000');
      expect(res.body.qr_settings.error_correction_level).toBe('H');
    });

    it('6.4 should update QR customization parameters (colors, dot styles, preset)', async () => {
      const res = await request(app)
        .put('/api/qr-settings')
        .set('Cookie', [sessionCookie])
        .send({
          foreground_color: '#06B6D4',
          background_color: '#0B0F19',
          dot_style: 'rounded',
          corner_style: 'rounded',
          preset_name: 'Midnight',
        });

      expect(res.status).toBe(200);
      expect(res.body.qr_settings.foreground_color).toBe('#06B6D4');
      expect(res.body.qr_settings.preset_name).toBe('Midnight');
      expect(res.body.qr_settings.dot_style).toBe('rounded');
    });

    it('6.5 should ensure QR scannability survives URL with UTM campaign parameters', async () => {
      const campaignUrl = 'http://localhost:3000/StandardUser?ref=qr&utm_source=flyer';
      const verification = await verifyQrCode(campaignUrl, { errorCorrectionLevel: 'H' });

      expect(verification.scannable).toBe(true);
      expect(verification.decodedUrl).toBe(campaignUrl);
    });
  });

  // ==========================================================================
  // Feature Area 7: Privacy Analytics & Tracked Redirect
  // ==========================================================================
  describe('7. Privacy Analytics & Tracked Redirect', () => {
    let sessionCookie: string;

    beforeEach(() => {
      const sessionId = createTestSession('usr_standard_1');
      sessionCookie = `linkpulse_session=${sessionId}`;
    });

    it('7.1 should record profile_view analytics event without raw IP storage', async () => {
      await request(app)
        .get('/api/public/StandardUser')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

      expect(testDb.analyticsEvents).toHaveLength(1);
      const event = testDb.analyticsEvents[0];
      expect(event.event_type).toBe('profile_view');
      expect(event.visitor_hash).toBeDefined();
      expect(event.visitor_hash).toHaveLength(64); // SHA-256 hash
      // Assert no raw IP is saved on event object
      expect((event as any).ip).toBeUndefined();
    });

    it('7.2 should increment click_count and issue 302 redirect at /r/:linkId', async () => {
      const createRes = await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Click Me', destination_url: 'https://dest.example.com' });

      const linkId = createRes.body.link.id;

      const redirectRes = await request(app).get(`/r/${linkId}`);
      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe('https://dest.example.com');

      // Verify click count incremented
      const updatedLink = testDb.links.get(linkId);
      expect(updatedLink?.click_count).toBe(1);
    });

    it('7.3 should record link_click analytics event on redirect', async () => {
      const createRes = await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Track Me', destination_url: 'https://track.example.com' });

      const linkId = createRes.body.link.id;

      await request(app)
        .get(`/r/${linkId}`)
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');

      const clickEvent = testDb.analyticsEvents.find(e => e.link_id === linkId);
      expect(clickEvent).toBeDefined();
      expect(clickEvent?.event_type).toBe('link_click');
      expect(clickEvent?.device_category).toBe('mobile');
    });

    it('7.4 should append configured UTM parameters to redirect destination URL', async () => {
      const createRes = await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'UTM Link',
          destination_url: 'https://store.example.com/item',
          utm_params: {
            utm_source: 'linkpulse',
            utm_medium: 'bio',
            utm_campaign: 'spring_sale',
          },
        });

      const linkId = createRes.body.link.id;

      const redirectRes = await request(app).get(`/r/${linkId}`);
      expect(redirectRes.status).toBe(302);
      const redirectedUrl = new URL(redirectRes.headers.location);
      expect(redirectedUrl.searchParams.get('utm_source')).toBe('linkpulse');
      expect(redirectedUrl.searchParams.get('utm_medium')).toBe('bio');
      expect(redirectedUrl.searchParams.get('utm_campaign')).toBe('spring_sale');
    });

    it('7.5 should provide aggregated summary in analytics dashboard endpoint', async () => {
      // Create link and generate 1 view and 2 clicks
      const link = (await request(app).post('/api/links').set('Cookie', [sessionCookie]).send({ title: 'Stats', destination_url: 'https://stats.com' })).body.link;

      await request(app).get('/api/public/StandardUser').set('User-Agent', 'Mozilla/5.0');
      await request(app).get(`/r/${link.id}`).set('User-Agent', 'Mozilla/5.0');
      await request(app).get(`/r/${link.id}`).set('User-Agent', 'Mozilla/5.0');

      const statsRes = await request(app)
        .get('/api/analytics')
        .set('Cookie', [sessionCookie]);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.summary.total_views).toBe(1);
      expect(statsRes.body.summary.total_clicks).toBe(2);
      expect(statsRes.body.summary.ctr).toBe(200);
    });
  });

  // ==========================================================================
  // Feature Area 8: Admin Dashboard & Protection
  // ==========================================================================
  describe('8. Admin Dashboard & Protection', () => {
    let standardCookie: string;
    let adminCookie: string;

    beforeEach(() => {
      const standardSess = createTestSession('usr_standard_1');
      standardCookie = `linkpulse_session=${standardSess}`;

      const adminSess = createTestSession('usr_admin_1');
      adminCookie = `linkpulse_session=${adminSess}`;
    });

    it('8.1 should reject unauthenticated requests to /api/admin/users with 401', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('8.2 should return 403 Forbidden when standard user requests /api/admin/users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [standardCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Administrator access required');
    });

    it('8.3 should allow admin user to list and search users', async () => {
      const res = await request(app)
        .get('/api/admin/users?q=Standard')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.some((u: any) => u.username === 'StandardUser')).toBe(true);
    });

    it('8.4 should allow admin to suspend user, immediately revoking active sessions', async () => {
      const suspendRes = await request(app)
        .post('/api/admin/users/usr_standard_1/suspend')
        .set('Cookie', [adminCookie])
        .send({ reason: 'Spam violation' });

      expect(suspendRes.status).toBe(200);

      // Verify standard user session is now rejected with 401
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [standardCookie]);

      expect(meRes.status).toBe(401);

      // Verify suspended public profile now returns 404
      const profileRes = await request(app).get('/api/public/StandardUser');
      expect(profileRes.status).toBe(404);
    });

    it('8.5 should allow admin to delete abusive link and log in audit table', async () => {
      const link = (await request(app).post('/api/links').set('Cookie', [standardCookie]).send({ title: 'Abusive', destination_url: 'https://bad.com' })).body.link;

      const deleteRes = await request(app)
        .delete(`/api/admin/links/${link.id}`)
        .set('Cookie', [adminCookie]);

      expect(deleteRes.status).toBe(200);
      expect(testDb.links.has(link.id)).toBe(false);

      // Verify audit log entry
      const auditRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', [adminCookie]);

      expect(auditRes.status).toBe(200);
      const log = auditRes.body.audit_logs.find((l: any) => l.action === 'link_delete');
      expect(log).toBeDefined();
      expect(log.target_id).toBe(link.id);
    });
  });
});
