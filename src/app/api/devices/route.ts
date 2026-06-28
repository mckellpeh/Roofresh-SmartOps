import { NextResponse } from 'next/server';
import { getSwitchbotHeaders } from '@/lib/switchbot';
import { CONTAINERS } from '@/config/containers';
import { evaluateAutoTemp } from '@/lib/autoTempStore';
import { evaluateAutoHumidity } from '@/lib/autoHumidityStore';
import { addHistoryPoint } from '@/lib/deviceHistoryStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId') || process.env.SWITCHBOT_HUB_ID;
    const manual = searchParams.get('manual') === 'true';
    
    if (!hubId) throw new Error('No Hub ID provided or configured');

    const headers = getSwitchbotHeaders();

    // Fetch Hub 2 status for temperature and humidity
    const response = await fetch(`https://api.switch-bot.com/v1.1/devices/${hubId}/status`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`SwitchBot API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Check and trigger temperature automation if container is mapped
    const container = CONTAINERS.find(c => c.hubId === hubId);
    if (container && data.body && typeof data.body.temperature === 'number') {
      try {
        const humidity = typeof data.body.humidity === 'number' ? data.body.humidity : 0;
        // Record reading to SwitchBot database log history
        await addHistoryPoint(container.id, data.body.temperature, humidity);
        
        await evaluateAutoTemp(container.id, data.body.temperature, container.acId, manual);
        await evaluateAutoHumidity(container.id, humidity, manual);
      } catch (evalErr) {
        console.error(`[Automation] Error during evaluation for container ${container.id}:`, evalErr);
      }
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
