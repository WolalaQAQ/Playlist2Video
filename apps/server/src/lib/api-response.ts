export interface ApiSuccess<T> { data: T }
export interface ApiErrorResponse { error: {code: string; message: string; details?: unknown} }
export const data = <T>(value: T): ApiSuccess<T> => ({data: value});
export const errorResponse = (code: string, message: string, details?: unknown): ApiErrorResponse => ({error: {code, message, details}});
