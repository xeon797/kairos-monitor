import { PROTOTYPE_CHECK_LIMIT, PROTOTYPE_METHOD_LIMIT, RESEARCH_DATA_ACCESS, RESEARCH_DATA_LABEL, RESEARCH_SOURCES } from '../research/sources';

function pageLabel(pages: readonly number[]) {
  return `PDF ${pages.length === 1 ? 'p.' : 'pp.'} ${pages.join(', ')}`;
}

export function ResearchSources() {
  return <section className="research-section" aria-labelledby="research-title">
    <h3 id="research-title">Research behind Kairos</h3>
    <p><strong>Mission scenario: {RESEARCH_DATA_LABEL}</strong></p>
    <p>{RESEARCH_DATA_ACCESS}</p>
    <p>{PROTOTYPE_METHOD_LIMIT}</p>
    <p>{PROTOTYPE_CHECK_LIMIT}</p>
    <p>These sources do not imply NASA endorsement of Kairos Monitor.</p>
    <div className="research-sources">{RESEARCH_SOURCES.map(source => <article className="research-source" key={source.id} aria-labelledby={`research-${source.id}-title`}>
      <p className="research-byline">{source.authors[0]}{source.authors.length > 1 ? ' and coauthors' : ''} · {source.year}</p>
      <h4 id={`research-${source.id}-title`}>{source.title}</h4>
      <p>{source.overview}</p>
      <p><a href={source.officialUrl} target="_blank" rel="noreferrer">Read {source.id === 'hera' ? 'the HERA article' : 'the ISS source'}<span className="external-label"> (opens a new tab)</span></a></p>
      <details className="research-details">
        <summary>Study details and limits · {source.id === 'hera' ? 'HERA' : 'ISS'}</summary>
        <div className="research-detail-content">
          <p><strong>Authors:</strong> {source.authors.join('; ')}.</p>
          <p>{source.publication} · {source.identifier.label}: {source.identifier.value}</p>
          <p>{source.pdfFile} · {pageLabel(source.relevantPdfPages)}</p>
          <h5>Published findings / protocol</h5>
          <ul>{source.findings.map(finding => <li key={finding.text}>{finding.text} <span className="research-page">({pageLabel(finding.pdfPages)})</span></li>)}</ul>
          <h5>How this informs Kairos</h5><p>{source.kairosUse}</p>
          <h5>Limits and data access</h5>
          <ul>{source.limitations.map(limit => <li key={limit.text}>{limit.text} <span className="research-page">({pageLabel(limit.pdfPages)})</span></li>)}</ul>
          <p>{source.dataAccess.text} ({pageLabel(source.dataAccess.pdfPages)})</p>
          {source.facts && <table className="research-facts">
            <caption>HERA published-study facts</caption>
            <thead><tr><th scope="col">Study fact</th><th scope="col">Published value</th></tr></thead>
            <tbody>{source.facts.map(fact => <tr key={fact.label}><th scope="row">{fact.label}</th><td>{fact.value}<span className="research-page">{pageLabel(fact.pdfPages)}</span></td></tr>)}</tbody>
          </table>}
          {source.facts && <p>Scheduled sleep opportunity is time allotted for sleep, not measured sleep. These published facts are context only; they do not enter the simulator, baseline or status calculations.</p>}
        </div>
      </details>
      <p className="research-attribution">{source.rights.adaptation} <a href={source.rights.url} target="_blank" rel="noreferrer">{source.rights.label}<span className="external-label"> (opens a new tab)</span></a></p>
    </article>)}</div>
  </section>;
}
