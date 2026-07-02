import React from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { EmptyState, HealthCard, Panel, StatusPill } from '../components/common.jsx';

export default function HealthChecksPage(props) {
  const {
    health,
    ready,
    services,
    instances,
    serviceName,
    serviceHealth,
    instanceHealth,
    loading,
    checkingInstanceId,
    onReload,
    onCheckInstance
  } = props;

  return (
    <section className="content-stack">
      <Panel title="Gateway health checks" eyebrow="bound">
        <div className="feature-cards">
          <HealthCard title="/health" active={Boolean(health)} payload={health} />
          <HealthCard title="/ready" active={Boolean(ready)} payload={ready} />
        </div>
      </Panel>

      <Panel title="Service health" eyebrow="GET /admin/services/:id/health">
        <div className="health-toolbar">
          <p className="panel-copy">Live aggregate status from the gateway health store.</p>
          <button className="ghost-button" type="button" onClick={onReload} disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}
            Refresh health
          </button>
        </div>
        <div className="feature-cards">
          {services.map((service) => {
            const current = serviceHealth[service.id];
            const active = Boolean(current?.total) && current?.down === 0 && current?.alive === current?.total;
            return (
              <div className="feature-card" key={service.id}>
                <StatusPill active={active} label={current?.error ? 'unavailable' : active ? 'healthy' : 'degraded'} />
                <strong>{service.name}</strong>
                <small>{current ? `${current.alive || 0}/${current.total || 0} alive, ${current.down || 0} down` : 'Not loaded'}</small>
              </div>
            );
          })}
        </div>
        {services.length === 0 && <EmptyState text="No services found" />}
      </Panel>

      <Panel title="Service instance health" eyebrow="GET + POST /admin/instances/:id/health">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Target</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Last check</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => {
              const current = instanceHealth[instance.id];
              const checking = checkingInstanceId === instance.id;
              return (
                <tr key={instance.id}>
                  <td>{serviceName(instance.service_id)}</td>
                  <td>{instance.host}:{instance.port}</td>
                  <td><StatusPill active={current?.status === 'alive'} label={current?.status || 'unknown'} /></td>
                  <td>{Number.isFinite(current?.latency_ms) ? `${current.latency_ms.toFixed(2)} ms` : '-'}</td>
                  <td>{formatTimestamp(current?.last_check)}</td>
                  <td>
                    <button className="icon-button" type="button" onClick={() => onCheckInstance(instance.id)} disabled={checking} title="Run health check">
                      {checking ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {instances.length === 0 && <EmptyState text="No instances found" />}
      </Panel>
    </section>
  );
}

function formatTimestamp(value) {
  if (!value || value.startsWith?.('0001-')) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}
