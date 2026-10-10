import type { Request, Response } from 'express';
import app from '../server/app.js';

export default function handler(req: Request, res: Response) {
  // Restore original request path if Vercel serverless rewrite changed it
  const originalPath = (
    req.headers['x-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-now-route-matches'] ||
    req.headers['x-rewrite-url']
  ) as string | undefined;

  if (originalPath && typeof originalPath === 'string' && (req.url === '/api' || req.url === '/' || !req.url.startsWith('/api'))) {
    req.url = originalPath;
  }

  return app(req, res);
}
