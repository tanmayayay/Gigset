import { useState } from 'react';
import { HelpCircle, Flag, FileText, ShieldCheck } from 'lucide-react';
import { PageHead } from '../components/ui';
import { useStore } from '../store/store';

const TABS = [
  ['help', 'Help centre', HelpCircle],
  ['report', 'Report a problem', Flag],
  ['terms', 'Terms of Service', FileText],
  ['privacy', 'Privacy Policy', ShieldCheck],
];

export default function Support() {
  const [tab, setTab] = useState('help');
  const { pushToast } = useStore();

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
          <h4 style={{ marginBottom: 10 }}>Report a user or a piece of content</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginBottom: 14 }}>Use this if a profile, post, or message violates community guidelines — impersonation, harassment, or misleading booking claims.</p>
          <label>What are you reporting?</label>
          <select style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', padding: '10px 12px', fontSize: 13.5, marginBottom: 12 }}>
            <option>A profile</option><option>A post</option><option>A message</option><option>An opportunity listing</option>
          </select>
          <label>Describe what happened</label>
          <textarea id="report-body" style={{ width: '100%', minHeight: 90, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', padding: '10px 12px', fontSize: 13.5 }} placeholder="Describe what happened…" />
          <button className="btn btn-blue btn-sm" style={{ marginTop: 12 }} onClick={() => pushToast('Report submitted — our team reviews every report within 48 hours.')}>Submit report</button>
        </div>
      )}

      {tab === 'terms' && (
        <div className="post-card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 10 }}>Terms of Service (summary)</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.7 }}>By using Gigset, you agree to keep your profile accurate, respect other stakeholders&apos; visibility settings, and use booking and messaging tools in good faith. Gigset is not a party to any booking agreement made between users. Accounts found impersonating another person or business may be suspended.</p>
        </div>
      )}

      {tab === 'privacy' && (
        <div className="post-card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 10 }}>Privacy Policy (summary)</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.7 }}>We store only what your profile visibility setting allows others to see. Login credentials and private contact details are encrypted and never shown publicly unless you choose to disclose them. This is a working prototype — no real personal data is collected, and everything is stored locally in your browser.</p>
        </div>
      )}
    </div>
  );
}
