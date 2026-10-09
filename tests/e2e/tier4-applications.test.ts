import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  getTestApp,
  resetTestDb,
  createTestSession,
  testDb,
} from '../setup.js';

describe('Tier 4: Real-World Scenarios (End-to-End Persona Applications)', () => {
  let app: any;

  beforeEach(() => {
    resetTestDb();
    app = getTestApp();
  });

  // ==========================================================================
  // Scenario 1: Influencer Profile Launch & Scheduled Timed Product Drop
  // ==========================================================================
  describe('Scenario 1: Influencer Product Launch Drop Lifecycle', () => {
    it('should manage timed link visibility across pre-launch, live drop, and post-expiration phases', async () => {
      // Step 1: Influencer signs up
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'SarahStyle',
          email: 'sarah@style.com',
          password: 'Password123!',
        });
      expect(signupRes.status).toBe(201);
      const cookies = signupRes.headers['set-cookie'];
      const sessionCookie = cookies.find((c: string) => c.startsWith('linkpulse_session='));

      // Step 2: Add standard perennial links (Podcast, Instagram)
      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Weekly Style Podcast', destination_url: 'https://podcast.sarahstyle.com' });

      await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({ title: 'Follow on Instagram', destination_url: 'https://instagram.com/sarahstyle' });

      // Step 3: Add timed limited drop link (Flash sale: window defined)
      const now = Date.now();
      const dropStartTime = new Date(now + 2000); // starts in 2 seconds
      const dropEndTime = new Date(now + 5000);   // ends in 5 seconds

      const dropLinkRes = await request(app)
        .post('/api/links')
        .set('Cookie', [sessionCookie])
        .send({
          title: '⚡ Limited Edition Capsule Collection Drop',
          destination_url: 'https://shop.sarahstyle.com/capsule',
          scheduled_start: dropStartTime.toISOString(),
          scheduled_end: dropEndTime.toISOString(),
          is_featured: true,
        });

      expect(dropLinkRes.status).toBe(201);
      const dropLinkId = dropLinkRes.body.link.id;

      // Phase 1 (Pre-Launch): Public profile should NOT show the capsule drop link
      const preLaunchRes = await request(app).get('/api/public/SarahStyle');
      expect(preLaunchRes.status).toBe(200);
      const preLaunchTitles = preLaunchRes.body.links.map((l: any) => l.title);
      expect(preLaunchTitles).toContain('Weekly Style Podcast');
      expect(preLaunchTitles).not.toContain('⚡ Limited Edition Capsule Collection Drop');

      // Phase 2 (Live Drop): Simulate current time entering the drop window
      const dropLink = testDb.links.get(dropLinkId);
      expect(dropLink).toBeDefined();
      if (dropLink) {
        dropLink.scheduled_start = new Date(Date.now() - 1000); // 1s in past
        dropLink.scheduled_end = new Date(Date.now() + 60000);  // 1m in future
      }

      const liveDropRes = await request(app).get('/api/public/SarahStyle');
      expect(liveDropRes.status).toBe(200);
      const liveDropTitles = liveDropRes.body.links.map((l: any) => l.title);
      expect(liveDropTitles).toContain('⚡ Limited Edition Capsule Collection Drop');

      // Verify click tracking during drop
      const clickRes = await request(app).get(`/r/${dropLinkId}`);
      expect(clickRes.status).toBe(302);
      expect(testDb.links.get(dropLinkId)?.click_count).toBe(1);

      // Phase 3 (Post-Expiration): Sale window closed
      if (dropLink) {
        dropLink.scheduled_start = new Date(Date.now() - 60000); // 1m in past
        dropLink.scheduled_end = new Date(Date.now() - 1000);   // 1s in past (expired)
      }

      const postDropRes = await request(app).get('/api/public/SarahStyle');
      expect(postDropRes.status).toBe(200);
      const postDropTitles = postDropRes.body.links.map((l: any) => l.title);
      expect(postDropTitles).not.toContain('⚡ Limited Edition Capsule Collection Drop');
      expect(postDropTitles).toContain('Weekly Style Podcast');
    });
  });

  // ==========================================================================
  // Scenario 2: Admin Moderation Triage, Abusive Link Removal & Session Revocation
  // ==========================================================================
  describe('Scenario 2: Admin Moderation & Threat Neutralization', () => {
    it('should complete moderation triage: find malicious user, remove abusive links, suspend account, and invalidate active sessions', async () => {
      // 1. Spammer registers an account
      const spammerSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'PhishingScammer',
          email: 'phish@scam.org',
          password: 'Password123!',
        });

      expect(spammerSignup.status).toBe(201);
      const spammerId = spammerSignup.body.user.id;
      const spammerCookies = spammerSignup.headers['set-cookie'];
      const spammerSession = spammerCookies.find((c: string) => c.startsWith('linkpulse_session='));

      // 2. Spammer creates malicious phishing link
      const badLinkRes = await request(app)
        .post('/api/links')
        .set('Cookie', [spammerSession])
        .send({
          title: 'Free Crypto Giveaway - Claim Now',
          destination_url: 'https://scam-crypto-wallet.com/login',
        });
      expect(badLinkRes.status).toBe(201);
      const badLinkId = badLinkRes.body.link.id;

      // 3. Admin logs in
      const adminSess = createTestSession('usr_admin_1');
      const adminCookie = `linkpulse_session=${adminSess}`;

      // 4. Admin searches for reported username
      const searchRes = await request(app)
        .get('/api/admin/users?q=Phishing')
        .set('Cookie', [adminCookie]);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.users.some((u: any) => u.id === spammerId)).toBe(true);

      // 5. Admin deletes the abusive link
      const deleteLinkRes = await request(app)
        .delete(`/api/admin/links/${badLinkId}`)
        .set('Cookie', [adminCookie]);
      expect(deleteLinkRes.status).toBe(200);
      expect(testDb.links.has(badLinkId)).toBe(false);

      // 6. Admin suspends the malicious user account
      const suspendRes = await request(app)
        .post(`/api/admin/users/${spammerId}/suspend`)
        .set('Cookie', [adminCookie])
        .send({ reason: 'Malicious phishing operation' });
      expect(suspendRes.status).toBe(200);

      // 7. Verify Spammer is blocked from authenticated requests
      const spammerMeRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [spammerSession]);
      // Should be 401 because sessions were deleted during suspension
      expect(spammerMeRes.status).toBe(401);

      // 8. Verify public profile is now 404
      const publicRes = await request(app).get('/api/public/PhishingScammer');
      expect(publicRes.status).toBe(404);

      // 9. Verify admin audit log records all actions
      const auditRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', [adminCookie]);
      expect(auditRes.status).toBe(200);

      const logs = auditRes.body.audit_logs;
      const linkDeleteLog = logs.find((l: any) => l.action === 'link_delete' && l.target_id === badLinkId);
      const userSuspendLog = logs.find((l: any) => l.action === 'user_suspend' && l.target_id === spammerId);

      expect(linkDeleteLog).toBeDefined();
      expect(userSuspendLog).toBeDefined();
      expect(userSuspendLog.details.reason).toBe('Malicious phishing operation');
    });
  });
});
