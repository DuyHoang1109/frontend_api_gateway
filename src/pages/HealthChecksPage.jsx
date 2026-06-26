import React from 'react';
import { HealthCard, Panel, StatusPill } from '../components/common.jsx';

export default function HealthChecksPage({ health, ready, instances, serviceName }) {
  return (
    <section className="content-stack">
      <Panel title="Gateway health checks" eyebrow="bound">
        <div className="feature-cards">
          <HealthCard title="/health" active={Boolean(health)} payload={health} />
          <HealthCard title="/ready" active={Boolean(ready)} payload={ready} />
        </div>
      </Panel>

      <Panel title="Service instance health" eyebrow="future endpoint">
        <p className="panel-copy">
          GW_v1 does not expose per-instance health checks yet. This table uses the active flag as the current demo status.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Target</th>
              <th>Current flag</th>
              <th>Needed API</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => (
              <tr key={instance.id}>
                <td>{serviceName(instance.service_id)}</td>
                <td>{instance.host}:{instance.port}</td>
                <td><StatusPill active={instance.is_active} label={instance.is_active ? 'active' : 'inactive'} /></td>
                <td>GET /admin/instances/{instance.id}/health</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}
