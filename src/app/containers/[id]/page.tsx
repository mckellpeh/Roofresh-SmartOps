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
      </header>

      <div className={styles.grid}>
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
    </main>
  );
}
