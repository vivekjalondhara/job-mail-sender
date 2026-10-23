import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

const OverviewPage = lazy(() => import('../modules/Dashboard/pages/OverviewPage'));
const TemplatesPage = lazy(() => import('../modules/Templates/pages/TemplatesPage'));
const NewCampaignPage = lazy(() => import('../modules/Campaigns/pages/NewCampaignPage'));
const CampaignListPage = lazy(() => import('../modules/Campaigns/pages/CampaignListPage'));
const CampaignDetailPage = lazy(() => import('../modules/Campaigns/pages/CampaignDetailPage'));

const router = createBrowserRouter([{
  element: <AppLayout/>,
  children: [
    { path: '/', element: <OverviewPage/> },
    { path: '/templates', element: <TemplatesPage/> },
    { path: '/campaigns/new', element: <NewCampaignPage/> },
    { path: '/campaigns', element: <CampaignListPage/> },
    { path: '/campaigns/:id', element: <CampaignDetailPage/> },
    { path: '*', element: <div className="empty">Page not found.</div> },
  ],
}]);

export default function AppRouter() { return <Suspense fallback={<div className="empty">Loading page…</div>}><RouterProvider router={router}/></Suspense>; }
