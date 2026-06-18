// 地頭ジム — メインコントローラ
import { el, toast, shuffle, pick, sample, randInt, todayStr } from './src/util.js';
import { PILLARS, DRILLS, drillById, drillsByPillar } from './src/drills/index.js';
import { LESSONS, lessonById } from './src/lessons.js';
import { getState, levelInfo, resetAll } from './src/store.js';
import { applyResult, currentLevel, startSessionStreak } from './src/engine.js';

const appEl = document.getElementById('app');
let session = null;

function setScreen(node) {
  appEl.innerHTML = '';
  node.classList.add('fade');
  appEl.appendChild(node);
  window.scrollTo(0, 0);
}

const pillarAvgLevel = (p) => {
  const ds = drillsByPillar(p);
  return ds.reduce((s, d) => s + currentLevel(d.id), 0) / ds.length;
};

/* ============================ HOME ============================ */
function renderHome() {
  const li = levelInfo();
  const st = getState();
  const today = st.daily[todayStr()] || { rounds: 0, correct: 0 };

  const top = el('div.topbar', [
    el('div.brand', [el('span', '地頭'), el('span.dot', 'ジム')]),
    el('div.spacer'),
    st.streakDays > 0 ? el('div.lvlchip', [el('span.streak', '🔥'), `${st.streakDays}日`]) : null,
    el('div.lvlchip', [`Lv ${li.level}`]),
  ]);

  const hero = el('div.hero', [
    el('div.glow'),
    el('h1', '今日のトレーニング'),
    el('p', '謎解き・計算・思考・記憶をミックスで10問。難しさは自動で調整されます。'),
    el('button.btn', { onclick: () => startSession({ mode: 'mixed', count: 10 }) }, 'はじめる ▶'),
    el('div.xpwrap', [
      el('div.xpbar', [el('div.xpfill', { style: { width: `${Math.round(li.progress * 100)}%` } })]),
      el('div.xplabel', [el('span', `次のレベルまで ${li.span - li.inLevel} XP`), el('span', `${today.rounds}問 / 今日`)]),
    ]),
  ]);

  const tiles = el('div.grid', Object.values(PILLARS).map((p) => {
    const lv = pillarAvgLevel(p.key);
    return el('button.tile', { 'data-p': p.key, onclick: () => startSession({ mode: 'pillar', pillar: p.key, count: 8 }) }, [
      el('div.ic', p.icon),
      el('div.name', p.name),
      el('div.sub', p.desc),
      el('div.bar', [el('i', { style: { width: `${Math.min(100, lv / 12 * 100)}%`, background: pillarColor(p.key) } })]),
      el('div.sub', { style: { marginTop: '6px' } }, `平均 Lv ${lv.toFixed(1)}`),
    ]);
  }));

  const drillList = el('div.card', DRILLS.map((d, i) =>
    el('button.tile', {
      style: { width: '100%', border: 'none', background: 'transparent', boxShadow: 'none', borderTop: i ? '1px solid var(--line)' : 'none', borderRadius: 0, padding: '12px 4px' },
      onclick: () => startSession({ mode: 'drill', drillId: d.id, count: 8 }),
    }, [
      el('div.row', [
        el('div', { style: { fontSize: '22px' } }, d.icon),
        el('div.col', { style: { flex: 1 } }, [
          el('div', { style: { fontWeight: '700' } }, d.title),
          el('div.sub', d.blurb),
        ]),
        el('div.lvlchip', `Lv ${currentLevel(d.id)}`),
      ]),
    ])
  ));

  const links = el('div.linkrow', [
    el('button', { onclick: () => { if (confirm('進捗をすべて消去します。よろしいですか？')) { resetAll(); renderHome(); toast('リセットしました'); } } }, 'データをリセット'),
    el('span.muted', 'v1.0'),
  ]);

  const learnCard = el('button.tile', {
    style: { width: '100%', marginTop: '14px', borderTop: '3px solid var(--framework)' },
    onclick: renderLearn,
  }, [
    el('div.row', [
      el('div', { style: { fontSize: '28px' } }, '🎓'),
      el('div.col', { style: { flex: 1 } }, [
        el('div.name', '思考の型を学ぶ'),
        el('div.sub', '14の考え方を、やさしい解説で身につける → クイズで腕試し'),
      ]),
      el('div', { style: { fontSize: '22px', color: 'var(--muted)' } }, '›'),
    ]),
  ]);

  setScreen(el('div', [
    top, hero,
    learnCard,
    el('div.section-title', '柱別トレーニング'),
    tiles,
    el('div.section-title', 'ドリル別（弱点を集中）'),
    drillList,
    links,
    el('div.bottomgap'),
  ]));
}

