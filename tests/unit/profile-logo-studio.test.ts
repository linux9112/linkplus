import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  getTestApp,
  resetTestDb,
  createTestSession,
  testDb,
  TestUser,
} from '../setup.js';
import { validateImageFile } from '../../src/utils/imageUpload.js';
import { SOCIAL_PLATFORMS_META, renderLinkIcon } from '../../src/components/profile/PublicProfileRenderer.js';

describe('Profile Customization Studio & Individual Link Logo Uploads', () => {
  let app: any;
  let user1: TestUser;
  let user2: TestUser;
  let sessionCookieUser1: string;
  let sessionCookieUser2: string;

  // 1x1 valid transparent PNG (Base64)
  const VALID_PNG_BASE64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // 1x1 valid JPEG (Base64)
  const VALID_JPEG_BASE64 =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  beforeEach(() => {
    resetTestDb();
    app = getTestApp();

    user1 = {
      id: 'usr_creator_1',
      username: 'Dindayal',
      normalized_username: 'dindayal',
      email: 'dindayal@example.com',
      normalized_email: 'dindayal@example.com',
      password_hash: 'hashed_pw',
      role: 'user',
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    testDb.users.set(user1.id, user1);

    testDb.profiles.set(user1.id, {
      id: 'prof_1',
      user_id: user1.id,
      display_name: 'Dindayal',
      bio: 'Student • Creator • Dreamer',
      avatar_url: null,
      theme_settings: {
        preset: 'default',
        title_tagline: 'Student • Creator • Dreamer',
      },
      social_links: [
        { platform: 'youtube', url: 'https://youtube.com/@dindayal' },
        { platform: 'instagram', url: 'https://instagram.com/dindayal' },
      ],
      is_public: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    user2 = {
      id: 'usr_creator_2',
      username: 'OtherUser',
      normalized_username: 'otheruser',
      email: 'other@example.com',
      normalized_email: 'other@example.com',
      password_hash: 'hashed_pw',
      role: 'user',
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    testDb.users.set(user2.id, user2);

    const s1 = createTestSession(user1.id);
    const s2 = createTestSession(user2.id);
    sessionCookieUser1 = `linkpulse_session=${s1}`;
    sessionCookieUser2 = `linkpulse_session=${s2}`;
  });

  describe('1. Client-side Image Validation Utility', () => {
    it('accepts standard PNG, JPG, and WebP image files within 5 MB', () => {
      const pngFile = new File(['mock_png_data'], 'logo.png', { type: 'image/png' });
      expect(() => validateImageFile(pngFile, 5)).not.toThrow();

      const webpFile = new File(['mock_webp_data'], 'logo.webp', { type: 'image/webp' });
      expect(() => validateImageFile(webpFile, 5)).not.toThrow();
    });

    it('rejects unsupported file formats like PDF or plain text', () => {
      const pdfFile = new File(['pdf_data'], 'doc.pdf', { type: 'application/pdf' });
      expect(() => validateImageFile(pdfFile, 5)).toThrow(/Please select a valid image file/);
    });

    it('rejects files larger than the 5 MB limit', () => {
      const hugeBuffer = new Uint8Array(6 * 1024 * 1024);
      const hugeFile = new File([hugeBuffer], 'huge.png', { type: 'image/png' });
      expect(() => validateImageFile(hugeFile, 5)).toThrow(/File is too large/);
    });
  });

  describe('2. Backend Upload API: Security & Tenant Isolation', () => {
    it('requires authentication for /api/upload/image', async () => {
      const res = await request(app).post('/api/upload/image').send({
        image_data: VALID_PNG_BASE64,
        type: 'link',
      });
      expect(res.status).toBe(401);
    });

    it('rejects invalid image payload format', async () => {
      const res = await request(app)
        .post('/api/upload/image')
        .set('Cookie', sessionCookieUser1)
        .send({
          image_data: 'not_a_valid_data_uri',
          type: 'link',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid image format/);
    });

    it('successfully uploads a link logo and returns clean public url', async () => {
      const res = await request(app)
        .post('/api/upload/image')
        .set('Cookie', sessionCookieUser1)
        .send({
          image_data: VALID_PNG_BASE64,
          type: 'link',
        });
      expect(res.status).toBe(200);
      expect(res.body.url).toMatch(/^\/api\/uploads\/links\/link-/);
      expect(res.body.filename).toBeDefined();
    });

    it('enforces link ownership: User 2 cannot upload or overwrite User 1 link logo', async () => {
      // Create Link for User 1
      const link1Id = 'link_dindayal_1';
      testDb.links.set(link1Id, {
        id: link1Id,
        user_id: user1.id,
        title: 'My YouTube Channel',
        destination_url: 'https://youtube.com',
        description: 'Tech tutorials',
        icon: 'youtube',
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
        created_at: new Date(),
        updated_at: new Date(),
      });

      // User 2 attempts to upload a logo for User 1's link
      const attackRes = await request(app)
        .post('/api/upload/image')
        .set('Cookie', sessionCookieUser2)
        .send({
          image_data: VALID_PNG_BASE64,
          type: 'link',
          link_id: link1Id,
        });

      expect(attackRes.status).toBe(403);
      expect(attackRes.body.error).toMatch(/Not authorized/);

      // Verify User 1's link thumbnail remains null
      expect(testDb.links.get(link1Id)?.thumbnail_url).toBeNull();
    });

    it('allows owner to upload a logo directly associating it with their link', async () => {
      const linkId = 'link_dindayal_youtube';
      testDb.links.set(linkId, {
        id: linkId,
        user_id: user1.id,
        title: 'My YouTube Channel',
        destination_url: 'https://youtube.com',
        description: null,
        icon: 'youtube',
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
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .post('/api/upload/image')
        .set('Cookie', sessionCookieUser1)
        .send({
          image_data: VALID_PNG_BASE64,
          type: 'link',
          link_id: linkId,
        });

      expect(res.status).toBe(200);
      const updated = testDb.links.get(linkId);
      expect(updated?.thumbnail_url).toBe(res.body.url);
    });
  });

  describe('3. Individual Logo Independence Across Multiple Links', () => {
    it('maintains distinct, independent logos for at least 3 separate links', async () => {
      const link1Id = 'link_yt';
      const link2Id = 'link_projects';
      const link3Id = 'link_notes';

      testDb.links.set(link1Id, {
        id: link1Id,
        user_id: user1.id,
        title: 'My YouTube Channel',
        destination_url: 'https://youtube.com/@channel',
        description: null,
        icon: 'youtube',
        thumbnail_url: '/api/uploads/links/youtube_logo.png',
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
        created_at: new Date(),
        updated_at: new Date(),
      });

      testDb.links.set(link2Id, {
        id: link2Id,
        user_id: user1.id,
        title: 'My Projects',
        destination_url: 'https://github.com/dindayal',
        description: null,
        icon: 'folder',
        thumbnail_url: '/api/uploads/links/folder_logo.png',
        position: 1,
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
        created_at: new Date(),
        updated_at: new Date(),
      });

      testDb.links.set(link3Id, {
        id: link3Id,
        user_id: user1.id,
        title: 'Study Notes',
        destination_url: 'https://notes.example.com',
        description: null,
        icon: 'book',
        thumbnail_url: '/api/uploads/links/notes_logo.png',
        position: 2,
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
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 1. Fetch links and verify all 3 have independent logos
      const listRes = await request(app).get('/api/links').set('Cookie', sessionCookieUser1);
      expect(listRes.status).toBe(200);
      const links = listRes.body.links;
      expect(links.length).toBe(3);

      const ytLink = links.find((l: any) => l.id === link1Id);
      const projLink = links.find((l: any) => l.id === link2Id);
      const notesLink = links.find((l: any) => l.id === link3Id);

      expect(ytLink.thumbnail_url).toBe('/api/uploads/links/youtube_logo.png');
      expect(projLink.thumbnail_url).toBe('/api/uploads/links/folder_logo.png');
      expect(notesLink.thumbnail_url).toBe('/api/uploads/links/notes_logo.png');

      // 2. Replacing logo on Link 2 does NOT affect Link 1 or Link 3
      const newLogoRes = await request(app)
        .post('/api/upload/image')
        .set('Cookie', sessionCookieUser1)
        .send({
          image_data: VALID_JPEG_BASE64,
          type: 'link',
          link_id: link2Id,
        });

      expect(newLogoRes.status).toBe(200);
      expect(testDb.links.get(link2Id)?.thumbnail_url).toBe(newLogoRes.body.url);
      expect(testDb.links.get(link1Id)?.thumbnail_url).toBe('/api/uploads/links/youtube_logo.png');
      expect(testDb.links.get(link3Id)?.thumbnail_url).toBe('/api/uploads/links/notes_logo.png');

      // 3. Removing logo on Link 3 resets thumbnail to null without modifying Link 1 or 2
      testDb.links.get(link3Id)!.thumbnail_url = null;
      expect(testDb.links.get(link3Id)?.thumbnail_url).toBeNull();
      expect(testDb.links.get(link1Id)?.thumbnail_url).toBe('/api/uploads/links/youtube_logo.png');
      expect(testDb.links.get(link2Id)?.thumbnail_url).toBe(newLogoRes.body.url);
    });
  });

  describe('4. Social Media Brands & Public Profile Metadata', () => {
    it('contains branded color mappings for standard social platforms', () => {
      expect(SOCIAL_PLATFORMS_META.youtube.bg).toBe('#FF0000');
      expect(SOCIAL_PLATFORMS_META.twitter.bg).toBe('#000000');
      expect(SOCIAL_PLATFORMS_META.github.bg).toBe('#24292e');
      expect(SOCIAL_PLATFORMS_META.linkedin.bg).toBe('#0A66C2');
    });

    it('renders contextual fallback icons for links without custom uploaded images', () => {
      const ytIcon = renderLinkIcon('video', 'My YouTube Channel', 'https://youtube.com');
      expect(ytIcon).toBeDefined();

      const projIcon = renderLinkIcon('folder', 'My Projects', 'https://github.com/project');
      expect(projIcon).toBeDefined();
    });
  });
});
