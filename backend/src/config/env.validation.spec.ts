import { assertProductionSafeEnv } from './env.validation';

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
