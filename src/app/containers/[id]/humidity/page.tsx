'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONTAINERS } from '@/config/containers';
import styles from '@/app/page.module.css';
import cardStyles from '@/components/DeviceCard.module.css';

export default function HumidityControl() {
  const params = useParams();
  const container = CONTAINERS.find(c => c.id === params.id);
  
  const [loading, setLoading] = useState(false);
  const [sensorLoading, setSensorLoading] = useState(true);
  const [currentHumidity, setCurrentHumidity] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!container) {
    return <main className={styles.main}>Container not found</main>;
  }

  const isPending = container.hubId === 'Pending';

  const fetchSensorData = async () => {
    if (isPending) {
      setSensorLoading(false);
      return;
    }
    setSensorLoading(true);
    try {
      const res = await fetch(`/api/devices?hubId=${container.hubId}`);
      const data = await res.json();
      if (data.body) {
        setCurrentHumidity(data.body.humidity || 0);
        setLastRefreshed(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch sensor reading');
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: `Could not retrieve latest sensor data: ${err.message}` });
    } finally {
      setSensorLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    // Poll sensor every 30 seconds
    const interval = setInterval(fetchSensorData, 30000);
    return () => clearInterval(interval);
  }, [container.hubId]);

  const sendCommand = async (deviceId: string, actionName: string) => {
    if (deviceId === 'Pending') {
      setFeedback({ type: 'error', message: `No Bot device configured for ${actionName}` });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceId, 
          command: 'press', 
          parameter: 'default',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setFeedback({
        type: 'success',
        message: `"${actionName}" Bot Clicker Triggered Successfully!`
      });
      
      // Auto-dismiss success alert after 5 seconds
      setTimeout(() => {
        setFeedback(prev => prev?.type === 'success' ? null : prev);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: `Failed to trigger "${actionName}": ${err.message || 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Humidity Control</h1>
          <p className={styles.subtitle}>{container.name} Humidifier</p>
        </div>
        <Link href={`/containers/${container.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          Back to Options →
        </Link>
      </header>

      {feedback && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          backgroundColor: feedback.type === 'success' ? 'rgba(4, 139, 119, 0.1)' : 'rgba(226, 88, 76, 0.1)',
          color: feedback.type === 'success' ? 'var(--primary)' : 'var(--danger)',
          border: `1px solid ${feedback.type === 'success' ? 'var(--primary-light)' : 'var(--danger)'}`,
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '800px',
          margin: '0 auto 24px auto'
        }}>
          <span>{feedback.message}</span>
          <button 
            onClick={() => setFeedback(null)} 
            style={{ background: 'none', border: 'none', color: 'inherit', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Sensor Reading Card */}
        <div className="glass-panel static" style={{ padding: '30px', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Climate Sensor Reading
            </span>
            <button 
              onClick={fetchSensorData} 
              disabled={sensorLoading || isPending}
              style={{
                background: 'rgba(4, 139, 119, 0.1)',
                color: 'var(--primary)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { if (!sensorLoading && !isPending) e.currentTarget.style.background = 'rgba(4, 139, 119, 0.2)'; }}
              onMouseLeave={(e) => { if (!sensorLoading && !isPending) e.currentTarget.style.background = 'rgba(4, 139, 119, 0.1)'; }}
            >
              {sensorLoading ? <span className="loading-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span> : '🔄'} Refresh
            </button>
          </div>

          {isPending ? (
            <div style={{ padding: '40px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚠️</div>
              <h3 style={{ color: 'var(--text-main)' }}>Sensor Offline</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active SwitchBot Hub configured for this container.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
              {/* Humidity Big Display */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '5.5rem', lineHeight: '1' }}>💧</span>
                <span style={{ fontSize: '4.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '10px' }}>
                  {currentHumidity !== null ? `${currentHumidity}%` : '--%'}
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '10px' }}>
                  Current Humidity
                </span>
              </div>
            </div>
          )}

          {!isPending && lastRefreshed && (
            <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Last updated: {lastRefreshed.toLocaleTimeString()} (Refreshes automatically every 30 seconds)
            </div>
          )}
        </div>

        {/* Humidifier Bot Controls */}
        <div className="glass-panel static" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '10px', textAlign: 'center' }}>
            Humidifier Bot Controls
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '30px', textAlign: 'center', maxWidth: '600px', margin: '0 auto 30px auto' }}>
            This container utilizes two separate physical SwitchBot bots to press the power toggles of your humidifier. 
            Click the buttons below to trigger the physical bots.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {/* Turn On Bot Card */}
            <div style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🟢</span>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Power ON</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Triggers the bot clicker to press the Humidifier ON switch.
                </p>
              </div>
              <button
                onClick={() => sendCommand(container.humidifierOnId, 'Turn On')}
                disabled={loading || isPending || container.humidifierOnId === 'Pending'}
                className={`${cardStyles.btn} ${cardStyles.active}`}
                style={{ width: '100%', height: '50px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? <span className="loading-spinner" style={{ borderTopColor: '#fff' }}></span> : 'Trigger Turn On'}
              </button>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px', fontFamily: 'monospace' }}>
                Device: switch bot (turn on)
              </div>
            </div>

            {/* Turn Off Bot Card */}
            <div style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🔴</span>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Power OFF</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Triggers the bot clicker to press the Humidifier OFF switch.
                </p>
              </div>
              <button
                onClick={() => sendCommand(container.humidifierOffId, 'Turn Off')}
                disabled={loading || isPending || container.humidifierOffId === 'Pending'}
                className={`${cardStyles.btn}`}
                style={{
                  width: '100%',
                  height: '50px',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--danger)',
                  color: '#fff',
                  borderColor: 'var(--danger)'
                }}
                onMouseEnter={(e) => { if (!loading && !isPending) e.currentTarget.style.backgroundColor = '#c54237'; }}
                onMouseLeave={(e) => { if (!loading && !isPending) e.currentTarget.style.backgroundColor = 'var(--danger)'; }}
              >
                {loading ? <span className="loading-spinner" style={{ borderTopColor: '#fff' }}></span> : 'Trigger Turn Off'}
              </button>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px', fontFamily: 'monospace' }}>
                Device: Bot Clicker (turn off)
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
