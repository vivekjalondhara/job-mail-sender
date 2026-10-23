import { Link } from 'react-router-dom';
import type { CampaignSummary } from '../../services/types';
import StatusPill from './StatusPill';

export default function CampaignTable({ campaigns }: { campaigns: CampaignSummary[] }) {
  if (!campaigns.length) return <div className="empty">No campaigns yet. Create one from a template and CSV.</div>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>CAMPAIGN</th><th>RECIPIENTS</th><th>SENT</th><th>FAILED</th><th>STATUS</th><th/></tr></thead><tbody>{campaigns.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></td><td>{item.total}</td><td>{item.sent}</td><td>{item.failed}</td><td><StatusPill status={item.status}/></td><td><Link className="table-link" to={`/campaigns/${item.id}`}>View ↗</Link></td></tr>)}</tbody></table></div>;
}
