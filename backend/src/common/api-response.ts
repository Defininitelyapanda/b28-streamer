import { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function successResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function errorResponse(code: string, message: string): ApiErrorBody {
  return { success: false, error: { code, message } };
}

export function sendSuccess<T>(res: Response, data: T, status = 200) {
  return res.status(status).json(successResponse(data));
}

export function sendError(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json(errorResponse(code, message));
}
