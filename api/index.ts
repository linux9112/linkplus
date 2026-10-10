import type { Request, Response } from 'express';
import app from '../server/app.js';

/**
 * Configure Vercel Serverless Function behavior.
 * Disable Vercel's built-in bodyParser so Express's express.json({ limit: '10mb' })
 * can stream and parse large image uploads without stream consumption deadlocks or payload drops.
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    externalResolver: true,
  },
};

export default function handler(req: Request, res: Response) {
  // Resolve true path from Vercel rewrite metadata or query parameters
  const xForwardedUri = req.headers['x-forwarded-uri'] as string | undefined;
  const xMatchedPath = req.headers['x-matched-path'] as string | undefined;
  const xRewriteUrl = req.headers['x-rewrite-url'] as string | undefined;

  // When vercel.json rewrites /api/(.*) -> /api, Vercel populates query['1'] or query['path']
  const queryParam = (req.query as any)?.['1'] || (req.query as any)?.['path'];

  let resolvedPath = req.url;

  if (xForwardedUri && (xForwardedUri.startsWith('/api') || xForwardedUri.startsWith('/r/'))) {
    resolvedPath = xForwardedUri;
  } else if (queryParam) {
    const sub = Array.isArray(queryParam) ? queryParam.join('/') : String(queryParam);
    resolvedPath = `/api/${sub.replace(/^\/+/, '')}`;
  } else if (xMatchedPath && (xMatchedPath.startsWith('/api') || xMatchedPath.startsWith('/r/')) && xMatchedPath !== '/api') {
    resolvedPath = xMatchedPath;
  } else if (xRewriteUrl && (xRewriteUrl.startsWith('/api') || xRewriteUrl.startsWith('/r/'))) {
    resolvedPath = xRewriteUrl;
  }

  // Preserve query parameters if present
  const qIdx = req.url.indexOf('?');
  if (qIdx !== -1) {
    const qs = req.url.slice(qIdx);
    if (!resolvedPath.includes('?')) {
      resolvedPath += qs;
    }
  }

  req.url = resolvedPath;
  return app(req, res);
}
