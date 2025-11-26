import type { FastifyReply } from 'fastify';

export class SSEStream {
  constructor(
    private readonly reply: FastifyReply,
    private readonly origin?: string
  ) {}

  open(): void {
    // Set CORS headers explicitly for SSE responses
    if (this.origin) {
      this.reply.raw.setHeader('Access-Control-Allow-Origin', this.origin);
      const existingVary = this.reply.raw.getHeader('Vary');
      const varyValue = existingVary
        ? `${Array.isArray(existingVary) ? existingVary.join(', ') : String(existingVary)}, Origin`
        : 'Origin';
      this.reply.raw.setHeader('Vary', varyValue);
    } else {
      this.reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    }
    this.reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');

    this.reply.raw.setHeader('Content-Type', 'text/event-stream');
    this.reply.raw.setHeader('Cache-Control', 'no-cache');
    this.reply.raw.setHeader('Connection', 'keep-alive');
    this.reply.raw.flushHeaders?.();
  }

  send(payload: { type: string; data: unknown }): void {
    this.reply.raw.write(`event: ${payload.type}\n`);
    this.reply.raw.write(`data: ${JSON.stringify(payload.data)}\n\n`);
  }

  close(): void {
    this.reply.raw.end();
  }
}
