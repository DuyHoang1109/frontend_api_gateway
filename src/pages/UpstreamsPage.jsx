import React from 'react';
import { Server } from 'lucide-react';
import { EmptyState, Panel, StatusPill } from '../components/common.jsx';

export default function UpstreamsPage({ services, instances, serviceName, onNavigate }) {
  return (
    <section className="content-stack">
      <Panel title="Upstreams mapped to service instances" eyebrow="GET /admin/instances">
        <p className="panel-copy">
          In Konga, upstreams and targets group backend instances for load balancing. In GW_v1, the closest model is service_instances.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Upstream service</th>
              <th>Target</th>
              <th>Weight</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => (
              <tr key={instance.id}>
                <td><strong>{serviceName(instance.service_id)}</strong><small>{instance.service_id}</small></td>
                <td>{instance.host}:{instance.port}</td>
                <td>{instance.weight}</td>
                <td><StatusPill active={instance.is_active} label={instance.is_active ? 'active' : 'inactive'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {instances.length === 0 && <EmptyState text="No upstream targets found" />}
        <div className="linked-actions">
          <button className="primary-button" onClick={() => onNavigate('instances')}>
            <Server size={17} />
            Manage instances
          </button>
        </div>
      </Panel>

      <Panel title="Load balancing strategies" eyebrow="services.lb_strategy">
        <div className="feature-cards">
          {services.map((service) => (
            <div className="feature-card" key={service.id}>
              <strong>{service.name}</strong>
              <span>{service.lb_strategy}</span>
              <small>{instances.filter((instance) => instance.service_id === service.id).length} targets</small>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
