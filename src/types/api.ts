export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ErrorResponse = {
  message: string;
  code?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
};


