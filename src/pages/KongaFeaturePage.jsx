import React from 'react';
import { Panel, StatusBadge } from '../components/common.jsx';

export default function KongaFeaturePage({ feature, services = [], routes = [], instances = [], onNavigate }) {
  return (
    <section className="content-stack">
      <Panel title={feature.title} eyebrow={`status: ${feature.status}`}>
        <div className="feature-layout">
          <div>
            <p className="panel-copy">{feature.summary}</p>
            <div className="endpoint-list">
              {feature.endpoints.map((endpoint) => (
                <code key={endpoint}>{endpoint}</code>
              ))}
            </div>
          </div>
          <StatusBadge status={feature.status} />
        </div>
      </Panel>

      <Panel title="Available related data" eyebrow="from bound admin APIs">
        <div className="feature-cards">
          <button className="feature-card" onClick={() => onNavigate?.('services')}>
            <strong>{services.length}</strong>
            <span>Services</span>
            <small>GET /admin/services</small>
          </button>
          <button className="feature-card" onClick={() => onNavigate?.('instances')}>
            <strong>{instances.length}</strong>
            <span>Instances</span>
            <small>GET /admin/instances</small>
          </button>
          <button className="feature-card" onClick={() => onNavigate?.('routes')}>
            <strong>{routes.length}</strong>
            <span>Routes</span>
            <small>GET /admin/routes</small>
          </button>
        </div>
      </Panel>
    </section>
  );
}
