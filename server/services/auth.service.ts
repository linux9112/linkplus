import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { Prisma, type User } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { isReservedUsername, validateUsername } from '../utils/reserved-usernames.js';
import { destroyUserSessions } from './session.service.js';

export class AuthError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 400,
    public field?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface SanitizedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  email_verified: boolean;
  created_at: Date;
}

export function sanitizeUser(user: User): SanitizedUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    email_verified: user.emailVerifiedAt !== null ? Boolean(user.emailVerifiedAt) : true,
    created_at: user.createdAt,
  };
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
  [key: string]: unknown;
}

/**
 * Registers a new user with strictly 3 fields: username, email, password.
 * Enforces case-insensitive uniqueness, reserved username protection,
 * 12-round bcrypt hashing, and default profile + QR settings creation.
 */
export async function signup(input: SignupInput): Promise<SanitizedUser> {
  const { username, email, password, ...extraFields } = input;

  // Strict 3-field rule: reject unexpected extra fields
  if (Object.keys(extraFields).length > 0) {
    throw new AuthError(
      'Signup requires strictly username, email, and password fields.',
      400
    );
  }

  // Validate username
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.valid) {
    throw new AuthError(usernameCheck.error || 'Invalid username', 400, 'username');
  }

  // Validate email
  if (typeof email !== 'string' || !email.trim()) {
    throw new AuthError('Email address is required', 400, 'email');
  }
  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
    throw new AuthError('Invalid email address format', 400, 'email');
  }

  // Validate password
  if (typeof password !== 'string' || password.length < 8) {
    throw new AuthError('Password must be at least 8 characters long', 400, 'password');
  }
  if (password.length > 100) {
    throw new AuthError('Password must not exceed 100 characters', 400, 'password');
  }

  const normalizedUsername = (username as string).trim().toLowerCase();
  const normalizedEmail = trimmedEmail.toLowerCase();

  // Enforce reserved username check
  if (isReservedUsername(normalizedUsername)) {
    throw new AuthError('Username is reserved by the platform', 400, 'username');
  }

  // Check case-insensitive uniqueness for username
  const existingUsername = await prisma.user.findUnique({
    where: { normalizedUsername },
  });
  if (existingUsername) {
    throw new AuthError('Username is already taken', 409, 'username');
  }

  // Check case-insensitive uniqueness for email
  const existingEmail = await prisma.user.findUnique({
    where: { normalizedEmail },
  });
  if (existingEmail) {
    throw new AuthError('Email is already registered', 409, 'email');
  }

  // Hash password using bcrypt with 12 salt rounds
  const passwordHash = await bcrypt.hash(password, 12);

  // Execute user creation, default profile, and default QR settings in a single transaction
  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: (username as string).trim(),
        normalizedUsername,
        email: trimmedEmail,
        normalizedEmail,
        passwordHash,
        role: 'user',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    // Default Profile
    await tx.profile.create({
      data: {
        userId: user.id,
        displayName: user.username,
        bio: '',
        avatarUrl: null,
        themeSettings: {
          preset: 'default',
          background_type: 'color',
          background_value: '#0f172a',
          button_shape: 'rounded-full',
          font_family: 'Inter',
        },
        socialLinks: [],
        isPublic: true,
      },
    });

    // Default QR Setting (Level H error correction)
    await tx.qrSetting.create({
      data: {
        userId: user.id,
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        gradientSettings: Prisma.JsonNull,
        dotStyle: 'squares',
        cornerStyle: 'square',
        logoUrl: null,
        errorCorrectionLevel: 'H',
        margin: 2,
        resolution: 1024,
        transparentBackground: false,
        presetName: 'Classic Black',
      },
    });

    return user;
  });

  return sanitizeUser(createdUser);
}

export interface LoginInput {
  identifier: string;
  password: string;
}

/**
 * Authenticates user via email or username and verifies password.
 */
export async function login(input: LoginInput): Promise<SanitizedUser> {
  const { identifier, password } = input;

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    throw new AuthError('Email or username is required', 400, 'identifier');
  }
  if (!password || typeof password !== 'string') {
    throw new AuthError('Password is required', 400, 'password');
  }

  const normalized = identifier.trim().toLowerCase();

  // Search by normalized username or normalized email
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { normalizedUsername: normalized },
        { normalizedEmail: normalized },
      ],
    },
  });

  if (!user) {
    throw new AuthError('Invalid email/username or password', 401);
  }

  // Constant-time password comparison
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AuthError('Invalid email/username or password', 401);
  }

  // Check account suspension status
  if (user.status === 'suspended') {
    throw new AuthError('Account is suspended. Please contact support.', 403);
  }

  return sanitizeUser(user);
}

/**
 * Initiates password reset flow by creating a secure token and sending email.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const genericSuccess = {
    message: 'If that email is registered, a password reset link has been sent.',
  };

  if (!email || typeof email !== 'string' || !email.trim()) {
    return genericSuccess;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { normalizedEmail },
    });

    if (!user) {
      return genericSuccess;
    }

    // Generate random 32-byte hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetLink = `${env.APP_URL}/reset-password?token=${rawToken}`;

    // Dispatch email if SMTP is configured
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
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
        subject: 'Reset your LinkPulse password',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password for LinkPulse. Click the button below to proceed:</p>
            <p style="margin: 24px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p style="color: #64748b; font-size: 14px;">This link will expire in 60 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } else {
      console.log(`[SMTP Notice] Password reset requested for ${user.email}. SMTP is unconfigured. Reset link: ${resetLink}`);
    }
  } catch (error) {
    console.error('Forgot password processing error:', error);
  }

  return genericSuccess;
}

/**
 * Resets user password using a verified token and invalidates active sessions.
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  if (!token || typeof token !== 'string') {
    throw new AuthError('Password reset token is required', 400);
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new AuthError('Password must be at least 8 characters long', 400, 'password');
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    include: { user: true },
  });

  if (!record || !record.user) {
    throw new AuthError('Invalid or expired password reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  });

  // Invalidate all active sessions for security
  await destroyUserSessions(record.userId);

  return { message: 'Password updated successfully. Please log in with your new password.' };
}

/**
 * Creates an email verification token.
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

/**
 * Verifies email using verification token.
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  if (!token || typeof token !== 'string') {
    throw new AuthError('Verification token is required', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!record) {
    throw new AuthError('Invalid or expired verification token', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });

    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  });

  return { message: 'Email verified successfully' };
}
