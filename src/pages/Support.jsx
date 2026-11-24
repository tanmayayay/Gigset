import { useState } from 'react';
import { HelpCircle, Flag, FileText, ShieldCheck } from 'lucide-react';
import { PageHead } from '../components/ui';
import { useStore } from '../store/store';
import { useSeo } from '../lib/seo';
import { Safety } from '../lib/api';

const TABS = [
  ['help', 'Help centre', HelpCircle],
  ['report', 'Report a problem', Flag],
  ['terms', 'Terms of Service', FileText],
  ['privacy', 'Privacy Policy', ShieldCheck],
];

export default function Support() {
  useSeo({ title: 'Help & Legal', description: 'Help, reporting, Terms of Service and Privacy Policy for TheGigSet.', path: '/support' });
  const [tab, setTab] = useState('help');
  const { pushToast, user } = useStore();
  const [problem, setProblem] = useState('');
  const [sending, setSending] = useState(false);
  const sendProblem = async () => {
    setSending(true);
    try {
      await Safety.report({ targetType: 'APP', targetId: window.location.pathname.slice(0, 60) || '/', reason: 'OTHER', details: problem.trim() });
      setProblem('');
      pushToast('Thanks. The team has your report and will look at it.');
    } catch (e) { pushToast(e.message || 'Could not send the report.', 'error'); }
    setSending(false);
  };

  return (
    <div>
      <PageHead title="Help & Legal" sub="Answers, reporting, and the fine print." />
      <div className="filter-row">
        {TABS.map(([v, label, Icon]) => (
          <button key={v} className={`filter-chip${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>
            <Icon size={13} style={{ marginRight: 6, verticalAlign: -2 }} />{label}
          </button>
        ))}
      </div>

      {tab === 'help' && (
        <div className="post-card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 14 }}>Frequently asked</h4>
          {[
            ['How do I get verified?', 'Verification is manual in this phase — complete your profile and connect at least one linked account, and our team reviews it within a few days.'],
            ['What is the AI match score?', 'Every opportunity shows a match percentage tuned to your stakeholder type, city and skills. Hover (or tap) the badge to see exactly why it matched.'],
            ['Can I change my stakeholder type later?', 'Yes, from Settings. Your feed and filters update automatically.'],
            ['How does the daily news feed work?', 'A small editorial team publishes roughly ten articles a day, visible to everyone regardless of stakeholder type.'],
          ].map(([q, a]) => (
            <div key={q} style={{ marginBottom: 16 }}>
              <b style={{ fontSize: 14 }}>{q}</b>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 4 }}>{a}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'report' && (
        <div className="post-card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 10 }}>Report a person, post or message</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.65, marginBottom: 18 }}>Open the ⋯ menu on the profile, post, message or community thread and choose Report. It goes straight to our team with a link to what you reported, and you can block the person from the same menu.</p>
          <h4 style={{ marginBottom: 10 }}>Report a problem with TheGigSet</h4>
          {user ? (
            <>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginBottom: 12 }}>Something broken, confusing or wrong? Tell us what you were doing and what happened.</p>
              <textarea value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={1000} style={{ width: '100%', minHeight: 110, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', padding: '10px 12px', fontSize: 13.5 }} placeholder="For example: I tapped Apply on a gig and nothing happened." />
              <button className="btn btn-blue btn-sm" style={{ marginTop: 12 }} disabled={sending || problem.trim().length < 10} onClick={sendProblem}>{sending ? 'Sending…' : 'Send to the team'}</button>
            </>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Sign in to send a report, so we can follow up with you.</p>
          )}
        </div>
      )}

      {tab === 'terms' && (
        <div className="post-card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 10 }}>Terms of Service (summary)</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.7 }}>By using TheGigSet, you agree to keep your profile accurate, respect other stakeholders&apos; visibility settings, and use booking and messaging tools in good faith. TheGigSet is not a party to any booking agreement made between users. Accounts found impersonating another person or business may be suspended.</p>
        </div>
      )}

      {tab === 'privacy' && (
        <div className="post-card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 10 }}>Privacy Policy (summary)</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.7 }}>We store your account details, your profile, what you post and upload, and your messages, with our hosting providers (Supabase and Render). Other people see only what your profile visibility setting allows. Your email address and date of birth are never shown on your profile. Passwords are handled by our sign-in provider and we never see them. You can delete your account, with your posts, stories and messages, at any time from Settings. A full Privacy Policy will be published before launch.</p>
        </div>
      )}
    </div>
  );
}
