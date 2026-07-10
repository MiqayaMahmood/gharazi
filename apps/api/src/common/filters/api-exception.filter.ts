import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { safeError } from '@Gharazi/shared-utils/structured-logger';
import { RequestWithContext } from '../middleware/request-context.middleware';
import { SystemEventsService } from '../../modules/system-events/system-events.service';

@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  constructor(private readonly events: SystemEventsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp(); const response = context.getResponse<Response>(); const request = context.getRequest<RequestWithContext>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const normalized = this.normalize(exception instanceof HttpException ? exception.getResponse() : undefined, statusCode);
    const summary = safeError(exception);
    const log = { action: 'request.failed', requestId: request.requestId, method: request.method, path: request.originalUrl.split('?')[0], statusCode, userId: request.user?.id, error: summary };
    if (statusCode >= 500) {
      this.logger.error(log, exception instanceof Error ? exception.stack : undefined);
      void this.events.record({ severity: 'error', source: 'api', message: summary.message, requestId: request.requestId, userId: request.user?.id, detailsJson: { method: request.method, path: request.originalUrl.split('?')[0], statusCode, errorName: summary.name } });
    } else if ([401, 403].includes(statusCode)) this.logger.debug(log);
    else this.logger.warn(log);
    response.status(statusCode).json({ success: false, statusCode, message: normalized.message, error: normalized.error, details: normalized.details, requestId: request.requestId, path: request.url, timestamp: new Date().toISOString() });
  }

  private normalize(body: unknown, statusCode: number) {
    if (typeof body === 'string') return { message: body, error: this.defaultError(statusCode), details: undefined };
    if (body && typeof body === 'object') { const data = body as { message?: unknown; error?: unknown }; return { message: Array.isArray(data.message) ? 'Validation failed' : typeof data.message === 'string' ? data.message : this.defaultMessage(statusCode), error: typeof data.error === 'string' ? data.error : this.defaultError(statusCode), details: Array.isArray(data.message) ? data.message : data }; }
    return { message: this.defaultMessage(statusCode), error: this.defaultError(statusCode), details: undefined };
  }
  private defaultMessage(statusCode: number) { return statusCode === 500 ? 'Internal server error' : 'Request failed'; }
  private defaultError(statusCode: number) { return statusCode === 500 ? 'Internal Server Error' : 'Error'; }
}
