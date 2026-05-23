import { NextResponse } from 'next/server';
import { getAutoTempState, updateAutoTempState, addLog } from '@/lib/autoTempStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');
    if (!containerId) {
      return NextResponse.json({ error: 'Missing containerId' }, { status: 400 });
    }
    const state = getAutoTempState(containerId);
    return NextResponse.json(state);
  } catch (error: any) {
    console.error('Error getting auto temp state:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { containerId, enabled, targetTemperature, lastAcTemperature, alertEmail, alertsEnabled, criticalLowTemp, criticalHighTemp } = body;
    if (!containerId) {
      return NextResponse.json({ error: 'Missing containerId' }, { status: 400 });
    }

    const currentState = getAutoTempState(containerId);
    const updates: any = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (targetTemperature !== undefined) updates.targetTemperature = targetTemperature;
    if (lastAcTemperature !== undefined) updates.lastAcTemperature = lastAcTemperature;
    if (alertEmail !== undefined) updates.alertEmail = alertEmail;
    if (alertsEnabled !== undefined) updates.alertsEnabled = alertsEnabled;
    if (criticalLowTemp !== undefined) updates.criticalLowTemp = criticalLowTemp;
    if (criticalHighTemp !== undefined) updates.criticalHighTemp = criticalHighTemp;

    const newState = updateAutoTempState(containerId, updates);

    // Log toggle changes
    if (enabled !== undefined && enabled !== currentState.enabled) {
      addLog(containerId, `Automation settings modified. System is now ${enabled ? 'Active' : 'Deactivated'}.`);
    }
    
    // Log alert toggle changes
    if (alertsEnabled !== undefined && alertsEnabled !== currentState.alertsEnabled) {
      addLog(containerId, `Alert notifications system toggled ${alertsEnabled ? 'ON' : 'OFF'}.`);
    }
    
    // Log alert settings changes
    if (alertEmail !== undefined && alertEmail !== currentState.alertEmail) {
      if (alertEmail) {
        addLog(containerId, `Alert notification email set to: ${alertEmail}`);
      } else {
        addLog(containerId, `Alert email cleared (email notifications deactivated).`);
      }
    }
    
    if (criticalLowTemp !== undefined && criticalLowTemp !== currentState.criticalLowTemp) {
      addLog(containerId, `Critical low temperature safety limit adjusted to: ${criticalLowTemp}°C`);
    }
    
    if (criticalHighTemp !== undefined && criticalHighTemp !== currentState.criticalHighTemp) {
      addLog(containerId, `Critical high temperature safety limit adjusted to: ${criticalHighTemp}°C`);
    }

    return NextResponse.json(newState);
  } catch (error: any) {
    console.error('Error updating auto temp state:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
