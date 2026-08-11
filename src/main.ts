import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(configService.get('API_PREFIX') || 'api/v1');

  // Global pipes & filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TechNG LMS API')
    .setDescription('TechNG Learning Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'student-access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'admin-access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 TechNG LMS API running on: http://localhost:${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/docs`);
}
bootstrap();