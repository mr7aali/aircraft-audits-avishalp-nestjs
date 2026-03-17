import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const statusCode = context.switchToHttp().getResponse()?.statusCode ?? 200;

    return next.handle().pipe(
      map((data) => {
        const normalizedData = this.normalizeForJson(data);

        if (
          typeof normalizedData === 'object' &&
          normalizedData !== null &&
          'success' in normalizedData
        ) {
          return normalizedData;
        }

        return {
          success: true,
          statusCode,
          message: statusCode === 201 ? 'Created successfully' : 'Success',
          data: normalizedData,
        };
      }),
    );
  }

  private normalizeForJson(value: unknown): unknown {
    if (typeof value === 'bigint') {
      const numberValue = Number(value);
      return Number.isSafeInteger(numberValue) ? numberValue : value.toString();
    }

    if (
      value == null ||
      value instanceof Date ||
      value instanceof Buffer ||
      typeof value !== 'object'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.normalizeForJson(entry));
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        this.normalizeForJson(entry),
      ]),
    );
  }
}
