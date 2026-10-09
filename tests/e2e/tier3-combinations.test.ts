import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  getTestApp,
  resetTestDb,
  verifyQrCode,
  testDb,
} from '../setup.js';

describe('Tier 3: Cross-Feature State Transitions & Integrated Lifecycles', () => {
  let app: any;

  beforeEach(() => {
    resetTestDb();
    app = getTestApp();
  });

  it('3.1 Complete End-to-End Creator Onboarding to QR Scan and Analytics Lifecycle', async () => {
    // ------------------------------------------------------------------------
    // Step 1: User Signup (Strictly 3 fields)
    // ------------------------------------------------------------------------
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'CreatorPro',
        email: 'creator@pro.com',
        password: 'Password123!',
      });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.user.username).toBe('CreatorPro');
    const cookies = signupRes.headers['set-cookie'];
    const sessionCookie = cookies.find((c: string) => c.startsWith('linkpulse_session='));
    expect(sessionCookie).toBeDefined();

    // ------------------------------------------------------------------------
    // Step 2: Customize Profile Appearance & Themes
    // ------------------------------------------------------------------------
    const themePayload = {
      display_name: 'Creator Pro Official',
      bio: 'Electronic Music Producer & Visual Artist',
      theme_settings: {
        preset: 'glassmorphism',
        background_type: 'gradient',
        background_value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        card_style: 'glass',
        button_shape: 'rounded-xl',
        button_variant: 'glassmorphic',
        button_color: 'rgba(255, 255, 255, 0.2)',
        font_family: 'Plus Jakarta Sans',
      },
      social_links: [
        { platform: 'youtube', url: 'https://youtube.com/@creatorpro' },
        { platform: 'spotify', url: 'https://spotify.com/artist/creatorpro' },
      ],
    };

    const updateProfileRes = await request(app)
      .put('/api/profile')
      .set('Cookie', [sessionCookie])
      .send(themePayload);

    expect(updateProfileRes.status).toBe(200);
    expect(updateProfileRes.body.profile.theme_settings.preset).toBe('glassmorphism');

    // ------------------------------------------------------------------------
    // Step 3: Create Links (Regular, UTM-tracked, Pinned, and Future-Scheduled)
    // ------------------------------------------------------------------------
    // Link 1: YouTube Channel
    const l1Res = await request(app)
      .post('/api/links')
      .set('Cookie', [sessionCookie])
      .send({
        title: 'Watch New Music Video',
        destination_url: 'https://youtube.com/watch?v=12345',
        icon: 'video',
      });
    expect(l1Res.status).toBe(201);
    const link1 = l1Res.body.link;

    // Link 2: Merch Store with UTM Parameters
    const l2Res = await request(app)
      .post('/api/links')
      .set('Cookie', [sessionCookie])
      .send({
        title: 'Official Merch Store',
        destination_url: 'https://store.creatorpro.com/hoodies',
        utm_params: {
          utm_source: 'linkpulse',
          utm_medium: 'bio_link',
          utm_campaign: 'tour_2026',
        },
      });
    expect(l2Res.status).toBe(201);
    const link2 = l2Res.body.link;

    // Link 3: Pinned Highlight Single
    const l3Res = await request(app)
      .post('/api/links')
      .set('Cookie', [sessionCookie])
      .send({
        title: 'Stream Latest Single',
        destination_url: 'https://spotify.com/track/latest',
        is_pinned: true,
      });
    expect(l3Res.status).toBe(201);
    const link3 = l3Res.body.link;

    // Link 4: Future Secret Drop (Scheduled for tomorrow)
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const l4Res = await request(app)
      .post('/api/links')
      .set('Cookie', [sessionCookie])
      .send({
        title: 'VIP Tour Tickets Drop',
        destination_url: 'https://tickets.creatorpro.com/vip',
        scheduled_start: futureDate.toISOString(),
      });
    expect(l4Res.status).toBe(201);
    const link4 = l4Res.body.link;

    // ------------------------------------------------------------------------
    // Step 4: Reorder Links
    // ------------------------------------------------------------------------
    const reorderRes = await request(app)
      .put('/api/links/reorder')
      .set('Cookie', [sessionCookie])
      .send({ linkIds: [link2.id, link1.id, link4.id, link3.id] });
    expect(reorderRes.status).toBe(200);

    // ------------------------------------------------------------------------
    // Step 5: Customize QR Code Settings
    // ------------------------------------------------------------------------
    const qrUpdateRes = await request(app)
      .put('/api/qr-settings')
      .set('Cookie', [sessionCookie])
      .send({
        foreground_color: '#059669',
        background_color: '#F0FDF4',
        preset_name: 'Emerald',
        dot_style: 'dots',
        corner_style: 'circle',
        error_correction_level: 'H',
      });
    expect(qrUpdateRes.status).toBe(200);
    expect(qrUpdateRes.body.qr_settings.preset_name).toBe('Emerald');

    // ------------------------------------------------------------------------
    // Step 6: Generate QR Code
    // ------------------------------------------------------------------------
    const qrGenRes = await request(app)
      .post('/api/qr/generate')
      .set('Cookie', [sessionCookie]);
    expect(qrGenRes.status).toBe(200);
    const qrUrl = qrGenRes.body.url;
    expect(qrUrl).toBe('http://localhost:3000/CreatorPro');

    // ------------------------------------------------------------------------
    // Step 7: Programmatic Scan & Decode Validation via jsQR Oracle
    // ------------------------------------------------------------------------
    const qrScan = await verifyQrCode(qrUrl, { errorCorrectionLevel: 'H' });
    expect(qrScan.scannable).toBe(true);
    expect(qrScan.decodedUrl).toBe(qrUrl);

    // ------------------------------------------------------------------------
    // Step 8: Visit Public Profile using the Decoded QR URL
    // ------------------------------------------------------------------------
    const profileRes = await request(app)
      .get('/api/public/CreatorPro?ref=qr')
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)');

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.profile.display_name).toBe('Creator Pro Official');
    expect(profileRes.body.profile.theme_settings.preset).toBe('glassmorphism');

    // Assert link visibility rules:
    // - Pinned link (link3) should be first
    // - link2 and link1 should be visible
    // - Future scheduled link (link4) must NOT be visible
    const visibleTitles = profileRes.body.links.map((l: any) => l.title);
    expect(visibleTitles[0]).toBe('Stream Latest Single'); // Pinned link
    expect(visibleTitles).toContain('Official Merch Store');
    expect(visibleTitles).toContain('Watch New Music Video');
    expect(visibleTitles).not.toContain('VIP Tour Tickets Drop'); // Future scheduled excluded

    // ------------------------------------------------------------------------
    // Step 9: Click Tracked Link Redirection (/r/:linkId) with UTM Verification
    // ------------------------------------------------------------------------
    const clickRes = await request(app)
      .get(`/r/${link2.id}?ref=qr`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)');

    expect(clickRes.status).toBe(302);
    const redirectUrl = new URL(clickRes.headers.location);
    expect(redirectUrl.origin).toBe('https://store.creatorpro.com');
    expect(redirectUrl.pathname).toBe('/hoodies');
    // Verify UTM tags propagated
    expect(redirectUrl.searchParams.get('utm_source')).toBe('linkpulse');
    expect(redirectUrl.searchParams.get('utm_medium')).toBe('bio_link');
    expect(redirectUrl.searchParams.get('utm_campaign')).toBe('tour_2026');

    // ------------------------------------------------------------------------
    // Step 10: Verify Analytics Aggregation
    // ------------------------------------------------------------------------
    const analyticsRes = await request(app)
      .get('/api/analytics')
      .set('Cookie', [sessionCookie]);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.summary.total_views).toBe(1); // 1 profile view from step 8
    expect(analyticsRes.body.summary.total_clicks).toBe(1); // 1 link click from step 9
    expect(analyticsRes.body.summary.ctr).toBe(100);

    // Verify analytics events stored without raw IPs
    const events = testDb.analyticsEvents;
    expect(events).toHaveLength(2);
    expect(events.find(e => e.event_type === 'profile_view')?.referrer_category).toBe('qr_campaign');
    expect(events.find(e => e.event_type === 'link_click')?.device_category).toBe('mobile');
    events.forEach(e => {
      expect(e.visitor_hash).toBeDefined();
      expect((e as any).ip).toBeUndefined();
    });
  });
});
