import { assertProductionSafeEnv, envValidationSchema } from './env.validation';

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
