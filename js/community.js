async function deletePost(id) {
  if (!currentUser) return;
  if (!confirm('Delete this post?')) return;
  const { error } = await sb.from('posts').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) { alert('Could not delete post: ' + error.message); return; }
  backToCommunityFeed();
}

async function deleteComment(id) {
  if (!currentUser) return;
  if (!confirm('Delete this comment?')) return;
  const { error } = await sb.from('comments').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) { alert('Could not delete comment: ' + error.message); return; }
  if (currentViewedPostId) loadComments(currentViewedPostId);
}

/* ══════════════════════════════════════════
   COMMUNITY
══════════════════════════════════════════ */
async function loadPosts(append = false) {
  const list = document.getElementById('community-posts-list');
  if (!list) return;
  // Only teacher can post
  const isTeacher = currentUser?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
  const writeBox = document.getElementById('write-post-box');
  if (writeBox) writeBox.style.display = isTeacher ? 'block' : 'none';
  if (!append) { list.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-light);font-size:14px">Loading posts...</div>'; }
  const offset = append ? (parseInt(list.dataset.offset) || 0) : 0;
  const { data: posts, error } = await sb.from('posts').select('*').order('created_at', { ascending: false }).range(offset, offset + 19);
  if (error) { list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:14px">Could not load posts.</div>'; return; }
  if (!posts || (!posts.length && !append)) { list.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-light);font-size:14px">No posts yet. Be the first to share!</div>'; return; }
  const html = posts.map(p => {
    const canEdit = currentUser?.id === p.user_id;
    const bodyText = p.body || p.content || '';
    const preview = bodyText.replace(/<[^>]+>/g, '').substring(0, 200);
    return `<div class="post-card" onclick="openPost('${esc(p.id)}')">
      <div class="post-header">
        <div class="post-avatar">${renderAvatarHTML(p.user_id, '')}</div>
        <span class="post-author">${getDisplayName(p.user_id, '')}</span>
        <span class="post-date">${timeAgo(p.created_at)}</span>
      </div>
      <div class="post-title">${esc(p.title || '')}</div>
      ${preview ? `<div class="post-preview">${esc(preview)}</div>` : ''}
      <div class="post-actions" onclick="event.stopPropagation()">
        <button class="action-btn">❤️ ${p.likes || 0}</button>
        ${canEdit ? `<button class="action-btn edit-post-btn" onclick="openEditPostModal('${esc(p.id)}', event)">✏️ Edit</button>` : ''}
        ${canEdit ? `<button class="action-btn delete-post-btn" onclick="deletePost('${esc(p.id)}')">🗑 Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');
  if (append) { const existing = list.querySelector('#posts-more-btn'); if (existing) existing.remove(); list.insertAdjacentHTML('beforeend', html); }
  else { list.innerHTML = html; }
  list.dataset.offset = offset + posts.length;
  const moreBtn = posts.length === 20 ? `<div style="text-align:center;margin-top:1rem"><button class="outline-btn" onclick="loadPosts(true)">Load more</button></div>` : '';
  list.insertAdjacentHTML('beforeend', `<div id="posts-more-btn">${moreBtn}</div>`);
}

async function openPost(postId) {
  currentViewedPostId = postId;
  document.getElementById('community-feed-view').style.display = 'none';
  document.getElementById('community-post-view').style.display = 'block';
  const { data: p } = await sb.from('posts').select('*').eq('id', postId).single();
  if (!p) { backToCommunityFeed(); return; }
  const canEdit = currentUser?.id === p.user_id;
  const bodyText = sanitizeHtml(p.body || p.content || '');
  document.getElementById('single-post-render').innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${renderAvatarHTML(p.user_id, '')}</div>
      <span class="post-author">${getDisplayName(p.user_id, '')}</span>
      <span class="post-date">${timeAgo(p.created_at)}</span>
    </div>
    <h2 class="post-title" style="font-size:20px;margin-bottom:1rem">${esc(p.title || '')}</h2>
    <div class="post-full-body">${bodyText}</div>
    <div class="post-actions">
      <button class="action-btn">❤️ ${p.likes || 0}</button>
      ${canEdit ? `<button class="action-btn edit-post-btn" onclick="openEditPostModal('${esc(p.id)}', event)">✏️ Edit</button>` : ''}
      ${canEdit ? `<button class="action-btn delete-post-btn" onclick="deletePost('${esc(p.id)}')">🗑 Delete</button>` : ''}
    </div>`;
  loadComments(postId);
}

function backToCommunityFeed() {
  currentViewedPostId = null;
  document.getElementById('community-post-view').style.display = 'none';
  document.getElementById('community-feed-view').style.display = 'block';
  loadPosts();
}

async function loadComments(postId) {
  const list = document.getElementById('comments-list');
  if (!list) return;
  const { data: comments } = await sb.from('comments').select('*').eq('post_id', postId).order('created_at');
  if (!comments || !comments.length) { list.innerHTML = '<div style="color:var(--text-light);font-size:13px;padding:1rem 0">No comments yet.</div>'; return; }
  list.innerHTML = comments.map(c => {
    const canDel = currentUser?.id === c.user_id;
    const commentText = c.body || c.content || '';
    return `<div class="comment-item">
      <div class="post-avatar" style="width:32px;height:32px;font-size:12px;flex-shrink:0">${renderAvatarHTML(c.user_id, '')}</div>
      <div class="comment-bubble">
        <div class="comment-author" style="display:flex;align-items:center;justify-content:space-between">
          <span>${getDisplayName(c.user_id, '')}</span>
          ${canDel ? `<button class="action-btn delete-post-btn" style="font-size:11px" onclick="deleteComment('${esc(c.id)}')">🗑</button>` : ''}
        </div>
        <div class="comment-text">${esc(commentText)}</div>
      </div>
    </div>`;
  }).join('');
}

async function submitPost() {
  if (!currentUser) { goToPage('auth'); return; }
  const titleEl = document.getElementById('new-post-title');
  const title = titleEl?.value.trim();
  const body = communityQuill ? communityQuill.root.innerHTML : '';
  if (!title) { alert('Please add a title.'); return; }
  const { error } = await sb.from('posts').insert([{ user_id: currentUser.id, title, body, likes: 0 }]);
  if (error) { alert('Error posting: ' + error.message); return; }
  if (titleEl) titleEl.value = '';
  if (communityQuill) communityQuill.root.innerHTML = '';
  loadPosts();
}

async function submitComment() {
  if (!currentUser || !currentViewedPostId) return;
  const input = document.getElementById('new-comment-input');
  const body = input?.value.trim();
  if (!body) return;
  const { error } = await sb.from('comments').insert([{ post_id: currentViewedPostId, user_id: currentUser.id, body }]);
  if (error) { alert('Error posting comment: ' + error.message); return; }
  if (input) input.value = '';
  loadComments(currentViewedPostId);
}

function openEditPostModal(postId, event) {
  if (event) event.stopPropagation();
  const idInput = document.getElementById('edit-post-id');
  if (idInput) idInput.value = postId;
  const modal = document.getElementById('edit-post-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditPostModal() {
  const modal = document.getElementById('edit-post-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveEditedPost() {
  if (!currentUser) return;
  const id = document.getElementById('edit-post-id')?.value;
  const title = document.getElementById('edit-post-title')?.value.trim();
  if (!id || !title) { alert('Title is required.'); return; }
  const payload = { title };
  if (editPostQuill) payload.body = editPostQuill.root.innerHTML;
  const { error } = await sb.from('posts').update(payload).eq('id', id).eq('user_id', currentUser.id);
  if (error) { alert('Error saving: ' + error.message); return; }
  closeEditPostModal();
  if (currentViewedPostId === id) openPost(id); else loadPosts();
}

function showOpenAnswerCompleted() { document.getElementById('score-area').innerHTML = `<div class="score-panel"><div class="score-top"><div class="score-circle open"><div class="pct">✓</div></div><div class="score-msg">Exercise submitted!<div class="sub">Review the expected answers above.</div></div></div></div>`; document.getElementById('score-area').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function showScore(correct, total, results, readonly) {
  const pct = total > 0 ? Math.round(correct / total * 100) : 0; const cls = pct >= 80 ? 'great' : pct >= 50 ? 'ok' : 'low'; const msg = pct >= 80 ? '¡Great work! 🎉' : pct >= 50 ? 'Good effort — keep practicing!' : 'Review and try again.';
  const rows = results.map(r => `<div class="score-row ${r.ok?'c':'w'}">${r.ok?'✓':'✗'} <em>${esc(r.prompt)}</em> → <strong>${esc(r.answer)}</strong>${!r.ok&&r.given?`<span class="ans"> (your answer: ${esc(r.given)})</span>`:''}</div>`).join('');
  document.getElementById('score-area').innerHTML = `<div class="score-panel"><div class="score-top"><div class="score-circle ${cls}"><div class="pct">${pct}%</div><div class="frac">${correct}/${total}</div></div><div class="score-msg">${readonly?'Previously completed':msg}<div class="sub">${correct} correct out of ${total}</div></div></div>${rows?`<div class="score-details">${rows}</div>`:''}</div>`;
  document.getElementById('score-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

