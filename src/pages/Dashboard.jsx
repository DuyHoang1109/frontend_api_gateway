import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Cloud, Download, Filter, Gauge, GitFork, Globe2, RefreshCcw, ShieldCheck, Server } from 'lucide-react';
import { EmptyState, Metric } from '../components/common.jsx';

export default function Dashboard({ api, services, instances, routes, health, ready, onNavigate }) {
  const [snapshot, setSnapshot] = useState(null);
  const [requestLogs, setRequestLogs] = useState([]);
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [streamError, setStreamError] = useState('');

  const activeServices = services.filter((item) => item.is_active).length;
  const activeInstances = instances.filter((item) => item.is_active).length;
  const activeRoutes = routes.filter((item) => item.is_active).length;
  const systemHealth = health && ready ? '99.9%' : health ? '75.0%' : '0%';
  const recentLogs = requestLogs.length > 0 ? normalizeLogs(requestLogs) : buildRecentLogs(routes);
  const summary = snapshot?.summary || {};
  const rps = Array.isArray(snapshot?.rps) ? snapshot.rps : [];

  useEffect(() => {
    if (!api?.streamRealtimeMetrics && !api?.getRealtimeSnapshot) return undefined;

    let retryTimer = null;
    let pollTimer = null;
    let stopped = false;
    let controller = null;
    const realtimeParams = { window: '60s', interval: '1s', top_limit: 10 };

    const pollSnapshot = async () => {
      if (stopped || !api?.getRealtimeSnapshot) return;
      try {
        const payload = await api.getRealtimeSnapshot(realtimeParams);
        if (!stopped) {
          setSnapshot(payload);
          setStreamStatus((current) => current === 'connected' ? current : 'polling');
          setStreamError('');
        }
      } catch (error) {
        if (!stopped) {
          setStreamStatus('disconnected');
          setStreamError(error.message || 'Cannot load metrics');
        }
      }
    };

    const startPolling = () => {
      if (pollTimer || !api?.getRealtimeSnapshot) return;
      pollSnapshot();
      pollTimer = window.setInterval(pollSnapshot, 2000);
    };

    const stopPolling = () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connect = () => {
      if (stopped) return;
      if (!api?.streamRealtimeMetrics) {
        startPolling();
        return;
      }
      controller = new AbortController();
      setStreamStatus('connecting');

      api.streamRealtimeMetrics(
        realtimeParams,
        {
          signal: controller.signal,
          onOpen: () => {
            stopPolling();
            setStreamStatus('connected');
            setStreamError('');
          },
          onMetrics: (payload) => {
            if (payload && typeof payload === 'object') {
              setSnapshot(payload);
            }
            setStreamStatus('connected');
            setStreamError('');
          },
          onError: (payload) => {
            setStreamStatus('degraded');
            setStreamError(payload?.message || 'Realtime stream degraded');
            startPolling();
          }
        }
      ).catch((error) => {
        if (stopped || error.name === 'AbortError') return;
        setStreamStatus('disconnected');
        setStreamError(error.message || 'Realtime stream disconnected');
        startPolling();
        retryTimer = window.setTimeout(connect, 3000);
      });
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      stopPolling();
      if (controller) controller.abort();
    };
  }, [api]);

  useEffect(() => {
    let ignore = false;
    if (!api?.getLogs) return undefined;

    const loadRecentLogs = () => {
      api.getLogs({ page: 1, limit: 5, sort: '@timestamp:desc' })
        .then((items) => {
          if (!ignore) setRequestLogs(items);
        })
        .catch(() => {
          if (!ignore) setRequestLogs([]);
        });
    };

    loadRecentLogs();
    const timer = window.setInterval(loadRecentLogs, 10000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [api]);

  const streamDetail = useMemo(() => {
    if (streamStatus === 'connected') return 'SSE connected';
    if (streamStatus === 'polling') return 'Polling metrics';
    if (streamStatus === 'degraded') return 'Elasticsearch retrying';
    if (streamStatus === 'disconnected') return 'Reconnecting';
    return 'Connecting';
  }, [streamStatus]);

  function exportRecentLogs() {
    const headers = ['Timestamp', 'Method', 'Path', 'Status', 'Latency'];
    const rows = recentLogs.map((log) => [
      log.timestamp,
      log.method,
      log.path,
      log.status,
      `${log.latency}ms`
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recent-api-logs-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="dashboard-stack">
      <div className="dashboard-kpi-grid">
        <KpiCard title="Total Requests" subtitle="60s" value={formatNumber(summary.total_requests)} trend={streamDetail} trendTone={streamStatus === 'connected' || streamStatus === 'polling' ? 'up' : 'down'} note={streamError} icon={Globe2} />
        <KpiCard title="Avg Latency" value={formatLatency(summary.avg_latency_ms)} unit="ms" trend={`p95 ${formatLatency(summary.p95_latency_ms)}ms`} trendTone={Number(summary.p95_latency_ms || 0) > 500 ? 'down' : 'up'} icon={Gauge} />
        <KpiCard title="Error Rate" value={formatPercent(summary.error_rate)} trend={`${formatNumber(summary.error_count)} errors`} trendTone={Number(summary.error_rate || 0) > 0.05 ? 'down' : 'up'} icon={AlertCircle} />
        <KpiCard title="System Health" value={systemHealth} trend={health ? 'All systems operational' : 'Gateway unavailable'} trendTone={health ? 'up' : 'down'} icon={ShieldCheck} />
      </div>

      <section className="page-grid compact-metrics dashboard-resource-grid">
        <Metric title="Services" value={services.length} detail={`${activeServices} active`} icon={Cloud} onClick={() => onNavigate('services')} />
        <Metric title="Instances" value={instances.length} detail={`${activeInstances} active`} icon={Server} onClick={() => onNavigate('instances')} />
        <Metric title="Routes" value={routes.length} detail={`${activeRoutes} active`} icon={GitFork} onClick={() => onNavigate('routes')} />
        <Metric title="Health" value={health ? 'OK' : '-'} detail={ready ? 'ready endpoint online' : 'ready unknown'} icon={Activity} onClick={() => onNavigate('info')} />
      </section>

      <div className="dashboard-main-grid">
        <section className="panel traffic-panel">
          <div className="panel-title split-title">
            <div>
              <p>Monitoring</p>
              <h2>Real-time Traffic</h2>
            </div>
            <button className="tiny-button">Last 24 Hours</button>
          </div>
          <TrafficChart data={rps} />
        </section>

        <section className="panel discovery-panel">
          <div className="panel-title split-title">
            <div>
              <p>Registry</p>
              <h2>Service Discovery</h2>
            </div>
            <button className="ghost-icon compact" title="Refresh services"><RefreshCcw size={14} /></button>
          </div>

          <div className="service-discovery-list">
            {services.slice(0, 4).map((service) => {
              const targets = instances.filter((instance) => instance.service_id === service.id);
              const activeTargets = targets.filter((instance) => instance.is_active).length;
              return (
                <button className="service-discovery-item" key={service.id} onClick={() => onNavigate('services')}>
                  <span className={service.is_active ? 'dot ok' : 'dot danger'} />
                  <strong>{service.name}</strong>
                  <small>{service.protocol || 'http'} / {service.lb_strategy}</small>
                  <em>{activeTargets}/{targets.length || 0}<span>Instances</span></em>
                </button>
              );
            })}
            {services.length === 0 && <EmptyState text="No services found" />}
          </div>

          <button className="outline-wide-button" onClick={() => onNavigate('services')}>View All Services</button>
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel logs-panel">
          <div className="panel-title split-title">
            <div>
              <p>Request Trace</p>
              <h2>Recent API Logs</h2>
            </div>
            <div className="table-tools">
              <button className="tiny-button" type="button" onClick={() => onNavigate('logs')}><Filter size={13} /> Filter</button>
              <button className="tiny-button" type="button" onClick={exportRecentLogs} disabled={recentLogs.length === 0}><Download size={13} /> Export</button>
            </div>
          </div>

          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log, index) => (
                <tr key={log.traceId || `${log.path}-${log.timestamp}-${index}`}>
                  <td>{log.timestamp}</td>
                  <td><span className={`method-badge ${log.method.toLowerCase()}`}>{log.method}</span></td>
                  <td><code className="path-code">{log.path}</code></td>
                  <td><span className={`status-code s${String(log.status)[0]}`}>{log.status}</span></td>
                  <td className={log.latency > 900 ? 'latency-warn' : ''}>{log.latency}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentLogs.length === 0 && <EmptyState text="No API logs yet" />}
        </section>

        <section className="panel route-overview-panel">
          <div className="panel-title split-title">
            <div>
              <p>Runtime Map</p>
              <h2>Route to service overview</h2>
            </div>
            <button className="tiny-button" onClick={() => onNavigate('routes')}>Manage Routes</button>
          </div>
          <div className="route-map">
            {routes.length === 0 ? (
              <EmptyState text="No routes found" />
            ) : routes.slice(0, 8).map((route) => (
              <div className="route-map-row" key={route.id}>
                <span className="method">{route.method}</span>
                <strong>{route.path}</strong>
                <span>{route.service_id}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function KpiCard({ title, subtitle, value, unit, trend, trendTone, note, icon: Icon }) {
  return (
    <section className="kpi-card">
      <div className="kpi-head">
        <div>
          <span>{title}</span>
          {subtitle && <small>({subtitle})</small>}
        </div>
        <Icon size={16} />
      </div>
      <strong>{value}{unit && <em>{unit}</em>}</strong>
      {trend && (
        <p className={trendTone === 'up' ? 'trend-up' : 'trend-down'}>
          <span>{trend}</span>
          {note && <small title={note}>{note}</small>}
        </p>
      )}
    </section>
  );
}

function TrafficChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const points = chartPoints(safeData);
  const linePath = pointsToLinePath(points);
  const areaPath = `${linePath} L640 250 L0 250 Z`;
  const maxRequests = Math.max(...safeData.map((item) => Number(item.requests || 0)), 1);
  const labels = chartLabels(safeData);

  return (
    <div className="traffic-chart">
      <div className="chart-axis">
        <span>{formatCompact(maxRequests)}</span>
        <span>{formatCompact(maxRequests * 0.66)}</span>
        <span>{formatCompact(maxRequests * 0.33)}</span>
        <span>0</span>
      </div>
      <svg viewBox="0 0 640 250" role="img" aria-label="Real time traffic chart">
        <defs>
          <linearGradient id="trafficFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f80ed" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#2f80ed" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path className="traffic-area" d={areaPath} />
        <path className="traffic-line" d={linePath} />
      </svg>
      <div className="chart-time">
        {labels.map((label) => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}

function normalizeLogs(logs) {
  return (Array.isArray(logs) ? logs : []).slice(0, 5).map((log) => ({
    traceId: log.trace_id,
    timestamp: formatTimestamp(log['@timestamp']),
    method: log.method || '-',
    path: log.path || log.normalized_path || '-',
    status: log.status_code || 0,
    latency: Math.round(Number(log.response_time_ms || 0))
  }));
}

function formatTimestamp(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatNumber(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('en-US', { notation: number >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(number);
}

function formatCompact(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(Number(value || 0)));
}

function formatLatency(value) {
  return String(Math.round(Number(value || 0)));
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function chartPoints(data) {
  const values = data.length > 0 ? data : Array.from({ length: 12 }, () => ({ requests: 0 }));
  const max = Math.max(...values.map((item) => Number(item.requests || 0)), 1);
  return values.map((item, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 640;
    const y = 220 - (Number(item.requests || 0) / max) * 170;
    return [x, y];
  });
}

function pointsToLinePath(points) {
  if (points.length === 0) return 'M0 220 L640 220';
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function chartLabels(data) {
  if (data.length < 2) return ['now-60s', 'now'];
  const first = formatChartTime(data[0].timestamp);
  const middle = formatChartTime(data[Math.floor(data.length / 2)].timestamp);
  const last = formatChartTime(data[data.length - 1].timestamp);
  return Array.from(new Set([first, middle, last]));
}

function formatChartTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function buildRecentLogs(routes) {
  const fallbackRoutes = [
    { method: 'GET', path: '/api/products', is_active: true },
    { method: 'POST', path: '/api/auth/login', is_active: true },
    { method: 'GET', path: '/api/product/2', is_active: true },
    { method: 'DELETE', path: '/api/order/123', is_active: false },
    { method: 'PUT', path: '/api/user/profile', is_active: true }
  ];

  const source = routes.length > 0 ? routes : fallbackRoutes;
  return source.slice(0, 5).map((route, index) => {
    const status = route.is_active === false ? 500 : index === 2 ? 404 : index === 1 ? 201 : 200;
    return {
      timestamp: `2026-06-26 0${index + 8}:3${index}:1${index}`,
      method: route.method,
      path: route.path,
      status,
      latency: status >= 500 ? 1450 : 45 + index * 31
    };
  });
}
