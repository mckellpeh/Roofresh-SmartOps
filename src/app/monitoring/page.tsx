'use client';

import { useState } from 'react';
import styles from '@/app/page.module.css';

interface CameraConfig {
  ip: string;
  rtspPort: string;
  onvifPort: string;
  user: string;
  pass: string;
  quality: 'HD' | 'SD' | 'Auto';
}

export default function MonitoringPage() {
  const [config, setConfig] = useState<CameraConfig>({
    ip: '192.168.1.100',
    rtspPort: '554',
    onvifPort: '2020',
    user: 'admin',
    pass: '••••••••',
    quality: 'Auto'
  });

  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'connected'>('offline');
  const [logs, setLogs] = useState<string[]>([
    'System: Monitoring tab loaded.',
    'System: Tapo RTSP/ONVIF controller initiated.'
  ]);
  const [isMuted, setIsMuted] = useState(true);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionStatus('connecting');
    addLog(`RTSP: Connecting to rtsp://${config.user}:***@${config.ip}:${config.rtspPort}/stream1...`);
    
    setTimeout(() => {
      setConnectionStatus('connected');
      addLog('ONVIF: Handshake successful. Connected to Tapo Camera.');
      addLog('RTSP: Receiving H.264 stream successfully.');
    }, 2000);
  };

  const handleDisconnect = () => {
    setConnectionStatus('offline');
    addLog('System: RTSP stream disconnected.');
  };

  const handlePtz = (direction: string) => {
    addLog(`PTZ Control: Sent movement command [Tilt/Pan ${direction}] via ONVIF.`);
  };

  const handleSnapshot = () => {
    addLog('Snapshot: Captured frame saved to sandbox disk.');
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tapo Camera Monitoring</h1>
          <p className={styles.subtitle}>RTSP Live Stream & ONVIF PTZ Controls</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: connectionStatus === 'connected' ? '#00e676' : connectionStatus === 'connecting' ? '#ffeb3b' : '#ff1744',
            boxShadow: connectionStatus === 'connected' ? '0 0 10px #00e676' : connectionStatus === 'connecting' ? '0 0 10px #ffeb3b' : '0 0 10px #ff1744'
          }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600, textTransform: 'capitalize' }}>
            {connectionStatus === 'connected' ? 'Live Stream Active' : connectionStatus === 'connecting' ? 'Connecting...' : 'Camera Offline'}
          </span>
        </div>
      </header>

      {/* Main Responsive Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '24px',
        width: '100%',
        marginTop: '24px'
      }} className="desktop-two-columns-layout">
        
        {/* Style helper for layout grids */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 1024px) {
            .desktop-two-columns-layout {
              grid-template-columns: 3fr 2fr !important;
            }
          }
        `}} />

        {/* Left Column: Sleek Video Player Placeholder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{
            position: 'relative',
            backgroundColor: '#0a0a0c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
          }}>
            {connectionStatus === 'connected' ? (
              // Connected Mock Live Feed Stream View
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(rgba(0, 230, 118, 0.02) 50%, rgba(0, 0, 0, 0.1) 50%), radial-gradient(circle, #1a1a24 0%, #0d0d12 100%)',
                backgroundSize: '100% 4px, 100% 100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Scanning overlay glow */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(0, 230, 118, 0.2)',
                  color: '#00e676',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#00e676',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  Live RTSP (1080P)
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.4; }
                    100% { transform: scale(1); opacity: 1; }
                  }
                `}} />

                <div style={{ textAlign: 'center', color: '#fff', opacity: 0.9 }}>
                  <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '8px' }}>🎥</span>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Tapo Camera Live Video Feed
                  </span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px' }}>
                    Pasir Ris Mushroom Container 1 (Left)
                  </span>
                </div>
              </div>
            ) : connectionStatus === 'connecting' ? (
              // Connecting loading view
              <div style={{ textAlign: 'center', color: 'var(--text-main)' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(255, 255, 255, 0.1)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}} />
                <p style={{ fontWeight: 600, margin: 0 }}>Connecting RTSP Stream...</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Verifying ONVIF credentials</p>
              </div>
            ) : (
              // Offline view
              <div style={{ textAlign: 'center', color: 'var(--text-main)', padding: '24px' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>🔒</span>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>Camera Stream Offline</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto 16px' }}>
                  Please enter your camera credentials and click <strong>Connect Stream</strong> to preview the Tapo feed.
                </p>
              </div>
            )}

            {/* Video Controls Bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              backgroundColor: 'rgba(10, 10, 12, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 5
            }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  disabled={connectionStatus !== 'connected'} 
                  onClick={handleDisconnect} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: connectionStatus === 'connected' ? '#ff1744' : 'var(--text-muted)',
                    cursor: connectionStatus === 'connected' ? 'pointer' : 'default',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  {connectionStatus === 'connected' ? '⏸️ Stop' : '▶️ Play'}
                </button>
                <button 
                  disabled={connectionStatus !== 'connected'} 
                  onClick={() => setIsMuted(!isMuted)} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: connectionStatus === 'connected' ? 'pointer' : 'default',
                    fontSize: '1rem'
                  }}
                >
                  {isMuted ? '🔇 Mute' : '🔊 Unmute'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <select 
                  value={config.quality}
                  onChange={(e) => setConfig(prev => ({ ...prev, quality: e.target.value as any }))}
                  disabled={connectionStatus !== 'connected'}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-main)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  <option value="HD">1080P HD</option>
                  <option value="SD">360P SD</option>
                  <option value="Auto">Auto Quality</option>
                </select>
                <button 
                  disabled={connectionStatus !== 'connected'} 
                  onClick={handleSnapshot} 
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    color: 'var(--text-main)',
                    cursor: connectionStatus === 'connected' ? 'pointer' : 'default'
                  }}
                >
                  📸 Snapshot
                </button>
              </div>
            </div>
          </div>

          {/* Activity Log Panel */}
          <div className="glass-panel" style={{ padding: '20px 24px', flex: 1 }}>
            <h3 style={{ color: 'var(--text-main)', margin: '0 0 12px 0', fontSize: '1rem' }}>Camera Activity Logs</h3>
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              maxHeight: '150px',
              overflowY: 'auto',
              border: '1px solid var(--panel-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{ lineBreak: 'anywhere' }}>{log}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Setup Panel & PTZ Controllers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* RTSP / ONVIF Connection settings */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ color: 'var(--text-main)', margin: '0 0 16px 0', fontSize: '1.15rem' }}>Stream Settings</h3>
            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: 600 }}>Tapo Camera IP Address</label>
                <input 
                  type="text" 
                  value={config.ip}
                  onChange={(e) => setConfig(prev => ({ ...prev, ip: e.target.value }))}
                  required 
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: 600 }}>RTSP Port</label>
                  <input 
                    type="text" 
                    value={config.rtspPort}
                    onChange={(e) => setConfig(prev => ({ ...prev, rtspPort: e.target.value }))}
                    required 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: 600 }}>ONVIF Port</label>
                  <input 
                    type="text" 
                    value={config.onvifPort}
                    onChange={(e) => setConfig(prev => ({ ...prev, onvifPort: e.target.value }))}
                    required 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: 600 }}>Username</label>
                  <input 
                    type="text" 
                    value={config.user}
                    onChange={(e) => setConfig(prev => ({ ...prev, user: e.target.value }))}
                    required 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: 600 }}>Password</label>
                  <input 
                    type="password" 
                    value={config.pass}
                    onChange={(e) => setConfig(prev => ({ ...prev, pass: e.target.value }))}
                    required 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={connectionStatus === 'connecting'}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: connectionStatus === 'connected' ? 'var(--panel-border)' : 'var(--primary)',
                  color: connectionStatus === 'connected' ? 'var(--text-muted)' : '#fff',
                  cursor: connectionStatus === 'connecting' ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  marginTop: '6px',
                  transition: 'background-color 0.2s'
                }}
              >
                {connectionStatus === 'connected' ? 'Stream Settings Locked' : connectionStatus === 'connecting' ? 'Connecting...' : 'Connect Stream'}
              </button>
            </form>
          </div>

          {/* PTZ D-pad Control Panel */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-main)', margin: '0 0 16px 0', fontSize: '1.15rem', alignSelf: 'flex-start' }}>PTZ Controller</h3>
            
            <div style={{
              position: 'relative',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '2px solid var(--panel-border)',
              margin: '12px 0'
            }}>
              {/* Up button */}
              <button 
                onClick={() => handlePtz('UP')}
                disabled={connectionStatus !== 'connected'}
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: connectionStatus === 'connected' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  color: connectionStatus === 'connected' ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: connectionStatus === 'connected' ? 'pointer' : 'default',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ▲
              </button>
              
              {/* Left button */}
              <button 
                onClick={() => handlePtz('LEFT')}
                disabled={connectionStatus !== 'connected'}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10px',
                  transform: 'translateY(-50%)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: connectionStatus === 'connected' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  color: connectionStatus === 'connected' ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: connectionStatus === 'connected' ? 'pointer' : 'default',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ◀
              </button>

              {/* Center decorative ring */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: connectionStatus === 'connected' ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.02)',
                border: '2px solid var(--panel-border)',
                boxShadow: connectionStatus === 'connected' ? '0 0 10px var(--primary-light)' : 'none',
                transition: 'all 0.3s'
              }} />

              {/* Right button */}
              <button 
                onClick={() => handlePtz('RIGHT')}
                disabled={connectionStatus !== 'connected'}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '10px',
                  transform: 'translateY(-50%)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: connectionStatus === 'connected' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  color: connectionStatus === 'connected' ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: connectionStatus === 'connected' ? 'pointer' : 'default',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ▶
              </button>

              {/* Down button */}
              <button 
                onClick={() => handlePtz('DOWN')}
                disabled={connectionStatus !== 'connected'}
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: connectionStatus === 'connected' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  color: connectionStatus === 'connected' ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: connectionStatus === 'connected' ? 'pointer' : 'default',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ▼
              </button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '8px 0 0 0', textAlign: 'center' }}>
              {connectionStatus === 'connected' ? 'Click D-pad to adjust camera rotation.' : 'Connect to camera to enable PTZ.'}
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
