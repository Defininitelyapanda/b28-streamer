import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  API_PORT: Joi.number().default(4000),
  PORT: Joi.number().optional(),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  REDIS_URL: Joi.string().uri().optional(),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('false'),
  AUTH_AUTO_VERIFY: Joi.string().valid('true', 'false').default('false'),
  DEV_BYPASS_STREAMING: Joi.string().valid('true', 'false').default('false'),
  CRON_SECRET: Joi.string().optional(),
  VERCEL: Joi.string().valid('1').optional(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  RESEND_API_KEY: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().optional(),
  YOUTUBE_API_KEY: Joi.string().optional(),
  YOUTUBE_CHANNEL_ID: Joi.string().optional(),
  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),
  R2_PUBLIC_DOMAIN: Joi.string().optional(),
}).unknown(true);

export function assertProductionSafeEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === 'production' && env.DEV_BYPASS_STREAMING === 'true') {
    throw new Error('DEV_BYPASS_STREAMING cannot be enabled when NODE_ENV is production.');
  }

  if (env.NODE_ENV === 'production' && !env.CRON_SECRET) {
    console.warn('[startup] CRON_SECRET is not set — internal YouTube sync cron will be disabled.');
  }
}
