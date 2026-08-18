import { PrismaClient, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'users.read', description: 'View users' },
  { key: 'users.write', description: 'Manage users and roles' },
  { key: 'users.suspend', description: 'Suspend or unsuspend users' },
  { key: 'films.read', description: 'View films' },
  { key: 'films.approve', description: 'Approve films' },
  { key: 'films.reject', description: 'Reject films' },
  { key: 'films.delete', description: 'Delete films' },
  { key: 'comments.read', description: 'View comments' },
  { key: 'comments.moderate', description: 'Moderate comments' },
  { key: 'payments.read', description: 'View payments' },
  { key: 'payments.refund', description: 'Refund payments' },
  { key: 'revenue.read', description: 'View revenue' },
  { key: 'revenue.adjust', description: 'Adjust revenue records' },
  { key: 'payouts.read', description: 'View payouts' },
  { key: 'payouts.approve', description: 'Approve payouts' },
  { key: 'ads.read', description: 'View advertisements' },
  { key: 'ads.write', description: 'Manage advertisements' },
  { key: 'settings.read', description: 'View platform settings' },
  { key: 'settings.write', description: 'Modify platform settings' },
  { key: 'audit.read', description: 'View audit logs' },
] as const;

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),
  ADMIN: [
    'users.read', 'users.write', 'users.suspend',
    'films.read', 'films.approve', 'films.reject', 'films.delete',
    'comments.read', 'comments.moderate',
    'payments.read', 'revenue.read', 'payouts.read',
    'ads.read', 'ads.write',
    'settings.read', 'settings.write', 'audit.read',
  ],
  MODERATOR: ['users.read', 'comments.read', 'comments.moderate'],
  FINANCE_ADMIN: ['payments.read', 'payments.refund', 'revenue.read', 'revenue.adjust', 'payouts.read', 'payouts.approve'],
  CONTENT_ADMIN: ['films.read', 'films.approve', 'films.reject', 'films.delete'],
  FILMMAKER: [],
  STREAMER: [],
};

const DEFAULT_SETTINGS = [
  { key: 'subscription.monthly_price', value: 400, type: 'number' },
  { key: 'subscription.annual_price', value: 4320, type: 'number' },
  { key: 'subscription.annual_discount_percent', value: 10, type: 'number' },
  { key: 'subscription.currency', value: 'KES', type: 'string' },
  { key: 'revenue.filmmaker_percentage', value: 70, type: 'number' },
  { key: 'revenue.platform_percentage', value: 30, type: 'number' },
  { key: 'streaming.free_max_resolution', value: '720p', type: 'string' },
  { key: 'streaming.premium_max_resolution', value: 'source', type: 'string' },
  { key: 'streaming.qualified_stream_seconds', value: 30, type: 'number' },
  { key: 'streaming.qualified_stream_percentage', value: 20, type: 'number' },
  { key: 'ads.free_ads_enabled', value: true, type: 'boolean' },
  { key: 'ads.premium_ads_enabled', value: false, type: 'boolean' },
  { key: 'moderation.comment_mode', value: 'OPEN', type: 'string' },
  { key: 'payouts.minimum_payout_amount', value: 1000, type: 'number' },
];

const FEATURE_FLAGS = [
  { key: 'PREMIUM', enabled: false, description: 'Premium subscriptions' },
  { key: 'MPESA', enabled: false, description: 'M-Pesa payments' },
  { key: 'PAYPAL', enabled: false, description: 'PayPal payments' },
  { key: 'CARDS', enabled: false, description: 'Card payments' },
  { key: 'COMMENTS', enabled: false, description: 'Film comments' },
  { key: 'RATINGS', enabled: false, description: 'Film ratings' },
  { key: 'FILMMAKER_UPLOADS', enabled: false, description: 'Filmmaker uploads' },
  { key: 'ADS', enabled: false, description: 'Advertisements' },
  { key: 'GOOGLE_AUTH', enabled: false, description: 'Google OAuth' },
  { key: 'PHONE_AUTH', enabled: false, description: 'Phone OTP auth' },
  { key: 'PAYOUTS', enabled: false, description: 'Filmmaker payouts' },
  { key: 'RECOMMENDATIONS', enabled: false, description: 'Recommendations engine' },
];

const SEED_PASSWORD = 'Password123!';

