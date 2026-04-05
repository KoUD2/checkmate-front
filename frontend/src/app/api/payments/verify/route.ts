import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json({ message: 'paymentId обязателен' }, { status: 400 });
  }

  const accessToken = request.cookies.get('accessToken')?.value;

  if (!accessToken) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiResponse = await fetch(
    `${BACKEND_URL}/payments/verify?paymentId=${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await apiResponse.json();
  return NextResponse.json(data, { status: apiResponse.status });
}
