export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function pageResults<T>(response: PaginatedResponse<T>): T[] {
  return response.results;
}
