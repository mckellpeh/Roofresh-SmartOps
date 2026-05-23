import fs from 'fs';
import path from 'path';
import { getSwitchbotHeaders } from './switchbot';
import { kv } from '@vercel/kv';

export interface AutoTempState {
  enabled: boolean;
  targetTemperature: number;
  lastAcTemperature: number;
  logs: string[];
  alertEmail: string;
  alertsEnabled: boolean;
  criticalLowTemp: number;
  criticalHighTemp: number;
  driftStartedAt: string | null;
  lastAlertSentAt: string | null;
  lastEvaluationTime: string | null;
}

const STATE_FILE_PATH = path.join(process.cwd(), 'src/config/auto-temp-state.json');

// In-memory fallback and cache for fast access and read-only environment persistence
let inMemoryStore: Record<string, AutoTempState> | null = null;

async function loadStore(): Promise<Record<string, AutoTempState>> {
  // 1. Try Vercel KV if available (Production/Staging)
  if (process.env.KV_REST_API_TOKEN) {
    try {
      const store = await kv.get<Record<string, AutoTempState>>('auto-temp-state');
      if (store) {
        inMemoryStore = store;
        return store;
      }
    } catch (err) {
      console.error('Failed to load auto temp store from Vercel KV', err);
    }
  }

  // 2. Fall back to local memory cache or local file
  if (inMemoryStore !== null) {
    return inMemoryStore;
  }

  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      inMemoryStore = JSON.parse(data);
      return inMemoryStore!;
    }
  } catch (err) {
    console.error('Failed to load auto temp store from file', err);
  }

  inMemoryStore = {};
  return inMemoryStore;
}

async function saveStore(store: Record<string, AutoTempState>): Promise<void> {
  inMemoryStore = store;

  // 1. Try Vercel KV if available (Production/Staging)
  if (process.env.KV_REST_API_TOKEN) {
    try {
      await kv.set('auto-temp-state', store);
      return;
    } catch (err) {
      console.error('Failed to save auto temp store to Vercel KV', err);
    }
  }

  // 2. Fall back to local file system (Local Dev)
  try {
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save auto temp store to file', err);
  }
}

export async function getAutoTempState(containerId: string): Promise<AutoTempState> {
  const store = await loadStore();
  let state = store[containerId];
  if (!state) {
    state = {
      enabled: false,
      targetTemperature: 24,
      lastAcTemperature: 24,
      logs: [],
      alertEmail: '',
      alertsEnabled: false,
      criticalLowTemp: 18,
      criticalHighTemp: 28,
      driftStartedAt: null,
      lastAlertSentAt: null,
      lastEvaluationTime: null,
    };
    store[containerId] = state;
    await saveStore(store);
  } else {
    // Fill in defaults for missing fields dynamically
    let modified = false;
    if (state.alertEmail === undefined) { state.alertEmail = ''; modified = true; }
    if (state.alertsEnabled === undefined) { state.alertsEnabled = false; modified = true; }
    if (state.criticalLowTemp === undefined) { state.criticalLowTemp = 18; modified = true; }
    if (state.criticalHighTemp === undefined) { state.criticalHighTemp = 28; modified = true; }
    if (state.driftStartedAt === undefined) { state.driftStartedAt = null; modified = true; }
    if (state.lastAlertSentAt === undefined) { state.lastAlertSentAt = null; modified = true; }
    if (state.lastEvaluationTime === undefined) { state.lastEvaluationTime = null; modified = true; }
    if (modified) {
      store[containerId] = state;
      await saveStore(store);
    }
  }
  return state;
}

