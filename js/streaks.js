/* ══════════════════════════════════════════
   STREAKS
══════════════════════════════════════════ */

async function renderStreaks() {
  if (!currentUser) return;
  const isTeacher = currentUser?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
  document.getElementById('streaks-student-view').style.display = isTeacher ? 'none' : 'block';
  document.getElementById('streaks-teacher-view').style.display = isTeacher ? 'block' : 'none';

  if (isTeacher) {
    const [rAllProg, rAllRec] = await Promise.all([
      sb.from('student_progress').select('user_id,lesson_id,created_at'),
      sb.from('recordings').select('user_id,lesson_id,url,duration_seconds,created_at')
    ]);
    const allProg = rAllProg?.data || [];
    const allRec  = rAllRec?.data || [];
    const students = dbProfiles.filter(p => p.id !== currentUser.id);
    const totalLessons = dbLessons.length;
    const list = document.getElementById('streak-all-list');
    if (!students.length) { list.innerHTML = '<div style="color:var(--text-light);font-size:13px;text-align:center;padding:1rem">No students yet.</div>'; return; }
    list.innerHTML = students.map(s => {
      const sProg   = allProg.filter(p => p.user_id === s.id);
      const done    = sProg.length;
      const pct     = totalLessons ? Math.round(done/totalLessons*100) : 0;
      const dates   = sProg.map(p => p.created_at ? p.created_at.slice(0,10) : null).filter(Boolean);
      const { current } = calcStreak(dates);
      const speakSecs = allRec.filter(r => r.user_id === s.id).reduce((a, r) => a + (r.duration_seconds || 0), 0);
      const speakLabel = speakSecs > 0 ? `<span style="font-size:11px;font-weight:700;color:var(--brand-mid);white-space:nowrap">🎙 ${fmtDur(speakSecs)}</span>` : '';
      // Per-module breakdown
      const moduleDetail = dbModules.map(m => {
        const mLessons = dbLessons.filter(l => l.module_id === m.id);
        if (!mLessons.length) return '';
        const mDone = mLessons.filter(l => sProg.some(p => p.lesson_id === l.id)).length;
        const mPct = Math.round(mDone/mLessons.length*100);
        const color = mPct === 100 ? 'var(--green)' : mPct > 0 ? 'var(--brand)' : 'var(--border)';
        return `<div class="stu-mod-row">
          <span class="stu-mod-title">${esc(m.title)}</span>
          <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${mDone}/${mLessons.length}</span>
          <div style="width:80px;height:6px;background:var(--border);border-radius:10px;overflow:hidden;flex-shrink:0">
            <div style="height:100%;width:${mPct}%;background:${color};border-radius:10px"></div>
          </div>
          <span style="font-size:11px;font-weight:700;color:${color};white-space:nowrap">${mPct}%</span>
        </div>`;
      }).join('');
      const studentRecs = allRec.filter(r => r.user_id === s.id).sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0));
      const recordingsHtml = studentRecs.length
        ? `<div class="stu-rec-list">` + studentRecs.map(r => {
            const lesson = dbLessons.find(l => l.id === r.lesson_id);
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
            const fileName = `${(s.username||'student').replace(/\s+/g,'_')}_${(lesson?.title||'recording').replace(/\s+/g,'_')}.webm`;
            return `<div class="stu-rec-row">
              <span class="stu-rec-title">🎙 ${esc(lesson?.title || 'Untitled lesson')}</span>
              <span class="stu-rec-date">${dateStr}</span>
              <audio controls src="${esc(r.url)}" style="height:30px;max-width:170px"></audio>
              <a href="${esc(r.url)}" download="${esc(fileName)}" class="stu-rec-download" title="Download recording">⬇</a>
            </div>`;
          }).join('') + `</div>`
        : `<div style="font-size:12px;color:var(--text-muted);padding:4px 0">No recordings yet.</div>`;
      return `<div>
        <div class="streak-stu-row" onclick="toggleStudentDetail('${s.id}')">
          <div class="post-avatar" style="width:30px;height:30px;font-size:12px;flex-shrink:0">${renderAvatarHTML(s.id, s.username||'Student')}</div>
          <span class="streak-stu-name">${esc(s.username||'Unnamed')}</span>
          <span class="streak-stu-flame">🔥 ${current}d</span>
          ${speakLabel}
          <div class="streak-prog-bar-wrap"><div class="streak-prog-bar" style="width:${pct}%"></div></div>
          <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${done}/${totalLessons}</span>
          <span style="font-size:11px;color:var(--text-muted)">▾</span>
        </div>
        <div class="stu-detail" id="stu-det-${s.id}">
          <div class="stu-detail-section-title">📊 Module progress</div>
          ${moduleDetail || '<div style="font-size:12px;color:var(--text-muted);padding:4px 0 12px">No activity yet.</div>'}
          <div class="stu-detail-section-title" style="margin-top:14px">🎙 Recordings</div>
          ${recordingsHtml}
        </div>
      </div>`;
    }).join('');
    return;
  }

  const dates = dbProgress.map(p => p.created_at ? p.created_at.slice(0,10) : null).filter(Boolean);
  const { current, best, activeDays } = calcStreak(dates);
  document.getElementById('streak-current-num').textContent = current;
  document.getElementById('streak-best-num').textContent    = best;
  document.getElementById('streak-total-num').textContent   = dbProgress.length;
  document.getElementById('streak-days-num').textContent    = activeDays;

  const doneSet = new Set(dates);
  const grid    = document.getElementById('streak-cal-grid');
  const today   = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);
  let calHtml = '';
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    calHtml += `<div class="streak-day${doneSet.has(ds)?' done':''}${ds===todayStr?' today':''}" title="${ds}"></div>`;
  }
  grid.innerHTML = calHtml;

  // Speaking time
  const totalSecs = dbRecordings.reduce((a, r) => a + (r.duration_seconds || 0), 0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0,0,0,0);
  const weekSecs = dbRecordings.filter(r => r.created_at && new Date(r.created_at) >= weekAgo).reduce((a, r) => a + (r.duration_seconds || 0), 0);
  const sessions = dbRecordings.length;
  const speakEmpty = document.getElementById('speak-empty');
  const speakStats = document.getElementById('speak-stats');
  if (speakEmpty) speakEmpty.style.display = sessions > 0 ? 'none' : 'block';
  if (speakStats) speakStats.style.display = sessions > 0 ? 'block' : 'none';
  if (sessions > 0) {
    document.getElementById('speak-total').textContent  = fmtDur(totalSecs);
    document.getElementById('speak-week').textContent   = fmtDur(weekSecs);
    document.getElementById('speak-sessions').textContent = sessions;
  }
}

function toggleStudentDetail(id) {
  const el = document.getElementById('stu-det-' + id);
  if (el) el.classList.toggle('open');
}

function renderTeacherProgress() { /* moved to Streaks page */ }

