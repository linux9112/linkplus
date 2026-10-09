import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AuthError } from '../services/auth.service.js';
import { env } from '../config/env.js';
import { isAllowedOrigin } from './security.middleware.js';

/**
 * Centralized application error handling middleware.
 * Formats validation, authentication, database connectivity, and internal errors into consistent JSON responses.
 * Never leaks stack traces or database credentials to API clients.
 */
export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Ensure CORS headers are attached on error responses for legitimate origins
  const origin = _req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  // 1. Custom AuthError (e.g. 400 validation, 401 unauth, 403 forbidden, 409 conflict)
  if (err instanceof AuthError) {
    const payload: { error: string; field?: string } = {
      error: err.message,
    };
    if (err.field) {
      payload.field = err.field;
    }
    res.status(err.statusCode).json(payload);
    return;
  }

  // 2. Zod Schema Validation Error
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const field = firstIssue?.path?.join('.') || undefined;
    const message = firstIssue?.message || 'Validation error';

    res.status(400).json({
      error: message,
      field,
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  // 3. Bad JSON syntax in request body
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON payload in request body' });
    return;
  }

  // 4. CORS restriction error
  if (err.message && err.message.includes('CORS')) {
    res.status(403).json({ error: err.message });
    return;
  }

  // 5. Prisma unique constraint violation fallback (P2002)
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    res.status(409).json({
      error: `A record with this ${target} already exists`,
      field: Array.isArray(err.meta?.target) ? err.meta.target[0] : undefined,
    });
    return;
  }

  // 6. MySQL Database Connectivity / Setup Error (never expose credentials!)
  const errName = String(err.name || '');
  const errMsg = String(err.message || '');
  if (
    errName.includes('PrismaClientInitializationError') ||
    err.code === 'P1001' ||
    err.code === 'P1000' ||
    err.code === 'P1003' ||
    err.code === 'ECONNREFUSED' ||
    errMsg.includes("Can't reach database server") ||
    errMsg.includes('Access denied for user')
  ) {
    res.status(503).json({
      error:
        'MySQL Database Connection Error: Unable to reach the configured MySQL database. Verify DB_HOST, DB_PORT, DB_NAME (u199400152_linkgenerator), DB_USER (u199400152_linkgenerator), and DB_PASSWORD in your .env file, ensure Remote MySQL is enabled in Hostinger hPanel if connecting remotely, and run `npm run db:migrate`.',
      code: 'DATABASE_UNREACHABLE',
      setupRequired: true,
    });
    return;
  }

  // 7. Generic Internal Server Error (logged securely, no credential leakage)
  console.error('[ServerError]', {
    message: err.message,
    stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(err.status || 500).json({
    error: 'An internal server error occurred. Please try again later.',
  });
};

/**
 * 404 handler for unmatched API routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}
