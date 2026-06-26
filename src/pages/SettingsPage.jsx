import React from 'react';
import { FeatureMatrix, Field, FormActions, InfoItem, Panel } from '../components/common.jsx';
import { getSavedBaseUrl } from '../api/gatewayAdminApi.js';

export default function SettingsPage({ baseUrl, setBaseUrl, onSave, services, instances, routes }) {
  return (
    <section className="content-stack">
      <Panel title="Dashboard settings" eyebrow="local">
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <Field label="Gateway base URL" value={baseUrl} onChange={setBaseUrl} required />
          <InfoItem label="Cached resources" value={`${services.length} services / ${instances.length} instances / ${routes.length} routes`} />
          <FormActions editing={true} onCancel={() => setBaseUrl(getSavedBaseUrl())} />
        </form>
      </Panel>

      <Panel title="Backend modules to add next" eyebrow="roadmap">
        <FeatureMatrix onlyMissing />
      </Panel>
    </section>
  );
}
