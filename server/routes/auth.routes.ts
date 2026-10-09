import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import * as authService from '../services/auth.service.js';
import * as sessionService from '../services/session.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rate-limit.middleware.js';
import { formatProfile } from './profile.routes.js';

const router = Router();

/**
 * POST /api/auth/signup
 * Registers a new account with strictly 3 fields (username, email, password).
 */
router.post(
  '/signup',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.signup(req.body);

      const session = await sessionService.createSession(user.id, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie(
        sessionService.SESSION_COOKIE_NAME,
        session.id,
        sessionService.getSessionCookieOptions()
      );

      res.status(201).json({
        user,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticates user credentials and establishes a session.
 */
router.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.login(req.body);

      const session = await sessionService.createSession(user.id, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie(
        sessionService.SESSION_COOKIE_NAME,
        session.id,
        sessionService.getSessionCookieOptions()
      );

      res.status(200).json({
        user,
        message: 'Logged in successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Destroys session in database and clears session cookie.
 */
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.cookies?.[sessionService.SESSION_COOKIE_NAME];
      if (sessionId) {
        await sessionService.destroySession(sessionId);
      }

      res.clearCookie(sessionService.SESSION_COOKIE_NAME, { path: '/' });
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * Returns authenticated user details and active profile summary.
 */
router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      res.status(200).json({
        user: authService.sanitizeUser(user),
        profile: formatProfile(profile),
        smtpConfigured: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Initiates password reset flow by dispatching reset email.
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
      const result = await authService.forgotPassword(req.body?.email);
      res.status(200).json({
        ...result,
        smtpConfigured,
        setupNotice: !smtpConfigured
          ? 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in .env. Configure an SMTP provider in .env to send live password reset emails.'
          : undefined,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Resets user password using a verified token.
 */
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body || {};
      const result = await authService.resetPassword(token, password);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/change-password
 * Updates password for an authenticated user after verifying their current password.
 */
router.post(
  '/change-password',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters long', field: 'newPassword' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Current password is incorrect', field: 'currentPassword' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/resend-verification
 * Sends an email verification link or explains SMTP configuration requirements if SMTP is not configured.
 */
router.post(
  '/resend-verification',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      if (user.emailVerifiedAt) {
        res.status(200).json({ message: 'Your email address is already verified.', verified: true });
        return;
      }

      const rawToken = await authService.createEmailVerificationToken(user.id);
      const verifyUrl = `${env.APP_URL.replace(/\/$/, '')}/api/auth/verify-email?token=${rawToken}`;
      const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

      if (!smtpConfigured) {
        res.status(200).json({
          emailSent: false,
          smtpConfigured: false,
          message:
            'Email provider credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) are not configured in .env. No email was sent. Add your SMTP credentials in .env to enable live email delivery.',
          devVerificationUrl: env.NODE_ENV !== 'production' ? verifyUrl : undefined,
        });
        return;
      }

      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: user.email,
        subject: 'Verify your LinkPulse email address',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify your email address</h2>
            <p>Click the button below to verify your email address for LinkPulse:</p>
            <p style="margin: 24px 0;">
              <a href="${verifyUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Verify Email Address
              </a>
            </p>
          </div>
        `,
      });

      res.status(200).json({
        emailSent: true,
        smtpConfigured: true,
        message: `Verification email sent to ${user.email}.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET & POST /api/auth/verify-email
 * Verifies email address using verification token.
 */
const handleVerifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = (req.query?.token as string) || req.body?.token;
    const result = await authService.verifyEmail(token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.get('/verify-email', handleVerifyEmail);
router.post('/verify-email', handleVerifyEmail);

export default router;
