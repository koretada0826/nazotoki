// 論理・推理（謎解き）ドリル
import { randInt, pick, shuffle, sample, clamp } from '../util.js';

const P = 'logic';
const NAMES = ['A', 'B', 'C', 'D', 'E'];

// ---------- 数列推理 ----------
function makeChoices(ans, spread) {
  const set = new Set([ans]);
  const steps = shuffle([spread, -spread, spread * 2, -spread * 2, Math.round(spread / 2) + 1]);
  let i = 0;
  while (set.size < 4 && i < steps.length) {
    set.add(ans + steps[i]); i++;
  }
  let k = 1;
  while (set.size < 4) { set.add(ans + spread * 3 + k); k++; }
  const choices = shuffle([...set]);
  return { choices, answerIndex: choices.indexOf(ans) };
}

function genSequence(level) {
  const pools = [];
  if (level <= 2) pools.push('arith', 'arith');
  if (level >= 2) pools.push('geo');
  if (level >= 3) pools.push('arith2');
  if (level >= 4) pools.push('quad');
  if (level >= 5) pools.push('interleave');
  if (level >= 6) pools.push('fib');
  if (level >= 8) pools.push('recur');
  const rule = pick(pools.length ? pools : ['arith']);

  let terms = [];
  let spread = 3;
  let hint = '';

  if (rule === 'arith') {
    const d = pick([2, 3, 4, 5, 6, -3, -4]);
    let a = randInt(1, 9);
    for (let i = 0; i < 6; i++) { terms.push(a); a += d; }
    spread = Math.abs(d); hint = '一定の数ずつ増減';
  } else if (rule === 'arith2') {
    const d = pick([7, 8, 9, 11, 12, -7, -9]);
    let a = randInt(2, 15);
    for (let i = 0; i < 6; i++) { terms.push(a); a += d; }
    spread = Math.max(2, Math.abs(d) - 3); hint = '一定の数ずつ';
  } else if (rule === 'geo') {
    const r = pick([2, 2, 3]);
    let a = randInt(1, 4);
    for (let i = 0; i < 6; i++) { terms.push(a); a *= r; }
    spread = Math.max(2, Math.round(terms[5] * 0.18)); hint = '何倍かずつ';
  } else if (rule === 'quad') {
    let a = randInt(1, 8), f = randInt(1, 4); const dd = pick([1, 2, 3]);
    for (let i = 0; i < 6; i++) { terms.push(a); a += f; f += dd; }
    spread = Math.max(2, dd + 2); hint = '増え方が一定ずつ増える';
  } else if (rule === 'interleave') {
    const d1 = pick([2, 3, 4, 5]), d2 = pick([3, 4, 6, 7]);
    let x = randInt(1, 6), y = randInt(2, 9);
    for (let i = 0; i < 6; i++) {
      if (i % 2 === 0) { terms.push(x); x += d1; } else { terms.push(y); y += d2; }
    }
    spread = Math.max(2, Math.round((d1 + d2) / 2)); hint = '2つの数列が交互';
  } else if (rule === 'fib') {
    let a = randInt(1, 4), b = randInt(2, 6);
    for (let i = 0; i < 6; i++) { terms.push(a); const n = a + b; a = b; b = n; }
    spread = Math.max(2, Math.round(terms[5] * 0.12)); hint = '前の2つの和';
  } else { // recur a_n = a_{n-1}*k + c
    const k = pick([2, 3]), c = pick([1, 2, 3, -1]);
    let a = randInt(1, 4);
    for (let i = 0; i < 6; i++) { terms.push(a); a = a * k + c; }
    spread = Math.max(2, Math.round(Math.abs(terms[5]) * 0.15)); hint = '◯倍して足す';
  }

  const ans = terms[5];
  const shown = terms.slice(0, 5);
  const { choices, answerIndex } = makeChoices(ans, Math.max(2, spread));
  return {
    type: 'choice', pillar: P,
    prompt: `次に来る数は？<small>${shown.join('　,　')}　,　?</small>`,
    choices: choices.map(String), answerIndex,
    explanation: `規則は「${hint}」。答えは ${ans}。`,
    expectedMs: 9000,
  };
}

// ---------- うそつき問題 ----------
function genLiar(level) {
  const n = level <= 3 ? 2 : 3;
  const people = NAMES.slice(0, n);
  for (let attempt = 0; attempt < 200; attempt++) {
    const stmts = people.map((s) => makeStatement(s, people));
    // 全 2^n 割り当てを検証
    const valid = [];
    for (let mask = 0; mask < (1 << n); mask++) {
      const honest = {};
      people.forEach((p, i) => { honest[p] = !!(mask & (1 << i)); });
      const ok = stmts.every((st) => honest[st.speaker] === st.eval(honest));
      if (ok) valid.push(honest);
    }
    if (valid.length !== 1) continue;
    const sol = valid[0];
    const liars = people.filter((p) => !sol[p]);
    if (liars.length !== 1) continue; // うそつきはちょうど1人
    const liar = liars[0];
    const text = stmts.map((st) => `${st.speaker}「${st.text}」`).join('<br>');
    const choices = shuffle(people.slice());
    return {
      type: 'choice', pillar: P,
      prompt: `正直者はいつも本当を、うそつきはいつもウソを言う。<small>${text}</small><small>うそつきは誰？</small>`,
      choices, answerIndex: choices.indexOf(liar),
      explanation: `矛盾なく成り立つのは ${people.map((p) => `${p}=${sol[p] ? '正直' : 'ウソ'}`).join('、')} の1通り。うそつきは ${liar}。`,
      expectedMs: 16000,
    };
  }
  return genSequence(level); // 生成失敗時のフォールバック
}

