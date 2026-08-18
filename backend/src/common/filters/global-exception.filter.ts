import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { errorResponse } from '../api-response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        const code = (body.code as string) ?? 'REQUEST_FAILED';
        const message = (body.message as string) ?? exception.message;
        return response.status(status).json(errorResponse(code, message));
      }

      return response.status(status).json(errorResponse('REQUEST_FAILED', exception.message));
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse('INTERNAL_ERROR', 'An unexpected error occurred.'));
  }
}
