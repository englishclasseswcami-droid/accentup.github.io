document.addEventListener('DOMContentLoaded', () => {
  try { quillEditor = new Quill('#quill-editor-container', { theme: 'snow', placeholder: 'Write your lesson content here...', modules: { toolbar: { container: [[{ header: [1,2,3,4,false] }],['bold','italic','strike','code','blockquote','code-block'],[{ list:'ordered' },{ list:'bullet' }],['link','image','video'],['clean'],['table']], handlers: { table: () => insertQuillTable() } } } }); } catch(e) { console.warn('Quill lesson init error:', e); }
  try { communityQuill = new Quill('#community-editor-container', { theme: 'snow', placeholder: 'Write your post here — you can add titles, bold text, links, YouTube videos and images...', modules: { toolbar: [[{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['link', 'image', 'video'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] } }); } catch(e) { console.warn('Quill community init error:', e); }
  try { editPostQuill = new Quill('#edit-post-editor-container', { theme: 'snow', modules: { toolbar: [['bold','italic'],['link'],['clean']] } }); } catch(e) { console.warn('Quill edit post init error:', e); }
  sb.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    if (event === 'PASSWORD_RECOVERY') {
      goToPage('auth');
      document.getElementById('auth-view-main').style.display = 'none';
      document.getElementById('auth-view-reset-request').style.display = 'none';
      document.getElementById('auth-view-reset-confirm').style.display = 'block';
      return;
    }
    updateAuthUI(); if (currentUser) fetchData();
  });
  renderQFields(); toggleLessonFields();
});


async function handleNavAuth() {
  if (currentUser) {
    try { await sb.auth.signOut(); } catch(e) { console.error('Sign out error:', e); }
  } else {
    goToPage('auth');
  }
}
function updateAuthUI() {
  const btn = document.getElementById('nav-auth-btn');
  const isLoggedIn = !!currentUser;
  const isTeacher = isLoggedIn && currentUser?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();

  // Public tabs (always visible)
  // 'home' and 'sounds' always shown when logged out; 'sounds' always shown

  // App tabs visibility
  const show = (id, visible) => { const el = document.getElementById(id); if (el) el.style.display = visible ? 'inline-block' : 'none'; };

  show('nav-home',       !isLoggedIn);
  show('nav-dashboard',  isLoggedIn && !isTeacher);
  show('nav-sounds',     true);
  show('nav-classroom',  isLoggedIn && !isTeacher);
  show('nav-community',  isLoggedIn);
  show('nav-routine-tab', isLoggedIn && !isTeacher);
  show('nav-reference-tab', isLoggedIn);
  show('nav-streaks-tab', isLoggedIn);
  show('nav-profile-tab', isLoggedIn && !isTeacher);
  show('nav-teacher-tab', isTeacher);

  if (isLoggedIn) {
    btn.textContent = 'Log out'; btn.classList.add('logout-btn-nav'); btn.classList.remove('auth-btn');
    if (document.getElementById('page-auth').classList.contains('active')) {
      goToPage(isTeacher ? 'teacher' : 'dashboard');
    }
  } else {
    btn.textContent = 'Log in'; btn.classList.remove('logout-btn-nav'); btn.classList.add('auth-btn');
    const activePage = document.querySelector('.page.active')?.id;
    const protectedPages = ['page-dashboard','page-classroom','page-teacher','page-profile','page-streaks','page-routine','page-reference','page-certificate'];
    if (protectedPages.includes(activePage)) goToPage('home');
  }
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('auth-title').textContent = isLoginMode ? 'Welcome back' : 'Create account';
  document.getElementById('auth-subtitle').textContent = isLoginMode ? 'Log in to access your classroom.' : 'Sign up below — Camila will review and activate your account.';
  document.getElementById('auth-toggle').textContent = isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Log in';
  document.getElementById('auth-submit-btn').textContent = isLoginMode ? 'Log in' : 'Create account';
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-forgot-link').style.display = isLoginMode ? 'block' : 'none';
}

/* ── PASSWORD RESET ── */
function showResetRequest() {
  document.getElementById('auth-view-main').style.display = 'none';
  document.getElementById('auth-view-reset-request').style.display = 'block';
  document.getElementById('auth-view-reset-confirm').style.display = 'none';
  document.getElementById('reset-error').style.display = 'none';
  document.getElementById('reset-success').style.display = 'none';
  document.getElementById('reset-email').value = '';
}

function backToLogin() {
  document.getElementById('auth-view-main').style.display = 'block';
  document.getElementById('auth-view-reset-request').style.display = 'none';
  document.getElementById('auth-view-reset-confirm').style.display = 'none';
}

async function sendResetEmail() {
  const email = document.getElementById('reset-email').value.trim();
  const errEl = document.getElementById('reset-error'); errEl.style.display = 'none';
  const successEl = document.getElementById('reset-success'); successEl.style.display = 'none';
  if (!email) { errEl.textContent = 'Please enter your email.'; errEl.style.display = 'block'; return; }
  const btn = document.getElementById('reset-submit-btn'); btn.disabled = true; btn.textContent = 'Sending...';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
  btn.disabled = false; btn.textContent = 'Send reset link';
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; }
  else { successEl.textContent = "✅ Check your email — we've sent you a password reset link."; successEl.style.display = 'block'; }
}