function makeStatement(speaker, people) {
  const others = people.filter((p) => p !== speaker);
  const t = pick(['isLiar', 'isHonest', 'same', 'diff', 'atLeastOne']);
  if (t === 'isLiar') {
    const x = pick(others);
    return { speaker, text: `${x}はうそつきだ`, eval: (h) => !h[x] };
  }
  if (t === 'isHonest') {
    const x = pick(others);
    return { speaker, text: `${x}は正直者だ`, eval: (h) => h[x] };
  }
  if (t === 'same') {
    const x = pick(others);
    return { speaker, text: `私と${x}は同じタイプだ`, eval: (h) => h[speaker] === h[x] };
  }
  if (t === 'diff') {
    const x = pick(others);
    return { speaker, text: `私と${x}は違うタイプだ`, eval: (h) => h[speaker] !== h[x] };
  }
  return { speaker, text: `この中に少なくとも1人はうそつきがいる`, eval: (h) => people.some((p) => !h[p]) };
}

// ---------- 順序推理 ----------
function genOrder(level) {
  const n = clamp(2 + Math.floor(level / 2), 3, 5);
  const people = sample(NAMES, n);
  const order = shuffle(people.slice()); // index0 = 1番(高/速い 等)
  const attr = pick([
    { noun: '背', hi: '高い', lo: '低い' },
    { noun: '足', hi: '速い', lo: '遅い' },
    { noun: '点数', hi: '高い', lo: '低い' },
    { noun: '年齢', hi: '上', lo: '下' },
  ]);
  const clues = [];
  for (let i = 0; i < order.length - 1; i++) {
    const hi = order[i], lo = order[i + 1];
    if (Math.random() < 0.5) clues.push(`${hi}は${lo}より${attr.noun}が${attr.hi}`);
    else clues.push(`${lo}は${hi}より${attr.noun}が${attr.lo}`);
  }
  if (level >= 5 && order.length >= 4) {
    clues.push(`${order[0]}は${order[order.length - 1]}より${attr.noun}が${attr.hi}`);
  }
  const rank = randInt(1, n);
  const ansPerson = order[rank - 1];
  const choices = shuffle(people.slice());
  const cluesHtml = shuffle(clues).map((c) => `・${c}`).join('<br>');
  return {
    type: 'choice', pillar: P,
    prompt: `${attr.noun}の${attr.hi}順を考えよう。<small>${cluesHtml}</small><small>${attr.noun}が${rank}番目に${attr.hi}のは？</small>`,
    choices, answerIndex: choices.indexOf(ansPerson),
    explanation: `${attr.hi}順は ${order.join(' > ')}。${rank}番目は ${ansPerson}。`,
    expectedMs: 18000,
  };
}

// ---------- 魔方陣 ----------
function gridHtml(g, hr, hc) {
  let s = '<table style="margin:10px auto;border-spacing:6px">';
  for (let r = 0; r < 3; r++) {
    s += '<tr>';
    for (let c = 0; c < 3; c++) {
      const hl = r === hr && c === hc;
      const v = hl ? '?' : g[r][c];
      s += `<td style="width:56px;height:56px;text-align:center;font-size:24px;font-weight:800;border-radius:12px;background:${hl ? 'rgba(91,140,255,.22)' : 'var(--card2)'};color:${hl ? 'var(--accent)' : 'var(--txt)'};border:1px solid var(--line)">${v}</td>`;
    }
    s += '</tr>';
  }
  return s + '</table>';
}

function genMagic(level) {
  const BASE = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];
  let g = BASE.map((r) => r.slice());
  const rot = (m) => m.map((_, i) => m.map((row) => row[i]).reverse());
  const times = randInt(0, 3);
  for (let i = 0; i < times; i++) g = rot(g);
  if (Math.random() < 0.5) g = g.map((r) => r.slice().reverse());
  const m = pick([1, 1, 2, 3]);
  const k = randInt(0, 5);
  g = g.map((r) => r.map((v) => v * m + k));
  const hr = randInt(0, 2), hc = randInt(0, 2);
  const ans = g[hr][hc];
  const M = g[1][0] + g[1][1] + g[1][2];
  const { choices, answerIndex } = makeChoices(ans, Math.max(2, m * 2));
  return {
    type: 'choice', pillar: P,
    prompt: `タテ・ヨコ・ナナメ どの3マスを足しても同じ数になる「魔方陣」。？に入る数は？${gridHtml(g, hr, hc)}`,
    choices: choices.map(String), answerIndex,
    explanation: `どの列の合計も ${M}。？を含む列の残りから逆算すると ${ans}。`,
    expectedMs: 15000,
  };
}

