import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

const emptyToUndefined = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

const stringOrUndefined = z.preprocess(emptyToUndefined, z.string().optional());

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.preprocess(emptyToUndefined, z.coerce.number().default(5000)),
    APP_URL: z.preprocess(
      emptyToUndefined,
      z.string().url().default('http://localhost:5173')
    ),

    // Explicit CORS Origins Allowlist (comma-separated origins)
    CORS_ORIGINS: stringOrUndefined,

    // MySQL Connection Configuration
    DB_HOST: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'DB_HOST is required').default('localhost')
    ),
    DB_PORT: z.preprocess(emptyToUndefined, z.coerce.number().default(3306)),
    DB_NAME: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'DB_NAME is required').default('u199400152_linkgenerator')
    ),
    DB_USER: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'DB_USER is required').default('u199400152_linkgenerator')
    ),
    DB_PASSWORD: z.preprocess(
      (val) => (typeof val === 'string' ? val : ''),
      z.string().default('')
    ),
    DATABASE_URL: stringOrUndefined,

    // Session Security
    SESSION_SECRET: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .min(16, 'SESSION_SECRET must be at least 16 characters long')
        .default('linkpulse-dev-secret-session-key-minimum-32-chars')
    ),

    // Optional SMTP Configuration
    SMTP_HOST: stringOrUndefined,
    SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().default(587)),
    SMTP_USER: stringOrUndefined,
    SMTP_PASS: stringOrUndefined,
    SMTP_FROM: z.preprocess(
      emptyToUndefined,
      z.string().default('LinkPulse <noreply@example.com>')
    ),

    // Optional Admin Bootstrap
    ADMIN_BOOTSTRAP_EMAIL: z.preprocess(
      emptyToUndefined,
      z.string().email('Invalid ADMIN_BOOTSTRAP_EMAIL format').optional()
    ),
    ADMIN_BOOTSTRAP_USERNAME: stringOrUndefined,
    ADMIN_BOOTSTRAP_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(8, 'ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters').optional()
    ),

    // Centralized GitHub Image Storage Configuration
    GITHUB_TOKEN: stringOrUndefined,
    GITHUB_OWNER: z.preprocess(emptyToUndefined, z.string().default('linux9112')),
    GITHUB_REPO: z.preprocess(emptyToUndefined, z.string().default('linkplus')),
    GITHUB_BRANCH: z.preprocess(emptyToUndefined, z.string().default('main')),
    GITHUB_PATH_PREFIX: z.preprocess(emptyToUndefined, z.string().default('uploads')),
  })
  .transform((data) => {
    const isGitHubStorageConfigured = Boolean(
      data.GITHUB_TOKEN && data.GITHUB_TOKEN.trim() !== '' &&
      data.GITHUB_OWNER && data.GITHUB_OWNER.trim() !== '' &&
      data.GITHUB_REPO && data.GITHUB_REPO.trim() !== ''
    );
    let databaseUrl = data.DATABASE_URL;
    if (!databaseUrl || databaseUrl.trim() === '') {
      const encodedUser = encodeURIComponent(data.DB_USER);
      const encodedPass = encodeURIComponent(data.DB_PASSWORD);
      databaseUrl = `mysql://${encodedUser}:${encodedPass}@${data.DB_HOST}:${data.DB_PORT}/${data.DB_NAME}`;
    }

    // Build unique allowed CORS origins
    const corsSet = new Set<string>();
    // Default allowed origins (including the production deployed frontend)
    corsSet.add('https://linkkpluss.vercel.app');
    corsSet.add('http://localhost:5173');
    corsSet.add('http://localhost:3000');
    corsSet.add('http://127.0.0.1:5173');
    corsSet.add('http://127.0.0.1:3000');

    if (data.APP_URL) {
      corsSet.add(data.APP_URL.trim().replace(/\/+$/, ''));
    }

    if (data.CORS_ORIGINS) {
      data.CORS_ORIGINS.split(',')
        .map((s) => s.trim().replace(/\/+$/, ''))
        .filter(Boolean)
        .forEach((origin) => corsSet.add(origin));
    }

    return {
      ...data,
      DATABASE_URL: databaseUrl,
      ALLOWED_ORIGINS: Array.from(corsSet),
      GITHUB_STORAGE_ENABLED: isGitHubStorageConfigured,
    };
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function getValidatedEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('=================================================================');
    console.error('❌ CONFIGURATION ERROR: Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('=================================================================');
    throw new Error(`Invalid environment variables: ${result.error.message}`);
  }

  // Ensure process.env.DATABASE_URL is populated for Prisma CLI and client
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = result.data.DATABASE_URL;
  }

  return result.data;
}

export const env: EnvConfig = getValidatedEnv();
export default env;