async function updatePassword() {
  const pw = document.getElementById('new-pw').value;
  const pw2 = document.getElementById('new-pw-confirm').value;
  const errEl = document.getElementById('update-pw-error'); errEl.style.display = 'none';
  if (!pw || pw.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = 'block'; return; }
  if (pw !== pw2) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; return; }
  const btn = document.getElementById('update-pw-btn'); btn.disabled = true; btn.textContent = 'Updating...';
  const { error } = await sb.auth.updateUser({ password: pw });
  btn.disabled = false; btn.textContent = 'Update password';
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  document.getElementById('auth-view-reset-confirm').style.display = 'none';
  document.getElementById('auth-view-main').style.display = 'block';
  alert('Password updated! Welcome back.');
  updateAuthUI();
  if (currentUser) fetchData();
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim(); const pw = document.getElementById('auth-pw').value;
  const errEl = document.getElementById('auth-error'); errEl.style.display = 'none';
  const btn = document.getElementById('auth-submit-btn'); btn.disabled = true; btn.textContent = 'Loading...';
  const res = isLoginMode ? await sb.auth.signInWithPassword({ email, password: pw }) : await sb.auth.signUp({ email, password: pw });
  if (res.error) { errEl.textContent = res.error.message; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = isLoginMode ? 'Log in' : 'Create account'; } 
  else {
    if (!isLoginMode || res.data?.user) {
      const userId = res.data?.user?.id;
      if (userId) {
        const checkProf = await sb.from('user_profiles').select('id').eq('id', userId).single();
        if (!checkProf.data) await sb.from('user_profiles').insert([{ id: userId, username: email.split('@')[0], approved: false }]);
      }
    }
    btn.disabled = false; btn.textContent = isLoginMode ? 'Log in' : 'Create account';
  }
}

document.querySelectorAll('.nav-tab[data-page]').forEach(tab => { tab.onclick = () => { const page = tab.dataset.page; if (['classroom','teacher','profile','streaks','routine','dashboard','reference','certificate'].includes(page) && !currentUser) { goToPage('auth'); closeNavMore(); return; } goToPage(page); closeNavMore(); }; });

function toggleNavMore(e) { e.stopPropagation(); document.querySelector('.nav-more-wrap')?.classList.toggle('open'); }
function closeNavMore() { document.querySelector('.nav-more-wrap')?.classList.remove('open'); }
document.addEventListener('click', (e) => { if (!e.target.closest('.nav-more-wrap')) closeNavMore(); });

