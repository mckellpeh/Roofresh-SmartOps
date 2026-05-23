import { NextResponse } from 'next/server';
import { getDeviceHistory } from '@/lib/deviceHistoryStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const history = await getDeviceHistory();
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Failed to get history logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
