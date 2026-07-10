import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { structuredLog } from '@Gharazi/shared-utils/structured-logger';

export type RequestWithContext = Request & { requestId?: string; user?: { id?: string } };

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const incoming = request.header('x-request-id');
    const requestId = incoming && /^[a-zA-Z0-9._:-]{1,120}$/.test(incoming) ? incoming : `req_${randomUUID()}`;
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    const started = Date.now();
    response.on('finish', () => {
      const durationMs = Date.now() - started;
      const statusCode = response.statusCode;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 && ![401, 403].includes(statusCode) ? 'warn' : durationMs > 1000 ? 'warn' : 'log';
      structuredLog(level, 'api', 'HttpRequest', 'request.completed', { requestId, method: request.method, path: request.originalUrl.split('?')[0], statusCode, durationMs, userId: request.user?.id, action: durationMs > 1000 ? 'slow_request' : 'request' });
    });
    next();
  }
}
