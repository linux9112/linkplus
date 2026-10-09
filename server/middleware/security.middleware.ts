import helmet from 'helmet';
import cors from 'cors';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

/**
 * Helmet security headers configuration.
 * Configures CSP, HSTS, X-Content-Type-Options, Frameguard, and X-XSS-Protection.
 */
export const helmetMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", ...(env.ALLOWED_ORIGINS || [env.APP_URL])],
      frameAncestors: ["'self'"],
    },
  } : false, // Relaxed in development/testing for Vite dev tooling
  crossOriginEmbedderPolicy: false,
});

/**
 * Checks if a given origin is allowed under the current CORS policy.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  const clean = origin.trim().replace(/\/+$/, '');
  const allowed = env.ALLOWED_ORIGINS || [
    'https://linkkpluss.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
  return allowed.includes(clean);
}

/**
 * CORS configuration restricting origins to env.ALLOWED_ORIGINS with credentials support.
 */
export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin) || env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['set-cookie'],
  maxAge: 86400,
});
