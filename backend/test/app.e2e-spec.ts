import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const prisma = new PrismaClient();
const requireTestDb = process.env.REQUIRE_TEST_DB === 'true';

describe('B28 Oncodex API (e2e)', () => {
  let app: INestApplication;
  let dbAvailable = false;
  let accessToken: string;
  let refreshToken: string;
  let adminToken: string;
  const testEmail = `test-${Date.now()}@b28.dev`;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbAvailable = true;
    } catch {
      dbAvailable = false;
      if (requireTestDb) {
        throw new Error('Database required for e2e tests (REQUIRE_TEST_DB=true).');
      }
      console.warn('Skipping e2e tests: database not available. Run scripts/setup-db.sql and npm run prisma:seed first.');
      return;
    }

    if (!process.env.CRON_SECRET) {
      process.env.CRON_SECRET = 'test-cron-secret';
    }
    process.env.AUTH_AUTO_VERIFY = 'false';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  const itIfDb = (name: string, fn: () => Promise<void>) => {
    it(name, async () => {
      if (!dbAvailable) return;
      await fn();
    });
  };

  function buildTestCatalogUpsert(
    slug: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      slug,
      title: 'Test catalog video',
      thumbnail: 'https://example.com/poster.jpg',
      date: '2026-01-01',
      genre: 'Drama',
      description: 'Test description',
      rating: '8.0',
      sourceType: 'youtube',
      videoId: slug,
      type: 'film',
      seriesGroup: 'Test catalog video',
      ...overrides,
    };
  }

  itIfDb('GET /health returns ok', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ok');
      });
  });

  itIfDb('GET /health/ready checks dependencies', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.checks).toHaveProperty('database');
      });
  });

  itIfDb('GET /api/v1/catalog is public', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.videos)).toBe(true);
        expect(res.headers['cache-control']).toContain('public');
      });
  });

  itIfDb('GET /api/v1/catalog/videos/:slug is public', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/catalog').expect(200);
    const slug = list.body.data.videos[0]?.id;
    if (!slug) return;

    await request(app.getHttpServer())
      .get(`/api/v1/catalog/videos/${encodeURIComponent(slug)}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(slug);
      });
  });

  itIfDb('GET /api/v1/subscriptions/offers is public', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/subscriptions/offers')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('monthly');
      });
  });

  itIfDb('GET /api/v1/catalog supports pagination', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog?page=1&limit=5')
      .expect(200)
      .expect((res) => {
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limit).toBe(5);
        expect(res.body.data.total).toBeGreaterThanOrEqual(0);
        expect(res.body.data.videos.length).toBeLessThanOrEqual(5);
      });
  });

  itIfDb('GET /api/v1/catalog supports search query', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/catalog').expect(200);
    const title = list.body.data.videos[0]?.title as string | undefined;
    if (!title) return;

    const term = title.split(' ')[0];
    await request(app.getHttpServer())
      .get(`/api/v1/catalog?q=${encodeURIComponent(term)}&limit=10`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.videos.length).toBeGreaterThan(0);
        expect(
          res.body.data.videos.some((v: { title: string }) =>
            v.title.toLowerCase().includes(term.toLowerCase()),
          ),
        ).toBe(true);
      });
  });

  itIfDb('GET /api/v1/streaming/play/:slug returns 404 for unknown slug', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/streaming/play/nonexistent-slug')
      .expect(404);
  });

  itIfDb('POST /api/v1/auth/register creates account', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'Password123!', displayName: 'Test User' })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  itIfDb('POST /api/v1/auth/login fails before email verification', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'Password123!' })
      .expect(401)
      .expect((res) => {
        expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
      });
  });

  itIfDb('seed admin can login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@b28.dev', password: 'Password123!' })
      .expect(201);

    adminToken = res.body.data.accessToken;
    expect(adminToken).toBeDefined();
  });

  itIfDb('GET /api/v1/streaming/play/:slug allows public trailers without auth', async () => {
    const slug = `trailer-guest-${Date.now()}`;
    await request(app.getHttpServer())
      .put('/api/v1/admin/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildTestCatalogUpsert(slug, { type: 'trailer', playbackFormat: 'YOUTUBE' }))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/streaming/play/${encodeURIComponent(slug)}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.playbackFormat).toBeDefined();
      });
  });

  itIfDb('GET /api/v1/streaming/play/:slug requires auth for full films', async () => {
    const slug = `film-guest-${Date.now()}`;
    await request(app.getHttpServer())
      .put('/api/v1/admin/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildTestCatalogUpsert(slug, { type: 'film', playbackFormat: 'YOUTUBE' }))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/streaming/play/${encodeURIComponent(slug)}`)
      .expect(401);
  });

  itIfDb('GET /api/v1/streaming/play/:slug requires subscription for full films when logged in', async () => {
    const slug = `film-nosub-${Date.now()}`;
    await request(app.getHttpServer())
      .put('/api/v1/admin/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildTestCatalogUpsert(slug, { type: 'film', playbackFormat: 'YOUTUBE' }))
      .expect(200);

    const freeUser = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'streamer.free@b28.dev', password: 'Password123!' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/streaming/play/${encodeURIComponent(slug)}`)
      .set('Authorization', `Bearer ${freeUser.body.data.accessToken}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
      });
  });

  itIfDb('GET /api/v1/streaming/play/:slug allows premium subscriber on full films', async () => {
    const slug = `film-premium-${Date.now()}`;
    await request(app.getHttpServer())
      .put('/api/v1/admin/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildTestCatalogUpsert(slug, { type: 'film', playbackFormat: 'YOUTUBE' }))
      .expect(200);

    const premiumUser = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'streamer.premium@b28.dev', password: 'Password123!' })
      .expect(201);

    const play = await request(app.getHttpServer())
      .get(`/api/v1/streaming/play/${encodeURIComponent(slug)}`)
      .set('Authorization', `Bearer ${premiumUser.body.data.accessToken}`);

    expect(play.status).toBe(200);
    expect(play.body.success).toBe(true);
  });

  itIfDb('POST /api/v1/admin/catalog/upload-url returns R2_NOT_CONFIGURED when R2 unset', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/upload-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'test-film', contentType: 'video/mp4', assetKind: 'film' });

    if (res.status === 503) {
      expect(res.body.error.code).toBe('R2_NOT_CONFIGURED');
      return;
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBeDefined();
  });

  itIfDb('POST /api/v1/admin/catalog/upload-url rejects invalid content type', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/upload-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'test-film', contentType: 'text/plain', assetKind: 'film' })
      .expect(400)
      .expect((res) => {
        expect(res.body.error.code).toBe('INVALID_CONTENT_TYPE');
      });
  });

  itIfDb('POST /api/v1/admin/catalog/upload-url rejects video type for thumbnail', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/upload-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'test-film', contentType: 'video/mp4', assetKind: 'thumbnail' })
      .expect(400)
      .expect((res) => {
        expect(res.body.error.code).toBe('INVALID_CONTENT_TYPE');
      });
  });

  itIfDb('POST /api/v1/admin/catalog/publish-bundle creates film and optional trailer rows', async () => {
    const slug = `bundle-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/publish-bundle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug,
        title: 'Bundle Test Film',
        date: '2026-01-01',
        genre: 'Drama',
        description: 'Publish bundle e2e',
        rating: '8.0',
        thumbnailKey: `catalog/${slug}/thumb.jpg`,
        filmStorageKey: `catalog/${slug}/film.mp4`,
        trailerStorageKey: `catalog/${slug}/trailer.mp4`,
        playbackFormat: 'MP4',
      });

    if (res.status === 400 && res.body.error?.code === 'R2_PUBLIC_DOMAIN_REQUIRED') {
      return;
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.film.id).toBe(slug);
    expect(res.body.data.trailerSlug).toBe(`${slug}-trailer`);

    const trailer = await request(app.getHttpServer())
      .get(`/api/v1/catalog/videos/${encodeURIComponent(`${slug}-trailer`)}`)
      .expect(200);
    expect(trailer.body.data.type).toBe('trailer');
  });

  itIfDb('GET /api/v1/streaming/play/:slug returns R2_NOT_CONFIGURED for MP4 without R2', async () => {
    const slug = `r2-test-${Date.now()}`;
    await request(app.getHttpServer())
      .put('/api/v1/admin/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildTestCatalogUpsert(slug, {
          title: 'R2 playback test',
          playbackFormat: 'MP4',
          accessTier: 'FREE',
          storageKey: 'films/r2-test/demo.mp4',
        }),
      )
      .expect(200);

    const filmmaker = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'filmmaker@b28.dev', password: 'Password123!' })
      .expect(201);

    const play = await request(app.getHttpServer())
      .get(`/api/v1/streaming/play/${encodeURIComponent(slug)}`)
      .set('Authorization', `Bearer ${filmmaker.body.data.accessToken}`);

    if (play.status === 503) {
      expect(play.body.error.code).toBe('R2_NOT_CONFIGURED');
      return;
    }

    expect(play.status).toBe(200);
    expect(play.body.success).toBe(true);
    expect(play.body.data.url).toBeDefined();
  });

  itIfDb('public catalog never exposes videoId', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/catalog').expect(200);
    for (const video of list.body.data.videos as Array<{ videoId?: string }>) {
      expect(video.videoId).toBeUndefined();
    }
  });

  itIfDb('POST /api/v1/subscriptions/subscribe requires payment method when PREMIUM enabled', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan: 'MONTHLY' })
      .expect(400)
      .expect((res) => {
        expect(res.body.error.code).toBe('PAYMENT_METHOD_REQUIRED');
      });
  });

  itIfDb('POST /api/v1/auth/google rejects when GOOGLE_AUTH feature is disabled', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZ28uZGV2In0.' })
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe('FEATURE_DISABLED');
      });
  });

  itIfDb('GET /api/v1/admin/users forbidden for unauthenticated', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
  });

  itIfDb('GET /api/v1/admin/users works for admin', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.items.length).toBeGreaterThan(0);
      });
  });

  itIfDb('PUT /api/v1/admin/settings rejects invalid revenue split', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'revenue.filmmaker_percentage', value: 80, type: 'number' })
      .expect(400);
  });

  itIfDb('POST /api/v1/auth/forgot-password does not leak account existence', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@b28.dev' })
      .expect(201)
      .expect((res) => {
        expect(res.body.data.message).toContain('If an account exists');
      });
  });

  itIfDb('POST /api/v1/auth/refresh rotates tokens', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'streamer.free@b28.dev', password: 'Password123!' })
      .expect(201);

    accessToken = login.body.data.accessToken;
    refreshToken = login.body.data.refreshToken;

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(refreshed.body.data.accessToken).toBeDefined();
    expect(refreshed.body.data.refreshToken).not.toBe(refreshToken);
    expect(refreshed.body.data.user?.email).toBe('streamer.free@b28.dev');
    expect(refreshed.body.data.subscription?.plan).toBeDefined();
  });

  itIfDb('POST /api/v1/auth/login returns user and subscription in one response', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'streamer.free@b28.dev', password: 'Password123!' })
      .expect(201)
      .expect((res) => {
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
        expect(res.body.data.user.email).toBe('streamer.free@b28.dev');
        expect(res.body.data.user.roles).toContain('STREAMER');
        expect(res.body.data.subscription.plan).toBeDefined();
      });
  });

  itIfDb('GET /api/v1/users/me returns own profile only', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.email).toBe('streamer.free@b28.dev');
      });
  });

  itIfDb('GET /api/v1/feature-flags returns public enabled flags', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/feature-flags')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });
});
