import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, MessageCircle, Plus, ChevronLeft, Check, CheckCheck, Clock, AlertCircle, Users, UserPlus, LogOut, Inbox } from 'lucide-react';
import { PageHead, Avatar, EmptyState, Modal } from '../components/ui';
import { useStore } from '../store/store';
import { Convos, Profiles } from '../lib/api';
import SafetyMenu from '../components/SafetyMenu';
import { onIncoming, setActiveConversation, adjustUnreadMessages } from '../lib/liveInbox';

const POLL_MS = 3000;

const clock = (iso) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
};

/** One tick = sent, two grey = delivered, two blue = read. */
function Ticks({ m }) {
  if (m._state === 'sending') return <span className="tick" title="Sending"><Clock size={12} /></span>;
  if (m._state === 'failed') return <span className="tick failed" title="Not sent"><AlertCircle size={13} /></span>;
  if (m.readAt) return <span className="tick read" title="Read"><CheckCheck size={16} strokeWidth={2.4} /></span>;
  if (m.deliveredAt) return <span className="tick" title="Delivered"><CheckCheck size={16} strokeWidth={2.4} /></span>;
  return <span className="tick" title="Sent"><Check size={14} /></span>;
}

function GroupModal({ onClose, onDone }) {
  const { pushToast } = useStore();
  const [people, setPeople] = useState(null);
  const [picked, setPicked] = useState([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { Profiles.connections().then((r) => setPeople(r.items || [])).catch(() => setPeople([])); }, []);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const create = async () => {
    setBusy(true);
    try { const r = await Convos.createGroup({ title: title.trim(), memberIds: picked }); onDone(r.id); }
    catch (e) { pushToast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title="New group" onClose={onClose}>
      <input type="text" placeholder="Group name (jam crew, band, …)" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <p className="msg-hint" style={{ margin: '8px 0 0' }}>You can add people you are connected with.</p>
      <div style={{ maxHeight: 280, overflowY: 'auto', marginTop: 8 }}>
        {people === null ? <p className="msg-hint">Loading…</p> : people.length === 0
          ? <EmptyState icon={<Users size={22} />} title="No connections yet" text="Follow each other to connect, then make a group." />
          : people.map((p) => (
            <button key={p.id} className={`msg-list-item${picked.includes(p.id) ? ' active' : ''}`} style={{ width: '100%', textAlign: 'left' }} onClick={() => toggle(p.id)}>
              <Avatar name={p.name || '?'} src={p.avatarUrl} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}><b>{p.name}</b><p>{[p.stakeholderType, p.city].filter(Boolean).join(' · ')}</p></div>
              {picked.includes(p.id) && <Check size={16} />}
            </button>
          ))}
      </div>
      <button className="btn btn-blue" style={{ width: '100%', marginTop: 12 }} disabled={busy || !title.trim() || picked.length === 0} onClick={create}>Create group{picked.length ? ` (${picked.length + 1})` : ''}</button>
    </Modal>
  );
}

function GroupMembers({ convo, onClose, onChanged, onLeft }) {
  const { pushToast } = useStore();
  const [people, setPeople] = useState([]);
  useEffect(() => { Profiles.connections().then((r) => setPeople(r.items || [])).catch(() => {}); }, []);
  const inGroup = new Set(convo.members.map((m) => m.id));
  const addable = people.filter((p) => !inGroup.has(p.id));
  const add = async (id) => { try { await Convos.addMembers(convo.id, [id]); await onChanged(); } catch (e) { pushToast(e.message, 'error'); } };
  const leave = async () => { try { await Convos.leave(convo.id); onLeft(); } catch (e) { pushToast(e.message, 'error'); } };
  return (
    <Modal title={convo.title || 'Group'} onClose={onClose}>
      <p className="msg-hint" style={{ margin: 0 }}>Members</p>
      {convo.members.map((m) => <div key={m.id} className="msg-list-item" style={{ cursor: 'default' }}><Avatar name={m.name || '?'} src={m.avatarUrl} size={32} /><div style={{ flex: 1 }}><b>{m.name}</b></div></div>)}
      {addable.length > 0 && <>
        <p className="msg-hint" style={{ margin: '12px 0 0' }}>Add from your connections</p>
        {addable.map((p) => <button key={p.id} className="msg-list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => add(p.id)}><Avatar name={p.name || '?'} src={p.avatarUrl} size={32} /><div style={{ flex: 1 }}><b>{p.name}</b></div><UserPlus size={15} /></button>)}
      </>}
      <button className="btn btn-ghost" style={{ width: '100%', marginTop: 14 }} onClick={leave}><LogOut size={14} /> Leave group</button>
    </Modal>
  );
}

export default function Messages() {
  const { user, userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  // Phones show one pane at a time: the list, or the open conversation.
  const [showThread, setShowThread] = useState(false);
  const [thread, setThread] = useState([]);
  const [pending, setPending] = useState([]); // my messages that are sending or failed
  const [text, setText] = useState('');
  const bodyRef = useRef(null);
  // "New message" modal state.
  const [newOpen, setNewOpen] = useState(false);
  const [following, setFollowing] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [fq, setFq] = useState('');
  const [tab, setTab] = useState('chats'); // chats | requests
  const [groupOpen, setGroupOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const convo = convos.find((c) => c.id === activeId) || null;
  const isGroup = convo?.kind === 'GROUP';
  const other = convo && !isGroup ? convo.members.find((m) => m.id !== userId) || convo.members[0] : null;
  const otherName = isGroup ? convo.title || 'Group' : other?.name || 'Conversation';
  const chats = convos.filter((c) => c.status === 'ACTIVE' || (c.status === 'REQUEST' && c.createdById === userId));
  const requests = convos.filter((c) => c.status === 'REQUEST' && c.createdById !== userId);
  const isRequestToMe = convo?.status === 'REQUEST' && convo.createdById !== userId;
  const isMyPending = convo?.status === 'REQUEST' && convo.createdById === userId;
  const listed = tab === 'requests' ? requests : chats;

  const loadConvos = useCallback(async () => {
    try {
      const res = await Convos.list();
      const items = res.items || [];
      setConvos(items);
      return items;
    } catch (e) {
      pushToast(e.message, 'error');
      return [];
    }
  }, [pushToast]);

  const loadThread = useCallback(async (id) => {
    try {
      const res = await Convos.messages(id);
      setThread(res.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
    }
  }, [pushToast]);

  // Initial load.
  useEffect(() => {
    loadConvos();
  }, [loadConvos]);

  // Deep-link: ?c=<conversationId> pre-selects a conversation (other pages
  // navigate here right after Convos.open).
  useEffect(() => {
    const deep = searchParams.get('c');
    const target = deep && convos.find((c) => c.id === deep);
    if (target) { setActiveId(deep); setShowThread(true); setTab(target.status === 'REQUEST' && target.createdById !== userId ? 'requests' : 'chats'); }
    else if (!deep && !activeId && convos.length > 0) setActiveId((convos.find((c) => c.status === 'ACTIVE') || convos[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, convos]);

  // Load the thread on selection and poll for new messages while open.
  useEffect(() => {
    if (!activeId) {
      setThread([]);
      return;
    }
    loadThread(activeId);
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadThread(activeId); }, POLL_MS);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  // Tell the live inbox which chat is open (no pop-up for it) and react to new arrivals at once.
  useEffect(() => {
    setActiveConversation(activeId);
    return () => setActiveConversation(null);
  }, [activeId]);
  useEffect(() => onIncoming((m) => {
    loadConvos();
    if (m.conversationId === activeId) loadThread(activeId);
  }), [activeId, loadConvos, loadThread]);

  // Opening a chat (or a message landing while it is open) marks theirs as read.
  const markedRef = useRef(new Set());
  useEffect(() => {
    if (!activeId || document.visibilityState !== 'visible') return;
    const unread = thread.filter((m) => m.senderId !== userId && !m.readAt && !markedRef.current.has(m.id));
    if (!unread.length) return;
    unread.forEach((m) => markedRef.current.add(m.id));
    Convos.markRead(activeId)
      .then(() => {
        adjustUnreadMessages(-unread.length);
        setConvos((cs) => cs.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
      })
      .catch(() => unread.forEach((m) => markedRef.current.delete(m.id)));
  }, [thread, activeId, userId]);

  // Refetch on window focus.
  useEffect(() => {
    const onFocus = () => {
      loadConvos();
      if (activeId) loadThread(activeId);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [activeId, loadConvos, loadThread]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [thread.length, pending.length, activeId]);

  // Load the follow list when the "New message" modal opens.
  useEffect(() => {
    if (!newOpen) return;
    let cancelled = false;
    setFollowingLoading(true);
    setFq('');
    Profiles.following()
      .then((res) => { if (!cancelled) setFollowing(res.items || []); })
      .catch((e) => { if (!cancelled) pushToast(e.message, 'error'); })
      .finally(() => { if (!cancelled) setFollowingLoading(false); });
    return () => { cancelled = true; };
  }, [newOpen, pushToast]);

  const openConvo = async (person) => {
    try {
      const res = await Convos.open(person.id);
      setNewOpen(false);
      await loadConvos(); // ensure the convo is listed…
      navigate(`/messages?c=${res.id}`); // …so the ?c= deep-link effect selects it
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const fql = fq.trim().toLowerCase();
  const filteredFollowing = following.filter((p) => !fql || (p.name || '').toLowerCase().includes(fql));

  const sendBody = async (convoId, body, tmpId) => {
    try {
      const msg = await Convos.send(convoId, body);
      setThread((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
      setPending((p) => p.filter((x) => x.id !== tmpId));
      loadConvos(); // refresh last-message previews
    } catch {
      setPending((p) => p.map((x) => (x.id === tmpId ? { ...x, _state: 'failed' } : x)));
    }
  };

  const send = () => {
    const body = text.trim();
    if (!body || !activeId) return;
    setText('');
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setPending((p) => [...p, { id: tmpId, convoId: activeId, senderId: userId, body, createdAt: new Date().toISOString(), _state: 'sending' }]);
    sendBody(activeId, body, tmpId);
  };

  const retry = (m) => {
    setPending((p) => p.map((x) => (x.id === m.id ? { ...x, _state: 'sending' } : x)));
    sendBody(m.convoId, m.body, m.id);
  };

  const shown = [...thread, ...pending.filter((m) => m.convoId === activeId)];

  return (
    <div>
      <PageHead title="Messages" sub="Conversations with your network — requests from non-connections appear here too." />
      <div className={`msg-shell${showThread ? ' show-thread' : ''}`}>
        <div className="msg-list">
          <div className="msg-tabs">
            <button className={tab === 'chats' ? 'on' : ''} onClick={() => setTab('chats')}>Chats</button>
            <button className={tab === 'requests' ? 'on' : ''} onClick={() => setTab('requests')}>Requests{requests.length > 0 && <em>{requests.length}</em>}</button>
            <span style={{ flex: 1 }} />
            <button className="msg-icon" title="New group" aria-label="New group" onClick={() => setGroupOpen(true)}><Users size={15} /></button>
            <button className="msg-icon blue" title="New message" aria-label="New message" onClick={() => setNewOpen(true)}><Plus size={15} /></button>
          </div>
          {tab === 'requests' && <p className="msg-hint">Messages from people you are not connected with. Nothing happens until you accept.</p>}
          {listed.length === 0 ? (
            tab === 'requests'
              ? <EmptyState icon={<Inbox size={22} />} title="No requests" text="When someone you are not connected with messages you, it lands here." />
              : <EmptyState icon={<MessageCircle size={22} />} title="No conversations yet" text="Start one from someone's profile, or make a group with your connections." />
          ) : (
            listed.map((c) => {
              const g = c.kind === 'GROUP';
              const o = c.members.find((m) => m.id !== userId) || c.members[0];
              return (
                <button key={c.id} className={`msg-list-item${c.id === activeId ? ' active' : ''}`} onClick={() => { setActiveId(c.id); setShowThread(true); }}>
                  {g ? <span className="msg-gavatar"><Users size={18} /></span> : <Avatar name={o?.name || '?'} src={o?.avatarUrl} size={38} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{g ? c.title : o?.name}{g && <small className="msg-gcount">{c.memberCount}</small>}{c.status === 'REQUEST' && c.createdById === userId && <small className="msg-pending">Pending</small>}</b>
                    <p className={c.unread > 0 ? 'unread' : ''}>{c.lastMessage?.body}</p>
                  </div>
                  {c.unread > 0 && c.id !== activeId && <span className="msg-unread">{c.unread > 99 ? '99+' : c.unread}</span>}
                </button>
              );
            })
          )}
        </div>
        <div className="msg-thread">
          {convo ? (
            <>
              <div className="msg-thread-head">
                <button className="msg-back" onClick={() => setShowThread(false)} aria-label="Back to conversations"><ChevronLeft size={22} /></button>
                {isGroup ? <span className="msg-gavatar sm"><Users size={16} /></span> : <Avatar name={otherName} src={other?.avatarUrl} size={34} />}
                <div className="msg-thread-who" onClick={() => (isGroup ? setMembersOpen(true) : other && navigate(`/profile/${other.id}`))}><b>{otherName}</b><div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{isGroup ? `${convo.memberCount} people · tap for members` : 'Typically replies within a day'}</div></div>
                {isGroup && <div style={{ marginLeft: 'auto' }}><button className="btn btn-ghost btn-sm" onClick={() => setMembersOpen(true)}><UserPlus size={14} /> People</button></div>}
                {other && other.id !== userId && <div style={{ marginLeft: 'auto' }}><SafetyMenu person={other} onBlockChange={(b) => { if (b) { setShowThread(false); loadConvos(); } }} /></div>}
              </div>
              {isRequestToMe && (
                <div className="msg-banner">
                  <span><b>{otherName}</b> is not connected with you yet. Accept to chat, or decline and they will not be able to message you.</span>
                  <div><button className="btn btn-ghost btn-sm" onClick={async () => { try { await Convos.decline(activeId); setShowThread(false); setActiveId(null); await loadConvos(); } catch (e) { pushToast(e.message, 'error'); } }}>Decline</button>
                    <button className="btn btn-blue btn-sm" onClick={async () => { try { await Convos.accept(activeId); await loadConvos(); setTab('chats'); } catch (e) { pushToast(e.message, 'error'); } }}>Accept</button></div>
                </div>
              )}
              {isMyPending && <div className="msg-banner soft"><span>Sent as a request. {otherName.split(' ')[0]} will see it once they accept. You can send up to 3 messages until then.</span></div>}
              <div className="msg-thread-body" ref={bodyRef}>
                {shown.map((m) => {
                  const mine = m.senderId === userId;
                  return (
                    <div key={m.id} className={`bubble ${mine ? 'me' : 'them'}${m._state === 'failed' ? ' failed' : ''}`}>
                      {isGroup && !mine && <span className="bubble-from">{m.sender?.name}</span>}
                      <span className="bubble-text">{m.body}</span>
                      <span className="bubble-meta">
                        {m._state === 'failed' ? (
                          <button className="bubble-retry" onClick={() => retry(m)}>Not sent · Retry</button>
                        ) : (
                          <>
                            {m._state !== 'sending' && clock(m.createdAt)}
                            {mine && <Ticks m={m} />}
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="msg-thread-input">
                <input type="text" enterKeyHint="send" placeholder={isGroup ? `Message ${otherName}…` : `Message ${otherName.split(' ')[0]}…`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button className="btn btn-blue btn-sm" onClick={send} aria-label="Send message"><Send size={14} /></button>
              </div>
            </>
          ) : (
            <EmptyState icon={<MessageCircle size={22} />} title="No conversation selected" text="Pick a conversation to start chatting." />
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12 }}>Signed in as {user?.name}.</p>

      {groupOpen && <GroupModal onClose={() => setGroupOpen(false)} onDone={async (id) => { setGroupOpen(false); await loadConvos(); setTab('chats'); setActiveId(id); setShowThread(true); }} />}
      {membersOpen && convo && isGroup && (
        <GroupMembers convo={convo} onClose={() => setMembersOpen(false)}
          onChanged={loadConvos}
          onLeft={async () => { setMembersOpen(false); setActiveId(null); setShowThread(false); await loadConvos(); }} />
      )}

      {newOpen && (
        <Modal title="New message" onClose={() => setNewOpen(false)}>
          <input
            type="text"
            placeholder="Search people you follow…"
            value={fq}
            onChange={(e) => setFq(e.target.value)}
            autoFocus
          />
          <p className="msg-hint" style={{ margin: '8px 0 0' }}>Connections chat straight away. Anyone else gets your message as a request.</p>
          <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 10 }}>
            {followingLoading ? (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '12px 4px' }}>Loading…</p>
            ) : filteredFollowing.length === 0 ? (
              <EmptyState
                icon={<MessageCircle size={22} />}
                title="Nobody here yet"
                text="Follow people from Collab or their profiles to message them."
              />
            ) : (
              filteredFollowing.map((p) => (
                <button
                  key={p.id}
                  className="msg-list-item"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => openConvo(p)}
                >
                  <Avatar name={p.name || '?'} src={p.avatarUrl} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{p.name}</b>
                    <p>{[p.stakeholderType, p.city].filter(Boolean).join(' · ')}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
