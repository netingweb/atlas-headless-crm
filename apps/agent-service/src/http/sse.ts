import type { FastifyReply } from 'fastify';

export class SSEStream {
  constructor(private readonly reply: FastifyReply) {}

  open(): void {
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

