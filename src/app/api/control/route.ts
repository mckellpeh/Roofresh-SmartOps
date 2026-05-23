import { NextResponse } from 'next/server';
import { getSwitchbotHeaders } from '@/lib/switchbot';
import { CONTAINERS } from '@/config/containers';
import { addLog, updateAutoTempState } from '@/lib/autoTempStore';

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

    // Log manual change in auto temp state if command was successful
    const container = CONTAINERS.find(c => c.acId === deviceId);
    if (container && command === 'setAll' && parameter) {
      try {
        const parts = parameter.split(',');
        if (parts.length >= 4) {
          const temp = parseInt(parts[0]);
          const modeVal = parseInt(parts[1]);
          const fanSpeedVal = parseInt(parts[2]);
          const powerState = parts[3].toUpperCase();

          const modeLabels: Record<number, string> = { 1: 'Auto', 2: 'Cool', 3: 'Dry', 4: 'Fan', 5: 'Heat' };
          const fanLabels: Record<number, string> = { 1: 'Auto', 2: 'Low', 3: 'Medium', 4: 'High' };

          const modeStr = modeLabels[modeVal] || 'Cool';
          const fanStr = fanLabels[fanSpeedVal] || 'Auto';

          const logMsg = `[Manual Override] Air Conditioner set manually to ${temp}°C (Mode: ${modeStr}, Fan: ${fanStr}, Power: ${powerState}).`;
          
          addLog(container.id, logMsg);
          updateAutoTempState(container.id, { lastAcTemperature: temp });
        }
      } catch (err) {
        console.error('Error logging manual control override:', err);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error sending control command:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

