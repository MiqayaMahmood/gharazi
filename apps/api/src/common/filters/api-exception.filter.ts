import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const normalized = this.normalize(exceptionResponse, statusCode);

    this.logException(statusCode, request, exception);

    response.status(statusCode).json({
      success: false,
      statusCode,
      message: normalized.message,
      error: normalized.error,
      details: normalized.details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(body: unknown, statusCode: number) {
    if (typeof body === 'string') {
      return { message: body, error: this.defaultError(statusCode), details: undefined };
    }
    if (body && typeof body === 'object') {
      const data = body as { message?: unknown; error?: unknown };
      return {
        message: Array.isArray(data.message) ? 'Validation failed' : typeof data.message === 'string' ? data.message : this.defaultMessage(statusCode),
        error: typeof data.error === 'string' ? data.error : this.defaultError(statusCode),
        details: Array.isArray(data.message) ? data.message : data,
      };
    }
    return { message: this.defaultMessage(statusCode), error: this.defaultError(statusCode), details: undefined };
  }

  private defaultMessage(statusCode: number) {
    return statusCode === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : 'Request failed';
  }

  private defaultError(statusCode: number) {
    return statusCode === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : 'Error';
  }

  private logException(statusCode: number, request: Request, exception: unknown) {
    const summary = exception instanceof Error ? exception.message : String(exception);
    const message = `${request.method} ${request.url} failed status=${statusCode}: ${summary}`;
    if (statusCode >= 500) {
      this.logger.error(message, exception instanceof Error && process.env.NODE_ENV !== 'production' ? exception.stack : undefined);
      return;
    }
    if (statusCode === HttpStatus.UNAUTHORIZED || statusCode === HttpStatus.FORBIDDEN) {
      if (process.env.NODE_ENV !== 'production') this.logger.debug(message);
      return;
    }
    if (process.env.NODE_ENV !== 'production') this.logger.warn(message);
  }
}
