import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const rawResponse: unknown = exception.getResponse();
    const exceptionResponse =
      rawResponse && typeof rawResponse === 'object'
        ? (rawResponse as Record<string, unknown>)
        : {};

    // Preserve custom fields (e.g. `code`, `activeSessions`) returned by
    // services instead of dropping them in the error envelope.
    const extra = Object.fromEntries(
      Object.entries(exceptionResponse).filter(
        ([key]) => key !== 'message' && key !== 'error' && key !== 'statusCode',
      ),
    );

    response.status(status).json({
      ...extra,
      statusCode: status,
      message: exceptionResponse.message || exception.message,
      error: exceptionResponse.error || 'Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
