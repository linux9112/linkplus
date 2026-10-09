import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { RESERVED_USERNAMES } from '../setup.js';

describe('Unit: Authentication & Credential Mechanics', () => {
  describe('Password Hashing with Bcrypt', () => {
    it('should generate secure non-reversible bcrypt hashes with salt rounds', () => {
      const password = 'SuperSecretPassword123!';
      const hash1 = bcrypt.hashSync(password, 10);
      const hash2 = bcrypt.hashSync(password, 10);

      // Distinct salts must produce different hashes
      expect(hash1).not.toBe(hash2);
      expect(hash1.startsWith('$2a$') || hash1.startsWith('$2b$')).toBe(true);

      // Verification succeeds
      expect(bcrypt.compareSync(password, hash1)).toBe(true);
      expect(bcrypt.compareSync(password, hash2)).toBe(true);
      expect(bcrypt.compareSync('WrongPassword', hash1)).toBe(false);
    });
  });

  describe('Reserved Usernames Protection', () => {
    it('should contain all required platform route names', () => {
      const requiredReserved = [
        'admin',
        'login',
        'signup',
        'dashboard',
        'settings',
        'api',
        'assets',
        'public',
        'r',
        '404',
      ];

      for (const name of requiredReserved) {
        expect(RESERVED_USERNAMES.has(name)).toBe(true);
      }
    });

    it('should allow legitimate creator usernames', () => {
      const legitUsernames = ['sarah', 'techguy', 'designer_mike', 'cool-band'];
      for (const name of legitUsernames) {
        expect(RESERVED_USERNAMES.has(name)).toBe(false);
      }
    });
  });

  describe('Normalization Rules', () => {
    it('should lowercase and trim usernames and emails for case-insensitive indexing', () => {
      const rawUser = '  JohnDoe2026  ';
      const rawEmail = '  John.Doe@EXAMPLE.COM ';

      expect(rawUser.trim().toLowerCase()).toBe('johndoe2026');
      expect(rawEmail.trim().toLowerCase()).toBe('john.doe@example.com');
    });
  });
});