async function seedCatalogVideos() {
  const catalogPath = path.join(__dirname, '../../frontend/data/catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.log('No frontend/data/catalog.json found — skipping catalog seed.');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as {
    videos: Array<{
      id: string;
      title: string;
      thumbnail: string;
      date: string;
      genre: string;
      desc: string;
      rating: string;
      sourceType: string;
      videoId: string;
      type: string;
      seriesGroup: string;
    }>;
  };

  let order = 0;
  for (const v of raw.videos) {
    await prisma.catalogVideo.upsert({
      where: { slug: v.id },
      create: {
        slug: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        date: v.date,
        genre: v.genre,
        description: v.desc,
        rating: v.rating,
        sourceType: v.sourceType,
        videoId: v.videoId,
        type: v.type,
        seriesGroup: v.seriesGroup,
        published: true,
        sortOrder: order++,
      },
      update: {
        title: v.title,
        thumbnail: v.thumbnail,
        date: v.date,
        genre: v.genre,
        description: v.desc,
        rating: v.rating,
        sourceType: v.sourceType,
        videoId: v.videoId,
        type: v.type,
        seriesGroup: v.seriesGroup,
        sortOrder: order++,
      },
    });
  }

  console.log(`Seeded ${raw.videos.length} catalog videos from frontend/data/catalog.json`);
}

async function main() {
  // Permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: { description: perm.description },
    });
  }

  // Roles
  const roleRecords: Record<string, { id: string }> = {};
  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name, description: `${name} role` },
      update: {},
    });
    roleRecords[name] = role;

    const permKeys = ROLE_PERMISSIONS[name];
    const perms = await prisma.permission.findMany({ where: { key: { in: permKeys } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
  }

  const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });

  async function upsertUser(
    email: string,
    displayName: string,
    roles: RoleName[],
    verified = true,
  ) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        emailVerifiedAt: verified ? new Date() : null,
        profile: { create: { displayName } },
        roles: {
          create: roles.map((name) => ({ roleId: roleRecords[name].id })),
        },
      },
      update: {
        passwordHash,
        emailVerifiedAt: verified ? new Date() : null,
      },
    });

    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.createMany({
      data: roles.map((name) => ({ userId: user.id, roleId: roleRecords[name].id })),
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, displayName },
      update: { displayName },
    });

    return user;
  }

  async function ensureSubscription(userId: string, plan: 'FREE_WITH_ADS' | 'MONTHLY' | 'ANNUAL', adsEnabled: boolean) {
    const expiresAt = plan === 'FREE_WITH_ADS' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.userSubscription.upsert({
      where: { userId },
      create: { userId, plan, adsEnabled, expiresAt },
      update: { plan, adsEnabled, expiresAt },
    });
  }

  const superAdmin = await upsertUser('superadmin@b28.dev', 'Super Admin', [RoleName.SUPER_ADMIN]);
  const admin = await upsertUser('admin@b28.dev', 'Platform Admin', [RoleName.ADMIN]);
  await upsertUser('moderator@b28.dev', 'Content Moderator', [RoleName.MODERATOR]);
  await upsertUser('finance@b28.dev', 'Finance Admin', [RoleName.FINANCE_ADMIN]);
  const filmmaker = await upsertUser('filmmaker@b28.dev', 'Sample Filmmaker', [RoleName.FILMMAKER, RoleName.STREAMER]);
  const freeStreamer = await upsertUser('streamer.free@b28.dev', 'Free Streamer', [RoleName.STREAMER]);
  const premiumStreamer = await upsertUser('streamer.premium@b28.dev', 'Premium Streamer', [RoleName.STREAMER]);

  await ensureSubscription(freeStreamer.id, 'FREE_WITH_ADS', true);
  await ensureSubscription(premiumStreamer.id, 'ANNUAL', false);
  await ensureSubscription(filmmaker.id, 'MONTHLY', false);
  await ensureSubscription(admin.id, 'ANNUAL', false);

  for (const flag of ['PREMIUM', 'MPESA', 'PAYPAL', 'CARDS', 'ADS', 'PHONE_AUTH', 'GOOGLE_AUTH'] as const) {
    await prisma.featureFlag.updateMany({ where: { key: flag }, data: { enabled: true } });
  }

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value, type: setting.type },
    });
  }

  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: flag,
      update: { description: flag.description },
    });
  }

  await seedCatalogVideos();

  console.log('Seed completed.');
  console.log(`Default password for all seed users: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
