import { NavigationIcon, type ScreenName } from './NavigationIcon';

interface PlaceholderScreenProps {
  screen: ScreenName;
  subtitle: string;
  purpose: string;
  description: string;
}

export function PlaceholderScreen({ screen, subtitle, purpose, description }: PlaceholderScreenProps) {
  return (
    <section aria-labelledby="screen-heading">
      <div className="screen-heading">
        <p className="eyebrow">Kairos Monitor / {screen}</p>
        <h1 id="screen-heading">{screen}</h1>
        <p className="screen-subtitle">{subtitle}</p>
      </div>
      <div className="screen-grid">
        <article className="placeholder-card">
          <div className="placeholder-card-header">
            <span className="icon-container"><NavigationIcon screen={screen} /></span>
            <span className="availability-label">Not connected yet</span>
          </div>
          <h2>{purpose}</h2>
          <p>{description}</p>
          <div className="placeholder-note">
            <span className="empty-marker" aria-hidden="true" />
            <span>This screen is a placeholder. No results are available yet.</span>
          </div>
        </article>
        <aside className="preview-card" aria-labelledby="preview-heading">
          <p className="eyebrow">Prototype preview</p>
          <h2 id="preview-heading">A foundation for the mission</h2>
          <p>Only navigation is available in this preview. Mission data and browser checks will be added in later milestones.</p>
          <p className="team-credit">Team Requiem_SUST</p>
        </aside>
      </div>
    </section>
  );
}
