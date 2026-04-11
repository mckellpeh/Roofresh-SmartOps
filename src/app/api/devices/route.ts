import { NextResponse } from 'next/server';
import { getSwitchbotHeaders } from '@/lib/switchbot';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId') || process.env.SWITCHBOT_HUB_ID;
    
    if (!hubId) throw new Error('No Hub ID provided or configured');

    const headers = getSwitchbotHeaders();

    // Fetch Hub 2 status for temperature and humidity
    const response = await fetch(`https://api.switch-bot.com/v1.1/devices/${hubId}/status`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`SwitchBot API returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
