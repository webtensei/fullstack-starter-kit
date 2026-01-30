import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing request ID from header or generate new one
    const requestId = req.headers['x-request-id'] || randomUUID();
    
    // Attach to request object
    (req as any).id = requestId;
    
    // Add to response headers for client tracing
    res.setHeader('X-Request-ID', requestId);
    
    next();
  }
}
