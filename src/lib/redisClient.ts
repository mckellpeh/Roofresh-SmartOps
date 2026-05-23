import { createClient } from 'redis';

let redisClient: any = null;

export async function getRedisClient() {
  if (redisClient) return redisClient;
  if (!process.env.REDIS_URL) return null;
  
  try {
    console.log('[Redis] Initializing standard Redis client...');
    const isTls = process.env.REDIS_URL.startsWith('rediss://');
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: isTls ? {
        tls: true,
        rejectUnauthorized: false
      } : undefined
    });
    
    client.on('error', (err) => console.error('[Redis] Client Error:', err));
    await client.connect();
    
    redisClient = client;
    console.log('[Redis] Client successfully connected and ready.');
    return redisClient;
  } catch (err) {
    console.error('[Redis] Connection failed:', err);
    return null;
  }
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) return null;
  
  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`[Redis] Failed to GET key "${key}":`, err);
    return null;
  }
}

export async function redisSet(key: string, value: any): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  
  try {
    const dataStr = JSON.stringify(value);
    await client.set(key, dataStr);
    return true;
  } catch (err) {
    console.error(`[Redis] Failed to SET key "${key}":`, err);
    return false;
  }
}
