import { useState, useEffect, useCallback, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Home, LayoutGrid, Handshake, Users, Newspaper, MessageCircle, Search,
  User, Bell, Settings, Info, LifeBuoy, Plus, Moon, Sun, Bookmark, Radio, Menu, X, LogOut,
} from 'lucide-react';
import { Logo, Avatar } from './ui';
import { useStore } from '../store/store';
import { Notifs, Account } from '../lib/api';
import { pendingRef, clearRef } from '../lib/ref';
import { useLiveInbox, startLiveInbox, stopLiveInbox, dismissPopup, setMessagePopupsMuted } from '../lib/liveInbox';
import { timeAgo, resolveNotifLink } from '../lib/format';

const NAV_MAIN = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/gighub', label: 'Gighub', icon: LayoutGrid },
  { to: '/collab', label: 'Collab', icon: Handshake },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/live', label: 'Live', icon: Radio },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/saved', label: 'Saved', icon: Bookmark },
];
const NAV_MORE = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About Gigset', icon: Info },
  { to: '/support', label: 'Help & Legal', icon: LifeBuoy },
];

function NavGroup({ label, items, onNav, unreadCount, unreadMessages = 0 }) {
  return (
    <nav className="nav-group">
      {label && <div className="nav-group-label">{label}</div>}
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} onClick={onNav} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <it.icon size={17} strokeWidth={1.9} />
          {it.label}
          {it.badgeKey === 'notifs' && unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          {it.to === '/messages' && unreadMessages > 0 && <span className="nav-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Shell({ onOpenPalette, onNewPost, onNewOpp }) {
  const { user, userId, logout, theme, toggleTheme, pushToast, settings } = useStore();
  const live = useLiveInbox();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Don't let the page scroll behind the open drawer.
  useEffect(() => {
    if (!drawer) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawer]);

  const loadNotifs = useCallback(async () => {
    try {
      const [unreadRes, allRes] = await Promise.all([
        Notifs.list({ unread: 'true' }),
        Notifs.list({ take: 4 }),
      ]);
      setUnreadCount(unreadRes.unreadCount || 0);
      setRecent((allRes.items || []).slice(0, 4));
    } catch (e) {
      pushToast(e.message, 'error');
    }
  }, [pushToast]);

  useEffect(() => {
    loadNotifs();
  }, [loadNotifs]);

  useEffect(() => {
    window.addEventListener('focus', loadNotifs);
    return () => window.removeEventListener('focus', loadNotifs);
  }, [loadNotifs]);

  // Live inbox: one light poll feeds message badges, pop-ups and the bell.
  useEffect(() => {
    if (!userId) return undefined;
    startLiveInbox(userId);
    return () => stopLiveInbox();
  }, [userId]);
  // Joined through someone's invite link? Credit them once.
  useEffect(() => {
    const code = pendingRef();
    if (!userId || !code) return;
    Account.claimReferral(code).catch(() => {}).finally(clearRef);
  }, [userId]);
  useEffect(() => { setMessagePopupsMuted(settings?.notifMessages === false); }, [settings?.notifMessages]);

  // New bell notifications arrived: refresh the badge and the dropdown.
  useEffect(() => {
    if (live.unreadNotifications !== unreadCount) loadNotifs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.unreadNotifications]);

  // "(2) Gigset" in the browser tab while messages wait.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = live.unreadMessages > 0 ? `(${live.unreadMessages > 99 ? '99+' : live.unreadMessages}) ${base}` : base;
    return () => { document.title = base; };
  }, [live.unreadMessages]);

  const NAV_YOU = [
    { to: `/profile/${userId}`, label: 'Profile', icon: User },
    { to: '/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifs' },
    { to: '/search', label: 'Search', icon: Search },
  ];

  const sidebarBody = (onNav) => (
    <>
      <Link to="/home" className="logo" onClick={onNav} style={{ textDecoration: 'none' }}>
        <Logo light size={24} />
      </Link>
      <div className="nav-group-label" style={{ padding: '0 12px 10px', textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
        Tying the music industry together
      </div>
      <NavGroup items={NAV_MAIN} onNav={onNav} unreadCount={unreadCount} unreadMessages={live.unreadMessages} />
      <NavGroup label="You" items={NAV_YOU} onNav={onNav} unreadCount={unreadCount} />
      <NavGroup label="More" items={NAV_MORE} onNav={onNav} unreadCount={unreadCount} />
      <div className="sidebar-foot">
        <button className="mini-profile" onClick={() => { onNav?.(); navigate(`/profile/${userId}`); }}>
          <Avatar name={user?.name || 'Guest'} src={user?.avatarUrl} size={34} />
          <div style={{ flex: 1 }}>
            <b>{user?.name || 'Guest'}</b>
            <span>{user ? `${user.stakeholderType} · ${user.city}` : 'Not signed in'}</span>
          </div>
        </button>
        <button className="nav-item" onClick={() => { logout(); navigate('/'); }} style={{ marginTop: 4 }}>
          <LogOut size={17} strokeWidth={1.9} /> Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="shell">
      <aside className="sidebar">{sidebarBody()}</aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <div className="sidebar drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setDrawer(false)} aria-label="Close menu">
              <X size={16} />
            </button>
            {sidebarBody(() => setDrawer(false))}
          </div>
        </div>
      )}

      <div className="main-col">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <button className="icon-btn mobile-menu-btn" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu size={17} />
            </button>
            <button className="topbar-search" onClick={onOpenPalette} aria-label="Search Gigset">
              <Search size={15} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Search people, venues, opportunities…</span>
              <kbd>⌘K</kbd>
            </button>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={onNewPost} aria-label="Create a post" title="Create a post">
              <Plus size={17} />
            </button>
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setProfileOpen(false); setNotifOpen((o) => !o); }} aria-label="Notifications">
              <Bell size={16} />
              {unreadCount > 0 && <span className="dot-badge" />}
            </button>
            {notifOpen && (
              <div className="panel-drop" style={{ position: 'absolute', top: 48, right: 0, width: 340, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-pop)', zIndex: 60, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Notifications
                  <button className="btn btn-ghost btn-xs" onClick={() => { setNotifOpen(false); navigate('/notifications'); }}>See all</button>
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {recent.map((n) => (
                    <div
                      key={n.id}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-soft)', fontSize: 13, display: 'flex', gap: 10, cursor: 'pointer' }}
                      onClick={() => { setNotifOpen(false); navigate(resolveNotifLink(n.link)); }}
                    >
                      {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', marginTop: 6, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontWeight: 600 }}>{n.title}</div>
                        {n.body && <div>{n.body}</div>}
                        <span style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setNotifOpen(false); setProfileOpen((o) => !o); }} aria-label="Your profile menu" aria-expanded={profileOpen} style={{ overflow: 'hidden', padding: 0, position: 'relative', zIndex: 60 }}>
              <Avatar name={user?.name || 'G'} src={user?.avatarUrl} size={38} />
            </button>
            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} aria-hidden="true" />
                <div className="panel-drop" style={{ position: 'absolute', top: 48, right: 0, width: 280, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-pop)', zIndex: 60, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={user?.name || 'Guest'} src={user?.avatarUrl} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Guest'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{user ? `${user.stakeholderType} · ${user.city}` : 'Not signed in'}</div>
                    </div>
                  </div>
                  <div style={{ padding: 8 }}>
                    <button className="nav-item theme-row" style={{ width: '100%' }} onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'}>
                      {theme === 'light' ? <Moon size={17} strokeWidth={1.9} /> : <Sun size={17} strokeWidth={1.9} />}
                      <span style={{ flex: 1, textAlign: 'left' }}>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
                      <span className={`switch${theme === 'dark' ? ' on' : ''}`} aria-hidden="true" />
                    </button>
                    <button className="nav-item" style={{ width: '100%' }} onClick={() => { setProfileOpen(false); navigate(`/profile/${userId}`); }}>
                      <User size={17} strokeWidth={1.9} /> Edit profile
                    </button>
                    <button className="nav-item" style={{ width: '100%' }} onClick={() => { setProfileOpen(false); logout(); navigate('/'); }}>
                      <LogOut size={17} strokeWidth={1.9} /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="content-area">
          <div className="content-inner wide">
            <Suspense fallback={<div className="page-loading"><span className="spinner" /></div>}>
              <div key={pathname} className="page-fade">
                <Outlet context={{ openPost: onNewPost, openOpp: onNewOpp }} />
              </div>
            </Suspense>
          </div>
        </main>

        {live.popups.length > 0 && (
          <div className="msg-popups" aria-live="polite">
            {live.popups.map((p) => (
              <div key={p.id} className="msg-popup" role="button" tabIndex={0}
                onClick={() => { dismissPopup(p.id); navigate(`/messages?c=${p.conversationId}`); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { dismissPopup(p.id); navigate(`/messages?c=${p.conversationId}`); } }}>
                <Avatar name={p.name} src={p.avatarUrl} size={38} />
                <div className="msg-popup-text">
                  <b>{p.name}</b>
                  <span>{p.body}</span>
                </div>
                <button className="msg-popup-x" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); dismissPopup(p.id); }}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        <nav className="bottom-nav">
          {[
            { to: '/home', label: 'Home', icon: Home },
            { to: '/gighub', label: 'Gighub', icon: LayoutGrid },
            { to: '/collab', label: 'Collab', icon: Handshake },
            { to: '/news', label: 'News', icon: Newspaper },
            { to: '/messages', label: 'Messages', icon: MessageCircle },
          ].map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="bn-icon">
                <it.icon size={20} strokeWidth={1.9} />
                {it.to === '/messages' && live.unreadMessages > 0 && <span className="bn-badge">{live.unreadMessages > 9 ? '9+' : live.unreadMessages}</span>}
              </span>
              {it.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
