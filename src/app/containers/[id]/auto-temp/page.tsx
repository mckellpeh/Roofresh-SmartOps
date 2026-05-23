'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONTAINERS } from '@/config/containers';
import styles from '@/app/page.module.css';
import cardStyles from '@/components/DeviceCard.module.css';

interface AutoTempState {
  enabled: boolean;
  targetTemperature: number;
  lastAcTemperature: number;
  logs: string[];
  alertEmail: string;
  alertsEnabled: boolean;
  criticalLowTemp: number;
  criticalHighTemp: number;
}

export default function AutomationControl() {
  const params = useParams();
  const container = CONTAINERS.find(c => c.id === params.id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentHumidity, setCurrentHumidity] = useState<number | null>(null);
  const [state, setState] = useState<AutoTempState | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inputAlertsEnabled, setInputAlertsEnabled] = useState(false);
  const [inputLow, setInputLow] = useState(18);
  const [inputCritical, setInputCritical] = useState(28);
  const [savingAlerts, setSavingAlerts] = useState(false);

  // Synchronize alert settings input fields
  useEffect(() => {
    if (state) {
      setInputEmail(state.alertEmail || '');
      setInputAlertsEnabled(state.alertsEnabled || false);
      setInputLow(state.criticalLowTemp || 18);
      setInputCritical(state.criticalHighTemp || 28);
    }
  }, [state]);

  // Fetch container sensor data and automation configurations
  const fetchData = async () => {
    if (!container) return;
    try {
      // 1. Fetch current Hub readings (triggers server evaluation if enabled)
      const hubRes = await fetch(`/api/devices?hubId=${container.hubId}`);
      const hubData = await hubRes.json();
      if (hubData.body) {
        setCurrentTemp(hubData.body.temperature || 0);
        setCurrentHumidity(hubData.body.humidity || 0);
      }

      // 2. Fetch the Automation configuration and log state
      const stateRes = await fetch(`/api/auto-temp?containerId=${container.id}`);
      const stateData = await stateRes.json();
      if (!stateData.error) {
        setState(stateData);
      }
    } catch (err) {
      console.error('Failed to fetch automation details', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 10 minutes to fetch logs, metrics and prevent frequent AC adjustments
    const interval = setInterval(() => fetchData(), 600000);
    return () => clearInterval(interval);
  }, [container?.id]);

  if (!container) {
    return <main className={styles.main}>Container not found</main>;
  }

  // Save Alert Configuration Settings
  const handleSaveAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !container) return;
    setSavingAlerts(true);
    try {
      const res = await fetch('/api/auto-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerId: container.id,
          alertEmail: inputEmail,
          alertsEnabled: inputAlertsEnabled,
          criticalLowTemp: inputLow,
          criticalHighTemp: inputCritical,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setState(data);
        setShowAlertModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save alerts config', err);
    } finally {
      setSavingAlerts(false);
    }
  };

  // Toggle Automation State
  const handleToggle = async () => {
    if (!state) return;
    setLoading(true);
    try {
      const nextEnabled = !state.enabled;
      const res = await fetch('/api/auto-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerId: container.id,
          enabled: nextEnabled,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setState(data);
        // Instantly update readings to trigger evaluation if enabled
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Change Target Temperature
  const handleTargetChange = async (newTemp: number) => {
    if (!state) return;
    // Optimistic local state update for snappy UI
    setState({ ...state, targetTemperature: newTemp });
    try {
      const res = await fetch('/api/auto-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerId: container.id,
          targetTemperature: newTemp,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setState(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger manual check and correction immediately
  const handleManualCheck = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  const target = state?.targetTemperature ?? 24;
  const isOptimal = currentTemp !== null && Math.abs(currentTemp - target) <= 1;
  const drift = currentTemp !== null ? currentTemp - target : 0;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Temperature Automation</h1>
          <p className={styles.subtitle}>{container.name} Environmental Loop</p>
        </div>
        <Link href={`/containers/${container.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          Back to Options →
        </Link>
      </header>

      {fetching ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <span className="loading-spinner" style={{ width: '48px', height: '48px' }}></span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Main Controls Panel */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '24px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Status: {state?.enabled ? 'Active' : 'Deactivated'}</h2>
                <p style={{ color: 'var(--text-muted)' }}>Automatically correct temperature using AC remote IR controls</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowAlertModal(true)}
                  className={cardStyles.btn}
                  style={{
                    padding: '14px 24px',
                    fontSize: '1.1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: state?.alertsEnabled && state?.alertEmail 
                      ? 'rgba(4, 139, 119, 0.1)' 
                      : state?.alertEmail 
                        ? 'rgba(212, 175, 55, 0.1)' 
                        : 'rgba(0, 0, 0, 0.05)',
                    color: state?.alertsEnabled && state?.alertEmail 
                      ? 'var(--primary)' 
                      : state?.alertEmail 
                        ? '#d4af37' 
                        : 'var(--text-muted)',
                    borderColor: state?.alertsEnabled && state?.alertEmail 
                      ? 'var(--primary)' 
                      : state?.alertEmail 
                        ? '#d4af37' 
                        : 'var(--panel-border)',
                    fontWeight: 600
                  }}
                >
                  {state?.alertsEnabled && state?.alertEmail 
                    ? '🔔 Alerts Active' 
                    : state?.alertEmail 
                      ? '🔕 Alerts Muted' 
                      : '🔔 Configure Alerts'}
                </button>
                <button
                  onClick={handleToggle}
                  disabled={loading}
                  className={`${cardStyles.btn} ${state?.enabled ? cardStyles.active : ''}`}
                  style={{
                    padding: '14px 28px',
                    fontSize: '1.1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: state?.enabled ? 'var(--primary)' : 'rgba(226, 88, 76, 0.1)',
                    color: state?.enabled ? '#ffffff' : 'var(--danger)',
                    borderColor: state?.enabled ? 'var(--primary)' : 'var(--danger)',
                    fontWeight: 700
                  }}
                >
                  {state?.enabled ? '🟢 AUTOMATION ON' : '🔴 AUTOMATION OFF'}
                </button>
              </div>
            </div>

            {/* Current Readings / Status Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '30px' }}>
              {/* Current Temp */}
              <div style={{ background: 'var(--bg-color)', padding: '24px', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem' }}>🌡️</span>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
                  {currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : '...'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>CURRENT TEMPERATURE</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                  From SwitchBot Hub 2
                </div>
              </div>

              {/* Status Indicator */}
              <div style={{
                background: isOptimal ? 'rgba(4, 139, 119, 0.05)' : 'rgba(226, 88, 76, 0.05)',
                padding: '24px',
                borderRadius: '16px',
                border: `1px solid ${isOptimal ? 'var(--primary-light)' : 'var(--danger)'}`,
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '2rem' }}>{isOptimal ? '🛡️' : '⚠️'}</span>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: isOptimal ? 'var(--primary)' : 'var(--danger)',
                  marginTop: '12px'
                }}>
                  {isOptimal ? 'Optimal Range' : drift > 0 ? 'Too Warm' : 'Too Cold'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, marginTop: '8px' }}>
                  {isOptimal ? 'Within ±1°C of Indicated' : `${drift > 0 ? '+' : ''}${drift.toFixed(1)}°C Drift`}
                </div>
              </div>
            </div>

            {/* Adjust Section Separating Line */}
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '24px', marginTop: '30px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Adjust</h2>
                <p style={{ color: 'var(--text-muted)' }}>Configure target conditions and monitor active remote feedback</p>
              </div>

              {/* Adjust Layout grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
                {/* Target Temperature Card */}
                <div style={{ background: 'var(--bg-color)', padding: '24px', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>🎯</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
                    {target}°C
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>INDICATED TEMPERATURE</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                    Tolerance Range: {target - 1}°C - {target + 1}°C
                  </div>
                </div>

                {/* Slider Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 600, fontSize: '1.1rem' }}>
                      Set Indicated Temperature
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <button
                        onClick={() => handleTargetChange(Math.max(16, target - 1))}
                        className={cardStyles.btn}
                        style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.5rem', flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="16"
                        max="30"
                        value={target}
                        onChange={(e) => handleTargetChange(parseInt(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--primary)', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <button
                        onClick={() => handleTargetChange(Math.min(30, target + 1))}
                        className={cardStyles.btn}
                        style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.5rem', flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
                      <span>16°C (Coldest)</span>
                      <span>30°C (Warmest)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Virtual AC State */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--panel-border)', flexWrap: 'wrap', gap: '10px', marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.25rem' }}>❄️</span>
                <span style={{ fontWeight: 600 }}>Virtual AC State:</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{state?.lastAcTemperature}°C (Cool, Auto Fan)</span>
              </div>
              <div>
                <button
                  onClick={handleManualCheck}
                  disabled={loading}
                  className={cardStyles.btn}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}
                >
                  {loading ? 'Evaluating...' : 'Trigger Review Now'}
                </button>
              </div>
            </div>
          </div>

          {/* Activity Logs Panel */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📋 Activity & Correction Logs
            </h2>
            <div style={{
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              padding: '20px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}>
              {!state?.logs || state.logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  No correction actions logged yet. Toggle Automation to start monitoring.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {state.logs.slice().reverse().map((log, index) => {
                    const isTooHigh = log.includes('too high') || log.includes('decreased');
                    const isTooLow = log.includes('too low') || log.includes('increased');
                    const isStable = log.includes('stable');
                    const isAlert = log.includes('ALERT') || log.includes('dispatched');
                    
                    const color = isAlert 
                      ? '#e2584c' 
                      : isTooHigh 
                        ? 'var(--danger)' 
                        : isTooLow 
                          ? '#d4af37' 
                          : isStable 
                            ? 'var(--primary)' 
                            : 'var(--text-muted)';
                            
                    return (
                      <div key={index} style={{ 
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)', 
                        paddingBottom: '8px', 
                        color: 'var(--text-main)', 
                        lineHeight: '1.4',
                        backgroundColor: isAlert ? 'rgba(226, 88, 76, 0.05)' : 'transparent',
                        padding: isAlert ? '8px 12px' : '4px 0',
                        borderRadius: isAlert ? '8px' : '0',
                        marginTop: isAlert ? '4px' : '0',
                        marginBottom: isAlert ? '4px' : '0'
                      }}>
                        <span style={{ color, fontWeight: 700, marginRight: '6px' }}>•</span> {log}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alert Configuration Modal Overlay */}
      {showAlertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            padding: '30px',
            width: '100%',
            maxWidth: '460px',
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            background: 'var(--bg-color)',
            border: '1px solid var(--panel-border)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAlertModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              🔔 Email Alerts
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Configure safety threshold ranges to receive real-time email alerts.
            </p>

            <form onSubmit={handleSaveAlerts} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* iOS style beautiful toggle button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--panel-border)',
                marginBottom: '5px'
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>Alert Notifications</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Enable or temporarily mute email notifications</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setInputAlertsEnabled(!inputAlertsEnabled)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: '1px solid',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      backgroundColor: inputAlertsEnabled ? 'var(--primary)' : 'rgba(226, 88, 76, 0.1)',
                      color: inputAlertsEnabled ? '#fff' : 'var(--danger)',
                      borderColor: inputAlertsEnabled ? 'var(--primary)' : 'var(--danger)',
                      transition: 'all 0.2s ease',
                      boxShadow: inputAlertsEnabled ? '0 2px 8px rgba(4, 139, 119, 0.3)' : 'none'
                    }}
                  >
                    {inputAlertsEnabled ? 'ACTIVE' : 'MUTED'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Target Email Address
                </label>
                <input
                  type="email"
                  placeholder="mckellpeh@gmail.com"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    color: 'var(--text-main)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* Low Safety Threshold Limit (Freeze Warning) */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Safety Low Limit (Too Cold): <span style={{ color: '#0070f3', fontWeight: 700 }}>{inputLow}°C</span>
                </label>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '-4px', marginBottom: '12px' }}>
                  Triggers immediate warning if container temperature drops below this value.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>0°C</span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={inputLow}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setInputLow(val);
                      if (val > inputCritical) {
                        setInputCritical(val);
                      }
                    }}
                    style={{ flex: 1, accentColor: '#0070f3', height: '6px', borderRadius: '3px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>40°C</span>
                </div>
              </div>

              {/* High Safety Threshold Limit (Heat Warning) */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Safety High Limit (Too Hot): <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{inputCritical}°C</span>
                </label>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '-4px', marginBottom: '12px' }}>
                  Triggers immediate warning if container temperature exceeds this value.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>0°C</span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={inputCritical}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setInputCritical(val);
                      if (val < inputLow) {
                        setInputLow(val);
                      }
                    }}
                    style={{ flex: 1, accentColor: 'var(--primary)', height: '6px', borderRadius: '3px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>40°C</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className={cardStyles.btn}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAlerts}
                  className={cardStyles.btn}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    borderColor: 'var(--primary)'
                  }}
                >
                  {savingAlerts ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
