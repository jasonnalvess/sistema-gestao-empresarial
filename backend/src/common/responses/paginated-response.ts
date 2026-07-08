export class PaginatedResponse<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    },
  ) {}
}