function pillarColor(key) {
  return { logic: 'var(--logic)', calc: 'var(--calc)', framework: 'var(--framework)', memory: 'var(--memory)' }[key];
}

/* ============================ LEARN（学ぶ）============================ */
function renderLearn() {
  const top = el('div.topbar', [
    el('button.btn.ghost', { style: { width: 'auto', padding: '6px 10px' }, onclick: renderHome }, '‹ 戻る'),
    el('div.brand', { style: { fontSize: '18px' } }, '思考の型を学ぶ'),
  ]);
  const intro = el('div.card', { style: { marginBottom: '6px' } }, [
    el('div.fexp', { class: 'muted', html: '考え方は「①学ぶ → ②使う → ③復習」で身につきます。気になる型を読んで、最後に「クイズで腕試し」で使ってみましょう。' }),
  ]);
  const list = el('div.card', LESSONS.map((l, i) =>
    el('button.tile', {
      style: { width: '100%', border: 'none', background: 'transparent', boxShadow: 'none', borderTop: i ? '1px solid var(--line)' : 'none', borderRadius: 0, padding: '14px 4px' },
      onclick: () => renderLesson(l.id),
    }, [
      el('div.row', [
        el('div', { style: { fontSize: '24px' } }, l.icon),
        el('div.col', { style: { flex: 1 } }, [
          el('div', { style: { fontWeight: '700' } }, l.title),
          el('div.sub', l.one),
        ]),
        el('div', { style: { color: 'var(--muted)' } }, '›'),
      ]),
    ])
  ));
  setScreen(el('div', [top, intro, list, el('div.bottomgap')]));
}

function lessonBlock(label, body, color) {
  return el('div', { style: { marginTop: '16px' } }, [
    el('div', { style: { fontSize: '12px', fontWeight: '800', color: color || 'var(--framework)', letterSpacing: '.5px', marginBottom: '6px' } }, label),
    typeof body === 'string'
      ? el('div', { style: { fontSize: '15px', lineHeight: '1.7' } }, body)
      : body,
  ]);
}

function renderLesson(id) {
  const l = lessonById(id);
  const top = el('div.topbar', [
    el('button.btn.ghost', { style: { width: 'auto', padding: '6px 10px' }, onclick: renderLearn }, '‹ 一覧'),
  ]);
  const head = el('div.hero', [
    el('div.glow'),
    el('div', { style: { fontSize: '36px' } }, l.icon),
    el('h1', { style: { margin: '8px 0 4px' } }, l.title),
    el('p', { style: { margin: 0 } }, l.one),
  ]);
  const steps = el('ol', { style: { margin: '0', paddingLeft: '20px', lineHeight: '1.8', fontSize: '15px' } },
    l.steps.map((s) => el('li', s)));
  const body = el('div.card', { style: { marginTop: '14px' } }, [
    lessonBlock('なぜ効く？', l.why),
    lessonBlock('具体例', el('div', { style: { fontSize: '15px', lineHeight: '1.7', background: 'var(--card2)', padding: '12px', borderRadius: '12px' } }, l.example), 'var(--calc)'),
    lessonBlock('使う手順', steps, 'var(--logic)'),
    lessonBlock('ありがちな失敗', l.pitfall, 'var(--bad)'),
  ]);
  const tryBtn = el('button.btn', { style: { marginTop: '16px' }, onclick: () => startSession({ mode: 'pillar', pillar: 'framework', count: 6 }) }, 'クイズで腕試し ▶');
  const next = (() => {
    const idx = LESSONS.findIndex((x) => x.id === id);
    const nx = LESSONS[idx + 1];
    return nx ? el('button.btn.secondary', { style: { marginTop: '10px' }, onclick: () => renderLesson(nx.id) }, `次の型：${nx.title} ›`) : null;
  })();
  setScreen(el('div', [top, head, body, tryBtn, next, el('div.bottomgap')]));
}

