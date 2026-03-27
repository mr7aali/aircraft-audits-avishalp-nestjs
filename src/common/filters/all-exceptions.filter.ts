import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma-client/client.js';

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

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, message, code, details } =
        this.handlePrismaKnownRequestError(exception));
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      ({ status, message, code, details } =
        this.handlePrismaInitializationError(exception));
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

  private handlePrismaKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): {
    status: number;
    message: string;
    code: string;
    details?: unknown;
  } {
    if (exception.code === 'P1000') {
      return this.buildDatabaseAuthenticationError(
        exception.code,
        exception.meta,
      );
    }

    if (exception.code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Duplicate value',
        code: 'CONFLICT_DUPLICATE',
        details: exception.meta,
      };
    }

    if (exception.code === 'P2003') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid reference',
        code: 'INVALID_REFERENCE',
        details: exception.meta,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database request failed',
      code: exception.code,
      details: exception.meta,
    };
  }

  private handlePrismaInitializationError(
    exception: Prisma.PrismaClientInitializationError,
  ): {
    status: number;
    message: string;
    code: string;
    details?: unknown;
  } {
    if (exception.errorCode === 'P1000') {
      return this.buildDatabaseAuthenticationError(exception.errorCode);
    }

    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database connection failed',
      code: exception.errorCode ?? 'DATABASE_CONNECTION_FAILED',
      details: {
        reason: exception.message,
      },
    };
  }

  private buildDatabaseAuthenticationError(
    prismaCode: string,
    meta?: unknown,
  ): {
    status: number;
    message: string;
    code: string;
    details: {
      reason: string;
      prismaCode: string;
      modelName?: string;
      driverCode?: string;
      driverKind?: string;
    };
  } {
    const metaRecord = this.asRecord(meta);
    const driverAdapterError = this.asRecord(metaRecord?.driverAdapterError);
    const cause = this.asRecord(driverAdapterError?.cause);

    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database authentication failed',
      code: 'DATABASE_AUTHENTICATION_FAILED',
      details: {
        reason:
          'Unable to authenticate with the configured database credentials.',
        prismaCode,
        modelName:
          typeof metaRecord?.modelName === 'string'
            ? metaRecord.modelName
            : undefined,
        driverCode:
          typeof cause?.originalCode === 'string'
            ? cause.originalCode
            : undefined,
        driverKind: typeof cause?.kind === 'string' ? cause.kind : undefined,
      },
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined;
  }
}