// ---------- 関数マシン（ルール解読）----------
function genFunction(level) {
  let fn, rule, spread;
  if (level >= 7 && Math.random() < 0.4) {
    const c = randInt(-3, 5);
    fn = (x) => x * x + c; rule = `2乗して ${c >= 0 ? '+' + c : c}`; spread = 4;
  } else {
    const a = pick([2, 3, 4, 5, 2, 3]); const b = randInt(-3, 6);
    fn = (x) => a * x + b; rule = `×${a} ${b >= 0 ? '+' + b : b}`; spread = Math.max(2, a);
  }
  const xs = [];
  while (xs.length < 3) { const x = randInt(1, 9); if (!xs.includes(x)) xs.push(x); }
  const lines = xs.map((x) => `${x} → ${fn(x)}`);
  let xq; do { xq = randInt(2, 12); } while (xs.includes(xq));
  const ans = fn(xq);
  const { choices, answerIndex } = makeChoices(ans, spread);
  return {
    type: 'choice', pillar: P,
    prompt: `ある機械は、入れた数を決まったルールで変える。ルールを見破って？を答えよう。<small>${lines.join('<br>')}<br><b>${xq} → ？</b></small>`,
    choices: choices.map(String), answerIndex,
    explanation: `ルールは「${rule}」。だから ${xq} → ${ans}。`,
    expectedMs: 13000,
  };
}

// ---------- 対応推理（マッチング）----------
const THEMES = [
  { noun: '果物', like: '好きな果物', items: ['りんご', 'ぶどう', 'みかん', 'もも'] },
  { noun: '飲み物', like: '頼んだ飲み物', items: ['コーヒー', '紅茶', 'ジュース', '水'] },
  { noun: 'ペット', like: '飼っているペット', items: ['犬', '猫', 'うさぎ', '小鳥'] },
  { noun: 'スポーツ', like: '得意なスポーツ', items: ['野球', 'サッカー', 'テニス', '水泳'] },
  { noun: '色', like: '好きな色', items: ['赤', '青', '緑', '黄'] },
];

function permute(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((v, i) => {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    permute(rest).forEach((p) => out.push([v, ...p]));
  });
  return out;
}
function countConsistent(people, items, clues) {
  let cnt = 0;
  for (const pm of permute(items)) {
    const a = {};
    people.forEach((p, i) => { a[p] = pm[i]; });
    if (clues.every((cl) => a[cl.p] !== cl.it)) cnt++;
  }
  return cnt;
}

function genMatch(level) {
  const n = level <= 5 ? 3 : 4;
  const people = NAMES.slice(0, n);
  const theme = pick(THEMES);
  const items = sample(theme.items, n);
  const perm = shuffle(items.slice());
  const truth = {};
  people.forEach((p, i) => { truth[p] = perm[i]; });

  let cand = [];
  people.forEach((p) => items.forEach((it) => { if (truth[p] !== it) cand.push({ p, it }); }));
  cand = shuffle(cand);
  const clues = [];
  for (const c of cand) {
    clues.push(c);
    if (countConsistent(people, items, clues) === 1) break;
  }
  const q = pick(people);
  const ans = truth[q];
  const clueLines = clues.map((cl) => `・${cl.p}の${theme.like}は「${cl.it}」ではない`).join('<br>');
  const choices = shuffle(items.slice());
  return {
    type: 'choice', pillar: P,
    prompt: `${people.join('・')}の${theme.like}を当てよう（全員ちがう${theme.noun}）。<small>${clueLines}</small><small><b>${q}の${theme.like}は？</b></small>`,
    choices, answerIndex: choices.indexOf(ans),
    explanation: `消去法で絞ると ${people.map((p) => `${p}=${truth[p]}`).join('、')}。${q}は ${ans}。`,
    expectedMs: 24000,
  };
}

export const logicDrills = [
  { id: 'logic.sequence', pillar: P, title: '数列推理', icon: '🔭', blurb: '規則を見抜いて次の数を当てる', generate: genSequence },
  { id: 'logic.function', pillar: P, title: '関数マシン', icon: '⚙️', blurb: '入力→出力のルールを解読する', generate: genFunction },
  { id: 'logic.liar', pillar: P, title: 'うそつき推理', icon: '🕵️', blurb: '誰がウソをついているか論理で特定', generate: genLiar },
  { id: 'logic.order', pillar: P, title: '順序推理', icon: '📊', blurb: '手がかりから並び順を組み立てる', generate: genOrder },
  { id: 'logic.match', pillar: P, title: '対応推理', icon: '🔗', blurb: 'ヒントから誰が何かを特定する謎解き', generate: genMatch },
  { id: 'logic.magic', pillar: P, title: '魔方陣', icon: '🔯', blurb: 'タテヨコナナメ同じ和を完成させる', generate: genMagic },
];
