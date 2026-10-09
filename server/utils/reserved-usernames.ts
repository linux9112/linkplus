/**
 * Reserved Usernames & Route Guard for LinkPulse
 * Prevents users from registering usernames matching core platform routes,
 * system endpoints, asset directories, or reserved protocol keywords.
 */

export const RESERVED_USERNAMES = new Set<string>([
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
  '500',
  'null',
  'undefined',
  'moderation',
  'reports',
  'app',
  'web',
  'favicon',
  'robots',
  'sitemap',
  'docs',
  'pricing',
  'explore',
]);

/**
 * Checks whether a given username is in the reserved list (case-insensitive).
 */
export function isReservedUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }
  const normalized = username.trim().toLowerCase();
  return RESERVED_USERNAMES.has(normalized);
}

/**
 * Validates username syntax and ensures it is not reserved.
 */
export function validateUsername(username: unknown): { valid: boolean; error?: string } {
  if (typeof username !== 'string' || !username.trim()) {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 30) {
    return { valid: false, error: 'Username must be between 3 and 30 characters' };
  }

  const validRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  if (isReservedUsername(trimmed)) {
    return { valid: false, error: 'Username is reserved by the platform' };
  }

  return { valid: true };
}
