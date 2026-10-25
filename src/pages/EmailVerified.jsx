import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Link2Off } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/ui';
import './email-verified.css';

/* Shown when the user lands from a Supabase email-confirmation link
   (#access_token=…&type=signup). supabase-js (detectSessionInUrl) has
   already swapped the fragment for a persisted session by the time this
   renders, so the account is verified AND signed in — this page just
   says so nicely and hands them back to the app. */
export default function EmailVerified({ result, onDone }) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live) setEmail(data.session?.user?.email || '');
    });
    return () => { live = false; };
  }, []);

  /* ---- expired / invalid link ---- */
  if (result.status === 'error') {
    return (
      <div className="ev-wrap">
        <motion.div
          className="ev-card"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <Logo />
          <motion.div
            className="ev-tick ev-tick--error"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
          >
            <Link2Off size={40} strokeWidth={2.4} />
          </motion.div>
          <h1>This link has expired</h1>
          <p className="ev-lead">Verification links only work for a limited time.</p>
          <p className="ev-sub">
            Head back to Gigset and sign in — we&rsquo;ll send you a fresh
            verification email from there.
          </p>
          <button className="ev-cta" onClick={onDone}>
            Back to Gigset <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    );
  }

  /* ---- success ---- */
  return (
    <div className="ev-wrap">
      <motion.div
        className="ev-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Logo />
        <motion.div
          className="ev-tick"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
        >
          <Check size={44} strokeWidth={3.2} />
        </motion.div>
        <h1>Thank you!</h1>
        <p className="ev-lead">
          Your email has been verified
          {email ? (
            <> as <strong>{email}</strong></>
          ) : (
            <> successfully</>
          )}
          .
        </p>
        <p className="ev-sub">
          You can go back to your Gigset application now — you&rsquo;re
          already signed in.
        </p>
        <button className="ev-cta" onClick={onDone}>
          Continue to Gigset <ArrowRight size={18} />
        </button>
      </motion.div>
    </div>
  );
}
