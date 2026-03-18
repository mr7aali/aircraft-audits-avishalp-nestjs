export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '30m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '14d',
    rememberMeTtl: process.env.JWT_REMEMBER_ME_TTL ?? '60d',
    throttleTtlSeconds: Number(process.env.AUTH_THROTTLE_TTL_SECONDS ?? 60),
    throttleLimit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 10),
  },
  redis: {
    enabled:
      (process.env.REDIS_ENABLED ?? 'true').toLowerCase() === 'true' ||
      process.env.REDIS_ENABLED === '1',
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? '',
  },
  mail: {
    from: process.env.MAIL_FROM ?? 'noreply@example.com',
    host: process.env.MAIL_HOST ?? 'localhost',
    port: Number(process.env.MAIL_PORT ?? 1025),
    secure:
      (process.env.MAIL_SECURE ?? 'false').toLowerCase() === 'true' ||
      process.env.MAIL_SECURE === '1',
    user: process.env.MAIL_USER ?? '',
    pass: process.env.MAIL_PASS ?? '',
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    localRoot: process.env.STORAGE_LOCAL_ROOT ?? 'storage',
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 104857600),
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    cloudinaryFolder: process.env.CLOUDINARY_FOLDER ?? '',
    s3Region: process.env.S3_REGION ?? '',
    s3Bucket: process.env.S3_BUCKET ?? '',
    s3Endpoint: process.env.S3_ENDPOINT ?? '',
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
});
