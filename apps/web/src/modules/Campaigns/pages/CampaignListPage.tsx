import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import CampaignTable from '../../../components/ui/CampaignTable';

export default function CampaignListPage() {
  const { data = [], error } = useQuery({ queryKey: ['campaigns'], queryFn: api.campaigns, refetchInterval: 5000 });
  return <><div className="section-title page-title"><div><span className="overline">YOUR SEND QUEUE</span><h2>Campaigns<span className="period">.</span></h2><p>Track every send and open a campaign to review its recipients.</p></div><Link className="button dark" to="/campaigns/new">New campaign ↗</Link></div><div className="card">{error ? <div className="empty">{(error as Error).message}</div> : <CampaignTable campaigns={data}/>}</div></>;
}
