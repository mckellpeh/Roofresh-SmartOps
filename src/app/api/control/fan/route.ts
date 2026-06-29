import { NextRequest, NextResponse } from 'next/server';
import { getFanState, updateFanState, addFanLog, executeTapoToggle } from '@/lib/fanStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await getFanState();
    return NextResponse.json(state);
  } catch (error: any) {
    console.error('Failed to get fan state:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ip } = body;
    const currentState = await getFanState();

    if (ip !== undefined && ip !== currentState.ip) {
      // Update IP address config
      await updateFanState({ ip });
      await addFanLog(`Settings Update: Tapo IP Address re-mapped to: ${ip}`);
      const finalState = await getFanState();
      return NextResponse.json(finalState);
    }

    if (action === 'toggle') {
      const targetIp = currentState.ip;
      if (!targetIp) {
        return NextResponse.json({ error: 'Device IP address is not configured.' }, { status: 400 });
      }

      // Execute local python KLAP control command
      const result = await executeTapoToggle(targetIp);
      
      if (result.success && result.state) {
        await updateFanState({ state: result.state });
        await addFanLog(`Manual Toggle: Successfully switched Fan ${result.state.toUpperCase()}`);
        const finalState = await getFanState();
        return NextResponse.json(finalState);
      } else {
        await addFanLog(`Manual Toggle Alert: Failed to switch Fan. Error: ${result.error || 'Unknown error'}`);
        return NextResponse.json({ error: result.error || 'Failed to communicate with plug.' }, { status: 502 });
      }
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating fan state:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
