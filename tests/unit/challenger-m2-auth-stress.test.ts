import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import {
  getTestApp,
  resetTestDb,
  createTestSession,
  testDb,
  type TestUser,
} from '../setup.js';
import {
  isReservedUsername,
  validateUsername,
  RESERVED_USERNAMES,
} from '../../server/utils/reserved-usernames.js';
import { AuthError, sanitizeUser } from '../../server/services/auth.service.js';
import { createApp } from '../../server/app.js';

describe('CHALLENGER Suite: Milestone 2 Auth & Edge Cases Empirical Stress Testing', () => {
  let app: any;

  beforeEach(() => {
    resetTestDb();
    app = getTestApp();
  });

  // ==========================================================================
  // Dimension 1: Case-Insensitive Uniqueness Enforcement
  // ==========================================================================
  describe('1. Case-Insensitive Uniqueness Enforcement', () => {
    it('enforces case-insensitive username uniqueness (signup "TestUser" then attempt "testuser" -> 409)', async () => {
      // Step 1: Initial registration with mixed-case username "TestUser"
      const res1 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'TestUser',
          email: 'first_testuser@example.com',
          password: 'Password123!',
        });
      expect(res1.status).toBe(201);
      expect(res1.body.user).toBeDefined();
      expect(res1.body.user.username).toBe('TestUser');

      // Step 2: Attempt duplicate registration with lowercase "testuser" -> 409 Conflict
      const res2 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'second_testuser@example.com',
          password: 'Password123!',
        });
      expect(res2.status).toBe(409);
      expect(res2.body.field).toBe('username');
      expect(res2.body.error).toMatch(/Username is already taken/i);

      // Step 3: Attempt duplicate registration with uppercase "TESTUSER" -> 409 Conflict
      const res3 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'TESTUSER',
          email: 'third_testuser@example.com',
          password: 'Password123!',
        });
      expect(res3.status).toBe(409);
      expect(res3.body.field).toBe('username');
      expect(res3.body.error).toMatch(/Username is already taken/i);

      // Step 4: Attempt duplicate with alternating case "tEsTuSeR" -> 409 Conflict
      const res4 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'tEsTuSeR',
          email: 'fourth_testuser@example.com',
          password: 'Password123!',
        });
      expect(res4.status).toBe(409);
      expect(res4.body.field).toBe('username');
    });

    it('enforces case-insensitive email uniqueness (signup "Foo@Bar.com" then attempt "foo@bar.com" -> 409)', async () => {
      // Step 1: Initial registration with mixed-case email "Foo@Bar.com"
      const res1 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'UserFoo1',
          email: 'Foo@Bar.com',
          password: 'Password123!',
        });
      expect(res1.status).toBe(201);
      expect(res1.body.user.email).toBe('Foo@Bar.com');

      // Step 2: Attempt duplicate registration with lowercase email "foo@bar.com" -> 409 Conflict
      const res2 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'UserFoo2',
          email: 'foo@bar.com',
          password: 'Password123!',
        });
      expect(res2.status).toBe(409);
      expect(res2.body.field).toBe('email');
      expect(res2.body.error).toMatch(/Email is already registered/i);

      // Step 3: Attempt duplicate registration with uppercase email "FOO@BAR.COM" -> 409 Conflict
      const res3 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'UserFoo3',
          email: 'FOO@BAR.COM',
          password: 'Password123!',
        });
      expect(res3.status).toBe(409);
      expect(res3.body.field).toBe('email');
      expect(res3.body.error).toMatch(/Email is already registered/i);

      // Step 4: Attempt duplicate registration with mixed case "fOO@bAR.cOm" -> 409 Conflict
      const res4 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'UserFoo4',
          email: 'fOO@bAR.cOm',
          password: 'Password123!',
        });
      expect(res4.status).toBe(409);
      expect(res4.body.field).toBe('email');
    });

    it('rejects collision circumventing attempts via leading/trailing whitespace ("  StandardUser  " -> 409)', async () => {
      // 'StandardUser' is already seeded in setup.ts with normalized_username: 'standarduser'
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: '   StandardUser   ',
          email: 'standard_whitespace@example.com',
          password: 'Password123!',
        });
      expect(res.status).toBe(409);
      expect(res.body.field).toBe('username');
      expect(res.body.error).toMatch(/Username is already taken/i);
    });

    it('allows legitimate usernames that extend existing names without substring false positives', async () => {
      const res1 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'StandardUser_official',
          email: 'std_official@example.com',
          password: 'Password123!',
        });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'realStandardUser',
          email: 'real_std@example.com',
          password: 'Password123!',
        });
      expect(res2.status).toBe(201);
    });
  });

  // ==========================================================================
  // Dimension 2: Reserved Usernames Enforcement
  // ==========================================================================
  describe('2. Reserved Usernames Enforcement', () => {
    it('blocks mandated reserved usernames: "admin", "api", "dashboard", "settings", "signup", "login" -> 400', async () => {
      const mandatedReserved = ['admin', 'api', 'dashboard', 'settings', 'signup', 'login'];

      for (const name of mandatedReserved) {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            username: name,
            email: `${name}@platformtest.com`,
            password: 'Password123!',
          });

        expect(res.status, `Failed to reject reserved username: ${name}`).toBe(400);
        expect(res.body.field).toBe('username');
        expect(res.body.error).toMatch(/reserved/i);
      }
    });

    it('blocks mandated reserved usernames regardless of casing or whitespace padding', async () => {
      const casingVariations = [
        'ADMIN',
        'Admin',
        '  admin  ',
        'API',
        'Api',
        '  API  ',
        'DASHBOARD',
        'DashBoard',
        'SETTINGS',
        'Settings',
        'SIGNUP',
        'SignUp',
        'LOGIN',
        'LogIn',
      ];

      for (const name of casingVariations) {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            username: name,
            email: `res_${Math.random()}@platformtest.com`,
            password: 'Password123!',
          });

        expect(res.status, `Failed for ${name}`).toBe(400);
        expect(res.body.field).toBe('username');
        expect(res.body.error).toMatch(/reserved/i);
      }
    });

    it('blocks critical route keywords ("assets", "public", "r", "auth", "profile", "links", "qr", "analytics", "404")', async () => {
      const routeKeywords = ['assets', 'public', 'r', 'auth', 'profile', 'links', 'qr', 'analytics', '404'];

      for (const kw of routeKeywords) {
        // Assert set membership directly
        expect(isReservedUsername(kw), `Expected keyword ${kw} to be reserved`).toBe(true);

        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            username: kw,
            email: `kw_${kw}@platformtest.com`,
            password: 'Password123!',
          });

        expect(res.status).toBe(400);
        expect(res.body.field).toBe('username');
      }
    });

    it('permits valid usernames containing reserved words as substrings', async () => {
      const validSubstrings = ['admin_master', 'api_creator', 'dashboard_guru', 'settings_hub', 'login_bonus'];

      for (const validName of validSubstrings) {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            username: validName,
            email: `${validName}@validtest.com`,
            password: 'Password123!',
          });

        expect(res.status, `Failed to permit legitimate username: ${validName}`).toBe(201);
        expect(res.body.user.username).toBe(validName);
      }
    });
  });

  // ==========================================================================
  // Dimension 3: Unauthenticated Access Rejection
  // ==========================================================================
  describe('3. Unauthenticated Access Rejection', () => {
    it('rejects GET /api/auth/me without session cookie with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Authentication required/i);
    });

    it('rejects GET /api/auth/me with empty or whitespace session cookie with 401', async () => {
      const resEmpty = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['linkpulse_session=']);
      expect(resEmpty.status).toBe(401);

      const resSpace = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['linkpulse_session=    ']);
      expect(resSpace.status).toBe(401);
    });

    it('rejects GET /api/auth/me with invalid or fabricated session IDs with 401', async () => {
      const fakeSessionIds = [
        'linkpulse_session=sess_00000000000000000000000000000000',
        'linkpulse_session=invalid_token_xyz',
        'linkpulse_session=undefined',
        'linkpulse_session=null',
      ];

      for (const cookieHeader of fakeSessionIds) {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Cookie', [cookieHeader]);
        expect(res.status).toBe(401);
      }
    });

    it('rejects GET /api/auth/me with expired session token with 401', async () => {
      const expiredSessionId = 'sess_stress_expired_token';
      testDb.sessions.set(expiredSessionId, {
        id: expiredSessionId,
        user_id: 'usr_standard_1',
        data: null,
        expires_at: new Date(Date.now() - 60000), // 1 minute in the past
        created_at: new Date(Date.now() - 120000),
        updated_at: new Date(Date.now() - 120000),
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`linkpulse_session=${expiredSessionId}`]);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/expired or invalid/i);
    });

    it('rejects GET /api/auth/me when associated user record is missing with 401', async () => {
      const orphanSessionId = createTestSession('usr_standard_1');
      // Remove usr_standard_1 from database
      testDb.users.delete('usr_standard_1');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`linkpulse_session=${orphanSessionId}`]);

      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // Dimension 4: Invalid Credential Rejection
  // ==========================================================================
  describe('4. Invalid Credential Rejection', () => {
    it('rejects login with correct username but wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'StandardUser',
          password: 'CompletelyWrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid email\/username or password/i);
    });

    it('rejects login with correct email but wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'standard@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid email\/username or password/i);
    });

    it('rejects login with non-existent user identifier with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'ghost_user_does_not_exist@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid email\/username or password/i);
    });

    it('rejects login with empty or missing credentials with 400', async () => {
      const resEmpty = await request(app).post('/api/auth/login').send({});
      expect(resEmpty.status).toBe(400);

      const resNoPass = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'StandardUser' });
      expect(resNoPass.status).toBe(400);

      const resNoId = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Password123!' });
      expect(resNoId.status).toBe(400);
    });

    it('rejects SQL injection authentication bypass attempts safely with 401', async () => {
      const sqliPayloads = [
        "' OR '1'='1",
        "admin'--",
        "standard@example.com' OR 1=1 --",
        "'; DROP TABLE users; --",
      ];

      for (const payload of sqliPayloads) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            identifier: payload,
            password: 'AnyPassword!',
          });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Invalid email\/username or password/i);
      }
    });

    it('authenticates successfully with case-insensitive identifier and correct password', async () => {
      // 1. Lowercase identifier for StandardUser
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'standarduser',
          password: 'Password123!',
        });
      expect(res1.status).toBe(200);
      expect(res1.body.user.username).toBe('StandardUser');

      // 2. Uppercase identifier for standard@example.com
      const res2 = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'STANDARD@EXAMPLE.COM',
          password: 'Password123!',
        });
      expect(res2.status).toBe(200);
      expect(res2.body.user.username).toBe('StandardUser');
    });
  });

  // ==========================================================================
  // Dimension 5: Suspended Account Rejection
  // ==========================================================================
  describe('5. Suspended Account Rejection (status === "suspended" -> 403)', () => {
    it('rejects login attempt for suspended user with 403 Forbidden', async () => {
      // Seed a suspended user
      const suspendedUser: TestUser = {
        id: 'usr_suspended_challenger',
        username: 'SuspendedUserTest',
        normalized_username: 'suspendedusertest',
        email: 'suspended_challenger@example.com',
        normalized_email: 'suspended_challenger@example.com',
        password_hash: bcrypt.hashSync('Password123!', 8),
        role: 'user',
        status: 'suspended',
        email_verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      testDb.users.set(suspendedUser.id, suspendedUser);

      // Attempt login with valid password
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'SuspendedUserTest',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Account is suspended/i);
    });

    it('rejects GET /api/auth/me for suspended user with active session with 403', async () => {
      // Set StandardUser status to suspended
      const user = testDb.users.get('usr_standard_1');
      if (user) {
        user.status = 'suspended';
      }

      const sessionId = createTestSession('usr_standard_1');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`linkpulse_session=${sessionId}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Account is suspended/i);
    });

    it('revokes active sessions upon admin suspension and returns 401 on subsequent requests', async () => {
      const userSessionId = createTestSession('usr_standard_1');
      const adminSessionId = createTestSession('usr_admin_1');

      // Admin executes suspension
      const suspendRes = await request(app)
        .post('/api/admin/users/usr_standard_1/suspend')
        .set('Cookie', [`linkpulse_session=${adminSessionId}`])
        .send({ reason: 'Spam violation' });

      expect(suspendRes.status).toBe(200);

      // Confirm session token was evicted from active sessions
      expect(testDb.sessions.has(userSessionId)).toBe(false);

      // Subsequent request by user must return 401
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`linkpulse_session=${userSessionId}`]);

      expect(meRes.status).toBe(401);
    });
  });

  // ==========================================================================
  // Dimension 6: Strict 3-Field Registration & Boundary Conditions
  // ==========================================================================
  describe('6. Strictly 3-Field Registration & Boundaries', () => {
    it('rejects registration payloads containing extraneous fields (strictly 3 fields)', async () => {
      const injectionPayloads = [
        { role: 'admin' },
        { status: 'active' },
        { is_admin: true },
        { id: 'usr_injected_uuid' },
        { email_verified_at: new Date().toISOString() },
      ];

      for (const extra of injectionPayloads) {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            username: `Valid_${Math.floor(Math.random() * 10000)}`,
            email: `valid_${Math.floor(Math.random() * 10000)}@test.com`,
            password: 'Password123!',
            ...extra,
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/strictly username, email, and password/i);
      }
    });

    it('enforces password boundaries (<8 chars -> 400, 8-100 chars -> 201, >100 chars -> 400)', async () => {
      // 7 chars -> 400
      const res7 = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'BoundaryPass7', email: 'bp7@test.com', password: 'Pass12!' });
      expect(res7.status).toBe(400);
      expect(res7.body.field).toBe('password');

      // 8 chars -> 201
      const res8 = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'BoundaryPass8', email: 'bp8@test.com', password: 'Password' });
      expect(res8.status).toBe(201);

      // 100 chars -> 201
      const exact100 = 'P' + 'a'.repeat(98) + '1';
      const res100 = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'BoundaryPass100', email: 'bp100@test.com', password: exact100 });
      expect(res100.status).toBe(201);

      // 101 chars -> 400
      const over100 = 'P' + 'a'.repeat(99) + '1';
      const resOver = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'BoundaryPass101', email: 'bp101@test.com', password: over100 });
      expect(resOver.status).toBe(400);
      expect(resOver.body.field).toBe('password');
    });

    it('enforces username boundaries (2 chars -> 400, 3 chars -> 201, 30 chars -> 201, 31 chars -> 400)', async () => {
      // 2 chars -> 400
      const res2 = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'ab', email: 'ab@test.com', password: 'Password123!' });
      expect(res2.status).toBe(400);

      // 3 chars -> 201
      const res3 = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'abc', email: 'abc@test.com', password: 'Password123!' });
      expect(res3.status).toBe(201);

      // 30 chars -> 201
      const name30 = 'u' + 'a'.repeat(29);
      const res30 = await request(app)
        .post('/api/auth/signup')
        .send({ username: name30, email: 'name30@test.com', password: 'Password123!' });
      expect(res30.status).toBe(201);

      // 31 chars -> 400
      const name31 = 'u' + 'a'.repeat(30);
      const res31 = await request(app)
        .post('/api/auth/signup')
        .send({ username: name31, email: 'name31@test.com', password: 'Password123!' });
      expect(res31.status).toBe(400);
    });
  });

  // ==========================================================================
  // Dimension 7: Unit Level Method Contracts
  // ==========================================================================
  describe('7. Unit Helper Contracts (validateUsername, AuthError, sanitizeUser)', () => {
    it('validateUsername validates types, lengths, special characters, and reserved names', () => {
      expect(validateUsername(null)).toEqual({ valid: false, error: 'Username is required' });
      expect(validateUsername('   ')).toEqual({ valid: false, error: 'Username is required' });
      expect(validateUsername('ab')).toEqual({ valid: false, error: 'Username must be between 3 and 30 characters' });
      expect(validateUsername('user!name')).toEqual({ valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' });
      expect(validateUsername('admin')).toEqual({ valid: false, error: 'Username is reserved by the platform' });
      expect(validateUsername('valid_creator-99')).toEqual({ valid: true });
    });

    it('AuthError formats properties consistently', () => {
      const err = new AuthError('Account suspended', 403, 'status');
      expect(err.message).toBe('Account suspended');
      expect(err.statusCode).toBe(403);
      expect(err.field).toBe('status');
      expect(err.name).toBe('AuthError');
    });
  });

  // ==========================================================================
  // Dimension 8: Production Express App (server/app.ts) Direct Route Stress
  // ==========================================================================
  describe('8. Production Express App (server/app.ts) Direct Route Stress', () => {
    // Import and instantiate production createApp
    const prodApp = createApp();

    it('rejects GET /api/auth/me without cookie with 401 on production app', async () => {
      const res = await request(prodApp).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('rejects all mandated reserved usernames on production POST /api/auth/signup with 400', async () => {
      const targets = ['admin', 'api', 'dashboard', 'settings', 'signup', 'login'];

      for (const username of targets) {
        const res = await request(prodApp)
          .post('/api/auth/signup')
          .send({
            username,
            email: `${username}@prodtest.com`,
            password: 'Password123!',
          });

        expect(res.status, `Prod app failed to reject ${username}`).toBe(400);
        expect(res.body.field).toBe('username');
        expect(res.body.error).toMatch(/reserved/i);
      }
    });

    it('rejects unexpected extra fields on production POST /api/auth/signup with 400', async () => {
      const res = await request(prodApp)
        .post('/api/auth/signup')
        .send({
          username: 'ValidCreator',
          email: 'valid@prodtest.com',
          password: 'Password123!',
          is_admin: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/strictly username, email, and password/i);
    });

    it('rejects empty credentials on production POST /api/auth/login with 400', async () => {
      const res = await request(prodApp)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});

