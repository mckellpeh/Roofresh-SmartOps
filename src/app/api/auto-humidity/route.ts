import { NextResponse } from 'next/server';
import { getAutoHumidityState, updateAutoHumidityState, addHumidityLog } from '@/lib/autoHumidityStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');
    if (!containerId) {
      return NextResponse.json({ error: 'Missing containerId' }, { status: 400 });
    }
    const state = await getAutoHumidityState(containerId);
    return NextResponse.json(state);
  } catch (error: any) {
    console.error('Error getting auto humidity state:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { containerId, enabled, targetHumidity, alertEmail, alertsEnabled, criticalLowHumidity, criticalHighHumidity } = body;
    if (!containerId) {
      return NextResponse.json({ error: 'Missing containerId' }, { status: 400 });
    }

    const currentState = await getAutoHumidityState(containerId);
    const updates: any = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (targetHumidity !== undefined) updates.targetHumidity = targetHumidity;
    if (alertEmail !== undefined) updates.alertEmail = alertEmail;
    if (alertsEnabled !== undefined) updates.alertsEnabled = alertsEnabled;
    if (criticalLowHumidity !== undefined) updates.criticalLowHumidity = criticalLowHumidity;
    if (criticalHighHumidity !== undefined) updates.criticalHighHumidity = criticalHighHumidity;

    const newState = await updateAutoHumidityState(containerId, updates);

    // Log toggle changes
    if (enabled !== undefined && enabled !== currentState.enabled) {
      await addHumidityLog(containerId, `Automation settings modified. System is now ${enabled ? 'Active' : 'Deactivated'}.`);
    }
    
    // Log alert toggle changes
    if (alertsEnabled !== undefined && alertsEnabled !== currentState.alertsEnabled) {
      await addHumidityLog(containerId, `Alert notifications system toggled ${alertsEnabled ? 'ON' : 'OFF'}.`);
    }
    
    // Log alert settings changes
    if (alertEmail !== undefined && alertEmail !== currentState.alertEmail) {
      if (alertEmail) {
        await addHumidityLog(containerId, `Alert notification email set to: ${alertEmail}`);
      } else {
        await addHumidityLog(containerId, `Alert email cleared (email notifications deactivated).`);
      }
    }
    
    if (criticalLowHumidity !== undefined && criticalLowHumidity !== currentState.criticalLowHumidity) {
      await addHumidityLog(containerId, `Critical low humidity safety limit adjusted to: ${criticalLowHumidity}%`);
    }
    
    if (criticalHighHumidity !== undefined && criticalHighHumidity !== currentState.criticalHighHumidity) {
      await addHumidityLog(containerId, `Critical high humidity safety limit adjusted to: ${criticalHighHumidity}%`);
    }

    return NextResponse.json(newState);
  } catch (error: any) {
    console.error('Error updating auto humidity state:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
