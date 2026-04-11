'use client';

import { useState } from 'react';
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

  if (!container) {
    return <main className={styles.main}>Container not found</main>;
  }

  const sendCommand = async () => {
    setLoading(true);
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
      alert('Command sent successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to send command');
    } finally {
      setLoading(false);
    }
  };

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

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ padding: '20px' }}>
          
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
              onChange={(e) => setTemperature(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
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
                  className={`${cardStyles.btn} ${power === 'off' ? cardStyles.active : ''}`}
                >
                  Turn OFF
                </button>
                <button 
                  onClick={() => setPower('on')}
                  className={`${cardStyles.btn} ${power === 'on' ? cardStyles.active : ''}`}
                >
                  Turn ON
                </button>
             </div>
          </div>

          <button 
            onClick={sendCommand} 
            disabled={loading}
            className={`${cardStyles.btn} ${cardStyles.active}`}
            style={{ width: '100%', height: '54px', fontSize: '1.1rem' }}
          >
            {loading ? <span className="loading-spinner"></span> : 'Send Command to AC'}
          </button>
        </div>
      </div>
    </main>
  );
}
