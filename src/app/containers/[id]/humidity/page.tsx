'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONTAINERS } from '@/config/containers';
import styles from '@/app/page.module.css';
import cardStyles from '@/components/DeviceCard.module.css';

export default function HumidityControl() {
  const params = useParams();
  const container = CONTAINERS.find(c => c.id === params.id);
  
  const [loading, setLoading] = useState(false);

  if (!container) {
    return <main className={styles.main}>Container not found</main>;
  }

  const sendCommand = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceId: container.humidifierId, 
          command: 'press', 
          parameter: 'default',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert('Bot Clicker Triggered Successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to send command to Bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <Link href={`/containers/${container.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', marginBottom: '8px', display: 'inline-block' }}>
            ← Back to Options
          </Link>
          <h1 className={styles.title}>Humidity Control</h1>
          <p className={styles.subtitle}>{container.name} Humidifier</p>
        </div>
      </header>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>💨</div>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>Physical Bot Control</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
          This will trigger the bot clicker inside the container to manually turn the Humidifier on or off.
        </p>
        <button 
          onClick={sendCommand} 
          disabled={loading}
          className={`${cardStyles.btn} ${cardStyles.active}`}
          style={{ width: '100%', height: '60px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? <span className="loading-spinner"></span> : 'Toggle Humidifier'}
        </button>
      </div>
    </main>
  );
}
