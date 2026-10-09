import type { Request, Response, NextFunction } from 'express';
import type { User, Session } from '@prisma/client';
import { validateSession, SESSION_COOKIE_NAME } from '../services/session.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}

/**
 * Middleware requiring an active, unexpired session.
 * Rejects unauthenticated requests with 401 and suspended accounts with 403.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await validateSession(sessionId);

  if (!result) {
    // Clear invalid session cookie
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(401).json({ error: 'Session expired or invalid' });
    return;
  }

  const { user, session } = result;

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account is suspended. Please contact support.' });
    return;
  }

  req.user = user;
  req.session = session;
  next();
}

/**
 * Middleware requiring administrator privileges.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Administrator access required' });
      return;
    }
    next();
  });
}

/**
 * Optional authentication middleware: populates req.user if a valid session exists,
 * but allows unauthenticated requests to continue.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

  if (sessionId) {
    const result = await validateSession(sessionId);
    if (result && result.user.status !== 'suspended') {
      req.user = result.user;
      req.session = result.session;
    }
  }

  next();
}