export async function updateAutoTempState(containerId: string, updates: Partial<AutoTempState>): Promise<AutoTempState> {
  const store = await loadStore();
  const currentState = store[containerId] || {
    enabled: false,
    targetTemperature: 24,
    lastAcTemperature: 24,
    logs: [],
    alertEmail: '',
    alertsEnabled: false,
    criticalLowTemp: 18,
    criticalHighTemp: 28,
    driftStartedAt: null,
    lastAlertSentAt: null,
    lastEvaluationTime: null,
  };
  
  const newState = {
    ...currentState,
    ...updates,
    logs: (updates.logs !== undefined ? updates.logs : currentState.logs).slice(-50),
  };
  
  store[containerId] = newState;
  await saveStore(store);
  return newState;
}

export async function addLog(containerId: string, message: string) {
  const state = await getAutoTempState(containerId);
  const timestamp = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
  const logMessage = `[${timestamp}] ${message}`;
  
  await updateAutoTempState(containerId, {
    logs: [...state.logs, logMessage],
  });
}

async function sendAcControlCommand(acId: string, temp: number): Promise<boolean> {
  if (acId === 'Pending') {
    console.log(`[Automation] Mocking AC command for pending container: Temp ${temp}°C`);
    return true;
  }
  
  try {
    const headers = getSwitchbotHeaders();
    // Mode 2: Cool, Fan Speed 1: Auto, Power: ON
    const commandStr = `${temp},2,1,on`;
    const payload = {
      command: 'setAll',
      parameter: commandStr,
      commandType: 'command'
    };

    const response = await fetch(`https://api.switch-bot.com/v1.1/devices/${acId}/commands`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`[Automation] SwitchBot API command failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.statusCode === 100 || data.message === 'success';
  } catch (error) {
    console.error('[Automation] Error sending AC command in evaluateAutoTemp:', error);
    return false;
  }
}

export async function evaluateAutoTemp(containerId: string, currentHubTemp: number, acId: string, bypassRateLimit = false) {
  const state = await getAutoTempState(containerId);
  if (!state.enabled) return;

  // Rate limit: strictly evaluate and adjust at most once every 10 minutes (600,000 ms) unless bypassed manually
  const now = Date.now();
  const lastEval = state.lastEvaluationTime ? new Date(state.lastEvaluationTime).getTime() : 0;
  const elapsedMs = now - lastEval;
  if (!bypassRateLimit && state.lastEvaluationTime && elapsedMs < 600000) {
    console.log(`[Automation] Skipping evaluation for ${containerId}. Only ${Math.round(elapsedMs / 1000)}s has elapsed since last adjustment check (10 min limit).`);
    return;
  }

  // Update evaluation timestamp immediately to lock other triggers out
  await updateAutoTempState(containerId, { lastEvaluationTime: new Date().toISOString() });

  const target = state.targetTemperature;
  const current = currentHubTemp;
  const lastAc = state.lastAcTemperature;

  const driftActive = current > target + 1 || current < target - 1;
  const isTooHotAlert = current >= state.criticalHighTemp;
  const isTooColdAlert = current <= state.criticalLowTemp;

  // Track Drift Duration
  let nextDriftStartedAt = state.driftStartedAt;
  if (driftActive) {
    if (!state.driftStartedAt) {
      nextDriftStartedAt = new Date().toISOString();
      await updateAutoTempState(containerId, { driftStartedAt: nextDriftStartedAt });
    }
  } else {
    if (state.driftStartedAt) {
      nextDriftStartedAt = null;
      await updateAutoTempState(containerId, { driftStartedAt: null });
    }
  }

  // 1. Check for Immediate Critical Temperature Alert (Too Hot or Too Cold)
  if (state.alertsEnabled && state.alertEmail && (isTooHotAlert || isTooColdAlert)) {
    const lastSent = state.lastAlertSentAt ? new Date(state.lastAlertSentAt).getTime() : 0;
    const elapsedMinutes = (Date.now() - lastSent) / 60000;
    
    // Dispatch every 2 hours (120 minutes) if condition persists
    if (!state.lastAlertSentAt || elapsedMinutes >= 120) {
      try {
        const { sendEmailAlert } = await import('./alerts');
        await sendEmailAlert({
          containerId,
          type: 'critical',
          currentTemp: current,
          criticalLimit: isTooHotAlert ? state.criticalHighTemp : state.criticalLowTemp
        });
      } catch (err) {
        console.error('[Automation] Failed to import alert system:', err);
      }
    }
  }

  // 2. Check for 1-Hour Temperature Drift Alert
  if (state.alertsEnabled && state.alertEmail && driftActive && nextDriftStartedAt) {
    const driftDurationMs = Date.now() - new Date(nextDriftStartedAt).getTime();
    // 60 minutes = 3600000 ms
    if (driftDurationMs >= 3600000) {
      const lastSent = state.lastAlertSentAt ? new Date(state.lastAlertSentAt).getTime() : 0;
      const elapsedMinutes = (Date.now() - lastSent) / 60000;

      // Dispatch every 2 hours (120 minutes) if drift remains unresolved
      if (!state.lastAlertSentAt || elapsedMinutes >= 120) {
        try {
          const { sendEmailAlert } = await import('./alerts');
          await sendEmailAlert({
            containerId,
            type: 'drift',
            currentTemp: current,
            driftStartedAt: nextDriftStartedAt,
            targetTemp: target
          });
        } catch (err) {
          console.error('[Automation] Failed to import alert system:', err);
        }
      }
    }
  }

  // Drift check: +-1°C
  const prefix = bypassRateLimit ? '[Manual Review] ' : '';

  if (current > target + 1) {
    // Too hot! Decrease AC target temp to cool down
    const newAcTemp = Math.max(16, lastAc - 1);
    
    if (newAcTemp !== lastAc || !state.logs.length) {
      const success = await sendAcControlCommand(acId, newAcTemp);
      if (success) {
        await updateAutoTempState(containerId, { lastAcTemperature: newAcTemp });
        await addLog(containerId, `${prefix}Temp too high (${current.toFixed(1)}°C > Target ${target}°C + 1°C). Automatically decreased AC setting to ${newAcTemp}°C to cool.`);
      } else {
        await addLog(containerId, `${prefix}Temp too high (${current.toFixed(1)}°C). Attempted to cool but AC command failed.`);
      }
    } else {
      // AC is already set to the coldest setting
      const lastLog = state.logs[state.logs.length - 1];
      if (!lastLog || !lastLog.includes('already at its minimum') || bypassRateLimit) {
        await addLog(containerId, `${prefix}Temp too high (${current.toFixed(1)}°C), but AC is already at its minimum setting (${newAcTemp}°C).`);
      }
    }
  } else if (current < target - 1) {
    // Too cold! Increase AC target temp to warm up
    const newAcTemp = Math.min(30, lastAc + 1);
    
    if (newAcTemp !== lastAc || !state.logs.length) {
      const success = await sendAcControlCommand(acId, newAcTemp);
      if (success) {
        await updateAutoTempState(containerId, { lastAcTemperature: newAcTemp });
        await addLog(containerId, `${prefix}Temp too low (${current.toFixed(1)}°C < Target ${target}°C - 1°C). Automatically increased AC setting to ${newAcTemp}°C to warm.`);
      } else {
        await addLog(containerId, `${prefix}Temp too low (${current.toFixed(1)}°C). Attempted to warm but AC command failed.`);
      }
    } else {
      // AC is already set to the warmest setting
      const lastLog = state.logs[state.logs.length - 1];
      if (!lastLog || !lastLog.includes('already at its maximum') || bypassRateLimit) {
        await addLog(containerId, `${prefix}Temp too low (${current.toFixed(1)}°C), but AC is already at its maximum setting (${newAcTemp}°C).`);
      }
    }
  } else {
    // In range
    await addLog(containerId, `${prefix}Temp is stable at ${current.toFixed(1)}°C (within Target ${target}°C ± 1°C). No adjustment needed.`);
  }
}
