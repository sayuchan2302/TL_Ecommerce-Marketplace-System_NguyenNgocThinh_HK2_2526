import './pageFallback.css';

const PageFallback = () => (
  <div className="page-fallback">
    <div className="page-fallback-row shimmer" />
    <div className="page-fallback-grid">
      <div className="page-fallback-card shimmer" />
      <div className="page-fallback-card shimmer" />
      <div className="page-fallback-card shimmer" />
    </div>
    <div className="page-fallback-row shimmer short" />
  </div>
);

export default PageFallback;
