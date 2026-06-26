import React from 'react';
import { Field, FormActions, Panel } from '../components/common.jsx';
import { backendFeatureStatus } from '../config/navigation.jsx';
import { getSavedBaseUrl } from '../api/gatewayAdminApi.js';
import KongaFeaturePage from './KongaFeaturePage.jsx';

export default function ConnectionsPage({ baseUrl, setBaseUrl, onSave }) {
  return (
    <section className="content-stack">
      <Panel title="Gateway connection" eyebrow="local dashboard config">
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <Field label="Gateway base URL" value={baseUrl} onChange={setBaseUrl} required />
          <FormActions editing={true} onCancel={() => setBaseUrl(getSavedBaseUrl())} />
        </form>
      </Panel>

      <KongaFeaturePage feature={backendFeatureStatus.connections} />
    </section>
  );
}
