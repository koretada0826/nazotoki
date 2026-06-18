// ナゾトキ — 探偵の捜査ファイル
import { el, toast, normalize, pick, randInt, todayStr } from './src/util.js';
import { CATEGORIES, catByKey, curatedOf, generateOf, speedNext } from './src/puzzles/index.js';
import { TECHNIQUES, techById } from './src/techniques.js';
import {
  getState, isSolved, markSolved, recordSolveGenerated, recordSpeed, markTechRead,
  isBriefed, markBriefed, rankInfo, resetAll, isDailyDone, markDailyDone,
} from './src/store.js';

// ── 実績バッジ（記録から算出）──
const dayIndex = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
const BADGES = [
  { id: 'b_first', icon: '🔰', name: '初動捜査', desc: '初めて事件を解決', on: (s) => s.solvedCount >= 1 },
  { id: 'b_daily', icon: '📅', name: '初出勤', desc: '本日の事件を初クリア', on: (s) => Object.keys(s.dailyDone).length >= 1 },
  { id: 'b_ten', icon: '🎖', name: '一人前', desc: '通算10件 解決', on: (s) => s.solvedCount >= 10 },
  { id: 'b_nohint', icon: '🕵️', name: '単独捜査官', desc: 'ノーヒントで10件', on: (s) => s.noHintCount >= 10 },
  { id: 'b_speed', icon: '⚡', name: '速読の達人', desc: '速読訓練で10件', on: (s) => s.speedBest >= 10 },
  { id: 'b_streak3', icon: '🔥', name: '三日連続', desc: '3日連続で捜査', on: (s) => s.streakDays >= 3 },
  { id: 'b_streak7', icon: '🏅', name: '皆勤の刑事', desc: '7日連続で捜査', on: (s) => s.streakDays >= 7 },
  { id: 'b_fifty', icon: '👑', name: 'ベテラン', desc: '通算50件 解決', on: (s) => s.solvedCount >= 50 },
  { id: 'b_hira', icon: '💡', name: 'ひらめき制覇', desc: 'ひらめき全問クリア', on: () => curatedOf('hirameki').every((p) => isSolved(p.id)) },
  { id: 'b_hundred', icon: '🗝️', name: '名探偵', desc: '通算100件 解決', on: (s) => s.solvedCount >= 100 },
];

const appEl = document.getElementById('app');
let speedTimer = null;
const MK = ['イ', 'ロ', 'ハ', 'ニ', 'ホ'];
const GENRE_MARK = { hirameki: '甲', cipher: '乙', deduction: '丙' };

function setScreen(node) {
  if (speedTimer) { clearInterval(speedTimer); speedTimer = null; }
  appEl.innerHTML = '';
  node.classList.add('fade');
  appEl.appendChild(node);
  window.scrollTo(0, 0);
}
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function shareResult(text) {
  const full = `${text}\n${location.origin}`;
  if (navigator.share) { navigator.share({ text: full }).catch(() => {}); }
  else if (navigator.clipboard) { navigator.clipboard.writeText(full).then(() => toast('結果をコピーしました'), () => toast('コピーできませんでした')); }
  else toast('共有に未対応の環境です');
}

function burst() {
  const colors = ['#b23a2c', '#2c4858', '#3a6b41', '#9a6a1e', '#241f18'];
  const wrap = el('div.burst');
  for (let i = 0; i < 24; i++) {
    const ang = (Math.PI * 2 * i) / 24 + Math.random() * 0.4;
    const dist = 110 + Math.random() * 150;
    wrap.appendChild(el('i', { style: { background: colors[i % colors.length], '--dx': `${Math.cos(ang) * dist}px`, '--dy': `${Math.sin(ang) * dist - 40}px` } }));
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1000);
}

