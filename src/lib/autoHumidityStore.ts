import fs from 'fs';
import path from 'path';
import { getSwitchbotHeaders } from './switchbot';
import { kv } from '@vercel/kv';
import { redisGet, redisSet } from './redisClient';
import { CONTAINERS } from '@/config/containers';

export interface AutoHumidityState {
  enabled: boolean;
  targetHumidity: number;
  logs: string[];
  alertEmail: string;
  alertsEnabled: boolean;
  criticalLowHumidity: number;
  criticalHighHumidity: number;
  driftStartedAt: string | null;
  lastAlertSentAt: string | null;
  lastEvaluationTime: string | null;
  humidifierState: 'on' | 'off' | 'unknown';
  humidifierTurnedOnAt: string | null;
}

const STATE_FILE_PATH = path.join(process.cwd(), 'src/config/auto-humidity-state.json');

let inMemoryStore: Record<string, AutoHumidityState> | null = null;

async function loadStore(): Promise<Record<string, AutoHumidityState>> {
  if (process.env.REDIS_URL) {
    try {
      const store = await redisGet<Record<string, AutoHumidityState>>('auto-humidity-state');
      if (store) {
        inMemoryStore = store;
        return store;
      }
    } catch (err) {
      console.error('Failed to load auto humidity store from Redis', err);
    }
  }

  if (process.env.KV_REST_API_TOKEN) {
    try {
      const store = await kv.get<Record<string, AutoHumidityState>>('auto-humidity-state');
      if (store) {
        inMemoryStore = store;
        return store;
      }
    } catch (err) {
      console.error('Failed to load auto humidity store from Vercel KV', err);
    }
  }

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
    console.error('Failed to load auto humidity store from file', err);
  }

  inMemoryStore = {};
  return inMemoryStore;
}

async function saveStore(store: Record<string, AutoHumidityState>): Promise<void> {
  inMemoryStore = store;

  if (process.env.REDIS_URL) {
    try {
      const success = await redisSet('auto-humidity-state', store);
      if (success) return;
    } catch (err) {
      console.error('Failed to save auto humidity store to Redis', err);
    }
  }

  if (process.env.KV_REST_API_TOKEN) {
    try {
      await kv.set('auto-humidity-state', store);
      return;
    } catch (err) {
      console.error('Failed to save auto humidity store to Vercel KV', err);
    }
  }

  try {
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save auto humidity store to file', err);
  }
}

export async function getAutoHumidityState(containerId: string): Promise<AutoHumidityState> {
  const store = await loadStore();
  let state = store[containerId];
  if (!state) {
    state = {
      enabled: false,
      targetHumidity: 80,
      logs: [],
      alertEmail: '',
      alertsEnabled: false,
      criticalLowHumidity: 60,
      criticalHighHumidity: 95,
      driftStartedAt: null,
      lastAlertSentAt: null,
      lastEvaluationTime: null,
      humidifierState: 'unknown',
      humidifierTurnedOnAt: null,
    };
    store[containerId] = state;
    await saveStore(store);
  } else {
    let modified = false;
    if (state.alertEmail === undefined) { state.alertEmail = ''; modified = true; }
    if (state.alertsEnabled === undefined) { state.alertsEnabled = false; modified = true; }
    if (state.criticalLowHumidity === undefined) { state.criticalLowHumidity = 60; modified = true; }
    if (state.criticalHighHumidity === undefined) { state.criticalHighHumidity = 95; modified = true; }
    if (state.driftStartedAt === undefined) { state.driftStartedAt = null; modified = true; }
    if (state.lastAlertSentAt === undefined) { state.lastAlertSentAt = null; modified = true; }
    if (state.lastEvaluationTime === undefined) { state.lastEvaluationTime = null; modified = true; }
    if (state.humidifierState === undefined) { state.humidifierState = 'unknown'; modified = true; }
    if (state.humidifierTurnedOnAt === undefined) { state.humidifierTurnedOnAt = null; modified = true; }
    if (modified) {
      store[containerId] = state;
      await saveStore(store);
    }
  }
  return state;
}

