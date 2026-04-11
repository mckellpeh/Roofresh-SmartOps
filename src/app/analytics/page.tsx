import styles from '@/app/page.module.css';

export default function AnalyticsPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Historical Data & Insights</p>
        </div>
      </header>

      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', marginTop: '40px' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '16px' }}>Coming Soon</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Detailed charts analyzing historical Temperature and Humidity variations will populate here once enough data has been collected.
        </p>
      </div>
    </main>
  );
}
