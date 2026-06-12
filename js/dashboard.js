/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
function renderDashboard() {
  const page = document.getElementById('page-dashboard');
  if (!page || !currentUser) return;
  const isTeacher = currentUser?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
  if (isTeacher) { goToPage('teacher'); return; }

  const profile  = dbProfiles.find(p => p.id === currentUser.id);
  const name     = profile?.username || currentUser.email.split('@')[0];

  if (profile && profile.approved === false) {
    page.innerHTML = `
      <div style="max-width:480px;margin:4rem auto;text-align:center">
        <div style="font-size:48px;margin-bottom:1rem">⏳</div>
        <div class="dash-greeting" style="margin-bottom:.5rem">Hi ${esc(name)}, welcome to AccentUp!</div>
        <p style="font-size:14px;color:var(--text-muted);line-height:1.6">
          Your account has been created and is now <strong>pending approval</strong>.
          Camila will review and activate your access shortly — this usually happens
          within 24 hours after your enrollment is confirmed.
        </p>
        <p style="font-size:13px;color:var(--text-muted);margin-top:1rem">
          In the meantime, feel free to explore the
          <a href="#" onclick="goToPage('sounds');return false" style="color:var(--brand);font-weight:700">Sounds of American English</a>
          — it's free for everyone!
        </p>
      </div>`;
    return;
  }

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Stats
  const dates      = dbProgress.map(p => p.created_at?.slice(0,10)).filter(Boolean);
  const { current: streak } = calcStreak(dates);
  const totalSecs  = dbRecordings.reduce((a, r) => a + (r.duration_seconds || 0), 0);
  const weekStart  = getWeekStart();
  const routineDone  = dbRoutineCompletions.length;
  const routineTotal = dbRoutineItems.length;

  // Next lesson to do
  const doneIds   = new Set(dbProgress.map(p => p.lesson_id));
  const nextLesson = dbLessons.find(l => !doneIds.has(l.id));
  const nextModule = nextLesson ? dbModules.find(m => m.id === nextLesson.module_id) : null;
  // OR continue last touched lesson
  const lastProg   = [...dbProgress].sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0))[0];
  const contLesson = nextLesson || (lastProg ? dbLessons.find(l => l.id === lastProg.lesson_id) : null);
  const contModule = contLesson ? dbModules.find(m => m.id === contLesson.module_id) : null;

  // Today's routine (Mon=0 … Sat=5)
  const jsDay   = new Date().getDay();
  const dayIdx  = jsDay === 0 ? 6 : jsDay - 1;
  const todayItems = dbRoutineItems.filter(i => i.day_of_week === dayIdx).slice(0, 4);
  const completedIds = new Set(dbRoutineCompletions.map(c => c.item_id));

  // Module progress
  const moduleProgress = dbModules.slice(0, 5).map(m => {
    const lessons = dbLessons.filter(l => l.module_id === m.id);
    const done    = lessons.filter(l => doneIds.has(l.id)).length;
    return { title: m.title, done, total: lessons.length, pct: lessons.length ? Math.round(done/lessons.length*100) : 0 };
  }).filter(m => m.total > 0);

  const streakCard  = streak > 0
    ? `<div class="dash-stat-card"><div class="dash-stat-icon">🔥</div><div class="dash-stat-val">${streak}</div><div class="dash-stat-lbl">Day streak</div></div>`
    : `<div class="dash-stat-card"><div class="dash-stat-icon">🔥</div><div class="dash-stat-val">0</div><div class="dash-stat-lbl">Start your streak!</div></div>`;

  const speakCard = `<div class="dash-stat-card"><div class="dash-stat-icon">🎙</div><div class="dash-stat-val">${fmtDur(totalSecs)||'0:00'}</div><div class="dash-stat-lbl">Speaking time</div></div>`;
  const lessonsCard = `<div class="dash-stat-card"><div class="dash-stat-icon">📚</div><div class="dash-stat-val">${dbProgress.length}</div><div class="dash-stat-lbl">Lessons done</div></div>`;
  const routineCard = routineTotal > 0
    ? `<div class="dash-stat-card ${routineDone === routineTotal && routineTotal > 0 ? 'complete' : ''}"><div class="dash-stat-icon">📅</div><div class="dash-stat-val">${routineDone}<span style="font-size:14px;font-weight:500;color:var(--text-muted)">/${routineTotal}</span></div><div class="dash-stat-lbl">Routine this week</div></div>`
    : `<div class="dash-stat-card"><div class="dash-stat-icon">📅</div><div class="dash-stat-val">—</div><div class="dash-stat-lbl">No routine yet</div></div>`;

  const continueHtml = contLesson
    ? `<button class="dash-continue" onclick="openDashLesson('${contLesson.id}','${contLesson.module_id}')">
        <span class="dash-continue-super">${esc(contModule?.title || 'Program')}</span>
        <span class="dash-continue-title">${esc(contLesson.title)}</span>
        <span class="dash-continue-arrow">Continue →</span>
       </button>`
    : `<div class="dash-empty">No lessons available yet.</div>`;

  const routineHtml = todayItems.length
    ? todayItems.map(item => {
        const done = completedIds.has(item.id);
        const lessonBtn = item.lesson_id
          ? `<button class="outline-btn" onclick="event.stopPropagation();openRoutineLesson('${item.lesson_id}')" style="font-size:11px;padding:3px 10px;flex-shrink:0">Open →</button>`
          : '';
        return `<div class="dash-routine-item ${done?'done':''}" onclick="toggleRoutineCompletion('${item.id}');renderDashboard()">
          <span style="font-size:16px">${done?'✅':'<span style="width:18px;height:18px;border:2px solid var(--border);border-radius:4px;display:inline-block"></span>'}</span>
          <span class="dash-routine-name">${esc(item.title)}</span>
          ${lessonBtn}
        </div>`;
      }).join('')
    : `<div class="dash-empty">${routineTotal > 0 ? 'No activities today.' : 'Your teacher will set up your routine soon.'}</div>`;

  const progressHtml = moduleProgress.length
    ? moduleProgress.map(m => `
        <div class="dash-mod-row">
          <div class="dash-mod-name"><span>${esc(m.title)}</span><span class="dash-mod-pct">${m.done}/${m.total}</span></div>
          <div class="dash-mod-bar"><div class="dash-mod-fill ${m.pct===100?'done':''}" style="width:${m.pct}%"></div></div>
        </div>`).join('')
    : `<div class="dash-empty">No modules yet.</div>`;

  page.innerHTML = `
    <div class="dash-greeting">${greeting}, <strong>${esc(name)}</strong> 👋</div>
    <div class="dash-sub">Here's your progress at a glance</div>
    <div class="dash-stats">${streakCard}${speakCard}${lessonsCard}${routineCard}</div>
    <div class="dash-grid">
      <div>
        <div class="dash-card">
          <div class="dash-card-label">▶ Continue learning</div>
          ${continueHtml}
        </div>
      </div>
      <div>
        <div class="dash-card" style="margin-bottom:1.25rem">
          <div class="dash-card-label">📅 Today's routine</div>
          ${routineHtml}
        </div>
        <div class="dash-card">
          <div class="dash-card-label">📊 Program progress</div>
          <div class="dash-prog-modules">${progressHtml}</div>
        </div>
      </div>
    </div>`;
}

function openDashLesson(lessonId, moduleId) {
  goToPage('classroom');
  setTimeout(() => {
    openModule(moduleId);
    setTimeout(() => showLesson(lessonId), 300);
  }, 100);
}
