import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import bodyParser from 'body-parser';
import { AppModule } from './app.module.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  // IMPORTANT: raw body for Stripe webhook
  app.use('/payments/webhook', bodyParser.raw({ type: 'application/json' }));

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT ?? 3000;

  // 🔥 IMPORTANT: Listen on 0.0.0.0 for Railway
  await app.listen(port, '0.0.0.0');
  // await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
