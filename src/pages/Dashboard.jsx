import React from 'react';
import { Activity, AlertCircle, Cloud, Download, Filter, Gauge, GitFork, Globe2, LayoutDashboard, RefreshCcw, ShieldCheck, Server } from 'lucide-react';
import { backendFeatureStatus, sections } from '../config/navigation.jsx';
import { EmptyState, Metric } from '../components/common.jsx';

export default function Dashboard({ services, instances, routes, health, ready, onNavigate }) {
  const activeServices = services.filter((item) => item.is_active).length;
  const activeInstances = instances.filter((item) => item.is_active).length;
  const activeRoutes = routes.filter((item) => item.is_active).length;
  const missingFeatureCount = Object.values(backendFeatureStatus).filter((feature) => feature.status === 'missing').length;
  const systemHealth = health && ready ? '99.9%' : health ? '75.0%' : '0%';
  const recentLogs = buildRecentLogs(routes);

  return (
    <section className="dashboard-stack">
      <div className="dashboard-kpi-grid">
        <KpiCard title="Total Requests" subtitle="24h" value="4.2M" trend="+12.5%" trendTone="up" note="vs yesterday" icon={Globe2} />
        <KpiCard title="Avg Latency" value="120" unit="ms" trend="+5ms" trendTone="down" note="vs yesterday" icon={Gauge} />
        <KpiCard title="Error Rate" value="0.02%" trend="-0.01%" trendTone="up" note="vs yesterday" icon={AlertCircle} />
        <KpiCard title="System Health" value={systemHealth} trend={health ? 'All systems operational' : 'Gateway unavailable'} trendTone={health ? 'up' : 'down'} icon={ShieldCheck} />
      </div>

      <section className="page-grid compact-metrics">
        <Metric title="Services" value={services.length} detail={`${activeServices} active`} icon={Cloud} onClick={() => onNavigate('services')} />
        <Metric title="Instances" value={instances.length} detail={`${activeInstances} active`} icon={Server} onClick={() => onNavigate('instances')} />
        <Metric title="Routes" value={routes.length} detail={`${activeRoutes} active`} icon={GitFork} onClick={() => onNavigate('routes')} />
        <Metric title="Health" value={health ? 'OK' : '-'} detail={ready ? 'ready endpoint online' : 'ready unknown'} icon={Activity} onClick={() => onNavigate('info')} />
        <Metric title="Konga Modules" value={sections.length - 1} detail={`${missingFeatureCount} need backend APIs`} icon={LayoutDashboard} />
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
          <TrafficChart />
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
              <button className="tiny-button"><Filter size={13} /> Filter</button>
              <button className="tiny-button"><Download size={13} /> Export</button>
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
              {recentLogs.map((log) => (
                <tr key={`${log.path}-${log.timestamp}`}>
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
          {trend}
          {note && <small>{note}</small>}
        </p>
      )}
    </section>
  );
}

function TrafficChart() {
  return (
    <div className="traffic-chart">
      <div className="chart-axis">
        <span>4k</span>
        <span>3k</span>
        <span>2k</span>
        <span>1k</span>
      </div>
      <svg viewBox="0 0 640 250" role="img" aria-label="Real time traffic chart">
        <defs>
          <linearGradient id="trafficFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f80ed" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#2f80ed" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path className="traffic-area" d="M0 210 C50 185 100 190 150 185 C210 175 230 110 285 70 C345 30 400 110 455 100 C510 90 510 40 575 55 C615 65 625 110 640 130 L640 250 L0 250 Z" />
        <path className="traffic-line" d="M0 210 C50 185 100 190 150 185 C210 175 230 110 285 70 C345 30 400 110 455 100 C510 90 510 40 575 55 C615 65 625 110 640 130" />
      </svg>
      <div className="chart-time">
        <span>00:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>18:00</span>
      </div>
    </div>
  );
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