/* ============================ SESSION ============================ */
function buildPicks({ mode, pillar, drillId, count }) {
  if (mode === 'drill') return Array.from({ length: count }, () => drillById(drillId));
  if (mode === 'pillar') {
    const ds = drillsByPillar(pillar);
    return Array.from({ length: count }, () => pick(ds));
  }
  // mixed: 各柱から散らす
  const keys = Object.keys(PILLARS);
  const picks = [];
  for (let i = 0; i < count; i++) {
    const p = keys[i % keys.length];
    picks.push(pick(drillsByPillar(p)));
  }
  return shuffle(picks);
}

function startSession(cfg) {
  startSessionStreak();
  session = {
    cfg,
    picks: buildPicks(cfg),
    i: 0,
    results: [],
    levelBefore: levelInfo().level,
  };
  renderRound();
}

function renderRound() {
  const { picks, i } = session;
  const drill = picks[i];
  const level = currentLevel(drill.id);
  const round = drill.generate(level);
  session.current = { drill, round, level, startTs: Date.now(), answered: false };

  const dots = el('div.progressdots', picks.map((_, k) => {
    const r = session.results[k];
    const cls = 'pdot' + (r ? (r.correct ? ' done ok' : ' done ng') : '');
    return el('div', { class: cls }, [el('i')]);
  }));

  const top = el('div.sess-top', [
    el('button.btn.ghost', { style: { width: 'auto', padding: '6px 10px' }, onclick: () => quitConfirm() }, '✕'),
    dots,
    el('div.qlevel', `${i + 1}/${picks.length}`),
  ]);

  const P = PILLARS[round.pillar];
  const meta = el('div.qmeta', [
    el('span', { class: `pill ${round.pillar}` }, P.short),
    el('span.qlevel', `Lv ${level}・${drill.title}`),
  ]);

  const area = el('div', { id: 'roundArea' });
  const wrap = el('div.sess', [top, meta, area]);
  setScreen(wrap);

  if (round.type === 'choice') renderChoice(area, round);
  else if (round.type === 'number') renderNumber(area, round);
  else if (round.type === 'custom') renderCustom(area, round, drill);
}

function renderChoice(area, round) {
  area.appendChild(el('div.prompt', { html: round.prompt }));
  const box = el('div.choices');
  round.choices.forEach((c, idx) => {
    box.appendChild(el('button.choice', {
      onclick: () => {
        if (session.current.answered) return;
        revealChoice(box, idx, round.answerIndex);
        handleAnswer(idx === round.answerIndex, round);
      },
    }, c));
  });
  area.appendChild(box);
}

function revealChoice(box, chosen, correct) {
  [...box.children].forEach((btn, idx) => {
    if (idx === correct) btn.classList.add('correct');
    else if (idx === chosen) btn.classList.add('wrong');
    else btn.classList.add('dim');
  });
}

function renderNumber(area, round) {
  area.appendChild(el('div.prompt', { html: round.prompt }));
  let entered = '';
  let neg = false;
  const box = el('div.answerbox');
  const render = () => { box.innerHTML = (neg ? '−' : '') + (entered || '<span class="cursor">_</span>'); };
  render();
  area.appendChild(box);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫'];
  const pad = el('div.numpad', keys.map((k) =>
    el('button.key', {
      onclick: () => {
        if (session.current.answered) return;
        if (k === '⌫') entered = entered.slice(0, -1);
        else if (k === '±') neg = !neg;
        else if (entered.length < 7) entered += k;
        render();
      },
    }, k)
  ));
  area.appendChild(pad);
  area.appendChild(el('button.btn', {
    style: { marginTop: '12px' },
    onclick: () => {
      if (session.current.answered || entered === '') return;
      const val = (neg ? -1 : 1) * Number(entered);
      box.innerHTML = `${val === round.answer ? '⭕️ ' : '❌ '}${neg ? '−' : ''}${entered}`;
      handleAnswer(val === round.answer, round);
    },
  }, '決定 ✓'));
}

function renderCustom(area, round, drill) {
  round.mount(area, {
    level: session.current.level,
    done: (correct, detail) => {
      handleAnswer(correct, { ...round, explanation: (detail && detail.explanation) || round.explanation });
    },
  });
}