/* ============================ BRIEFING（最初の心得）============================ */
function renderBriefing() {
  const head = el('div.hero', [
    el('div.filetab', '新人研修'),
    el('div.eyebrow', '〔 極秘 〕'),
    el('h1', '捜査の心得'),
    el('p', 'ようこそ、新米刑事。事件（謎）に挑む前に、まず"解き方の型"を頭に入れよう。型を知る者だけが、見た瞬間に手が動く。下の5項を読んでから捜査に出ろ。'),
    el('div.stamppos', [el('span.stamp', '訓 練 中')]),
  ]);
  const list = el('div.card.plist', { style: { marginTop: '14px' } }, TECHNIQUES.map((t, i) =>
    el('button.prow', { onclick: () => renderTech(t.id, { from: 'brief' }) }, [
      el('div.no', String(i + 1).padStart(2, '0')),
      el('div.col', { style: { flex: 1 } }, [el('div.t', t.title), el('div.d', t.one)]),
      el('div', { class: 'muted', style: { fontWeight: '800' } }, getState().techRead[t.id] ? '✓' : '›'),
    ])
  ));
  const go = el('button.btn', { style: { marginTop: '16px' }, onclick: () => { markBriefed(); renderHome(); } }, '事件に挑む  →');
  setScreen(el('div', [
    el('div.topbar', [el('div.brand', ['ナゾトキ', el('span.sub', 'DETECTIVE TRAINING')])]),
    head, list, go,
    el('div.linkrow', [el('button', { onclick: () => { markBriefed(); renderHome(); } }, 'あとで読む（捜査へ）')]),
    el('div.bottomgap'),
  ]));
}

/* ============================ HOME ============================ */
function renderHome() {
  const st = getState();
  const rk = rankInfo();
  const top = el('div.topbar', [
    el('div.brand', ['ナゾトキ', el('span.sub', 'NAZOTOKI CASE FILE')]),
    el('div.spacer'),
    st.streakDays > 0 ? el('div.chip', [`連続 ${st.streakDays}`]) : null,
  ]);

  const hero = el('div.hero', [
    el('div.filetab', '捜査記録'),
    el('div.eyebrow', '〔 機 密 〕'),
    el('h1', '謎を解き、頭を研ぎ澄ませ。'),
    el('p', 'ひらめき・暗号・推理。手がかりを組み立て、事件を解決するほど"思考の型"が体に染みつく。'),
    el('div.rankwrap', [
      el('div.ranktop', [el('div', [el('span.muted', '階級　'), el('span.now', rk.name)]), el('div.muted', rk.isMax ? '最高位' : `次の昇進まで ${rk.toNext}`)]),
      el('div.rankbar', [el('i', { style: { width: `${Math.round(rk.progress * 100)}%` } })]),
    ]),
    el('div.records', [
      el('div.r', [el('div.v', st.solvedCount), el('div.k', '解決')]),
      el('div.r', [el('div.v', st.noHintCount), el('div.k', '単独解決')]),
      el('div.r', [el('div.v', st.speedBest), el('div.k', '速読 最高')]),
    ]),
  ]);

  // テクニックを最初に
  const techCard = el('button.navcard.accent', { onclick: renderTechList }, [
    el('div.idx', '心'),
    el('div.col', { style: { flex: 1 } }, [
      el('div.t', '捜査の心得'),
      el('div.d', '暗号の崩し方・ひらめきの視点・推理の整理術。まず読むほど速くなる'),
    ]),
    el('div.arrow', '›'),
  ]);

  const doneToday = isDailyDone(todayStr());
  const dailyCard = el('button.navcard', { onclick: renderDaily }, [
    el('div.idx', '日'),
    el('div.col', { style: { flex: 1 } }, [
      el('div.t', ['今日の事件', doneToday ? el('span.stamp.green', { style: { marginLeft: '10px', fontSize: '11px' } }, '解 決') : null]),
      el('div.d', '全捜査員に同じ3件。毎日これだけで頭が回り出す（結果をシェアできる）'),
      st.streakDays > 0 ? el('div.prog', `🔥 ${st.streakDays}日連続`) : null,
    ]),
    el('div.arrow', '›'),
  ]);

  const cats = CATEGORIES.map((c) => {
    const cur = curatedOf(c.key);
    const solved = cur.filter((p) => isSolved(p.id)).length;
    const prog = c.generated ? '自動生成・無限' : `${solved} / ${cur.length} 解決`;
    return el('button.navcard', { onclick: () => renderCategory(c.key) }, [
      el('div.idx', GENRE_MARK[c.key]),
      el('div.col', { style: { flex: 1 } }, [el('div.t', c.name), el('div.d', c.desc), el('div.prog', prog)]),
      el('div.arrow', '›'),
    ]);
  });

  const speedCard = el('button.navcard', { onclick: renderSpeedIntro }, [
    el('div.idx', '速'),
    el('div.col', { style: { flex: 1 } }, [el('div.t', '速読訓練'), el('div.d', '60秒で何件落とせる？ 解く速さを鍛えるタイムアタック'), el('div.prog', `最高 ${st.speedBest} 件`)]),
    el('div.arrow', '›'),
  ]);
  const unlocked = BADGES.filter((b) => b.on(st)).length;
  const badgeCard = el('button.navcard', { onclick: renderBadges }, [
    el('div.idx', '章'),
    el('div.col', { style: { flex: 1 } }, [el('div.t', '勲章・実績'), el('div.d', '事件を解くほど勲章が増える。コレクションを埋めろ'), el('div.prog', `${unlocked} / ${BADGES.length} 獲得`)]),
    el('div.arrow', '›'),
  ]);

  const links = el('div.linkrow', [
    el('button', { onclick: () => { if (confirm('捜査記録をすべて消去しますか？')) { resetAll(); renderHome(); toast('記録を消去しました'); } } }, '記録をリセット'),
    el('button', { onclick: () => { location.href = './legacy_jigatama/index.html'; } }, '旧・地頭ジム'),
    el('span', { class: 'muted', style: { fontSize: '11px', letterSpacing: '1px' } }, '古典版 ‧ 0618e'),
  ]);

  setScreen(el('div', [
    top, hero,
    el('div.section-title', 'まず読む ─ 捜査の心得'),
    techCard,
    el('div.section-title', '本日の任務'),
    dailyCard,
    el('div.section-title', '事件ジャンル'),
    ...cats,
    el('div.section-title', '訓練・記録'),
    speedCard, badgeCard,
    links, el('div.bottomgap'),
  ]));
}

