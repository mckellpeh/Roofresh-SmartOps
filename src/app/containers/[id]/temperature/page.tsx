'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONTAINERS } from '@/config/containers';
import styles from '@/app/page.module.css';
import cardStyles from '@/components/DeviceCard.module.css';

export default function TemperatureControl() {
  const params = useParams();
  const container = CONTAINERS.find(c => c.id === params.id);
  
  const [loading, setLoading] = useState(false);
  const [power, setPower] = useState<'on' | 'off'>('on');
  const [temperature, setTemperature] = useState<number>(24);
  const [mode, setMode] = useState<number>(2); // 1: Auto, 2: Cool, 3: Dry, 4: Fan, 5: Heat
  const [fanSpeed, setFanSpeed] = useState<number>(1); // 1: Auto, 2: Low, 3: Medium, 4: High
  const [logs, setLogs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  const isPending = container?.acId === 'Pending';

  // Fetch the last known temperature set by the automation system as default on page load
  const fetchStateAndLogs = async () => {
    if (!container) return;
    try {
      const res = await fetch(`/api/auto-temp?containerId=${container.id}`);
      const data = await res.json();
      if (data) {
        if (typeof data.lastAcTemperature === 'number') {
          setTemperature(data.lastAcTemperature);
        }
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load last known AC state and logs', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStateAndLogs();
    
    // Poll logs every 30 seconds
    const interval = setInterval(fetchStateAndLogs, 30000);
    return () => clearInterval(interval);
  }, [container?.id]);

  if (!container) {
    return <main className={styles.main}>Container not found</main>;
  }

  const sendCommand = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      // Command string format: temperature,mode,fanspeed,power
      const commandStr = `${temperature},${mode},${fanSpeed},${power}`;
      
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceId: container.acId, 
          command: 'setAll', 
          parameter: commandStr,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Instantly update logs in the UI
      const timestamp = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
      const modeLabels: Record<number, string> = { 1: 'Auto', 2: 'Cool', 3: 'Dry', 4: 'Fan', 5: 'Heat' };
      const fanLabels: Record<number, string> = { 1: 'Auto', 2: 'Low', 3: 'Medium', 4: 'High' };
      const newAcLog = `[${timestamp}] [Manual Override] Air Conditioner set manually to ${temperature}°C (Mode: ${modeLabels[mode] || 'Cool'}, Fan: ${fanLabels[fanSpeed] || 'Auto'}, Power: ${power.toUpperCase()}). -> [API Call] POST /v1.1/devices/${container.acId}/commands | Payload: ${JSON.stringify({ command: 'setAll', parameter: commandStr, commandType: 'command' })} | Response: ${JSON.stringify(data)}`;
      setLogs(prev => [...prev, newAcLog]);

      setFeedback({ type: 'success', message: 'Command sent to Air Conditioner successfully!' });
      
      setTimeout(() => {
        setFeedback(prev => prev?.type === 'success' ? null : prev);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: `Failed to send command: ${err.message || 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  };

  const tempLogs = logs.filter(log => {
    const lowercaseLog = log.toLowerCase();
    return (
      lowercaseLog.includes('air conditioner') ||
      lowercaseLog.includes('ac') ||
      lowercaseLog.includes('temp') ||
      lowercaseLog.includes('automation')
    );
  });

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Temperature Control</h1>
          <p className={styles.subtitle}>{container.name} Air Conditioner</p>
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
        {/* Control Card */}
        <div className="glass-panel static" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--primary)' }}>
              {temperature}°C
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>Set Temperature</label>
            <input 
              type="range" 
              min="16" 
              max="30" 
              value={temperature}
              disabled={!mounted || isPending}
              onChange={(e) => setTemperature(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: isPending ? 'not-allowed' : 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '5px' }}>
              <span>16°C</span>
              <span>30°C</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>Mode</label>
              <select 
                value={mode} 
                disabled={!mounted || isPending}
                onChange={(e) => setMode(parseInt(e.target.value))}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
              >
                <option value={1}>Auto</option>
                <option value={2}>Cool</option>
                <option value={3}>Dry</option>
                <option value={4}>Fan</option>
                <option value={5}>Heat</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>Fan Speed</label>
              <select 
                value={fanSpeed} 
                disabled={!mounted || isPending}
                onChange={(e) => setFanSpeed(parseInt(e.target.value))}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
              >
                <option value={1}>Auto</option>
                <option value={2}>Low</option>
                <option value={3}>Medium</option>
                <option value={4}>High</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
             <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>Power State</label>
             <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setPower('off')}
                  disabled={!mounted || isPending}
                  className={`${cardStyles.btn} ${power === 'off' ? cardStyles.active : ''}`}
                >
                  Turn OFF
                </button>
                <button 
                  onClick={() => setPower('on')}
                  disabled={!mounted || isPending}
                  className={`${cardStyles.btn} ${power === 'on' ? cardStyles.active : ''}`}
                >
                  Turn ON
                </button>
             </div>
          </div>

          <button 
            onClick={sendCommand} 
            disabled={!mounted || loading || isPending}
            className={`${cardStyles.btn} ${cardStyles.active}`}
            style={{ width: '100%', height: '54px', fontSize: '1.1rem', marginBottom: '20px' }}
          >
            {loading ? <span className="loading-spinner" style={{ borderTopColor: '#fff' }}></span> : 'Send Command to AC'}
          </button>

          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px', textAlign: 'center' }}>
            <Link 
              href={`/analytics?containerId=${container.id}`}
              className={cardStyles.btn}
              style={{ 
                width: '100%', 
                height: '48px', 
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: 'rgba(0, 112, 243, 0.1)',
                color: '#0070f3',
                borderColor: '#0070f3',
                textDecoration: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              📊 Temperature Monitoring
            </Link>
          </div>
        </div>

        {/* SwitchBot Call & Activity Logs */}
        <div className="glass-panel static" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📋 Air Conditioner Activity Logs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
            This list logs the history of SwitchBot API calls and automatic adjustments made for the air conditioner.
          </p>
          <div style={{
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--panel-border)',
            borderRadius: '12px',
            padding: '20px',
            maxHeight: '250px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            {!mounted || !tempLogs || tempLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                {!mounted ? 'Loading log history...' : 'No air conditioner activity logs available.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tempLogs.slice().reverse().map((log, index) => {
                  const isManual = log.toLowerCase().includes('manual');
                  const isSuccess = log.toLowerCase().includes('success');
                  const isFail = log.toLowerCase().includes('fail');
                  
                  let color = 'var(--text-muted)';
                  if (isManual) {
                    color = 'var(--primary)';
                  } else if (isSuccess) {
                    color = '#0070f3';
                  } else if (isFail) {
                    color = 'var(--danger)';
                  } else {
                    color = 'var(--text-main)';
                  }
                  
                  return (
                    <div key={index} style={{ 
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)', 
                      paddingBottom: '8px', 
                      color: color, 
                      lineHeight: '1.4',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
