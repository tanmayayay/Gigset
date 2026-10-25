import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, Send, MessageCircle } from 'lucide-react';
import { PageHead, Avatar, Tag, EmptyState, Modal, Verified } from '../components/ui';
import { useStore } from '../store/store';
import { Groups, Posts } from '../lib/api';
import PostCard from '../components/PostCard';

const POLL_MS = 5000;

const ROLE_TAG = { ADMIN: 'amber', COADMIN: 'blue', MEMBER: 'gray' };
const ROLE_LABEL = { ADMIN: 'Admin', COADMIN: 'Co-admin', MEMBER: 'Member' };

function RoleTag({ role }) {
  return <Tag color={ROLE_TAG[role] || 'gray'}>{ROLE_LABEL[role] || role}</Tag>;
}

function GroupSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div className="skel-card" key={i}>
          <div className="skel-line shimmer-strip" style={{ width: '45%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '80%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '30%' }} />
        </div>
      ))}
    </>
  );
}

/* ============================ LIST VIEW ============================ */

function GroupCard({ group, onOpen }) {
  const { pushToast } = useStore();
  const [joining, setJoining] = useState(false);

  const join = async (e) => {
    e.stopPropagation();
    setJoining(true);
    try {
      await Groups.join(group.id);
      pushToast(`Joined "${group.name}" — say hello.`);
      onOpen(group.id);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="community-card" onClick={() => onOpen(group.id)} style={{ cursor: 'pointer' }}>
      <div className="community-icon" style={{ background: 'var(--blue-dim)' }}>
        <MessageCircle size={20} />
      </div>
      <h4>{group.name}</h4>
      {group.desc && <p className="desc">{group.desc}</p>}
      <div className="meta-row">
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {(group._count?.members ?? 0).toLocaleString()} members · {(group._count?.messages ?? 0).toLocaleString()} messages
        </span>
        {group.myRole ? (
          <RoleTag role={group.myRole} />
        ) : (
          <button className="btn btn-blue btn-sm" disabled={joining} onClick={join}>
            {joining ? 'Joining…' : 'Join'}
          </button>
        )}
      </div>
    </div>
  );
}

function NewGroupModal({ onClose, onCreated }) {
  const { pushToast } = useStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      pushToast('Give your group a name.', 'error');
      return;
    }
    setSaving(true);
    try {
      const g = await Groups.create({ name: name.trim(), desc: desc.trim() || undefined });
      pushToast(`"${g.name}" is live — say hello.`);
      onCreated(g.id);
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New group" onClose={onClose}>
      <label>Group name</label>
      <input
        type="text"
        placeholder="e.g. Mumbai drummers"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        onKeyDown={(e) => e.key === 'Enter' && create()}
      />
      <label>What is this group about? (optional)</label>
      <textarea
        rows={3}
        placeholder="Who should join, what you'll talk about…"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" disabled={saving} onClick={create}>
          {saving ? 'Creating…' : 'Create group'}
        </button>
      </div>
    </Modal>
  );
}