/* ============================ DAILY（本日の事件・全員共通）============================ */
function todayCases() {
  // 日付シードで「全捜査員が同じ3件」を決定的に選ぶ
  const idx = dayIndex();
  const hira = curatedOf('hirameki');
  const ded = curatedOf('deduction');
  return [
    hira[idx % hira.length],
    ded[idx % ded.length],
    hira[(idx * 7 + 3) % hira.length],
  ];
}
function renderDaily() {
  const cases = todayCases();
  const run = (i) => {
    if (i >= cases.length) {
      markDailyDone(todayStr());
      burst();
      setScreen(el('div', [
        el('div.topbar', [el('div.brand', '任務完了')]),
        el('div.hero', { style: { textAlign: 'center' } }, [el('div.eyebrow', '〔 本日分 終了 〕'), el('h1', '3件、捜査完了。'), el('p', { style: { margin: 0 } }, 'この調子で毎日。積み重ねが思考力になる。'), el('div.stamppos', [el('span.stamp.green', '完 了')])]),
        el('button.btn', { style: { marginTop: '16px' }, onclick: () => shareResult(`🗝️ナゾトキ｜本日の3件、捜査完了！\n階級：${rankInfo().name}・通算${getState().solvedCount}件解決`) }, '結果を共有する'),
        el('button.btn.ghost', { style: { marginTop: '10px' }, onclick: renderHome }, '本部へ戻る'),
        el('div.bottomgap'),
      ]));
      return;
    }
    renderPuzzle(cases[i], { next: () => run(i + 1), back: renderHome, backLabel: '本部', seq: `本日 ${i + 1}/${cases.length}` });
  };
  run(0);
}

