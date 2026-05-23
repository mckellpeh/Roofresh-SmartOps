import Link from 'next/link';
import { CONTAINERS } from '@/config/containers';
import styles from '@/app/page.module.css';

export default async function ContainerHub({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const container = CONTAINERS.find(c => c.id === resolvedParams.id);

  if (!container) {
    return (
      <main className={styles.main}>
        <h1>Container not found</h1>
        <Link href="/" style={{ color: 'var(--primary)' }}>← Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{container.name}</h1>
          <p className={styles.subtitle}>Select a control module</p>
        </div>
        <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          Back to Dashboard →
        </Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <Link href={`/containers/${container.id}/temperature`} style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '3rem', marginBottom: '16px' }}>❄️</span>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem' }}>Temperature Control</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Adjust Air Conditioner settings</p>
          </div>
        </Link>
        <Link href={`/containers/${container.id}/humidity`} style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '3rem', marginBottom: '16px' }}>💨</span>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem' }}>Humidity Control</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Toggle Humidifier Bot</p>
          </div>
        </Link>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Link href={`/containers/${container.id}/auto-temp`} style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start', 
            gap: '30px', 
            padding: '30px 40px',
            textAlign: 'left'
          }}>
            <span style={{ fontSize: '3.5rem', flexShrink: 0 }}>🤖</span>
            <div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0 }}>Temperature Automation</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', margin: 0 }}>Auto-regulate container temperature, monitor SwitchBot activity logs, and configure email alert safety thresholds.</p>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