function handleAnswer(correct, round) {
  if (session.current.answered) return;
  session.current.answered = true;
  const drill = session.current.drill;
  const ms = Date.now() - session.current.startTs;
  const res = applyResult(drill.id, { correct, ms, expectedMs: round.expectedMs });
  session.results.push({ correct, xpGain: res.xpGain, pillar: drill.pillar, title: drill.title, leveledDrill: res.leveledDrill });

  if (res.leveledDrill) toast(`${drill.title} が Lv${Math.floor(res.diffAfter)} に！`);

  const area = document.getElementById('roundArea');
  const fb = el('div', { class: `feedback ${correct ? 'ok' : 'ng'} pop` }, [
    el('div.ftitle', correct ? `正解！  +${res.xpGain} XP` : '残念…'),
    round.explanation ? el('div.fexp', { html: round.explanation }) : null,
  ]);
  area.appendChild(fb);

  const last = session.i === session.picks.length - 1;
  area.appendChild(el('button.btn', {
    style: { marginTop: '14px' },
    onclick: () => {
      session.i += 1;
      if (last) renderSummary();
      else renderRound();
    },
  }, last ? '結果を見る 🏁' : '次へ ▶'));
  fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function quitConfirm() {
  if (session.results.length === 0 || confirm('トレーニングを中断しますか？（途中までの記録は保存されます）')) {
    if (session.results.length > 0) renderSummary();
    else renderHome();
  }
}

/* ============================ SUMMARY ============================ */
function renderSummary() {
  const r = session.results;
  const total = r.length;
  const correct = r.filter((x) => x.correct).length;
  const xp = r.reduce((s, x) => s + x.xpGain, 0);
  const acc = total ? Math.round(correct / total * 100) : 0;
  const li = levelInfo();
  const leveledUp = li.level > session.levelBefore;

  const byPillar = {};
  r.forEach((x) => { byPillar[x.pillar] = byPillar[x.pillar] || { c: 0, t: 0 }; byPillar[x.pillar].t++; if (x.correct) byPillar[x.pillar].c++; });

  const ring = el('div.center', { style: { margin: '8px 0 4px' } }, [
    el('div', { style: { fontSize: '54px', fontWeight: '800' } }, `${acc}%`),
    el('div.muted', `${correct} / ${total} 正解`),
  ]);

  const stats = el('div.statgrid', [
    el('div.stat', [el('div.v', `+${xp}`), el('div.k', '獲得 XP')]),
    el('div.stat', [el('div.v', `Lv ${li.level}`), el('div.k', leveledUp ? 'レベルアップ！' : '現在レベル')]),
  ]);

  const breakdown = el('div.card', Object.entries(byPillar).map(([p, v], i) =>
    el('div.row', { style: { padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' } }, [
      el('span', { class: `pill ${p}` }, PILLARS[p].short),
      el('span', { style: { flex: 1, marginLeft: '8px' } }, PILLARS[p].name),
      el('span', { style: { fontWeight: '700' } }, `${v.c}/${v.t}`),
    ])
  ));

  const msg = acc === 100 ? '完璧。地頭フル回転！' : acc >= 70 ? 'いい調子！この難度をモノにしつつある。' : acc >= 40 ? '伸びしろの宝庫。間違いこそ栄養。' : '難度が上がってる証拠。下げて立て直そう。';

  setScreen(el('div', [
    el('div.topbar', [el('div.brand', 'リザルト'), el('div.spacer'), leveledUp ? el('div.lvlchip', [el('span.levelup', 'LEVEL UP!')]) : null]),
    el('div.hero', { style: { textAlign: 'center' } }, [el('div.glow'), ring, el('p', { style: { margin: '6px 0 0' } }, msg)]),
    stats,
    el('div.section-title', '柱ごとの結果'),
    breakdown,
    el('button.btn', { style: { marginTop: '16px' }, onclick: () => startSession(session.cfg) }, 'もう一度 🔁'),
    el('button.btn.secondary', { style: { marginTop: '10px' }, onclick: renderHome }, 'ホームへ'),
    el('div.bottomgap'),
  ]));
}

/* ============================ boot ============================ */
renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offlineは後で */ });
  });
}
