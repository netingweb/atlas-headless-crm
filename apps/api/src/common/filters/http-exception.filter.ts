import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError as CoreValidationError } from '@crm-atlas/core';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { send: (data: unknown) => void };
      send: (data: unknown) => void;
    }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let errors: Array<{ path: string; message: string }> | undefined;

    if (exception instanceof CoreValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = exception.code;
      errors = exception.errors;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        code = (resp.code as string) || exception.name;
        errors = resp.errors as Array<{ path: string; message: string }> | undefined;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).send({
      statusCode: status,
      message,
      code,
      ...(errors && errors.length > 0 && { errors }),
      timestamp: new Date().toISOString(),
    });
  }
}
