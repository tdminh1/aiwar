export default function FeedLoading() {
  return (
    <main className="feed-app feed-loading" aria-busy="true" aria-label="Loading intelligence feed">
      <header className="feed-topbar">
        <div className="skeleton skeleton-logo" />
        <div className="skeleton skeleton-account" />
      </header>
      <div className="feed-loading-grid">
        <aside className="skeleton skeleton-panel" />
        <section className="feed-loading-list">
          <div className="skeleton skeleton-heading" />
          {Array.from({ length: 6 }, (_, index) => <div className="skeleton skeleton-row" key={index} />)}
        </section>
        <aside className="skeleton skeleton-panel" />
      </div>
    </main>
  );
}