export async function updateAutoHumidityState(containerId: string, updates: Partial<AutoHumidityState>): Promise<AutoHumidityState> {
  const store = await loadStore();
  const currentState = store[containerId] || {
    enabled: false,
    targetHumidity: 80,
    logs: [],
    alertEmail: '',
    alertsEnabled: false,
    criticalLowHumidity: 60,
    criticalHighHumidity: 95,
    driftStartedAt: null,
    lastAlertSentAt: null,
    lastEvaluationTime: null,
    humidifierState: 'unknown',
    humidifierTurnedOnAt: null,
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

export async function addHumidityLog(containerId: string, message: string) {
  const state = await getAutoHumidityState(containerId);
  const timestamp = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
  const logMessage = `[${timestamp}] ${message}`;
  
  await updateAutoHumidityState(containerId, {
    logs: [...state.logs, logMessage],
  });
}

async function sendHumidifierCommand(deviceId: string): Promise<boolean> {
  if (deviceId === 'Pending') {
    console.log(`[Automation] Mocking Humidifier Bot command: Device ID ${deviceId}`);
    return true;
  }
  
  try {
    const headers = getSwitchbotHeaders();
    const payload = {
      command: 'press',
      parameter: 'default',
      commandType: 'command'
    };

    const response = await fetch(`https://api.switch-bot.com/v1.1/devices/${deviceId}/commands`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`[Automation] SwitchBot Humidifier API failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.statusCode === 100 || data.message === 'success';
  } catch (error) {
    console.error('[Automation] Error sending Humidifier bot command:', error);
    return false;
  }
}

export async function evaluateAutoHumidity(containerId: string, currentHubHumidity: number, bypassRateLimit = false) {
  const state = await getAutoHumidityState(containerId);
  if (!state.enabled) return;

  const now = Date.now();
  const container = CONTAINERS.find(c => c.id === containerId);
  if (!container) return;

  // 1. Shutoff Timer Check (Strict 2-minute limit)
  if (state.humidifierState === 'on' && state.humidifierTurnedOnAt) {
    const turnedOnTime = new Date(state.humidifierTurnedOnAt).getTime();
    const elapsedMs = now - turnedOnTime;
    
    if (elapsedMs >= 120000) { // 2 minutes = 120,000 ms
      const success = await sendHumidifierCommand(container.humidifierOffId);
      if (success) {
        await updateAutoHumidityState(containerId, { 
          humidifierState: 'off',
          humidifierTurnedOnAt: null
        });
        await addHumidityLog(containerId, `Humidifier Auto-Shutoff: Successfully triggered OFF bot clicker after running for 2 minutes.`);
      } else {
        await addHumidityLog(containerId, `Humidifier Auto-Shutoff Alert: Attempted to trigger OFF bot clicker after 2 minutes, but API call failed.`);
      }
      return; // Stop processing further automation checks for this tick
    }
  }

  // 2. Evaluation Rate Limiting (Strictly check every 30 minutes, i.e., 1,800,000 ms)
  const lastEval = state.lastEvaluationTime ? new Date(state.lastEvaluationTime).getTime() : 0;
  const elapsedSinceLastEval = now - lastEval;
  if (!bypassRateLimit && state.lastEvaluationTime && elapsedSinceLastEval < 1800000) {
    console.log(`[Humidity Automation] Skipping evaluation loop. Only ${Math.round(elapsedSinceLastEval / 60000)}m has elapsed of the 30-minute rate limit.`);
    return;
  }

  // Lock evaluation timestamp immediately
  await updateAutoHumidityState(containerId, { lastEvaluationTime: new Date().toISOString() });

  const target = state.targetHumidity;
  const current = currentHubHumidity;

  const driftActive = current < target - 5 || current > target + 5;
  const isTooDry = current <= state.criticalLowHumidity;
  const isTooWet = current >= state.criticalHighHumidity;

  // Track Drift Duration
  let nextDriftStartedAt = state.driftStartedAt;
  if (driftActive) {
    if (!state.driftStartedAt) {
      nextDriftStartedAt = new Date().toISOString();
      await updateAutoHumidityState(containerId, { driftStartedAt: nextDriftStartedAt });
    }
  } else {
    if (state.driftStartedAt) {
      nextDriftStartedAt = null;
      await updateAutoHumidityState(containerId, { driftStartedAt: null });
    }
  }

  // 3. Safety Alerts: Critical Range Email Notification
  if (state.alertsEnabled && state.alertEmail && (isTooDry || isTooWet)) {
    const lastSent = state.lastAlertSentAt ? new Date(state.lastAlertSentAt).getTime() : 0;
    const elapsedAlertMinutes = (now - lastSent) / 60000;
    
    if (!state.lastAlertSentAt || elapsedAlertMinutes >= 120) {
      try {
        const { sendHumidityEmailAlert } = await import('./alerts');
        await sendHumidityEmailAlert({
          containerId,
          type: 'critical',
          currentHumidity: current,
          criticalLimit: isTooDry ? state.criticalLowHumidity : state.criticalHighHumidity
        });
      } catch (err) {
        console.error('[Humidity Automation] Failed to dispatch critical alert email:', err);
      }
    }
  }

  // 4. Safety Alerts: 1-Hour Humidity Drift Notification
  if (state.alertsEnabled && state.alertEmail && driftActive && nextDriftStartedAt) {
    const driftDurationMs = now - new Date(nextDriftStartedAt).getTime();
    if (driftDurationMs >= 3600000) { // 1 Hour
      const lastSent = state.lastAlertSentAt ? new Date(state.lastAlertSentAt).getTime() : 0;
      const elapsedAlertMinutes = (now - lastSent) / 60000;

      if (!state.lastAlertSentAt || elapsedAlertMinutes >= 120) {
        try {
          const { sendHumidityEmailAlert } = await import('./alerts');
          await sendHumidityEmailAlert({
            containerId,
            type: 'drift',
            currentHumidity: current,
            driftStartedAt: nextDriftStartedAt,
            targetHumidity: target
          });
        } catch (err) {
          console.error('[Humidity Automation] Failed to dispatch drift alert email:', err);
        }
      }
    }
  }

  const prefix = bypassRateLimit ? '[Manual Review] ' : '';

  // 5. Automated Controls Implementation
  // If humidity is below target - 5%, turn ON the humidifier (which runs for 2 minutes)
  if (current < target - 5) {
    if (state.humidifierState !== 'on') {
      const success = await sendHumidifierCommand(container.humidifierOnId);
      if (success) {
        await updateAutoHumidityState(containerId, { 
          humidifierState: 'on',
          humidifierTurnedOnAt: new Date().toISOString()
        });
        await addHumidityLog(containerId, `${prefix}Humidity too low (${current.toFixed(1)}% < Target ${target}% - 5%). Triggered Humidifier ON. Will run for strictly 2 minutes.`);
      } else {
        await addHumidityLog(containerId, `${prefix}Humidity too low (${current.toFixed(1)}%). Attempted to turn Humidifier ON but SwitchBot call failed.`);
      }
    } else {
      await addHumidityLog(containerId, `${prefix}Humidity too low (${current.toFixed(1)}%), but Humidifier is already active.`);
    }
  } else if (current > target + 5) {
    // If humidity is above target + 5%, turn OFF humidifier (if it is currently running)
    if (state.humidifierState === 'on') {
      const success = await sendHumidifierCommand(container.humidifierOffId);
      if (success) {
        await updateAutoHumidityState(containerId, { 
          humidifierState: 'off',
          humidifierTurnedOnAt: null
        });
        await addHumidityLog(containerId, `${prefix}Humidity too high (${current.toFixed(1)}% > Target ${target}% + 5%). Triggered Humidifier OFF.`);
      } else {
        await addHumidityLog(containerId, `${prefix}Humidity too high (${current.toFixed(1)}%). Attempted to turn Humidifier OFF but SwitchBot call failed.`);
      }
    } else {
      await addHumidityLog(containerId, `${prefix}Humidity is high (${current.toFixed(1)}%). Humidifier is already OFF.`);
    }
  } else {
    // Stable within target range
    await addHumidityLog(containerId, `${prefix}Humidity is stable at ${current.toFixed(1)}% (within Target ${target}% ± 5%). No correction needed.`);
  }
}
