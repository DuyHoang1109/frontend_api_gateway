import React from 'react';
import { Loader2, RefreshCcw, RotateCcw } from 'lucide-react';
import { FeatureMatrix, Field, FormActions, InfoItem, Panel } from '../components/common.jsx';
import { getSavedBaseUrl, getSavedLogServiceBaseUrl } from '../api/gatewayAdminApi.js';

export default function SettingsPage(props) {
  const {
    baseUrl,
    setBaseUrl,
    onSave,
    logServiceBaseUrl,
    setLogServiceBaseUrl,
    onSaveLogService,
    services,
    instances,
    routes,
    cacheStatus,
    cacheLoading,
    onRefreshCache,
    onReloadCache
  } = props;

  return (
    <section className="content-stack">
      <Panel title="Dashboard settings" eyebrow="local">
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <Field label="Gateway base URL" value={baseUrl} onChange={setBaseUrl} required />
          <InfoItem label="Cached resources" value={`${services.length} services / ${instances.length} instances / ${routes.length} routes`} />
          <FormActions editing={true} onCancel={() => setBaseUrl(getSavedBaseUrl())} />
        </form>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSaveLogService(); }}>
          <Field label="Log service URL" value={logServiceBaseUrl} onChange={setLogServiceBaseUrl} required />
          <InfoItem label="Dashboard metrics source" value={`${logServiceBaseUrl}/admin/metrics/*`} />
          <FormActions editing={true} onCancel={() => setLogServiceBaseUrl(getSavedLogServiceBaseUrl())} />
        </form>
      </Panel>

      <Panel title="Configuration cache" eyebrow="GET version + POST reload">
        <div className="info-grid">
          <InfoItem label="Local version" value={cacheStatus?.local_version ?? '-'} />
          <InfoItem label="Redis version" value={cacheStatus?.redis_version ?? '-'} />
          <InfoItem label="Synchronization" value={cacheStatus?.synced ? 'Synced' : cacheStatus ? 'Pending' : 'Unknown'} />
          <InfoItem label="Reload state" value={cacheStatus?.reloaded ? 'Reloaded' : 'Ready'} />
        </div>
        <div className="cache-actions">
          <button className="ghost-button" type="button" onClick={onRefreshCache} disabled={cacheLoading}>
            <RefreshCcw size={16} />
            Refresh version
          </button>
          <button className="primary-button" type="button" onClick={onReloadCache} disabled={cacheLoading}>
            {cacheLoading ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} />}
            Reload cache
          </button>
        </div>
      </Panel>

      <Panel title="Backend modules to add next" eyebrow="roadmap">
        <FeatureMatrix onlyMissing />
      </Panel>
    </section>
  );
}
