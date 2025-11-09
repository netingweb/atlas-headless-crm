import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class CorsInterceptor implements NestInterceptor {
  private readonly allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const origin = request.headers.origin;

    // Handle OPTIONS preflight requests
    if (request.method === 'OPTIONS') {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const originHeader = typeof origin === 'string' ? origin : undefined;
      if (isDevelopment || !originHeader || this.allowedOrigins.includes(originHeader)) {
        response.header('Access-Control-Allow-Origin', originHeader || '*');
        response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        response.header('Access-Control-Allow-Credentials', 'true');
        response.header('Access-Control-Max-Age', '86400');
        response.status(204).send();
        return new Observable<never>((subscriber) => {
          subscriber.complete();
        });
      }
    }

    // Add CORS headers to all responses
    return next.handle().pipe(
      tap(() => {
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const originHeader = typeof origin === 'string' ? origin : undefined;
        if (isDevelopment || !originHeader || this.allowedOrigins.includes(originHeader)) {
          response.header('Access-Control-Allow-Origin', originHeader || '*');
          response.header('Access-Control-Allow-Credentials', 'true');
        }
      })
    );
  }
}