/* ============================ CATEGORY ============================ */
function renderCategory(catKey) {
  const c = catByKey(catKey);
  const cur = curatedOf(catKey);
  const top = el('div.topbar', [
    el('button.iconbtn', { onclick: renderHome }, '‹'),
    el('div.brand', { style: { fontSize: '20px' } }, [GENRE_MARK[catKey] + '　' + c.name]),
  ]);
  const intro = el('div.card', [el('div.muted', { style: { fontSize: '13px', lineHeight: '1.7' } }, c.desc)]);
  const kids = [top, intro];
  if (c.generated) kids.push(el('button.btn', { style: { marginTop: '14px' }, onclick: () => genAndShow(catKey) }, '新しい事件を生成  →'));
  if (cur.length) {
    kids.push(el('div.section-title', c.generated ? '名作ファイル' : '事件ファイル'));
    kids.push(el('div.card.plist', cur.map((p, i) =>
      el('button.prow', { onclick: () => renderPuzzle(p, { next: () => nextCurated(catKey, p.id), back: () => renderCategory(catKey), backLabel: c.name }) }, [
        el('div.no', isSolved(p.id) ? el('span.check', '✓') : String(i + 1).padStart(2, '0')),
        el('div.col', { style: { flex: 1 } }, [el('div.t', p.title), el('div.diff', stars(p.level))]),
        el('div.arrow', { class: 'muted' }, '›'),
      ])
    )));
  }
  kids.push(el('div.bottomgap'));
  setScreen(el('div', kids));
}
function genAndShow(catKey) {
  const puz = generateOf(catKey, randInt(2, 5));
  renderPuzzle(puz, { next: () => genAndShow(catKey), back: () => renderCategory(catKey), backLabel: catByKey(catKey).name });
}
function nextCurated(catKey, currentId) {
  const rest = curatedOf(catKey).filter((p) => p.id !== currentId && !isSolved(p.id));
  if (rest.length) renderPuzzle(rest[0], { next: () => nextCurated(catKey, rest[0].id), back: () => renderCategory(catKey), backLabel: catByKey(catKey).name });
  else { toast('このジャンルは全て解決！'); renderCategory(catKey); }
}

