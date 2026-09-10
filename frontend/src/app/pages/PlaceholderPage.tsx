import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  icon: string;
  phase: string;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  icon,
  phase,
  description,
}) => {
  return (
    <div className="placeholder-container" id={`page-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="placeholder-card">
        <div className="placeholder-icon">{icon}</div>
        <div className="placeholder-badge">{phase}</div>
        <h2 className="placeholder-title">{title}</h2>
        <p className="placeholder-desc">{description}</p>
        <div className="placeholder-meta">
          <span>This feature module is scheduled for implementation in upcoming roadmap tasks.</span>
        </div>
        <div className="placeholder-actions">
          <Link to="/" className="btn btn-primary" id="btn-back-dashboard">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
