import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { EntitiesModule } from './entities/entities.module';
import { SearchModule } from './search/search.module';
import { ConfigModule } from './config/config.module';
import { MCPModule } from './mcp/mcp.module';
import { StatsModule } from './stats/stats.module';
import { IndexingModule } from './indexing/indexing.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CorsInterceptor } from './common/interceptors/cors.interceptor';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      ignoreEnvFile: false,
    }),
    HealthModule,
    AuthModule,
    EntitiesModule,
    SearchModule,
    ConfigModule,
    MCPModule,
    StatsModule,
    IndexingModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorsInterceptor,
    },
  ],
})
export class AppModule {}