function goToPage(pageId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const tabBtn = document.querySelector(`.nav-tab[data-page="${pageId}"]`); if (tabBtn) tabBtn.classList.add('active');
  if (tabBtn && tabBtn.closest('.nav-more-menu')) document.getElementById('nav-more-btn')?.classList.add('active');
  const pageEl = document.getElementById('page-' + pageId); if (pageEl) pageEl.classList.add('active');
  if (pageId === 'classroom') renderClassroomGrid();
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'teacher') { renderManageList(); updateModuleSelect(); updatePendingBadge(); }
  if (pageId === 'streaks') renderStreaks();
  if (pageId === 'sounds') buildAllSoundsGrids();
  if (pageId === 'community') loadPosts();
  if (pageId === 'routine') renderRoutine();
  if (pageId === 'reference') renderReferenceLibrary();
  if (pageId === 'certificate') renderCertificate();
  if (pageId === 'profile') { const p = dbProfiles.find(x => x.id === currentUser?.id); if (p) document.getElementById('profile-username').value = p.username || ''; }
  window.scrollTo(0, 0);
}

async function fetchData() {
  if (!currentUser) return;
  try {
    const userEmail = currentUser?.email?.toLowerCase() || '';
    const isTeacher = userEmail === TEACHER_EMAIL.toLowerCase();

    const [rMod, rSub, rLes, rProg, rSound] = await Promise.all([
      sb.from('modules').select('*').order('order_index'),
      sb.from('submodules').select('*').order('order_index'),
      sb.from('lessons').select('*').order('order_index'),
      sb.from('student_progress').select('*').eq('user_id', currentUser.id),
      sb.from('soundboard_items').select('*').order('order_index')
    ]);

    dbModules = (rMod?.data || []).filter(m => isTeacher || !m.is_private ||
      (m.allowed_emails && m.allowed_emails.toLowerCase().split(',').map(e => e.trim()).includes(userEmail)));
    dbSubmodules = rSub?.data || [];
    dbLessons = rLes?.data || [];
    dbProgress = rProg?.data || [];
    dbSoundboard = rSound?.data || [];

    renderClassroomGrid(); updateModuleSelect(); if (isTeacher) renderManageList();

    const [rProfiles, rRec] = await Promise.all([
      sb.from('user_profiles').select('*'),
      sb.from('recordings').select('*').eq('user_id', currentUser.id)
    ]);
    dbProfiles = rProfiles?.data || [];
    dbRecordings = rRec?.data || [];

    if (isTeacher) { const rAllProg = await sb.from('student_progress').select('*'); renderTeacherProgress(rAllProg?.data || []); }
    if (!isTeacher) {
      const rRou = await sb.from('student_routines').select('*').eq('student_id', currentUser.id).maybeSingle();
      dbRoutine = rRou?.data || null;
      if (dbRoutine) {
        const [rItems, rComp] = await Promise.all([
          sb.from('routine_items').select('*').eq('routine_id', dbRoutine.id).order('day_of_week').order('order_index'),
          sb.from('routine_completions').select('*').eq('student_id', currentUser.id).eq('week_start', getWeekStart())
        ]);
        dbRoutineItems = rItems?.data || [];
        dbRoutineCompletions = rComp?.data || [];
      } else { dbRoutineItems = []; dbRoutineCompletions = []; }
    }
    if (document.getElementById('page-streaks').classList.contains('active')) renderStreaks();
    if (document.getElementById('page-routine')?.classList.contains('active')) renderRoutine();
  } catch (error) { console.error("Error fetching data:", error); }
}


async function saveProfile() {
  const username = document.getElementById('profile-username').value.trim(); if (!username) { alert('Please choose a username.'); return; }
  const btn = document.getElementById('btn-save-profile'); btn.disabled = true; btn.textContent = 'Saving...';
  let avatarUrl = dbProfiles.find(p => p.id === currentUser.id)?.avatar_url || null; const file = document.getElementById('profile-avatar').files[0];
  if (file) { const fn = `av_${currentUser.id}_${Date.now()}`; const { error } = await sb.storage.from('avatars').upload(fn, file, { upsert: true }); if (!error) avatarUrl = sb.storage.from('avatars').getPublicUrl(fn).data.publicUrl; else alert('Error uploading image.'); }
  await sb.from('user_profiles').upsert({ id: currentUser.id, username, avatar_url: avatarUrl }); await fetchData();
  btn.disabled = false; btn.textContent = 'Save profile'; alert('Profile updated!');
}

