import { PaginatedResponse } from '../responses/paginated-response';

export function respostaPaginada<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return new PaginatedResponse(data, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
