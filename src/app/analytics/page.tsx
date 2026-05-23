'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '@/app/page.module.css';
import { CONTAINERS } from '@/config/containers';

interface HistoryPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
}

// Generate a massive high-density dataset allowing deep timeline panning
function generateMassiveBaseline(mode: 'day' | 'week' | 'month', baseTemp: number, baseHumid: number): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const now = Date.now();
  
  // Day: 3 days of 15-min points (288 points total)
  // Week: 3 weeks of hourly points (504 points total)
  // Month: 3 months of 3-hour points (720 points total)
  let totalPoints = 288;
  let timeStepMs = 15 * 60 * 1000;
  
  if (mode === 'week') {
    totalPoints = 504;
    timeStepMs = 60 * 60 * 1000;
  } else if (mode === 'month') {
    totalPoints = 720;
    timeStepMs = 3 * 60 * 60 * 1000;
  }

  for (let i = totalPoints; i >= 0; i--) {
    const time = new Date(now - i * timeStepMs);
    const hour = time.getHours();
    const day = time.getDate();
    
    // Saw-tooth climate AC cycling wave
    let tempCycle = Math.sin((hour - 8) * Math.PI / 12) * 1.5;
    const cycleFreq = mode === 'day' ? 0.8 : 0.4;
    tempCycle += (Math.abs((i * cycleFreq) % 2) - 1.0) * 0.7;

    let humidCycle = -Math.sin((hour - 8) * Math.PI / 12) * 4;
    humidCycle += (Math.abs((i * cycleFreq + 0.5) % 2) - 1.0) * 2;

    // Multi-day variations
    tempCycle += Math.sin(day * Math.PI / 6) * 1.2;
    humidCycle += Math.cos(day * Math.PI / 6) * 3;

    points.push({
      timestamp: time.toISOString(),
      temperature: parseFloat((baseTemp + tempCycle + (Math.random() - 0.5) * 0.15).toFixed(1)),
      humidity: Math.min(100, Math.max(10, Math.round(baseHumid + humidCycle + (Math.random() - 0.5) * 1.5)))
    });
  }

  return points;
}

