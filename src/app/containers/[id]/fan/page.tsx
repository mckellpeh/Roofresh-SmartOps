'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONTAINERS } from '@/config/containers';
import styles from '@/app/page.module.css';
import cardStyles from '@/components/DeviceCard.module.css';

export default function FanControl() {
  const params = useParams();
  const container = CONTAINERS.find(c => c.id === params.id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fanState, setFanState] = useState<'on' | 'off'>('off');
  const [ipAddress, setIpAddress] = useState('192.168.1.84');
  const [inputIp, setInputIp] = useState('192.168.1.84');
  const [logs, setLogs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchFanData = async () => {
    try {
      const res = await fetch('/api/control/fan', { cache: 'no-store' });
      const data = await res.json();
      if (data && !data.error) {
        setFanState(data.state || 'off');
        setIpAddress(data.ip || '192.168.1.84');
        setInputIp(data.ip || '192.168.1.84');
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch fan details:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchFanData();
    const interval = setInterval(fetchFanData, 15000); // Refresh logs and status every 15s
    return () => clearInterval(interval);
  }, []);

  if (!container) {
    return <main className={styles.main}>Container not found</main>;
  }

  const handleToggle = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/control/fan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setFanState(data.state);
      setLogs(data.logs);
      setFeedback({ type: 'success', message: `Fan successfully turned ${data.state.toUpperCase()}` });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: `Failed to toggle Fan: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/control/fan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: inputIp }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setIpAddress(data.ip);
      setLogs(data.logs);
      setFeedback({ type: 'success', message: `Tapo Plug IP address updated to ${data.ip}` });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: `Failed to update IP settings: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <Link href={`/containers/${container.id}`} style={{
            color: 'var(--primary)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'inline-block',
            marginBottom: '12px'
          }}>
            ← Back to Container
          </Link>
          <h1 className={styles.title}>Fan Control (Tapo P110M)</h1>
          <p className={styles.subtitle}>
            Container: {container.name} | Local KLAP Control
          </p>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%', marginTop: '24px' }} className="fan-grid-layout">
        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 768px) {
            .fan-grid-layout {
              grid-template-columns: 1fr 1fr !important;
            }
          }
        `}} />

        {/* Left Column: Switch & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Toggle Card */}
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '12px' }}>🌀</span>
            <h2 style={{ color: 'var(--text-main)', margin: '0 0 8px 0', fontSize: '1.4rem' }}>Exhaust Fan Status</h2>
            <div style={{ margin: '16px 0' }}>
              <span style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#fff',
                backgroundColor: fanState === 'on' ? '#00e676' : '#ff1744',
                boxShadow: fanState === 'on' ? '0 0 10px rgba(0, 230, 118, 0.4)' : '0 0 10px rgba(255, 23, 68, 0.4)'
              }}>
                {fanState === 'on' ? 'POWER ON' : 'POWER OFF'}
              </span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Connected to Tapo Plug at: <strong style={{ color: 'var(--text-main)' }}>{ipAddress}</strong>
            </p>

            <button
              onClick={handleToggle}
              disabled={loading || fetching}
              className={cardStyles.btn}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: fanState === 'on' ? '#ff1744' : 'var(--primary)',
                color: '#fff',
                fontWeight: 600,
                cursor: (loading || fetching) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Executing KLAP command...' : fanState === 'on' ? 'Turn Off Fan' : 'Turn On Fan'}
            </button>
          </div>

          {/* Setup Settings Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ color: 'var(--text-main)', margin: '0 0 12px 0', fontSize: '1.1rem' }}>Tapo Connection Setup</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
              If you re-map the smart plug or go down to the site tomorrow, update the local IP address assigned to the Tapo P110M below.
            </p>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="e.g. 192.168.1.84"
                value={inputIp}
                onChange={(e) => setInputIp(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--panel-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Save
              </button>
            </form>
          </div>

          {/* Feedback messages */}
          {feedback && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: feedback.type === 'success' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)',
              color: feedback.type === 'success' ? '#00e676' : '#ff1744',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 23, 68, 0.25)'}`
            }}>
              {feedback.message}
            </div>
          )}
        </div>

        {/* Right Column: Activity Logs */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--text-main)', margin: '0 0 16px 0', fontSize: '1.1rem' }}>Exhaust Fan Activity Logs</h3>
          <div style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--panel-border)',
            borderRadius: '8px',
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            overflowY: 'auto',
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} style={{ lineBreak: 'anywhere', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                  {log}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)' }}>
                No activities logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
