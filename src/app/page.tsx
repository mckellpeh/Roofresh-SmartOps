'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
    const interval = setInterval(fetchHubData, 60000);
    return () => clearInterval(interval);
  }, [container.hubId]);

  return (
    <Link href={`/containers/${container.id}`} className={styles.containerLink}>
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '8px' }}>{container.name}</h2>
          <p style={{ color: 'var(--text-muted)' }}>Click to view options</p>
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
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Container Overview</p>
        </div>
      </header>

      <section className={styles.containerList}>
        {CONTAINERS.map((container) => (
          <ContainerOverview key={container.id} container={container} />
        ))}
      </section>
    </main>
  );
}