export default function AnalyticsPage() {
  const [selectedContainerId, setSelectedContainerId] = useState('container-left');
  const [timeMode, setTimeMode] = useState<'day' | 'week' | 'month'>('week');
  const [fullDataset, setFullDataset] = useState<HistoryPoint[]>([]);
  const [activePoints, setActivePoints] = useState<HistoryPoint[]>([]);
  
  // Scrolling offsets back in time
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [hoveredTempIndex, setHoveredTempIndex] = useState<number | null>(null);
  const [hoveredHumidIndex, setHoveredHumidIndex] = useState<number | null>(null);

  // Dragging states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  // Premium options toggles
  const [absoluteHumidity, setAbsoluteHumidity] = useState(false);
  const [dewPoint, setDewPoint] = useState(false);
  const [vpd, setVpd] = useState(false);

  // Refs for native wheel listener targeting passive-blocking
  const tempChartRef = useRef<HTMLDivElement>(null);
  const humidChartRef = useRef<HTMLDivElement>(null);

  // Dynamic zoom scaling points representation (Day: 96, Week: 168, Month: 240 default baselines)
  const [zoomPoints, setZoomPoints] = useState(168);

  // Automation System Logs popup
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Date Range Selection Popup
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  // Temporary selections inside modal before clicking "Apply"
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Extract all unique dates available in the full dataset for selection
  const getAvailableDates = () => {
    const datesSet = new Set<string>();
    fullDataset.forEach(p => {
      if (p.timestamp) {
        const dateStr = new Date(p.timestamp).toLocaleDateString('en-SG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        datesSet.add(dateStr);
      }
    });
    return Array.from(datesSet);
  };

  const handleOpenRangeModal = () => {
    const available = getAvailableDates();
    if (available.length > 0) {
      setTempStartDate(startDate || available[0]);
      setTempEndDate(endDate || available[available.length - 1]);
    }
    setShowRangeModal(true);
  };

  const fetchAutomationLogs = async () => {
    try {
      const res = await fetch(`/api/auto-temp?containerId=${selectedContainerId}`);
      const data = await res.json();
      if (data && data.logs) {
        setAutomationLogs(data.logs);
      } else {
        setAutomationLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch automation logs', err);
      setAutomationLogs([]);
    }
  };

  useEffect(() => {
    fetchAutomationLogs();
  }, [selectedContainerId]);

  // Initialize data baseline
  useEffect(() => {
    const baseTemp = selectedContainerId === 'container-left' ? 25.8 : 24.2;
    const baseHumid = selectedContainerId === 'container-left' ? 85 : 78;
    const dataset = generateMassiveBaseline(timeMode, baseTemp, baseHumid);
    setFullDataset(dataset);
    setScrollOffset(0); // Reset scroll to most recent
    setStartDate(null); // Reset date range filter
    setEndDate(null);   // Reset date range filter
    
    const defaultZoom = timeMode === 'day' ? 96 : timeMode === 'week' ? 168 : 240;
    setZoomPoints(defaultZoom);
    
    setActivePoints(dataset.slice(dataset.length - defaultZoom));
    setHoveredTempIndex(null);
    setHoveredHumidIndex(null);
  }, [timeMode, selectedContainerId]);

  // Sync active points when scrollOffset, zoomPoints, or date filters update
  useEffect(() => {
    if (fullDataset.length === 0) return;
    
    let datasetToSlice = fullDataset;
    
    // Apply Date Range Filter if set
    if (startDate && endDate) {
      const startMs = new Date(startDate).getTime();
      // End of selected day (23:59:59.999)
      const endMs = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      
      datasetToSlice = fullDataset.filter(p => {
        const timeMs = new Date(p.timestamp).getTime();
        return timeMs >= startMs && timeMs <= endMs;
      });
    }
    
    if (datasetToSlice.length === 0) {
      setActivePoints([]);
      return;
    }

    const currentZoom = Math.min(zoomPoints, datasetToSlice.length);
    const maxOffset = datasetToSlice.length - currentZoom;
    const currentOffset = Math.min(maxOffset, Math.max(0, scrollOffset));
    
    const sliced = datasetToSlice.slice(
      datasetToSlice.length - currentZoom - currentOffset,
      datasetToSlice.length - currentOffset
    );
    setActivePoints(sliced);
  }, [scrollOffset, fullDataset, zoomPoints, startDate, endDate]);

  // Dynamic scaling zoom handler using scroll wheel deltaY
  const handleZoom = (deltaY: number) => {
    if (fullDataset.length === 0) return;
    
    const step = 12;
    const minZoom = 24; // High-zoom detailed resolution
    const maxZoom = Math.min(500, fullDataset.length); // Birds-eye overview range
    
    setZoomPoints((prev) => {
      if (deltaY > 0) {
        // Scroll down: Zoom OUT (show MORE points)
        return Math.min(maxZoom, prev + step);
      } else {
        // Scroll up: Zoom IN (show FEWER points)
        return Math.max(minZoom, prev - step);
      }
    });
  };

  // Passive-blocking wheel listener hook to scale the graph without scrolling the window!
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY);
    };

    const tempEl = tempChartRef.current;
    const humidEl = humidChartRef.current;

    if (tempEl) tempEl.addEventListener('wheel', handleWheel, { passive: false });
    if (humidEl) humidEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (tempEl) tempEl.removeEventListener('wheel', handleWheel);
      if (humidEl) humidEl.removeEventListener('wheel', handleWheel);
    };
  }, [fullDataset, zoomPoints]);

  // Calculate statistics over currently VISIBLE active points!
  const temps = activePoints.map(p => p.temperature);
  const humidities = activePoints.map(p => p.humidity);

  const maxTemp = temps.length && selectedContainerId !== 'container-right' ? Math.max(...temps).toFixed(1) : 'N/A';
  const minTemp = temps.length && selectedContainerId !== 'container-right' ? Math.min(...temps).toFixed(1) : 'N/A';
  const avgTemp = temps.length && selectedContainerId !== 'container-right' ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 'N/A';

  const maxHumid = humidities.length && selectedContainerId !== 'container-right' ? Math.max(...humidities) : 'N/A';
  const minHumid = humidities.length && selectedContainerId !== 'container-right' ? Math.min(...humidities) : 'N/A';
  const avgHumid = humidities.length && selectedContainerId !== 'container-right' ? Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length) : 'N/A';

  // Dragging event handlers supporting smooth panning
  const handleStartDrag = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setDragStartOffset(scrollOffset);
  };

  const handleDrag = (clientX: number) => {
    if (!isDragging || fullDataset.length === 0) return;
    const deltaX = clientX - dragStartX;
    
    // Scale mapping dynamically uses reactive zoomPoints
    const pointsPerPixel = zoomPoints / 680;
    const offsetChange = Math.round(deltaX * pointsPerPixel);
    
    const maxOffset = fullDataset.length - zoomPoints;
    const targetOffset = Math.min(maxOffset, Math.max(0, dragStartOffset + offsetChange));
    setScrollOffset(targetOffset);
  };

  const handleEndDrag = () => {
    setIsDragging(false);
  };

  // Helper date formatters
  const getFormattedTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFormattedDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: '2-digit' });
  };

  const getDetailedDateString = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // High Density SVG Draggable Chart Renderer
  const renderDraggableChart = (
    values: number[], 
    isTemp: boolean, 
    hoverIndex: number | null,
    setHoverIndex: (idx: number | null) => void
  ) => {
    if (values.length === 0) return null;

    const width = 800;
    const height = 360;
    const paddingLeft = 40;
    const paddingRight = 45;
    const paddingTop = 15;
    const paddingBottom = 40;

    const minVal = Math.min(...values) - 0.5;
    const maxVal = Math.max(...values) + 0.5;
    const valRange = maxVal - minVal || 1;

    const pointsCount = values.length;

    // Map coordinates
    const coords = values.map((val, index) => {
      const x = paddingLeft + (index * (width - paddingLeft - paddingRight)) / (pointsCount - 1);
      const y = height - paddingBottom - ((val - minVal) * (height - paddingTop - paddingBottom)) / valRange;
      return { x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    const gradientPathD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;
    const lineColor = isTemp ? 'var(--primary)' : '#0070f3';
    const gradientId = isTemp ? 'tempDragGrad' : 'humidDragGrad';

    // Form X-axis timeline labels
    const getXLabels = () => {
      const labels: { index: number; text: string }[] = [];
      const step = Math.floor(pointsCount / 5);
      for (let i = 0; i < pointsCount; i += step) {
        if (activePoints[i]) {
          labels.push({ 
            index: i, 
            text: timeMode === 'day' ? getFormattedTime(activePoints[i].timestamp) : getFormattedDate(activePoints[i].timestamp) 
          });
        }
      }
      // Guarantee last node
      if (labels[labels.length - 1]?.index !== pointsCount - 1 && activePoints[pointsCount - 1]) {
        labels.push({ 
          index: pointsCount - 1, 
          text: timeMode === 'day' ? getFormattedTime(activePoints[pointsCount - 1].timestamp) : getFormattedDate(activePoints[pointsCount - 1].timestamp) 
        });
      }
      return labels;
    };

    const xLabels = getXLabels();

    return (
      <div 
        style={{ position: 'relative', overflow: 'visible', cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={(e) => handleStartDrag(e.clientX)}
        onMouseMove={(e) => {
          handleDrag(e.clientX);
          // Set hover node index only when NOT dragging
          if (!isDragging) {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const widthRatio = mouseX / rect.width;
            const approxIndex = Math.round(widthRatio * (pointsCount - 1));
            if (approxIndex >= 0 && approxIndex < pointsCount) {
              setHoverIndex(approxIndex);
            }
          } else {
            setHoverIndex(null);
          }
        }}
        onMouseUp={handleEndDrag}
        onMouseLeave={() => {
          handleEndDrag();
          setHoverIndex(null);
        }}
        // Mobile touchscreen events
        onTouchStart={(e) => {
          if (e.touches[0]) handleStartDrag(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) handleDrag(e.touches[0].clientX);
        }}
        onTouchEnd={handleEndDrag}
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', pointerEvents: 'none' }}
        >
          <defs>
            {isTemp ? (
              <linearGradient id="tempDragGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
              </linearGradient>
            ) : (
              <linearGradient id="humidDragGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0070f3" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0070f3" stopOpacity="0.00" />
              </linearGradient>
            )}
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = paddingTop + ratio * (height - paddingTop - paddingBottom);
            const gridVal = maxVal - ratio * valRange;
            return (
              <g key={index}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--panel-border)"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x={width - paddingRight + 8}
                  y={y + 3}
                  fill="var(--text-muted)"
                  fontSize="11"
                  textAnchor="start"
                  fontWeight="600"
                >
                  {gridVal.toFixed(1)}
                  {isTemp ? '°' : '%'}
                </text>
              </g>
            );
          })}

          {/* X Axis labels */}
          {xLabels.map((lbl, index) => {
            const x = coords[lbl.index]?.x || paddingLeft;
            return (
              <g key={index}>
                <line
                  x1={x}
                  y1={height - paddingBottom}
                  x2={x}
                  y2={height - paddingBottom + 5}
                  stroke="var(--panel-border)"
                  opacity="0.8"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 18}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {lbl.text}
                </text>
              </g>
            );
          })}

          {/* Shaded area */}
          <path d={gradientPathD} fill={`url(#${gradientId})`} />

          {/* High density curve path line */}
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Guideline on hover */}
          {hoverIndex !== null && coords[hoverIndex] && (
            <g>
              <line
                x1={coords[hoverIndex].x}
                y1={paddingTop}
                x2={coords[hoverIndex].x}
                y2={height - paddingBottom}
                stroke={lineColor}
                strokeWidth="1.5"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              <circle
                cx={coords[hoverIndex].x}
                cy={coords[hoverIndex].y}
                r="6"
                fill="#ffffff"
                stroke={lineColor}
                strokeWidth="3.5"
              />
            </g>
          )}
        </svg>

        {/* Hover details tooltip card */}
        {hoverIndex !== null && coords[hoverIndex] && activePoints[hoverIndex] && (
          <div style={{
            position: 'absolute',
            top: `${(coords[hoverIndex].y / height) * 100 - 18}%`,
            left: `${Math.max(10, Math.min(85, (coords[hoverIndex].x / width) * 100 - 15))}%`,
            transform: 'translateY(-100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: `1.5px solid ${lineColor}`,
            borderRadius: '16px',
            padding: '8px 16px',
            color: 'var(--text-main)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            fontSize: '11.5px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            zIndex: 100,
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{ fontWeight: 800, color: lineColor, fontSize: '14px' }}>
              {values[hoverIndex].toFixed(1)}
              {isTemp ? '°C' : '%'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontWeight: 600 }}>
              {getDetailedDateString(activePoints[hoverIndex].timestamp)}
            </span>
          </div>
        )}
      </div>
    );
  };

  const getActiveIndicatorVal = (isTemp: boolean) => {
    if (activePoints.length === 0 || selectedContainerId === 'container-right') return 'N/A';
    const hoverIndex = isTemp ? hoveredTempIndex : hoveredHumidIndex;
    if (hoverIndex !== null && activePoints[hoverIndex]) {
      return isTemp ? `${activePoints[hoverIndex].temperature}°C` : `${activePoints[hoverIndex].humidity}%`;
    }
    return isTemp ? `${temps[temps.length - 1]}°C` : `${humidities[humidities.length - 1]}%`;
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Historical Climate Insights & Metrics</p>
        </div>
        <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          Back to Dashboard →
        </Link>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Container Selector Tabs */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          {CONTAINERS.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedContainerId(c.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: selectedContainerId === c.id ? 'var(--primary)' : 'rgba(0, 0, 0, 0.02)',
                color: selectedContainerId === c.id ? '#ffffff' : 'var(--text-muted)',
                borderColor: selectedContainerId === c.id ? 'var(--primary)' : 'var(--panel-border)',
                transition: 'all 0.2s ease'
              }}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Quick Statistics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
          <div className="glass-panel static" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '8px' }}>🌡️</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Temp</span>
            <h3 style={{ color: 'var(--text-main)', fontSize: '2rem', margin: '4px 0 0 0', fontWeight: 700 }}>
              {avgTemp !== 'N/A' ? `${avgTemp}°C` : 'N/A'}
            </h3>
          </div>
          <div className="glass-panel static" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '8px' }}>🔥</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Max Temp</span>
            <h3 style={{ color: 'var(--danger)', fontSize: '2rem', margin: '4px 0 0 0', fontWeight: 700 }}>
              {maxTemp !== 'N/A' ? `${maxTemp}°C` : 'N/A'}
            </h3>
          </div>
          <div className="glass-panel static" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '8px' }}>❄️</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Min Temp</span>
            <h3 style={{ color: '#0070f3', fontSize: '2rem', margin: '4px 0 0 0', fontWeight: 700 }}>
              {minTemp !== 'N/A' ? `${minTemp}°C` : 'N/A'}
            </h3>
          </div>
          <div className="glass-panel static" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '8px' }}>💦</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Humidity</span>
            <h3 style={{ color: '#0070f3', fontSize: '2rem', margin: '4px 0 0 0', fontWeight: 700 }}>
              {avgHumid !== 'N/A' ? `${avgHumid}%` : 'N/A'}
            </h3>
          </div>
        </div>

        {selectedContainerId === 'container-right' ? (
          /* Container 2 (Right) Connection Pending State */
          <div className="glass-panel static" style={{ textAlign: 'center', padding: '100px 20px', margin: '20px auto', maxWidth: '640px', width: '100%' }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '16px', color: 'var(--text-main)' }}>Hardware Pending Connection</h2>
            <p style={{ color: 'var(--text-muted)' }}>This container does not have an active SwitchBot Hub. Once paired, detailed historical graphs will populate here.</p>
          </div>
        ) : (
          /* Container 1 (Left) Consolidated Cockpit Views */
          <>
            {startDate && endDate && (
              <div className="glass-panel static" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 24px',
                borderRadius: '16px',
                backgroundColor: 'rgba(0, 112, 243, 0.05)',
                border: '1.5px solid rgba(0, 112, 243, 0.15)',
                width: '100%',
                maxWidth: '1100px',
                margin: '0 auto -10px auto'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0070f3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📅 Active Timeline Date Filter: <strong>{startDate}</strong> to <strong>{endDate}</strong>
                </span>
                <button 
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  style={{
                    background: 'rgba(0, 112, 243, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: '#0070f3',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ✕ Clear Filter
                </button>
              </div>
            )}
            {/* Live Indicator Metrics Row */}
            <section className="glass-panel static" style={detailStyles.metricsBar}>
              <div style={detailStyles.metricItem}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>🌡️ Temp: {getActiveIndicatorVal(true)}</span>
              </div>
              <div style={detailStyles.metricItem}>
                <span style={{ color: '#0070f3', fontWeight: 700 }}>💧 Humid: {getActiveIndicatorVal(false)}</span>
              </div>
              <div style={detailStyles.metricItem}>
                <span style={{ color: '#d97706', fontWeight: 700 }}>☀️ Sun: 1 Level</span>
              </div>
              <div style={detailStyles.metricItem}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>💨 Abs Humid: 22.27g/m³</span>
              </div>
              <div style={detailStyles.metricItem}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>🎚️ Setpoint: 24.6°C</span>
              </div>
            </section>

            {/* Sleek Mode Switch segment pills */}
            <div style={detailStyles.tabContainer}>
              <div className="glass-panel static" style={detailStyles.segmentWrapper}>
                <button 
                  onClick={() => setTimeMode('day')}
                  style={{
                    ...detailStyles.segmentBtn,
                    backgroundColor: timeMode === 'day' ? 'var(--primary)' : 'transparent',
                    color: timeMode === 'day' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  Day
                </button>
                <button 
                  onClick={() => setTimeMode('week')}
                  style={{
                    ...detailStyles.segmentBtn,
                    backgroundColor: timeMode === 'week' ? 'var(--primary)' : 'transparent',
                    color: timeMode === 'week' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  Week
                </button>
                <button 
                  onClick={() => setTimeMode('month')}
                  style={{
                    ...detailStyles.segmentBtn,
                    backgroundColor: timeMode === 'month' ? 'var(--primary)' : 'transparent',
                    color: timeMode === 'month' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  Month
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="glass-panel" 
                  style={{ ...detailStyles.iconBtn, cursor: 'pointer' }}
                  onClick={handleOpenRangeModal}
                >
                  📅 Range
                </button>
                <button 
                  className="glass-panel" 
                  style={{ ...detailStyles.iconBtn, cursor: 'pointer' }}
                  onClick={() => {
                    fetchAutomationLogs();
                    setShowLogsModal(true);
                  }}
                >
                  📊 Logs
                </button>
              </div>
            </div>

            {/* Temperature Variations Enlarge Drag Chart Panel */}
            <div className="glass-panel static" style={detailStyles.card}>
              <div style={detailStyles.cardHeader}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  🌡️ Temperature Variations
                </h3>
              </div>
              
              <div style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                <div style={detailStyles.leftStatsCol}>
                  <div>
                    <span style={detailStyles.statLabel}>Max</span>
                    <span style={{ ...detailStyles.statValTemp, color: 'var(--danger)' }}>{maxTemp}°C</span>
                  </div>
                  <div>
                    <span style={detailStyles.statLabel}>Avg</span>
                    <span style={detailStyles.statValTemp}>{avgTemp}°C</span>
                  </div>
                  <div>
                    <span style={detailStyles.statLabel}>Min</span>
                    <span style={{ ...detailStyles.statValTemp, color: '#0070f3' }}>{minTemp}°C</span>
                  </div>
                </div>
                
                <div ref={tempChartRef} style={{ flex: 1, touchAction: 'none' }}>
                  {renderDraggableChart(temps, true, hoveredTempIndex, setHoveredTempIndex)}
                </div>
              </div>
              
              <div style={detailStyles.chartFooter}>
                {activePoints[0] && `${getFormattedDate(activePoints[0].timestamp)} ${getFormattedTime(activePoints[0].timestamp)}`} ~ {activePoints[activePoints.length - 1] && `${getFormattedDate(activePoints[activePoints.length - 1].timestamp)} ${getFormattedTime(activePoints[activePoints.length - 1].timestamp)}`}
              </div>
            </div>

            {/* Humidity Variations Enlarge Drag Chart Panel */}
            <div className="glass-panel static" style={detailStyles.card}>
              <div style={detailStyles.cardHeader}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  💦 Humidity Variations
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                <div style={detailStyles.leftStatsCol}>
                  <div>
                    <span style={detailStyles.statLabel}>Max</span>
                    <span style={{ ...detailStyles.statValHumid, color: '#0070f3' }}>{maxHumid}%</span>
                  </div>
                  <div>
                    <span style={detailStyles.statLabel}>Avg</span>
                    <span style={detailStyles.statValHumid}>{avgHumid}%</span>
                  </div>
                  <div>
                    <span style={detailStyles.statLabel}>Min</span>
                    <span style={{ ...detailStyles.statValHumid, color: 'var(--danger)' }}>{minHumid}%</span>
                  </div>
                </div>
                
                <div ref={humidChartRef} style={{ flex: 1, touchAction: 'none' }}>
                  {renderDraggableChart(humidities, false, hoveredHumidIndex, setHoveredHumidIndex)}
                </div>
              </div>

              <div style={detailStyles.chartFooter}>
                {activePoints[0] && `${getFormattedDate(activePoints[0].timestamp)} ${getFormattedTime(activePoints[0].timestamp)}`} ~ {activePoints[activePoints.length - 1] && `${getFormattedDate(activePoints[activePoints.length - 1].timestamp)} ${getFormattedTime(activePoints[activePoints.length - 1].timestamp)}`}
              </div>
            </div>

            {/* SwitchBot options toggles bar */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
              <div className="glass-panel static" style={detailStyles.toggleRow}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>Absolute Humidity ℹ️</span>
                <button 
                  onClick={() => setAbsoluteHumidity(!absoluteHumidity)} 
                  style={{
                    ...detailStyles.switchBtn,
                    backgroundColor: absoluteHumidity ? 'var(--primary)' : 'rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div style={{
                    ...detailStyles.switchHandle,
                    transform: absoluteHumidity ? 'translateX(20px)' : 'translateX(0px)',
                    backgroundColor: '#ffffff'
                  }} />
                </button>
              </div>

              <div className="glass-panel static" style={detailStyles.toggleRow}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>Dew Point ℹ️</span>
                <button 
                  onClick={() => setDewPoint(!dewPoint)} 
                  style={{
                    ...detailStyles.switchBtn,
                    backgroundColor: dewPoint ? 'var(--primary)' : 'rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div style={{
                    ...detailStyles.switchHandle,
                    transform: dewPoint ? 'translateX(20px)' : 'translateX(0px)',
                    backgroundColor: '#ffffff'
                  }} />
                </button>
              </div>

              <div className="glass-panel static" style={detailStyles.toggleRow}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>Vapor-pressure Deficit ℹ️</span>
                <button 
                  onClick={() => setVpd(!vpd)} 
                  style={{
                    ...detailStyles.switchBtn,
                    backgroundColor: vpd ? 'var(--primary)' : 'rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div style={{
                    ...detailStyles.switchHandle,
                    transform: vpd ? 'translateX(20px)' : 'translateX(0px)',
                    backgroundColor: '#ffffff'
                  }} />
                </button>
              </div>
            </section>
          </>
        )}

        {/* Detailed Sensor Log Table at the bottom */}
        <div className="glass-panel static" style={{ padding: '24px', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 Recent SwitchBot Sensor Log
          </h3>
          {activePoints.length > 0 && selectedContainerId !== 'container-right' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-main)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--panel-border)', paddingBottom: '8px' }}>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Temperature</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Humidity</th>
                  </tr>
                </thead>
                <tbody>
                  {activePoints.slice().reverse().slice(0, 15).map((p, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', verticalAlign: 'middle' }}>
                      <td style={{ padding: '12px 8px' }}>{getFormattedDate(p.timestamp)}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{getFormattedTime(p.timestamp)}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--primary)' }}>{p.temperature.toFixed(1)}°C</td>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: '#0070f3' }}>{p.humidity}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No historical logs logged yet for this container.
            </div>
          )}
        </div>
      </div>

      {/* Glassmorphic Automation logs overlay */}
      {showLogsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel static" style={{
            width: '90%',
            maxWidth: '680px',
            maxHeight: '80vh',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            borderRadius: '24px',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🤖 System & Automation Logs
              </h3>
              <button 
                onClick={() => setShowLogsModal(false)}
                style={{
                  border: 'none',
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {selectedContainerId === 'container-right' ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No system logs. Right Container is pending connection.
                </div>
              ) : automationLogs.length > 0 ? (
                automationLogs.slice().reverse().map((log, i) => {
                  const isStable = log.includes('stable');
                  const isCool = log.includes('cool') || log.includes('decreased');
                  const isWarm = log.includes('warm') || log.includes('increased');
                  
                  let borderLeftColor = 'var(--panel-border)';
                  let bg = 'rgba(0, 0, 0, 0.02)';
                  
                  if (isStable) {
                    borderLeftColor = '#0070f3';
                    bg = 'rgba(0, 112, 243, 0.04)';
                  } else if (isCool) {
                    borderLeftColor = 'var(--danger)';
                    bg = 'rgba(255, 0, 0, 0.04)';
                  } else if (isWarm) {
                    borderLeftColor = 'var(--primary)';
                    bg = 'rgba(255, 120, 0, 0.04)';
                  }
                  
                  return (
                    <div key={i} style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${borderLeftColor}`,
                      backgroundColor: bg,
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: 'var(--text-main)',
                      fontFamily: 'monospace'
                    }}>
                      {log}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No system automation activities recorded yet.
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
              <button 
                className="glass-panel"
                onClick={() => setShowLogsModal(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Date Range Picker Modal */}
      {showRangeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel static" style={{
            width: '90%',
            maxWidth: '500px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            borderRadius: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📅 Select Climate Date Range
              </h3>
              <button 
                onClick={() => setShowRangeModal(false)}
                style={{
                  border: 'none',
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Filter telemetry charts to show only records between your chosen start and end dates. Available dates are populated dynamically based on actual sensor database history.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Start Date</label>
                  <select 
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--panel-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      color: 'var(--text-main)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {getAvailableDates().map((d, idx) => (
                      <option key={idx} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>End Date</label>
                  <select 
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--panel-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      color: 'var(--text-main)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {getAvailableDates().map((d, idx) => (
                      <option key={idx} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '16px', gap: '12px' }}>
              <button 
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setShowRangeModal(false);
                }}
                style={{
                  padding: '10px 18px',
                  backgroundColor: 'transparent',
                  border: '1.5px dashed var(--panel-border)',
                  color: 'var(--text-muted)',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Reset / Show All
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShowRangeModal(false)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    border: 'none',
                    color: 'var(--text-muted)',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setShowRangeModal(false);
                  }}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Apply Range
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const detailStyles: { [key: string]: React.CSSProperties } = {
  metricsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 12px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    fontSize: '11px',
    fontWeight: 700,
    flexWrap: 'wrap',
    gap: '12px'
  },
  metricItem: {
    flex: '1 1 auto',
    textAlign: 'center',
    padding: '4px 8px'
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    gap: '12px'
  },
  segmentWrapper: {
    display: 'flex',
    borderRadius: '14px',
    padding: '4px',
    width: '240px',
    border: '1px solid var(--panel-border)'
  },
  segmentBtn: {
    flex: 1,
    border: 'none',
    borderRadius: '10px',
    padding: '8px 0',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  iconBtn: {
    border: '1px solid var(--panel-border)',
    color: 'var(--text-muted)',
    borderRadius: '12px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    outline: 'none',
    fontWeight: 700,
    transition: 'all 0.2s ease'
  },
  card: {
    borderRadius: '24px',
    padding: '24px',
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid var(--panel-border)',
    userSelect: 'none' // Prevent selection while dragging
  },
  cardHeader: {
    borderBottom: '1px solid var(--panel-border)',
    paddingBottom: '12px'
  },
  leftStatsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '75px',
    borderRight: '1px solid var(--panel-border)',
    paddingRight: '12px',
    justifyContent: 'center'
  },
  statLabel: {
    display: 'block',
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.5px'
  },
  statValTemp: {
    display: 'block',
    fontSize: '14px',
    color: 'var(--primary)',
    fontWeight: 800
  },
  statValHumid: {
    display: 'block',
    fontSize: '14px',
    color: 'var(--primary)',
    fontWeight: 800
  },
  chartFooter: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '10px',
    marginTop: '6px',
    borderTop: '1px solid var(--panel-border)',
    paddingTop: '12px',
    fontWeight: 600
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '16px',
    padding: '16px 20px',
    border: '1px solid var(--panel-border)'
  },
  toggleLabel: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: 'var(--text-main)'
  },
  switchBtn: {
    width: '46px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    padding: '2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
  },
  switchHandle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    transition: 'transform 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
  }
};
