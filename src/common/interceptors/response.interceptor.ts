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
        if (data?.success !== undefined) {
          return data;
        }

        return {
          success: true,
          statusCode,
          message: statusCode === 201 ? 'Created successfully' : 'Success',
          data,
        };
      }),
    );
  }
}