/* ============================ PUZZLE ============================ */
function renderPuzzle(puz, opts) {
  const c = catByKey(puz.cat);
  let usedHint = false, hintsShown = 0, done = false;

  const top = el('div.topbar', [
    el('button.iconbtn', { onclick: opts.back }, '‹'),
    el('div.spacer'),
    opts.seq ? el('div.chip', opts.seq) : null,
    el('div.chip', { class: 'muted' }, opts.backLabel || '戻る'),
  ]);
  const meta = el('div.puzmeta', [
    el('span', { class: `pill ${puz.cat}` }, c.name),
    el('span.diff', stars(puz.level)),
    puz.title ? el('span.muted', { style: { fontSize: '12px' } }, '〔' + puz.title + '〕') : null,
  ]);
  const question = el('div.question', { html: puz.q });
  const area = el('div');
  const fbArea = el('div');

  const hintBox = el('div');
  const hintBtn = (puz.hints && puz.hints.length) ? el('button.hintbtn', { onclick: () => {
    if (hintsShown >= puz.hints.length) { toast('手がかりは出尽くした'); return; }
    usedHint = true;
    hintBox.appendChild(el('div.hint', { html: `<b>手がかり ${hintsShown + 1}：</b>${puz.hints[hintsShown]}` }));
    hintsShown += 1;
    if (hintsShown >= puz.hints.length) hintBtn.textContent = '手がかりは出尽くした';
  } }, `🔎 手がかりを請求（全${puz.hints.length}件）`) : null;
  const hintWrap = el('div.hintwrap', [hintBtn, hintBox]);

  function finishSolved(self) {
    if (done) return; done = true;
    const noHint = !usedHint && !self;
    const before = rankInfo().index;
    if (puz.generated) recordSolveGenerated(noHint); else markSolved(puz.id, !noHint);
    const after = rankInfo();
    burst();
    if (after.index > before) setTimeout(() => toast(`昇進 ─ ${after.name}`), 600);
    showFeedback(true, self);
  }
  function showFeedback(ok, self) {
    area.style.opacity = '.55'; area.style.pointerEvents = 'none';
    const title = ok ? (self ? '記録：閲覧' : (usedHint ? '解決' : '単独解決')) : '未解決';
    const fb = el('div', { class: `feedback ${ok && !self ? 'ok' : 'ng'}` }, [
      el('div.ft', [title, ok && !self ? el('span.stamp.green', { style: { marginLeft: '10px' } }, '解 決') : null]),
      puz.explain ? el('div.fe', { html: puz.explain }) : null,
    ]);
    const last = !opts.next;
    fbArea.innerHTML = '';
    fbArea.append(fb,
      el('button.btn', { style: { marginTop: '14px' }, onclick: () => opts.next ? opts.next() : opts.back() }, opts.next ? '次の事件  →' : '戻る'),
      el('button.btn.ghost', { style: { marginTop: '10px' }, onclick: opts.back }, `${opts.backLabel || '戻る'}へ`));
    fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function revealAnswer() {
    if (done) return; done = true;
    if (!puz.generated) markSolved(puz.id, true);
    showFeedback(true, true);
  }

  if (puz.type === 'choice') {
    const box = el('div.choices');
    puz.choices.forEach((ch, idx) => {
      box.appendChild(el('button.choice', { onclick: () => {
        if (done) return;
        [...box.children].forEach((b, i) => {
          if (i === puz.answerIndex) b.classList.add('correct');
          else if (i === idx) b.classList.add('wrong');
          else b.classList.add('dim');
        });
        if (idx === puz.answerIndex) finishSolved(false);
        else { done = true; showFeedback(false, false); }
      } }, [el('span.mk', MK[idx]), el('span', ch)]));
    });
    area.appendChild(box);
  } else if (puz.type === 'input') {
    const allDigits = puz.answers.every((a) => /^[0-9]+$/.test(a));
    const inp = el('input.txtin', { type: 'text', inputmode: allDigits ? 'numeric' : 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '解答を記入' });
    const check = () => {
      if (done) return;
      const v = inp.value; if (!v.trim()) return;
      if (puz.answers.some((a) => normalize(a) === normalize(v))) finishSolved(false);
      else { toast('違う ─ 再考せよ'); inp.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 170 }); }
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    area.append(
      el('div.inrow', [inp, el('button.btn', { style: { width: 'auto', padding: '13px 20px' }, onclick: check }, '照合')]),
      el('button.btn.line', { style: { marginTop: '12px' }, onclick: revealAnswer }, '解答を確認する'),
    );
  } else { // reveal
    area.append(el('button.btn.ink', { class: 'revealbtn', onclick: () => {
      area.querySelector('.revealbtn')?.remove();
      area.append(
        el('div.card', { style: { borderLeft: '3px solid var(--navy)' } }, [el('div.fe', { class: 'muted', style: { lineHeight: '1.85', fontSize: '14px' }, html: puz.explain })]),
        el('div', { style: { marginTop: '14px' } }, [
          el('div.muted', { style: { textAlign: 'center', marginBottom: '10px', fontSize: '12.5px', letterSpacing: '1px' } }, '自力で解けていたか？'),
          el('div.inrow', [el('button.btn', { onclick: () => finishSolved(false) }, '解けていた'), el('button.btn.ghost', { onclick: () => finishSolved(true) }, '見ただけ')]),
        ]),
      );
    } }, '📂 解答・解説を開く'));
  }

  setScreen(el('div.puz', [top, meta, question, area, hintWrap, fbArea, el('div.bottomgap')]));
}

