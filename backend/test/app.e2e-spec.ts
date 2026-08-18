import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const prisma = new PrismaClient();

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
      // eslint-disable-next-line no-console
      console.warn('Skipping e2e tests: database not available. Run scripts/setup-db.sql and npm run prisma:seed first.');
      return;
    }

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
      .expect(401);
  });

  itIfDb('seed admin can login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@b28.dev', password: 'Password123!' })
      .expect(201);

    adminToken = res.body.data.accessToken;
    expect(adminToken).toBeDefined();
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
