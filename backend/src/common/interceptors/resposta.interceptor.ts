import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { PaginatedResponse } from '../responses/paginated-response';

@Injectable()
export class RespostaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((response: unknown) => {
        if (response instanceof PaginatedResponse) {
          return {
            success: true,
            data: response.data,
            meta: response.meta,
          };
        }

        return {
          success: true,
          data: response,
        };
      }),
    );
  }
}
