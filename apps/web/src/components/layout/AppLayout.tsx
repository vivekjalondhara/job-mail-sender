import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const links = [
  { to: '/', label: 'Overview', icon: '◫' },
  { to: '/templates', label: 'Templates', icon: '✎' },
  { to: '/send', label: 'Send email', icon: '✉' },
  { to: '/campaigns/new', label: 'New campaign', icon: '↗' },
  { to: '/campaigns', label: 'Campaigns', icon: '▤' },
];

export default function AppLayout() {
  const { data } = useQuery({ queryKey: ['status'], queryFn: api.status, refetchInterval: 5000 });
  const location = useLocation();
  const label = links.find(link => link.to === location.pathname)?.label || 'Campaign detail';
  return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">✳</span><span>maildesk<span className="brand-dot">.</span></span></div><div className="side-label">WORKSPACE</div><nav aria-label="Sections">{links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span>{link.icon}</span>{link.label}</NavLink>)}</nav><div className="sidebar-bottom"><span className="pulse"/><span>Local sending desk<br/><small>{data?.mode === 'smtp' ? 'SMTP sender' : 'Gmail account'} · one worker</small></span></div></aside><main><header className="topbar"><span>CAMPAIGN DESK <span className="slash">/</span> {label.toUpperCase()}</span><span>{data?.mode === 'smtp' ? `SMTP · ${data.smtp.sender || 'not configured'}` : data?.account || 'Gmail not connected'}</span></header><div className="content"><Outlet/></div></main></div>;
}
