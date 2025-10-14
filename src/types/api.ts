export type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
};
