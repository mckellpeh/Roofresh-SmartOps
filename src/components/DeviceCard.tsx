'use client';

import React, { useState } from 'react';
import styles from './DeviceCard.module.css';

interface DeviceCardProps {
  title: string;
  type: 'humidifier' | 'ac';
  deviceId: string;
  icon: React.ReactNode;
}

export default function DeviceCard({ title, type, deviceId, icon }: DeviceCardProps) {
  const [loading, setLoading] = useState(false);
  const [temp, setTemp] = useState(24);

  const sendCommand = async (command: string, parameter: string = 'default', commandType: string = 'command') => {
    setLoading(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, command, parameter, commandType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err) {
      console.error(err);
      alert('Failed to send command');
    } finally {
      setLoading(false);
    }
  };

  const handleAcState = (state: 'on' | 'off') => {
    // Air Conditioner command format: setAll parameter: temperature,mode,fanspeed,power
    // Example: 26,1,1,on
    // Mode: 1(auto), 2(cool), 3(dry), 4(fan), 5(heat)
    // Fan speed: 1(auto), 2(low), 3(medium), 4(high)
    // We will assume cool mode, auto fan.
    const mode = 2; // Cool
    const fan = 1; // Auto
    const cmdStr = `${temp},${mode},${fan},${state}`;
    sendCommand('setAll', cmdStr);
  };

  return (
    <div className={`glass-panel ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>{icon}</div>
        <div>
          <h3 className={styles.title}>{title}</h3>
          <span className={styles.status}>{type === 'humidifier' ? 'Bot Clicker' : 'Infrared Remote'}</span>
        </div>
      </div>

      {type === 'ac' && (
        <div className={styles.acControls}>
          <button 
            className={styles.btn} 
            onClick={() => setTemp(t => Math.max(16, t - 1))}
            disabled={loading}
          >
            -
          </button>
          <div className={styles.tempDisplay}>{temp}°C</div>
          <button 
            className={styles.btn} 
            onClick={() => setTemp(t => Math.min(30, t + 1))}
            disabled={loading}
          >
            +
          </button>
        </div>
      )}

      <div className={styles.controls}>
        {type === 'humidifier' ? (
          <button 
            className={`${styles.btn} ${styles.active}`}
            onClick={() => sendCommand('press')}
            disabled={loading}
          >
            {loading ? <span className="loading-spinner"></span> : 'Toggle Humidifier'}
          </button>
        ) : (
          <>
            <button 
              className={styles.btn}
              onClick={() => handleAcState('off')}
              disabled={loading}
            >
              Turn OFF
            </button>
            <button 
              className={`${styles.btn} ${styles.active}`}
              onClick={() => handleAcState('on')}
              disabled={loading}
            >
              {loading ? <span className="loading-spinner"></span> : 'Turn ON'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
