import express from 'express';
import type { Application } from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { helmetMiddleware, corsMiddleware } from './middleware/security.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { checkDatabaseConnection } from './db/check-connection.js';
import { env } from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import linkRoutes from './routes/link.routes.js';
import publicRoutes from './routes/public.routes.js';
import redirectRoutes from './routes/redirect.routes.js';
import qrRoutes from './routes/qr.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';

/**
 * Creates and configures the LinkPulse Express Application.
 */
export function createApp(): Application {
  const app = express();

  // Security headers & CORS
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // Performance & Body Parsing (10MB limit for rich media, logo and avatar uploads)
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads directory serving
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));

  // Basic Health Check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'linkpulse-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Live Database Health & Setup Diagnostic Check
  app.get('/api/health/db', async (_req, res) => {
    const dbCheck = await checkDatabaseConnection();
    if (dbCheck.ok) {
      res.status(200).json({
        ok: true,
        connected: true,
        database: env.DB_NAME,
        host: env.DB_HOST,
      });
    } else {
      res.status(503).json({
        ok: false,
        connected: false,
        database: env.DB_NAME,
        host: env.DB_HOST,
        error: dbCheck.error,
        instructions: [
          '1. Open your .env file in the project root.',
          '2. Set DB_HOST to your Hostinger MySQL hostname (or localhost if running on the same server).',
          '3. Set DB_NAME=u199400152_linkgenerator and DB_USER=u199400152_linkgenerator.',
          '4. Set DB_PASSWORD to your MySQL database user password.',
          '5. If connecting remotely to Hostinger MySQL, whitelist your IP under Hostinger hPanel -> Databases -> Remote MySQL.',
          '6. Run `npm run db:migrate` to create all 11 MySQL tables.',
        ],
      });
    }
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/links', linkRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/r', redirectRoutes);
  app.use('/api/qr', qrRoutes);
  app.use('/api/qr-settings', qrRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/uploads', uploadRoutes);

  // Fallback 404 for unmatched API routes
  app.use('/api/*', notFoundHandler);

  // Serve built Vite frontend in production if dist/client exists
  const clientDistPath = path.resolve(process.cwd(), 'dist/client');
  if (env.NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app: Application = createApp();
export default app;
