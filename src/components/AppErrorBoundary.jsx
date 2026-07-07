import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Application render failed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-error-page">
        <section className="panel app-error-panel">
          <p>Something went wrong</p>
          <h1>The page could not be displayed</h1>
          <small>{this.state.error.message}</small>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </section>
      </main>
    );
  }
}
