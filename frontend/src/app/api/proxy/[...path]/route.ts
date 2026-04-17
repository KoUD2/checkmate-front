import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

function proxyFetch(targetUrl: string, method: string, headers: Record<string, string>, body?: Buffer): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: url.hostname.replace(/^\[|\]$/g, ''),
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const resHeaders: Record<string, string> = {};
        Object.entries(res.headers).forEach(([k, v]) => {
          if (k !== 'transfer-encoding' && v) {
            resHeaders[k] = Array.isArray(v) ? v.join(', ') : v;
          }
        });
        resolve({ status: res.statusCode ?? 200, headers: resHeaders, body: Buffer.concat(chunks) });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetUrl = `${BACKEND_URL}/${path.join('/')}${request.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const STRIP_HEADERS = ['host', 'connection', 'transfer-encoding', 'keep-alive', 'upgrade', 'if-none-match', 'if-modified-since'];
  request.headers.forEach((value, key) => {
    if (!STRIP_HEADERS.includes(key)) {
      headers[key] = value;
    }
  });

  const bodyBuf = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : Buffer.from(await request.arrayBuffer());

  const result = await proxyFetch(targetUrl, request.method, headers, bodyBuf);

  return new NextResponse(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
