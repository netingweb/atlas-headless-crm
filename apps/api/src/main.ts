import { loadRootEnv } from '@crm-atlas/utils';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { connectMongo } from '@crm-atlas/db';
import { SmartValidationPipe } from './common/pipes/smart-validation.pipe';

/**
 * Atlas CRM Headless API Server
 * Headless CRM multi-tenant, API-first, MCP-ready
 *
 * @author Luca Mainieri - www.neting.it
 * @license MIT
 */

async function bootstrap(): Promise<void> {
  // Ensure .env from monorepo root is loaded
  loadRootEnv();
  // Debug: Log environment variables status
  console.log('[Bootstrap] Environment variables check:', {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...' || 'not set',
    embeddingsProvider: process.env.EMBEDDINGS_PROVIDER || 'openai (default)',
    nodeEnv: process.env.NODE_ENV || 'not set',
  });

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
  const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
  await connectMongo(mongoUri, dbName);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  // Get Fastify instance
  const fastifyInstance = app.getHttpAdapter().getInstance();

  // Register multipart plugin for file uploads
  try {
    const multipart = await import('@fastify/multipart');
    await fastifyInstance.register(multipart.default);
    console.log('✅ Multipart plugin registered');
  } catch (error) {
    console.error('⚠️ Failed to register multipart plugin:', error);
    // Continue without multipart - uploads will fail but API can start
  }

  // CORS configuration - register on Fastify instance directly
  // For development, allow all origins. In production, restrict to specific origins
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  // Register CORS plugin
  const corsPlugin = await import('@fastify/cors');
  await fastifyInstance.register(corsPlugin.default, {
    origin: isDevelopment ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  app.setGlobalPrefix('api');

  // Add hook to handle OPTIONS requests - must be after setGlobalPrefix but handles all routes
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin as string | undefined;
    if (request.method === 'OPTIONS') {
      if (isDevelopment || !origin || allowedOrigins.includes(origin)) {
        reply.header('Access-Control-Allow-Origin', origin || '*');
        reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        reply.header('Access-Control-Allow-Credentials', 'true');
        reply.header('Access-Control-Max-Age', '86400');
        return reply.code(204).send();
      }
    }
  });

  app.useGlobalPipes(
    new SmartValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger/OpenAPI configuration
  try {
    const config = new DocumentBuilder()
      .setTitle('Atlas CRM Headless API')
      .setDescription(
        'Headless CRM multi-tenant, API-first, MCP-ready. Complete API documentation for managing contacts, companies, tasks, notes, and opportunities.'
      )
      .setVersion('0.1.0')
      .setContact('Luca Mainieri', 'https://www.neting.it', 'info@neting.it')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
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
      .addTag('mcp', 'MCP tools endpoints for AI integration')
      .addTag('config', 'Configuration endpoints')
      .addTag('stats', 'Statistics and dashboard endpoints')
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
