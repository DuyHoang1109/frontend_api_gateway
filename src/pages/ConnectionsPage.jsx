import React from 'react';
import { Field, FormActions, Panel } from '../components/common.jsx';
import { getSavedBaseUrl, getSavedLogServiceBaseUrl } from '../api/gatewayAdminApi.js';

export default function ConnectionsPage({ baseUrl, setBaseUrl, onSave, logServiceBaseUrl, setLogServiceBaseUrl, onSaveLogService }) {
  return (
    <section className="content-stack">
      <Panel title="Gateway connection" eyebrow="local dashboard config">
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <Field label="Gateway base URL" value={baseUrl} onChange={setBaseUrl} required />
          <FormActions editing={true} onCancel={() => setBaseUrl(getSavedBaseUrl())} />
        </form>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSaveLogService(); }}>
          <Field label="Log service URL" value={logServiceBaseUrl} onChange={setLogServiceBaseUrl} required />
          <FormActions editing={true} onCancel={() => setLogServiceBaseUrl(getSavedLogServiceBaseUrl())} />
        </form>
      </Panel>
    </section>
  );
}
