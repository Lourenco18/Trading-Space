// ============================================================
// community.js — Communities, posts, reactions, members
// ============================================================

let _activeCommunity = null;
let _communityTab = 'feed'; // feed | members | settings

// ── Load community posts ──────────────────────────────────────
async function loadCommunityPosts(communityId) {
  const { data, error } = await sb
    .from('community_posts')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('community_id', communityId)
    .is('reply_to', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { toast(t('error')+': '+error.message, 'err'); return []; }
  return (data||[]).map(mapPost);
}

async function loadCommunityMembers(communityId) {
  const { data, error } = await sb
    .from('community_members')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('community_id', communityId);
  if (error) return [];
  return data||[];
}

// ── Render main community page ────────────────────────────────
async function renderCommunity() {
  const page = document.getElementById('communityPage');
  if (!page) return;

  if (!State.communities.length) {
    page.innerHTML = renderCommunityEmpty();
    return;
  }

  if (!_activeCommunity) {
    _activeCommunity = State.communities[0];
  }

  page.innerHTML = renderCommunityLayout();
  renderCommunityList();

  // Load posts + members for active community
  setSyncing(true);
  State.communityPosts = await loadCommunityPosts(_activeCommunity.id);
  State.communityMembers = await loadCommunityMembers(_activeCommunity.id);
  setSyncing(false);

  renderCommunityFeed();
  renderMembersList();
  renderCommunitySettings();
  setupCommunityTabs();
}

function renderCommunityEmpty() {
  return `<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:20px">
    <div style="font-size:48px;opacity:.3">👥</div>
    <div style="font-size:16px;font-weight:600;color:var(--text2)">${t('noCommunities')}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      <button class="btn btn-primary" onclick="openModal('createCommunityModal')">${t('createCommunity')}</button>
      <button class="btn btn-secondary" onclick="openModal('joinCommunityModal')">${t('joinByCode')}</button>
    </div>
  </div>`;
}

function renderCommunityLayout() {
  const isOwner = _activeCommunity?.ownerId === State.user?.id;
  const myRole = State.communityMembers?.find(m => m.user_id === State.user?.id)?.role || (isOwner ? 'owner' : 'member');
  const canManage = myRole === 'owner' || myRole === 'admin';

  return `
  <div class="comm-layout">
    <!-- Left: community list -->
    <div class="comm-sidebar">
      <div class="comm-sidebar-header">
        <span style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:1px">${t('communities')}</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-xs" onclick="openModal('joinCommunityModal')" title="${t('joinByCode')}">🔗</button>
          <button class="btn btn-primary btn-xs" onclick="openModal('createCommunityModal')">+</button>
        </div>
      </div>
      <div id="communityList" class="comm-list"></div>
    </div>

    <!-- Right: feed -->
    <div class="comm-main">
      <div class="comm-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="comm-avatar" style="background:${_activeCommunity.color}">${_activeCommunity.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-size:16px;font-weight:700">${_activeCommunity.name}</div>
            <div style="font-size:12px;color:var(--text2)">${_activeCommunity.isPublic ? '🌐 '+t('public') : '🔒 '+t('private')}</div>
          </div>
        </div>
        <div class="comm-tabs" id="commTabs">
          <button class="comm-tab active" data-tab="feed">💬 Feed</button>
          <button class="comm-tab" data-tab="members">👥 ${t('members')}</button>
          ${canManage ? `<button class="comm-tab" data-tab="settings">⚙️ ${t('communitySettings')}</button>` : ''}
        </div>
      </div>

      <!-- Feed tab -->
      <div class="comm-tab-content active" id="comm-tab-feed">
        ${_activeCommunity.allowPosts ? `
        <div class="post-composer card" style="margin-bottom:16px">
          <textarea id="newPostText" placeholder="${t('writePost')}" style="min-height:80px;margin-bottom:10px"></textarea>
          <div id="postImgPreview" class="img-grid"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:8px">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('postImgInput').click()">📸 Imagem</button>
              <input type="file" id="postImgInput" multiple accept="image/*" style="display:none" onchange="handlePostImgs(event)">
              <button class="btn btn-secondary btn-sm" onclick="openModal('attachTradeModal')">📊 ${t('attachTrade')}</button>
            </div>
            <button class="btn btn-primary btn-sm" onclick="submitPost()">${t('newPost')}</button>
          </div>
          <div id="attachedTradePreview" style="display:none;margin-top:10px"></div>
        </div>` : ''}
        <div id="postsFeed"></div>
      </div>

      <!-- Members tab -->
      <div class="comm-tab-content" id="comm-tab-members">
        <div id="membersList"></div>
      </div>

      <!-- Settings tab -->
      ${canManage ? `<div class="comm-tab-content" id="comm-tab-settings"><div id="communitySettings"></div></div>` : ''}
    </div>
  </div>`;
}

function renderCommunityList() {
  const el = document.getElementById('communityList');
  if (!el) return;
  el.innerHTML = State.communities.map(c => `
    <div class="comm-list-item ${c.id === _activeCommunity?.id ? 'active' : ''}" onclick="switchCommunity('${c.id}')">
      <div class="comm-avatar sm" style="background:${c.color}">${c.name.charAt(0).toUpperCase()}</div>
      <div class="comm-list-name">${c.name}</div>
      ${c.isPublic ? '' : '<span style="font-size:10px;color:var(--text2)">🔒</span>'}
    </div>`).join('');
}

function renderCommunityFeed() {
  const el = document.getElementById('postsFeed');
  if (!el) return;
  if (!State.communityPosts.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">💬</div><p>${t('noPosts')}</p></div>`;
    return;
  }
  el.innerHTML = State.communityPosts.map(p => renderPost(p)).join('');
}

function renderPost(p) {
  const isOwner = p.userId === State.user?.id;
  const myRole = State.communityMembers?.find(m => m.user_id === State.user?.id)?.role;
  const canDelete = isOwner || myRole === 'owner' || myRole === 'admin';
  const canPin = myRole === 'owner' || myRole === 'admin';
  const displayName = p.profile?.display_name || 'Trader';
  const avatar = p.profile?.avatar_url;

  return `<div class="post-card ${p.isPinned ? 'pinned' : ''}" id="post-${p.id}">
    ${p.isPinned ? '<div class="pin-badge">📌 Fixado</div>' : ''}
    <div class="post-header">
      <div class="post-avatar">${avatar ? `<img src="${avatar}" alt="">` : displayName.charAt(0).toUpperCase()}</div>
      <div>
        <div class="post-author">${displayName}</div>
        <div class="post-time">${fmtAgo(p.createdAt)}</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:4px">
        ${canPin ? `<button class="btn btn-secondary btn-xs" onclick="togglePin('${p.id}',${p.isPinned})">${p.isPinned ? t('unpinPost') : t('pinPost')}</button>` : ''}
        ${canDelete ? `<button class="btn btn-danger btn-xs" onclick="deletePost('${p.id}')">🗑</button>` : ''}
      </div>
    </div>
    ${p.content ? `<div class="post-content">${p.content.replace(/\n/g,'<br>')}</div>` : ''}
    ${(p.asset || p.pnl != null) ? `<div class="post-trade-card">
      ${p.asset ? `<span class="post-trade-asset">${p.asset}</span>` : ''}
      ${p.direction ? `<span class="tag ${p.direction==='Buy'?'tag-buy':'tag-sell'}">${p.direction}</span>` : ''}
      ${p.result ? `<span class="tag ${p.result==='Win'?'tag-win':p.result==='Loss'?'tag-loss':'tag-be'}">${p.result}</span>` : ''}
      ${p.pnl != null ? `<span class="${p.pnl>=0?'pnl-pos':'pnl-neg'}">${fmt(p.pnl)}</span>` : ''}
      ${p.rr ? `<span style="color:var(--text2);font-size:12px;font-family:'DM Mono',monospace">${p.rr}</span>` : ''}
    </div>` : ''}
    ${p.images?.length ? `<div class="post-images">${p.images.map(s=>`<img src="${s}" onclick="openModal('lightboxOverlay');document.getElementById('lboxImg').src='${s}'" style="max-height:220px;border-radius:8px;cursor:zoom-in;object-fit:cover">`).join('')}</div>` : ''}
    <div class="post-actions">
      <button class="post-reaction-btn" onclick="reactToPost('${p.id}','👍')">👍</button>
      <button class="post-reaction-btn" onclick="reactToPost('${p.id}','🔥')">🔥</button>
      <button class="post-reaction-btn" onclick="reactToPost('${p.id}','📈')">📈</button>
      <button class="post-reaction-btn" onclick="reactToPost('${p.id}','💯')">💯</button>
    </div>
    <div class="post-reactions" id="reactions-${p.id}"></div>
  </div>`;
}

function renderMembersList() {
  const el = document.getElementById('membersList');
  if (!el) return;
  const myRole = State.communityMembers.find(m=>m.user_id===State.user?.id)?.role;
  const canManage = myRole==='owner'||myRole==='admin';
  el.innerHTML = `<div class="card" style="padding:0">
    ${State.communityMembers.map(m => {
      const name = m.profiles?.display_name || 'Trader';
      const avatar = m.profiles?.avatar_url;
      const isMe = m.user_id === State.user?.id;
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
        <div class="post-avatar sm">${avatar?`<img src="${avatar}" alt="">`:name.charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:600">${name}${isMe?' <span style="color:var(--text2);font-size:11px">(eu)</span>':''}</div>
          <div style="font-size:12px;color:var(--text2)">${m.role}</div>
        </div>
        ${canManage && !isMe ? `
          <div style="display:flex;gap:4px">
            ${m.role==='member' ? `<button class="btn btn-secondary btn-xs" onclick="changeMemberRole('${m.community_id}','${m.user_id}','admin')">${t('promote')}</button>` : ''}
            ${m.role==='admin' ? `<button class="btn btn-secondary btn-xs" onclick="changeMemberRole('${m.community_id}','${m.user_id}','member')">${t('demote')}</button>` : ''}
            ${m.role!=='owner' ? `<button class="btn btn-danger btn-xs" onclick="kickMember('${m.community_id}','${m.user_id}')">${t('kick')}</button>` : ''}
          </div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function renderCommunitySettings() {
  const el = document.getElementById('communitySettings');
  if (!el || !_activeCommunity) return;
  const c = _activeCommunity;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">${t('communitySettings')}</div>
      <div class="form-grid">
        <div class="form-field"><label>${t('accountName')}</label><input type="text" id="editCommName" value="${c.name}"></div>
        <div class="form-field"><label>${t('stratDesc')}</label><input type="text" id="editCommDesc" value="${c.desc||''}"></div>
        <div class="form-field">
          <label>${t('inviteCode')}</label>
          <div style="display:flex;gap:6px">
            <input type="text" value="${c.inviteCode}" readonly style="font-family:'DM Mono',monospace;font-size:13px">
            <button class="btn btn-secondary btn-sm" onclick="copyInviteCode('${c.inviteCode}')">${t('copyCode')}</button>
          </div>
        </div>
        <div class="form-field">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="editCommPublic" ${c.isPublic?'checked':''} style="width:auto;padding:0"> ${t('public')}
          </label>
        </div>
        <div class="form-field">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="editCommPosts" ${c.allowPosts?'checked':''} style="width:auto;padding:0"> Permitir publicações
          </label>
        </div>
      </div>
      <div class="form-row">
        <button class="btn btn-primary" onclick="updateCommunity()">${t('save')}</button>
        ${c.ownerId===State.user?.id ? `<button class="btn btn-danger" onclick="deleteCommunity('${c.id}')">${t('deleteCommunity')}</button>` : ''}
      </div>
    </div>`;
}

function setupCommunityTabs() {
  document.querySelectorAll('.comm-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.comm-tab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.comm-tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('comm-tab-'+tab)?.classList.add('active');
    });
  });
}

// ── Switch community ──────────────────────────────────────────
async function switchCommunity(id) {
  _activeCommunity = State.communities.find(c=>c.id===id);
  await renderCommunity();
}

// ── Create community ──────────────────────────────────────────
async function createCommunity() {
  const name = document.getElementById('newCommName')?.value.trim();
  if (!name) return toast(t('nameRequired'), 'err');
  const row = {
    owner_id: State.user.id,
    name,
    description: document.getElementById('newCommDesc')?.value.trim(),
    avatar_color: document.getElementById('newCommColor')?.value || '#818cf8',
    is_public: document.getElementById('newCommPublic')?.checked ?? true,
    allow_posts: document.getElementById('newCommPosts')?.checked ?? true,
  };
  setSyncing(true);
  const { data: comm, error } = await sb.from('communities').insert(row).select().single();
  if (error) { setSyncing(false,true); return toast(t('error')+': '+error.message,'err'); }
  // Auto-join as owner
  await sb.from('community_members').insert({ community_id:comm.id, user_id:State.user.id, role:'owner' });
  setSyncing(false);
  State.communities.push(mapCommunity(comm));
  _activeCommunity = mapCommunity(comm);
  closeModal('createCommunityModal');
  toast(t('communityCreated'));
  await renderCommunity();
}

// ── Join by invite code ───────────────────────────────────────
async function joinCommunity() {
  const code = document.getElementById('joinCode')?.value.trim().toLowerCase();
  if (!code) return toast(t('nameRequired'), 'err');
  const { data: comm, error } = await sb.from('communities').select('*').eq('invite_code',code).single();
  if (error || !comm) return toast(t('invalidCode'),'err');
  const { error: err2 } = await sb.from('community_members').insert({ community_id:comm.id, user_id:State.user.id, role:'member' });
  if (err2) return toast(t('invalidCode'),'err');
  State.communities.push(mapCommunity(comm));
  _activeCommunity = mapCommunity(comm);
  closeModal('joinCommunityModal');
  toast(t('joinedCommunity'));
  await renderCommunity();
}

// ── Update community ──────────────────────────────────────────
async function updateCommunity() {
  const row = {
    name: document.getElementById('editCommName')?.value.trim(),
    description: document.getElementById('editCommDesc')?.value.trim(),
    is_public: document.getElementById('editCommPublic')?.checked,
    allow_posts: document.getElementById('editCommPosts')?.checked,
  };
  if (!row.name) return toast(t('nameRequired'),'err');
  setSyncing(true);
  const { error } = await sb.from('communities').update(row).eq('id',_activeCommunity.id);
  setSyncing(false,!!error);
  if (error) return toast(t('error')+': '+error.message,'err');
  _activeCommunity = { ..._activeCommunity, name:row.name, desc:row.description||'', isPublic:row.is_public, allowPosts:row.allow_posts };
  State.communities = State.communities.map(c=>c.id===_activeCommunity.id?_activeCommunity:c);
  toast(t('save')+' ✓');
  await renderCommunity();
}

// ── Delete community ──────────────────────────────────────────
async function deleteCommunity(id) {
  if (!confirm(t('deleteCommunityConfirm'))) return;
  setSyncing(true);
  await sb.from('communities').delete().eq('id',id);
  setSyncing(false);
  State.communities = State.communities.filter(c=>c.id!==id);
  _activeCommunity = State.communities[0]||null;
  toast(t('communityDeleted'));
  await renderCommunity();
}

// ── Submit post ───────────────────────────────────────────────
let _postImgs = [];
let _attachedTrade = null;

function handlePostImgs(e) {
  [...e.target.files].forEach(f=>{
    const r=new FileReader();
    r.onload=ev=>{_postImgs.push(ev.target.result);renderPostImgPreview();};
    r.readAsDataURL(f);
  });
  e.target.value='';
}
function renderPostImgPreview() {
  const el=document.getElementById('postImgPreview');
  if(el) el.innerHTML=_postImgs.map((s,i)=>`<div class="img-thumb"><img src="${s}"><button class="img-del" onclick="removePostImg(${i})">✕</button></div>`).join('');
}
function removePostImg(i){_postImgs.splice(i,1);renderPostImgPreview();}

async function submitPost() {
  const content = document.getElementById('newPostText')?.value.trim();
  if (!content && !_postImgs.length && !_attachedTrade) return toast(t('error'),'err');
  if (!_activeCommunity) return;
  const row = {
    community_id: _activeCommunity.id,
    user_id: State.user.id,
    content: content||null,
    images: [..._postImgs],
    asset: _attachedTrade?.asset||null,
    direction: _attachedTrade?.dir||null,
    result: _attachedTrade?.result||null,
    pnl: _attachedTrade?.pnl||null,
    rr: _attachedTrade?.rr||null,
  };
  setSyncing(true);
  const { data, error } = await sb.from('community_posts').insert(row).select('*, profiles(id,display_name,avatar_url)').single();
  setSyncing(false,!!error);
  if (error) return toast(t('error')+': '+error.message,'err');
  const postEl=document.getElementById('newPostText'); if(postEl) postEl.value='';
  _postImgs=[]; _attachedTrade=null;
  renderPostImgPreview();
  const prev=document.getElementById('attachedTradePreview');
  if(prev){prev.style.display='none';prev.innerHTML='';}
  State.communityPosts.unshift(mapPost(data));
  renderCommunityFeed();
  toast(t('postSaved'));
}

// ── Delete post ───────────────────────────────────────────────
async function deletePost(id) {
  if (!confirm(t('postDeleted')+'?')) return;
  await sb.from('community_posts').delete().eq('id',id);
  State.communityPosts=State.communityPosts.filter(p=>p.id!==id);
  renderCommunityFeed();
  toast(t('postDeleted'));
}

// ── Pin post ──────────────────────────────────────────────────
async function togglePin(id, isPinned) {
  await sb.from('community_posts').update({is_pinned:!isPinned}).eq('id',id);
  State.communityPosts=State.communityPosts.map(p=>p.id===id?{...p,isPinned:!isPinned}:p);
  renderCommunityFeed();
}

// ── React to post ─────────────────────────────────────────────
async function reactToPost(postId, emoji) {
  const existing = await sb.from('community_post_reactions').select('id').eq('post_id',postId).eq('user_id',State.user.id).eq('emoji',emoji).single();
  if (existing.data) {
    await sb.from('community_post_reactions').delete().eq('id',existing.data.id);
  } else {
    await sb.from('community_post_reactions').insert({post_id:postId,user_id:State.user.id,emoji});
  }
  // Reload reactions for this post
  const {data} = await sb.from('community_post_reactions').select('emoji,user_id').eq('post_id',postId);
  const el=document.getElementById('reactions-'+postId);
  if (el && data) {
    const grouped={};
    data.forEach(r=>{grouped[r.emoji]=(grouped[r.emoji]||0)+1;});
    el.innerHTML=Object.entries(grouped).map(([em,count])=>`<span class="reaction-chip">${em} ${count}</span>`).join('');
  }
}

// ── Member management ─────────────────────────────────────────
async function changeMemberRole(communityId, userId, role) {
  await sb.from('community_members').update({role}).eq('community_id',communityId).eq('user_id',userId);
  State.communityMembers=State.communityMembers.map(m=>m.community_id===communityId&&m.user_id===userId?{...m,role}:m);
  renderMembersList();
  toast(t('save')+' ✓');
}
async function kickMember(communityId, userId) {
  if(!confirm(t('kick')+'?'))return;
  await sb.from('community_members').delete().eq('community_id',communityId).eq('user_id',userId);
  State.communityMembers=State.communityMembers.filter(m=>!(m.community_id===communityId&&m.user_id===userId));
  renderMembersList();
}

// ── Attach trade ──────────────────────────────────────────────
function renderAttachTradeModal() {
  const el=document.getElementById('attachTradeList');
  if (!el) return;
  el.innerHTML=State.trades.slice(0,30).map(t=>`
    <div class="comm-list-item" onclick="selectTrade('${t.id}')" style="cursor:pointer;padding:10px 14px">
      <span style="font-weight:600;color:var(--accent2)">${t.asset}</span>
      <span class="tag ${t.dir==='Buy'?'tag-buy':'tag-sell'}" style="margin-left:6px">${t.dir}</span>
      <span class="tag ${t.result==='Win'?'tag-win':t.result==='Loss'?'tag-loss':'tag-be'}" style="margin-left:4px">${t.result}</span>
      <span class="${t.pnl>=0?'pnl-pos':'pnl-neg'}" style="margin-left:auto">${fmt(t.pnl)}</span>
    </div>`).join('');
}

function selectTrade(id) {
  _attachedTrade=State.trades.find(t=>t.id===id);
  closeModal('attachTradeModal');
  const prev=document.getElementById('attachedTradePreview');
  if(prev&&_attachedTrade){
    prev.style.display='block';
    prev.innerHTML=`<div class="post-trade-card">
      <span class="post-trade-asset">${_attachedTrade.asset}</span>
      <span class="tag ${_attachedTrade.dir==='Buy'?'tag-buy':'tag-sell'}">${_attachedTrade.dir}</span>
      <span class="tag ${_attachedTrade.result==='Win'?'tag-win':_attachedTrade.result==='Loss'?'tag-loss':'tag-be'}">${_attachedTrade.result}</span>
      <span class="${_attachedTrade.pnl>=0?'pnl-pos':'pnl-neg'}">${fmt(_attachedTrade.pnl)}</span>
      <button class="btn btn-secondary btn-xs" onclick="_attachedTrade=null;this.closest('.post-trade-card').parentElement.style.display='none'">✕</button>
    </div>`;
  }
}

// ── Copy invite code ──────────────────────────────────────────
function copyInviteCode(code) {
  navigator.clipboard.writeText(code).then(()=>toast(t('codeCopied')));
}

// ── Public communities discovery ──────────────────────────────
async function loadPublicCommunities() {
  const { data } = await sb.from('communities').select('*').eq('is_public',true).order('created_at',{ascending:false}).limit(20);
  return (data||[]).map(mapCommunity);
}
