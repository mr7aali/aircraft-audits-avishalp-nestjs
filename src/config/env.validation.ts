import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('30m'),
  JWT_REFRESH_TTL: Joi.string().default('14d'),
  JWT_REMEMBER_ME_TTL: Joi.string().default('60d'),
  AUTH_THROTTLE_TTL_SECONDS: Joi.number().default(60),
  AUTH_THROTTLE_LIMIT: Joi.number().default(10),
  REDIS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().email().default('noreply@example.com'),
  MAIL_HOST: Joi.string().default('localhost'),
  MAIL_PORT: Joi.number().default(1025),
  MAIL_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASS: Joi.string().allow('').optional(),
  STORAGE_DRIVER: Joi.string()
    .valid('local', 's3', 'cloudinary')
    .default('local'),
  STORAGE_LOCAL_ROOT: Joi.string().default('storage'),
  CLOUDINARY_CLOUD_NAME: Joi.when('STORAGE_DRIVER', {
    is: 'cloudinary',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_API_KEY: Joi.when('STORAGE_DRIVER', {
    is: 'cloudinary',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_API_SECRET: Joi.when('STORAGE_DRIVER', {
    is: 'cloudinary',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_FOLDER: Joi.string().allow('').optional(),
  S3_REGION: Joi.string().allow('').optional(),
  S3_BUCKET: Joi.string().allow('').optional(),
  S3_ENDPOINT: Joi.string().allow('').optional(),
  S3_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  APP_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  MAX_UPLOAD_BYTES: Joi.number().default(104857600),
});
