import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import { checkDatabaseConnection } from './check-connection.js';

const __filename = fileURLToPath(import.meta.url);

export interface SeedAdminResult {
  created: boolean;
  userId: string;
  username: string;
  email: string;
}

const DEFAULT_THEME_SETTINGS = {
  preset: 'default',
  background_type: 'color',
  background_value: '#f8fafc',
  card_style: 'rounded',
  button_shape: 'rounded-full',
  button_variant: 'filled',
  button_color: '#0f172a',
  button_text_color: '#ffffff',
  button_border_color: '#e2e8f0',
  font_family: 'Inter',
  text_color: '#0f172a',
  accent_color: '#3b82f6',
  link_spacing: 'normal',
  link_alignment: 'center',
};

/**
 * Bootstraps an administrator account using environment variables or safe defaults.
 */
export async function seedAdmin(): Promise<SeedAdminResult> {
  console.log('🔄 Checking database connection before admin seeding...');
  const connCheck = await checkDatabaseConnection();
  if (!connCheck.ok) {
    throw new Error(`Database connection failed: ${connCheck.error}`);
  }

  const username = env.ADMIN_BOOTSTRAP_USERNAME || 'admin';
  const email = env.ADMIN_BOOTSTRAP_EMAIL || 'admin@linkpulse.local';
  const password = env.ADMIN_BOOTSTRAP_PASSWORD || 'Admin@123456!';

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  // Check if admin user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { normalizedUsername },
        { normalizedEmail },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.role !== 'admin') {
      console.log(`ℹ️ User '${existingUser.username}' already exists. Elevating role to 'admin'...`);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'admin',
          status: 'active',
          emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminUserId: existingUser.id,
          action: 'admin_elevated',
          targetType: 'user',
          targetId: existingUser.id,
          details: { reason: 'Elevated via seed-admin CLI' },
        },
      });

      console.log(`👑 User '${existingUser.username}' elevated to admin.`);
      return {
        created: false,
        userId: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
      };
    }

    console.log(`ℹ️ Admin user already exists: ${existingUser.username} (${existingUser.email})`);
    return {
      created: false,
      userId: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
    };
  }

  // Hash password with bcrypt (salt rounds = 12)
  const passwordHash = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();

  // Create admin user with profile, QR settings, and audit log
  await prisma.$transaction(async (tx) => {
    // 1. Create User
    await tx.user.create({
      data: {
        id: userId,
        username,
        normalizedUsername,
        email,
        normalizedEmail,
        passwordHash,
        role: 'admin',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    // 2. Create Profile
    await tx.profile.create({
      data: {
        userId,
        displayName: 'Administrator',
        bio: 'LinkPulse System Administrator',
        themeSettings: DEFAULT_THEME_SETTINGS,
        socialLinks: [],
        isPublic: true,
      },
    });

    // 3. Create QR Settings
    await tx.qrSetting.create({
      data: {
        userId,
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        dotStyle: 'squares',
        cornerStyle: 'square',
        errorCorrectionLevel: 'H',
        margin: 2,
        resolution: 1024,
        transparentBackground: false,
      },
    });

    // 4. Log Admin Bootstrap
    await tx.adminAuditLog.create({
      data: {
        adminUserId: userId,
        action: 'admin_bootstrap',
        targetType: 'user',
        targetId: userId,
        details: {
          username,
          email,
          bootstrappedAt: new Date().toISOString(),
        },
      },
    });
  });

  console.log(`✅ Administrator account created successfully:`);
  console.log(`   Username: ${username}`);
  console.log(`   Email   : ${email}`);
  console.log(`   Role    : admin`);

  return {
    created: true,
    userId,
    username,
    email,
  };
}

// Auto-run when executed directly via tsx/node CLI
const isDirectExecution =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) ||
    import.meta.url === pathToFileURL(process.argv[1]).href);

if (isDirectExecution) {
  seedAdmin()
    .then((res) => {
      console.log(`✨ Admin seed finished: ${res.username} (${res.created ? 'Created' : 'Existing'})`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Admin seed failed:', err);
      process.exit(1);
    });
}
