import { NextResponse } from 'next/server';
import { getSwitchbotHeaders } from '@/lib/switchbot';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, command, parameter, commandType } = body;

    if (!deviceId || !command) {
      return NextResponse.json({ error: 'Missing deviceId or command' }, { status: 400 });
    }

    const headers = getSwitchbotHeaders();

    const payload = {
      command: command,
      parameter: parameter || 'default',
      commandType: commandType || 'command'
    };

    const response = await fetch(`https://api.switch-bot.com/v1.1/devices/${deviceId}/commands`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`SwitchBot API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error sending control command:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
