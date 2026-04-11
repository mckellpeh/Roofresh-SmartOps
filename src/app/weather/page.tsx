import styles from '@/app/page.module.css';

async function getWeatherData() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=1.374361&longitude=103.952501&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation_probability&timezone=Asia/Singapore';
  const res = await fetch(url, { next: { revalidate: 300 } }); // Cache for 5 minutes
  
  if (!res.ok) {
    throw new Error('Failed to fetch weather data');
  }

  return res.json();
}

export default async function WeatherPage() {
  let weather;
  try {
    weather = await getWeatherData();
  } catch (error) {
    return <main className={styles.main}><h2>Error loading weather.</h2></main>;
  }

  const current = weather.current;
  const temp = current.temperature_2m;
  const humidity = current.relative_humidity_2m;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Weather Forecast</h1>
          <p className={styles.subtitle}>Pasir Ris Central, Singapore</p>
        </div>
      </header>

      <section className={styles.dashboardStats}>
        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.sensorIcon}>🌡️</div>
          <div className={styles.statValue}>
             {temp}°C
          </div>
          <div className={styles.statLabel}>Current Outdoor Temp</div>
        </div>
        
        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.sensorIcon}>💧</div>
          <div className={styles.statValue}>
             {humidity}%
          </div>
          <div className={styles.statLabel}>Outdoor Humidity</div>
        </div>
      </section>

      <h2 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>Upcoming 12 Hours</h2>
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: 'var(--text-main)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
              <th style={{ padding: '12px' }}>Time</th>
              <th style={{ padding: '12px' }}>Temp (°C)</th>
              <th style={{ padding: '12px' }}>Rain Prob (%)</th>
            </tr>
          </thead>
          <tbody>
            {weather.hourly.time.slice(0, 12).map((timeStr: string, i: number) => {
              const d = new Date(timeStr);
              return (
                <tr key={timeStr} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{weather.hourly.temperature_2m[i]}°C</td>
                  <td style={{ padding: '12px', color: 'var(--primary)' }}>{weather.hourly.precipitation_probability[i]}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
