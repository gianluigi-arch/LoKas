import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transactionIds?: string[] };
    const transactionIds = Array.isArray(body.transactionIds)
      ? body.transactionIds.filter((id): id is string => typeof id === 'string')
      : [];

    return NextResponse.json({
      ok: true,
      syncedIds: transactionIds,
      syncedAt: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Payload sinkronisasi tidak valid' },
      { status: 400 }
    );
  }
}