/* ============================ SPEED ============================ */
function renderSpeedIntro() {
  const st = getState();
  const top = el('div.topbar', [el('button.iconbtn', { onclick: renderHome }, '‹'), el('div.brand', { style: { fontSize: '20px' } }, '速　速読訓練')]);
  const hero = el('div.hero', [
    el('div.filetab', '訓練'),
    el('div.eyebrow', 'TIME ATTACK'),
    el('h1', '60秒。何件落とせる？'),
    el('p', '暗号と暗証番号が次々に。英字・数字で答えるから手が止まらない。"速く解く"感覚を体に刻む訓練。'),
    el('div.records', [el('div.r', [el('div.v', st.speedBest), el('div.k', '自己ベスト')]), el('div.r', [el('div.v', st.speedPlays), el('div.k', '訓練回数')])]),
    el('button.btn', { style: { marginTop: '16px' }, onclick: renderSpeedRun }, '開始  →'),
  ]);
  setScreen(el('div', [top, hero, el('div.bottomgap')]));
}
function renderSpeedRun() {
  const DURATION = 60000;
  const endTs = Date.now() + DURATION;
  let score = 0;
  const scoreEl = el('div.scorebig', '0');
  const timerFill = el('i', { style: { width: '100%' } });
  const area = el('div');
  const top = el('div.topbar', [el('button.iconbtn', { onclick: () => { if (confirm('訓練を中止する？')) renderHome(); } }, '✕'), el('div.spacer'), el('div.chip', '速読訓練')]);
  const head = el('div', { style: { textAlign: 'center', margin: '4px 0 8px' } }, [scoreEl, el('div.muted', { style: { fontSize: '11px', letterSpacing: '2px' } }, '解決件数')]);

  function load() {
    const level = Math.min(6, 2 + Math.floor(score / 4));
    const puz = speedNext(level);
    area.innerHTML = '';
    const allDigits = puz.answers.every((a) => /^[0-9]+$/.test(a));
    const inp = el('input.txtin', { type: 'text', inputmode: allDigits ? 'numeric' : 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '解答' });
    const submit = () => {
      const v = inp.value; if (!v.trim()) return;
      if (puz.answers.some((a) => normalize(a) === normalize(v))) {
        score += 1; scoreEl.textContent = score; scoreEl.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 200 });
        load();
      } else { inp.value = ''; inp.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 150 }); }
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    area.append(el('div.question', { style: { fontSize: '18px' }, html: puz.q }), el('div.inrow', [inp, el('button.btn', { style: { width: 'auto', padding: '13px 18px' }, onclick: submit }, '照合')]), el('button.btn.line', { style: { marginTop: '10px' }, onclick: load }, '次へ（パス）'));
    inp.focus();
  }
  speedTimer = setInterval(() => {
    const left = endTs - Date.now();
    timerFill.style.width = `${Math.max(0, left / DURATION * 100)}%`;
    if (left <= 0) { clearInterval(speedTimer); speedTimer = null; renderSpeedResult(score); }
  }, 100);
  setScreen(el('div.puz', [top, head, el('div.timer', [timerFill]), area]));
  load();
}
function renderSpeedResult(score) {
  const isBest = recordSpeed(score);
  const hero = el('div.hero', { style: { textAlign: 'center' } }, [
    el('div.filetab', '結果'),
    el('div.eyebrow', isBest ? '〔 自己記録 更新 〕' : '〔 訓練終了 〕'),
    el('div.scorebig', { style: { margin: '10px 0' } }, score),
    el('p', { style: { margin: 0 } }, score >= 12 ? '爆速。捜査脳になってきた。' : score >= 7 ? '良い手際。心得を読めばさらに伸びる。' : 'まず「捜査の心得」で型を覚えよう。'),
    isBest ? el('div.stamppos', [el('span.stamp', '新記録')]) : null,
  ]);
  if (isBest) burst();
  setScreen(el('div', [
    el('div.topbar', [el('div.brand', { style: { fontSize: '20px' } }, '速読訓練 ─ 結果')]),
    hero,
    el('button.btn', { style: { marginTop: '16px' }, onclick: renderSpeedRun }, 'もう一度'),
    el('button.btn.ghost', { style: { marginTop: '10px' }, onclick: () => shareResult(`🗝️ナゾトキ 速読訓練：${score}件解決！${isBest ? ' 自己ベスト更新🎖' : ''}\n君は何件落とせる？`) }, '結果を共有する'),
    el('button.btn.ghost', { style: { marginTop: '10px' }, onclick: renderTechList }, '捜査の心得を読む'),
    el('button.btn.line', { style: { marginTop: '10px' }, onclick: renderHome }, '本部へ戻る'),
    el('div.bottomgap'),
  ]));
}

