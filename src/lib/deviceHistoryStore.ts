import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';
import { redisGet, redisSet } from './redisClient';

export interface HistoryPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
}

export interface DeviceHistory {
  [containerId: string]: HistoryPoint[];
}

const historyFilePath = path.join(process.cwd(), 'src/config/device-history.json');

// Initialize with a beautiful set of 42 points representing a realistic 7-day week of fluctuations
function generateMockHistory(containerId: string, baseTemp: number, baseHumid: number): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const now = Date.now();
  // 7 days * 24 hours = 168 hours. A point every 4 hours gives 42 beautifully detailed points.
  for (let i = 42; i >= 0; i--) {
    const time = new Date(now - i * 4 * 3600 * 1000);
    const hour = time.getHours();
    const dayOffset = time.getDay();
    // Nice sinusoidal waves for daily day/night cycles + long-term weekly climate variations
    const tempVar = Math.sin((hour - 8) * Math.PI / 12) * 1.5 + Math.sin(dayOffset * Math.PI / 3.5) * 1.0;
    const humidVar = Math.cos((hour - 8) * Math.PI / 12) * 3 + Math.cos(dayOffset * Math.PI / 3.5) * 2;
    
    points.push({
      timestamp: time.toISOString(),
      temperature: parseFloat((baseTemp + tempVar + (Math.random() - 0.5) * 0.4).toFixed(1)),
      humidity: Math.round(baseHumid + humidVar + (Math.random() - 0.5) * 2)
    });
  }
  return points;
}

let cachedHistory: DeviceHistory | null = null;

export async function getDeviceHistory(): Promise<DeviceHistory> {
  // 1. Try standard Redis first if configured
  if (process.env.REDIS_URL) {
    try {
      const history = await redisGet<DeviceHistory>('device-history');
      if (history) {
        cachedHistory = history;
        return history;
      }
    } catch (error) {
      console.error('Failed to read device history from Redis:', error);
    }
  }

  // 2. Try Vercel KV if available (Production/Staging)
  if (process.env.KV_REST_API_TOKEN) {
    try {
      const history = await kv.get<DeviceHistory>('device-history');
      if (history) {
        cachedHistory = history;
        return history;
      }
    } catch (error) {
      console.error('Failed to read device history from Vercel KV:', error);
    }
  }

  // 2. Fall back to local file system or memory cache
  if (cachedHistory !== null) {
    return cachedHistory;
  }

  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, 'utf8');
      cachedHistory = JSON.parse(data);
      return cachedHistory!;
    }
  } catch (error) {
    console.error('Failed to read device history file, generating mock data...', error);
  }

  // Pre-populate with beautiful mock data if no file exists (only Container 1 is live)
  const mockData: DeviceHistory = {
    'container-left': generateMockHistory('container-left', 25.8, 85),
    'container-right': []
  };
  
  await saveDeviceHistory(mockData);
  cachedHistory = mockData;
  return mockData;
}

export async function saveDeviceHistory(history: DeviceHistory) {
  cachedHistory = history;

  // 1. Try standard Redis first if configured
  if (process.env.REDIS_URL) {
    try {
      const success = await redisSet('device-history', history);
      if (success) return;
    } catch (error) {
      console.error('Failed to save device history to Redis:', error);
    }
  }

  // 2. Try Vercel KV if available (Production/Staging)
  if (process.env.KV_REST_API_TOKEN) {
    try {
      await kv.set('device-history', history);
      return;
    } catch (error) {
      console.error('Failed to save device history to Vercel KV:', error);
    }
  }

  // 2. Fall back to local file system (Local Dev)
  try {
    const dir = path.dirname(historyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write device history file:', error);
  }
}


export async function addHistoryPoint(containerId: string, temperature: number, humidity: number) {
  const history = await getDeviceHistory();
  if (!history[containerId]) {
    history[containerId] = [];
  }
  
  // Append new point
  history[containerId].push({
    timestamp: new Date().toISOString(),
    temperature,
    humidity
  });
  
  // Keep only the last 500 points (approx 2 months of hourly logs, or plenty of week-long high-frequency logs!)
  if (history[containerId].length > 500) {
    history[containerId] = history[containerId].slice(-500);
  }
  
  await saveDeviceHistory(history);
  return history;
}
