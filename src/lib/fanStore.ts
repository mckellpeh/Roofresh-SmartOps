import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { kv } from '@vercel/kv';
import { redisGet, redisSet } from './redisClient';

const execFileAsync = promisify(execFile);

export interface FanState {
  ip: string;
  state: 'on' | 'off';
  logs: string[];
}

const stateFilePath = path.join(process.cwd(), 'src/config/fan-state.json');

let cachedState: FanState | null = null;

export async function getFanState(): Promise<FanState> {
  // 1. Try standard Redis first
  if (process.env.REDIS_URL) {
    try {
      const state = await redisGet<FanState>('fan-state');
      if (state) {
        cachedState = state;
        return state;
      }
    } catch (error) {
      console.error('Failed to read fan state from Redis:', error);
    }
  }

  // 2. Try Vercel KV
  if (process.env.KV_REST_API_TOKEN) {
    try {
      const state = await kv.get<FanState>('fan-state');
      if (state) {
        cachedState = state;
        return state;
      }
    } catch (error) {
      console.error('Failed to read fan state from Vercel KV:', error);
    }
  }

  // 3. Fall back to memory cache or local file system
  if (cachedState !== null) {
    return cachedState;
  }

  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf8');
      cachedState = JSON.parse(data);
      return cachedState!;
    }
  } catch (error) {
    console.error('Failed to read fan state file:', error);
  }

  const defaultState: FanState = {
    ip: '192.168.1.84',
    state: 'off',
    logs: ['System: Fan state initialized.']
  };
  cachedState = defaultState;
  return defaultState;
}

export async function saveFanState(state: FanState) {
  cachedState = state;

  if (process.env.REDIS_URL) {
    try {
      const success = await redisSet('fan-state', state);
      if (success) return;
    } catch (error) {
      console.error('Failed to save fan state to Redis:', error);
    }
  }

  if (process.env.KV_REST_API_TOKEN) {
    try {
      await kv.set('fan-state', state);
      return;
    } catch (error) {
      console.error('Failed to save fan state to Vercel KV:', error);
    }
  }

  try {
    const dir = path.dirname(stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write fan state file:', error);
  }
}

export async function updateFanState(updates: Partial<FanState>): Promise<FanState> {
  const currentState = await getFanState();
  const newState = { ...currentState, ...updates };
  await saveFanState(newState);
  return newState;
}

export async function addFanLog(msg: string) {
  const state = await getFanState();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const logMessage = `[${time}] ${msg}`;
  const newLogs = [logMessage, ...state.logs.slice(0, 49)];
  await updateFanState({ logs: newLogs });
}

// Executes the local python KLAP control command
export async function executeTapoToggle(ip: string): Promise<{ success: boolean; state?: 'on' | 'off'; error?: string }> {
  try {
    const pythonScriptPath = path.join(process.cwd(), '.agents', 'skills', 'tapo-control', 'scripts', 'tapo_toggle.py');
    
    console.log(`[Fan Control] Executing Python Tapo toggle: python "${pythonScriptPath}" ${ip}`);
    
    const { stdout, stderr } = await execFileAsync('python', [pythonScriptPath, ip]);
    
    if (stderr && stderr.trim().length > 0) {
      console.warn('[Fan Control] Python stderr:', stderr);
    }

    const output = stdout.toString();
    console.log('[Fan Control] Python stdout:', output);

    if (output.includes('Successfully toggled Tapo plug!')) {
      const isNowOn = output.includes('Toggling power to: ON') || output.includes('Toggling power state to: ON');
      const nextState: 'on' | 'off' = isNowOn ? 'on' : 'off';
      return { success: true, state: nextState };
    } else {
      return { success: false, error: output || 'Unexpected script response' };
    }
  } catch (err: any) {
    console.error('[Fan Control] Failed to execute Tapo python script:', err);
    let errorMessage = err.message || 'Execution error';
    if (err.code === 'ENOENT') {
      errorMessage = 'Local control command cannot run in the cloud. Tapo smart plugs only accept commands over your local WiFi network. Please run this command using the local dashboard (http://localhost:3000) on your laptop on site.';
    }
    return { success: false, error: errorMessage };
  }
}