/* ============================ TECHNIQUES ============================ */
function renderTechList() {
  const top = el('div.topbar', [el('button.iconbtn', { onclick: renderHome }, '‹'), el('div.brand', { style: { fontSize: '20px' } }, '心　捜査の心得')]);
  const intro = el('div.card', [el('div.muted', { style: { fontSize: '13px', lineHeight: '1.7' } }, '謎解きは才能でなく「型」。崩し方を知るほど、見た瞬間に手が動く。気になる項を読み、最後に事件で試せ。')]);
  const list = el('div.card.plist', { style: { marginTop: '12px' } }, TECHNIQUES.map((t, i) =>
    el('button.prow', { onclick: () => renderTech(t.id) }, [
      el('div.no', String(i + 1).padStart(2, '0')),
      el('div.col', { style: { flex: 1 } }, [el('div.t', t.title), el('div.d', t.one)]),
      el('div', { class: 'muted', style: { fontWeight: '800' } }, getState().techRead[t.id] ? '✓' : '›'),
    ])
  ));
  setScreen(el('div', [top, intro, list, el('div.bottomgap')]));
}
function renderTech(id, opt) {
  markTechRead(id);
  const t = techById(id);
  const idx = TECHNIQUES.findIndex((x) => x.id === id);
  const nx = TECHNIQUES[idx + 1];
  const backTo = opt && opt.from === 'brief' ? renderBriefing : renderTechList;
  const top = el('div.topbar', [el('button.iconbtn', { onclick: backTo }, '‹'), el('div.chip', { class: 'muted' }, t.tag)]);
  const head = el('div.hero', [el('div.eyebrow', `心得 其ノ ${idx + 1}`), el('div.techhead', t.title), el('p', { style: { margin: '8px 0 0' } }, t.one)]);
  const body = el('div.card', { style: { marginTop: '14px' } }, [
    el('div.tblock', [el('div.lbl', '── コツ ──'), el('ul', t.points.map((p) => el('li', p)))]),
    el('div.tblock', [el('div.lbl', '── 使う例 ──'), el('div.exbox', t.example)]),
  ]);
  const genre = t.tag === '暗号' ? 'cipher' : t.tag === '推理' ? 'deduction' : 'hirameki';
  setScreen(el('div', [
    top, head, body,
    el('button.btn', { style: { marginTop: '16px' }, onclick: () => renderCategory(genre) }, 'この型で事件に挑む  →'),
    nx ? el('button.btn.ghost', { style: { marginTop: '10px' }, onclick: () => renderTech(nx.id, opt) }, `次の心得：${nx.title}`) : null,
    el('div.bottomgap'),
  ]));
}

/* ============================ BADGES（勲章・実績）============================ */
function renderBadges() {
  const st = getState();
  const got = BADGES.filter((b) => b.on(st)).length;
  const top = el('div.topbar', [el('button.iconbtn', { onclick: renderHome }, '‹'), el('div.brand', { style: { fontSize: '20px' } }, '章　勲章・実績')]);
  const intro = el('div.card', [el('div.muted', { style: { fontSize: '13px', lineHeight: '1.7' } }, `獲得 ${got} / ${BADGES.length}。事件を解くほど勲章が増える。空欄を全部埋めろ。`)]);
  const grid = el('div.card.plist', { style: { marginTop: '12px' } }, BADGES.map((b) => {
    const on = b.on(st);
    return el('div.prow', { style: { opacity: on ? '1' : '.5' } }, [
      el('div', { style: { fontSize: '26px', width: '42px', textAlign: 'center', filter: on ? 'none' : 'grayscale(1)' } }, b.icon),
      el('div.col', { style: { flex: 1 } }, [el('div.t', b.name), el('div.d', b.desc)]),
      el('div', { class: on ? 'check' : 'muted', style: { fontWeight: '800', fontSize: on ? '18px' : '14px' } }, on ? '✓' : '🔒'),
    ]);
  }));
  setScreen(el('div', [top, intro, grid, el('div.bottomgap')]));
}

/* ============================ boot ============================ */
// 旧Service Workerが残っていたら確実に解除（古いUIキャッシュ対策）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
}
if (isBriefed()) renderHome(); else renderBriefing();