function LatestDiscussions() {
  const { pushToast } = useStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await Posts.list({ take: 10 });
      setPosts(res.items || []);
    } catch (e) {
      pushToast(e.message || 'Could not load discussions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
    window.addEventListener('gigset:post-created', load);
    return () => window.removeEventListener('gigset:post-created', load);
  }, [load]);

  return (
    <div style={{ marginTop: 34 }}>
      <h3 style={{ fontSize: 17, marginBottom: 12 }}>Latest discussions</h3>
      {loading ? (
        <GroupSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={22} />}
          title="No discussions yet"
          text="Start the conversation — share an update from Home."
        />
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}

/* ============================ CHAT VIEW ============================ */

function MembersPanel({ detail, groupId, onClose, onChanged, onLeft }) {
  const { userId, pushToast } = useStore();
  const myRole = detail.myRole;

  const act = async (fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await fn();
      await onChanged();
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const controlsFor = (m) => {
    if (m.user.id === userId) return null;
    if (myRole === 'ADMIN') {
      return (
        <>
          {m.role === 'MEMBER' && (
            <button className="btn btn-xs btn-blue" onClick={() => act(() => Groups.setRole(groupId, m.user.id, 'COADMIN'))}>
              Make co-admin
            </button>
          )}
          {m.role === 'COADMIN' && (
            <button className="btn btn-xs btn-ghost" onClick={() => act(() => Groups.setRole(groupId, m.user.id, 'MEMBER'))}>
              Demote
            </button>
          )}
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => act(
              () => Groups.setRole(groupId, m.user.id, 'ADMIN'),
              `Make ${m.user.name} the admin? You will become a co-admin.`
            )}
          >
            Make admin
          </button>
          <button
            className="btn btn-xs btn-ghost"
            style={{ color: 'var(--red)' }}
            onClick={() => act(() => Groups.removeMember(groupId, m.user.id), `Remove ${m.user.name} from the group?`)}
          >
            Remove
          </button>
        </>
      );
    }
    if (myRole === 'COADMIN' && m.role === 'MEMBER') {
      return (
        <button
          className="btn btn-xs btn-ghost"
          style={{ color: 'var(--red)' }}
          onClick={() => act(() => Groups.removeMember(groupId, m.user.id), `Remove ${m.user.name} from the group?`)}
        >
          Remove
        </button>
      );
    }
    return null;
  };

  const leave = () => act(
    async () => { await Groups.leave(groupId); onLeft(); },
    'Leave this group?'
  );

  return (
    <Modal title={`${detail.group.name} — members`} onClose={onClose} wide>
      {detail.members.map((m) => {
        const controls = controlsFor(m);
        return (
          <div className="member-row" key={m.user.id}>
            <div className="member-top">
              <Avatar name={m.user.name} size={36} />
              <div className="member-info">
                <b>
                  {m.user.name}{m.user.id === userId ? ' (you)' : ''}{m.user.verificationStatus === 'VERIFIED' && <Verified size={12} />}
                </b>
                <span>{[m.user.stakeholderType, m.user.city].filter(Boolean).join(' · ')}</span>
              </div>
              <RoleTag role={m.role} />
            </div>
            {controls && <div className="member-actions">{controls}</div>}
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={leave}>
          Leave group
        </button>
      </div>
    </Modal>
  );
}

function GroupChat({ id, onBack }) {
  const { userId, pushToast } = useStore();
  const [detail, setDetail] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const bodyRef = useRef(null);

  const loadDetail = useCallback(async () => {
    try {
      setDetail(await Groups.get(id));
    } catch (e) {
      pushToast(e.message, 'error');
    }
  }, [id, pushToast]);

  const loadMsgs = useCallback(async () => {
    try {
      const d = await Groups.messages(id, { take: 60 });
      setMsgs(d.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
    }
  }, [id, pushToast]);

  useEffect(() => {
    loadDetail();
    loadMsgs();
    const t = setInterval(loadMsgs, POLL_MS);
    const onFocus = () => { loadMsgs(); loadDetail(); };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [id, loadDetail, loadMsgs]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs.length, id]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      const m = await Groups.send(id, body);
      setMsgs((prev) => [...prev, m]);
    } catch (e) {
      pushToast(e.message, 'error');
      setDraft(body);
    }
  };

  return (
    <div>
      <button className="wall-back" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={15} /> All groups
      </button>

      <div
        className="msg-thread-head"
        onClick={() => setShowMembers(true)}
        style={{ cursor: 'pointer', border: '1px solid var(--border)', borderRadius: '14px 14px 0 0' }}
      >
        <Avatar name={detail?.group?.name || '?'} size={38} />
        <div>
          <b>{detail?.group?.name || 'Loading…'}</b>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            {detail ? `${detail.members.length} member${detail.members.length === 1 ? '' : 's'} · tap to view` : '…'}
          </div>
        </div>
        {detail?.myRole && (
          <span style={{ marginLeft: 'auto' }}><RoleTag role={detail.myRole} /></span>
        )}
      </div>

      <div
        className="msg-thread-body"
        ref={bodyRef}
        style={{ minHeight: 320, maxHeight: '52vh', border: '1px solid var(--border)', borderTop: 'none' }}
      >
        {msgs.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center', marginTop: 24 }}>
            No messages yet — break the ice.
          </p>
        ) : (
          msgs.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div key={m.id} className={`bubble ${mine ? 'me' : 'them'}`}>
                {!mine && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', marginBottom: 3 }}>
                    {m.sender?.name || 'Member'}
                  </div>
                )}
                {m.body}
              </div>
            );
          })
        )}
      </div>

      <div className="msg-thread-input" style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 14px 14px' }}>
        <input
          type="text"
          placeholder="Message the group…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          maxLength={2000}
        />
        <button className="btn btn-blue btn-sm" onClick={send} aria-label="Send message">
          <Send size={14} />
        </button>
      </div>

      {showMembers && detail && (
        <MembersPanel
          detail={detail}
          groupId={id}
          onClose={() => setShowMembers(false)}
          onChanged={loadDetail}
          onLeft={onBack}
        />
      )}
    </div>
  );
}

/* ============================ PAGE ============================ */

export default function Community() {
  const { pushToast } = useStore();
  const [openId, setOpenId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const d = await Groups.list();
      setGroups(d.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const openGroup = useCallback((gid) => setOpenId(gid), []);
  const closeChat = useCallback(() => { setOpenId(null); loadGroups(); }, [loadGroups]);

  if (openId) {
    return <GroupChat id={openId} onBack={closeChat} />;
  }

  return (
    <div>
      <PageHead
        title="Community"
        sub="Group chats for your scene — join a crew or start your own."
        action={(
          <button className="btn btn-blue btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New group
          </button>
        )}
      />

      {loading ? (
        <GroupSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={22} />}
          title="No groups yet"
          text="Start the first one — gather your crew in one chat."
          action={(
            <button className="btn btn-blue btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New group
            </button>
          )}
        />
      ) : (
        <div className="community-grid">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onOpen={openGroup} />
          ))}
        </div>
      )}

      {showCreate && (
        <NewGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(gid) => { setShowCreate(false); loadGroups(); openGroup(gid); }}
        />
      )}

      <LatestDiscussions />
    </div>
  );
}
