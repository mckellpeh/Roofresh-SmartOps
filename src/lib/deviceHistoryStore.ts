import fs from 'fs';
import path from 'path';

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

export function getDeviceHistory(): DeviceHistory {
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read device history file, generating mock data...', error);
  }

  // Pre-populate with beautiful mock data if no file exists (only Container 1 is live)
  const mockData: DeviceHistory = {
    'container-left': generateMockHistory('container-left', 25.8, 85),
    'container-right': []
  };
  
  saveDeviceHistory(mockData);
  return mockData;
}

export function saveDeviceHistory(history: DeviceHistory) {
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

export function addHistoryPoint(containerId: string, temperature: number, humidity: number) {
  const history = getDeviceHistory();
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
  
  saveDeviceHistory(history);
  return history;
}
