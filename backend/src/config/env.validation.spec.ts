import { assertProductionSafeEnv, envValidationSchema } from './env.validation';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getMigrationDatabaseUrl } = require('../../scripts/migration-database-url') as {
  getMigrationDatabaseUrl: (env?: NodeJS.ProcessEnv) => string | null;
};

describe('getMigrationDatabaseUrl', () => {
  it('prefers DATABASE_URL_UNPOOLED', () => {
    expect(
      getMigrationDatabaseUrl({
        DATABASE_URL: 'postgresql://pooled',
        DATABASE_URL_UNPOOLED: 'postgresql://direct',
      }),
    ).toBe('postgresql://direct');
  });

  it('strips Neon pooler host suffix from DATABASE_URL', () => {
    const url = getMigrationDatabaseUrl({
      DATABASE_URL:
        'postgresql://user:pass@ep-cool-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
    });
    expect(url).toContain('ep-cool.us-east-1.aws.neon.tech');
    expect(url).not.toContain('-pooler');
  });
});

describe('envValidationSchema', () => {
  it('accepts Resend-style EMAIL_FROM with display name', () => {
    const { error } = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_ACCESS_SECRET: 'x'.repeat(32),
      EMAIL_FROM: 'B28 Oncodex <noreply@b28.dev>',
    });
    expect(error).toBeUndefined();
  });
});

describe('assertProductionSafeEnv', () => {
  it('rejects DEV_BYPASS_STREAMING in production', () => {
    expect(() =>
      assertProductionSafeEnv({
        NODE_ENV: 'production',
        DEV_BYPASS_STREAMING: 'true',
      }),
    ).toThrow('DEV_BYPASS_STREAMING cannot be enabled');
  });

  it('allows DEV_BYPASS_STREAMING in development', () => {
    expect(() =>
      assertProductionSafeEnv({
        NODE_ENV: 'development',
        DEV_BYPASS_STREAMING: 'true',
      }),
    ).not.toThrow();
  });
});
