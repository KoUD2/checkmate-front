import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetUrl = `${BACKEND_URL}/${path.join('/')}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    duplex: 'half',
  } as RequestInit & { duplex: string });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('transfer-encoding');

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
