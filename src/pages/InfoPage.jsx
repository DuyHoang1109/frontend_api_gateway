import React from 'react';
import { FeatureMatrix, InfoItem, Panel } from '../components/common.jsx';

export default function InfoPage({ baseUrl, health, ready, services, instances, routes }) {
  return (
    <section className="content-stack">
      <Panel title="Gateway status" eyebrow="GET /health + GET /ready">
        <div className="info-grid">
          <InfoItem label="Gateway URL" value={baseUrl} />
          <InfoItem label="Health" value={health ? JSON.stringify(health) : 'unavailable'} />
          <InfoItem label="Ready" value={ready ? JSON.stringify(ready) : 'unavailable'} />
          <InfoItem label="Bound admin resources" value={`${services.length} services, ${instances.length} instances, ${routes.length} routes`} />
        </div>
      </Panel>

      <Panel title="Konga feature coverage" eyebrow="frontend parity">
        <FeatureMatrix />
      </Panel>
    </section>
  );
}
