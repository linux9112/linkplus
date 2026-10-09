import crypto from 'crypto';
import type { CookieOptions } from 'express';
import type { Session, User } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'linkpulse_session';
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionMetadata {
  ip?: string;
  userAgent?: string;
}

export interface ValidatedSession {
  session: Session;
  user: User;
}

/**
 * Generates cookie configuration options adhering to production security requirements.
 */
export function getSessionCookieOptions(maxAgeSeconds: number = SESSION_DURATION_SECONDS): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
}

/**
 * Creates a new authenticated server-side session in MySQL.
 */
export async function createSession(
  userId: string,
  metadata?: SessionMetadata
): Promise<Session> {
  const sessionId = 'sess_' + crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);

  const sessionData = {
    ip: metadata?.ip ?? null,
    userAgent: metadata?.userAgent ? metadata.userAgent.substring(0, 500) : null,
    createdAt: now.toISOString(),
  };

  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      data: sessionData,
      expiresAt,
    },
  });

  return session;
}

/**
 * Validates a session token from request cookies.
 * Lazily evicts expired sessions.
 */
export async function validateSession(sessionId: string | undefined): Promise<ValidatedSession | null> {
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || !session.user) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      // Lazily remove expired session
      prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      return null;
    }

    return {
      session,
      user: session.user,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Destroys a single session by ID upon logout.
 */
export async function destroySession(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  try {
    await prisma.session.delete({
      where: { id: sessionId },
    });
    return true;
  } catch {
    // If already deleted or not found, return false without throwing
    return false;
  }
}

/**
 * Revokes all sessions for a specific user (e.g. upon password reset or admin suspension).
 */
export async function destroyUserSessions(userId: string): Promise<number> {
  if (!userId) return 0;

  try {
    const result = await prisma.session.deleteMany({
      where: { userId },
    });
    return result.count;
  } catch (error) {
    console.error(`Failed to destroy sessions for user ${userId}:`, error);
    return 0;
  }
}
