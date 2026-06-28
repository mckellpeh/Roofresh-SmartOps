'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import { CONTAINERS, Container } from '@/config/containers';

interface HubData {
  temperature: number;
  humidity: number;
}

function ContainerOverview({ container }: { container: Container }) {
  const [hubData, setHubData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHubData = async () => {
      try {
        const res = await fetch(`/api/devices?hubId=${container.hubId}`);
        const data = await res.json();
        if (data.body) {
          setHubData({
            temperature: data.body.temperature || 0,
            humidity: data.body.humidity || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch hub data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHubData();
    const interval = setInterval(fetchHubData, 30000);
    return () => clearInterval(interval);
  }, [container.hubId]);

  return (
    <Link href={`/containers/${container.id}`} className={styles.containerLink}>
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Image 
            src={container.imageUrl} 
            alt={container.name} 
            width={80} 
            height={80} 
            style={{ borderRadius: '12px', objectFit: 'cover' }}
          />
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '8px' }}>{container.name}</h2>
            <p style={{ color: 'var(--text-muted)' }}>Click to view options</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>🌡️</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {loading ? '...' : `${hubData?.temperature}°C`}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TEMP</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>💧</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {loading ? '...' : `${hubData?.humidity}%`}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>HUMIDITY</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const [weatherData, setWeatherData] = useState<{ temperature: number; humidity: number; weatherCode: number } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=1.374361&longitude=103.952501&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia/Singapore');
        const data = await res.json();
        if (data.current) {
          setWeatherData({
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m,
            weatherCode: data.current.weather_code
          });
        }
      } catch (err) {
        console.error('Failed to fetch weather on landing page', err);
      }
    };
    fetchWeather();
    // Refresh weather every 5 minutes
    const weatherInterval = setInterval(fetchWeather, 300000);
    return () => clearInterval(weatherInterval);
  }, []);

  function getWeatherDescription(code: number): { label: string; emoji: string } {
    if (code === 0) return { label: 'Clear Sky', emoji: '☀️' };
    if (code === 1 || code === 2 || code === 3) return { label: 'Partly Cloudy', emoji: '⛅' };
    if (code === 45 || code === 48) return { label: 'Foggy', emoji: '🌫️' };
    if (code >= 51 && code <= 55) return { label: 'Drizzle', emoji: '🌦️' };
    if (code >= 61 && code <= 65) return { label: 'Rainy', emoji: '🌧️' };
    if (code >= 80 && code <= 82) return { label: 'Showers', emoji: '🌦️' };
    if (code === 95 || code === 96 || code === 99) return { label: 'Thunderstorm', emoji: '⛈️' };
    return { label: 'Cloudy', emoji: '☁️' };
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Container Overview</p>
        </div>
      </header>

      {/* Weather Summary Widget */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '20px 24px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2.5rem' }}>{weatherData ? getWeatherDescription(weatherData.weatherCode).emoji : '⛅'}</span>
          <div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', margin: 0 }}>Pasir Ris Central Weather</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              {weatherData ? getWeatherDescription(weatherData.weatherCode).label : 'Loading conditions...'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>🌡️ Outdoor Temp</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
              {weatherData ? `${weatherData.temperature}°C` : '...'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>💧 Outdoor Humidity</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
              {weatherData ? `${weatherData.humidity}%` : '...'}
            </div>
          </div>
        </div>
      </div>

      <section className={styles.containerList}>
        {CONTAINERS.map((container) => (
          <ContainerOverview key={container.id} container={container} />
        ))}
      </section>
    </main>
  );
}
