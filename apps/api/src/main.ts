import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { connectMongo } from '@crm-atlas/db';

async function bootstrap(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
  const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
  await connectMongo(mongoUri, dbName);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger/OpenAPI configuration
  try {
    const config = new DocumentBuilder()
      .setTitle('CRM Atlas API')
      .setDescription(
        'Headless CRM multi-tenant, API-first, MCP-ready. Complete API documentation for managing contacts, companies, tasks, notes, and opportunities.'
      )
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login',
        },
        'bearer'
      )
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication endpoints')
      .addTag(
        'entities',
        'Entity CRUD operations (contacts, companies, tasks, notes, opportunities)'
      )
      .addTag('search', 'Search endpoints (full-text and semantic)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      jsonDocumentUrl: '/docs/json',
    });
    console.log('✅ Swagger configured at /docs');
    console.log('✅ OpenAPI JSON available at /docs/json');
  } catch (error) {
    console.error('❌ Swagger setup error:', error);
  }

  const port = parseInt(process.env.API_PORT || '3000', 10);
  const host = process.env.API_HOST || '0.0.0.0';

  console.log(`[DEBUG] About to listen on ${host}:${port}`);
  await app.listen(port, host);
  console.log(`Application is running on: http://${host}:${port}`);
  console.log(`Swagger docs available at: http://${host}:${port}/docs`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
  process.exit(1);
});
