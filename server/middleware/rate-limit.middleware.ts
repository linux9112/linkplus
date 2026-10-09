import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

const isTest = env.NODE_ENV === 'test';

/**
 * IP rate limiter for authentication endpoints (signup, login).
 * Enforces 10 requests per 15 minutes per IP.
 */
export const authRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTest ? 10000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  skip: () => isTest,
});

/**
 * IP rate limiter for password reset requests.
 * Enforces 5 requests per hour per IP to prevent spam and enumeration.
 */
export const passwordResetRateLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: isTest ? 10000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many password reset requests. Please try again later.',
  },
  skip: () => isTest,
});

/**
 * General API rate limiter across standard endpoints.
 * Enforces 300 requests per 15 minutes per IP.
 */
export const apiRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 50000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded. Please slow down your requests.',
  },
  skip: () => isTest,
});

/**
 * Analytics endpoint rate limiter.
 * Enforces 100 requests per 15 minutes per IP.
 */
export const analyticsRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTest ? 10000 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many analytics recording requests. Please try again later.',
  },
  skip: () => isTest,
});
