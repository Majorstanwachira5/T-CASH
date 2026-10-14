import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'unreachable';
    console.error('Healthcheck DB connection error:', error instanceof Error ? error.message : 'Unknown');
  }

  const isHealthy = dbStatus === 'healthy';
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'T CPI Application Backend',
      version: '1.0.0',
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      },
      responseTimeMs: Date.now() - startTime,
    },
    { status: statusCode }
  );
}
