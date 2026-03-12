import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Duplicate value';
        code = 'CONFLICT_DUPLICATE';
        details = exception.meta;
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid reference';
        code = 'INVALID_REFERENCE';
        details = exception.meta;
      } else {
        code = exception.code;
        details = exception.meta;
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
        code = 'HTTP_EXCEPTION';
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const maybeBody = responseBody as {
          message?: string | string[];
          code?: string;
          details?: unknown;
        };
        if (Array.isArray(maybeBody.message)) {
          message = 'Validation failed';
          code = maybeBody.code ?? 'VALIDATION_FAILED';
          details = maybeBody.message;
        } else {
          message = maybeBody.message ?? message;
          code = maybeBody.code ?? 'HTTP_EXCEPTION';
          details = maybeBody.details;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      details = exception.stack;
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }
}
