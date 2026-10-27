import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Users, FileText, Flag, Megaphone, ScrollText, ShieldCheck } from 'lucide-react';
import { Admin } from '../lib/api';
import '../components/admin/admin.css';

const Overview = lazy(() => import('../components/admin/Overview'));
const People = lazy(() => import('../components/admin/People'));
const Content = lazy(() => import('../components/admin/Content'));
const Reports = lazy(() => import('../components/admin/Reports'));
const Announce = lazy(() => import('../components/admin/Announce'));
const Log = lazy(() => import('../components/admin/Log'));

const TABS = [['overview', 'Dashboard', BarChart3], ['people', 'People', Users], ['content', 'Content', FileText], ['reports', 'Reports', Flag], ['announce', 'Announce', Megaphone], ['log', 'Activity log', ScrollText]];

/** The admin console: one place to see how Gigset is doing and to look after it. Only admins get in. */
export default function AdminPage() {
  const [ok, setOk] = useState(null);
  const [sp, setSp] = useSearchParams();
  const [preset, setPreset] = useState({});
  const [reports, setReports] = useState(null);
  const tab = TABS.some(([t]) => t === sp.get('tab')) ? sp.get('tab') : 'overview';
  useEffect(() => { Admin.me().then(() => setOk(true)).catch(() => setOk(false)); }, []);
  const go = (t, p = {}) => { setPreset(p); setSp({ tab: t }, { replace: true }); window.scrollTo({ top: 0 }); };
  if (ok === false) return <Navigate to="/home" replace />;
  if (ok == null) return <div className="page-loading"><span className="spinner" /></div>;
  return (
    <div className="ad">
      <div className="ad-head"><ShieldCheck size={22} /><div><h1>Admin console</h1><p>You can see and change anything here. Every change is recorded.</p></div></div>
      <div className="ad-tabs" role="tablist">
        {TABS.map(([t, label, Icon]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => go(t)}><Icon size={15} />{label}{t === 'reports' && reports > 0 && <em>{reports}</em>}</button>
        ))}
      </div>
      <Suspense fallback={<div className="shimmer-strip" style={{ height: 240, borderRadius: 16 }} />}>
        {tab === 'overview' && <Overview go={go} />}
        {tab === 'people' && <People key={JSON.stringify(preset)} preset={preset} />}
        {tab === 'content' && <Content />}
        {tab === 'reports' && <Reports onCount={setReports} />}
        {tab === 'announce' && <Announce />}
        {tab === 'log' && <Log />}
      </Suspense>
    </div>
  );
}
