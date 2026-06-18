// 計算・数的処理ドリル
import { randInt, pick, shuffle, clamp } from '../util.js';

const P = 'calc';

// ---------- 暗算 ----------
function genMental(level) {
  const L = clamp(level, 1, 12);
  let prompt, answer;
  const kind = (() => {
    if (L <= 2) return pick(['add', 'sub']);
    if (L <= 4) return pick(['add', 'sub', 'mul1']);
    if (L <= 6) return pick(['add3', 'sub', 'mul1', 'mul2']);
    if (L <= 8) return pick(['add3', 'mul2', 'mix']);
    return pick(['mul2', 'mulbig', 'mix']);
  })();

  if (kind === 'add') { const a = randInt(5, 30 + L * 6), b = randInt(5, 30 + L * 6); answer = a + b; prompt = `${a} + ${b}`; }
  else if (kind === 'sub') { let a = randInt(20, 40 + L * 8), b = randInt(5, a - 1); answer = a - b; prompt = `${a} − ${b}`; }
  else if (kind === 'add3') { const a = randInt(15, 60 + L * 8), b = randInt(15, 60 + L * 8), c = randInt(15, 60 + L * 6); answer = a + b + c; prompt = `${a} + ${b} + ${c}`; }
  else if (kind === 'mul1') { const a = randInt(3, 9), b = randInt(3, 19); answer = a * b; prompt = `${a} × ${b}`; }
  else if (kind === 'mul2') { const a = randInt(11, 19 + L), b = randInt(3, 9 + Math.floor(L / 2)); answer = a * b; prompt = `${a} × ${b}`; }
  else if (kind === 'mulbig') { const a = randInt(12, 30 + L * 2), b = randInt(11, 25 + L); answer = a * b; prompt = `${a} × ${b}`; }
  else { // mix: a×b + c
    const a = randInt(4, 12 + L), b = randInt(3, 9), c = randInt(10, 40 + L * 4);
    answer = a * b + c; prompt = `${a} × ${b} + ${c}`;
  }
  return {
    type: 'number', pillar: P,
    prompt: `<span class="big">${prompt}</span>`,
    answer,
    explanation: `答えは ${answer}。`,
    expectedMs: 7000 + L * 600,
  };
}

// ---------- 概算（フェルミ的） ----------
function genEstimate(level) {
  const L = clamp(level, 1, 12);
  const a = randInt(120 + L * 30, 400 + L * 120);
  const b = randInt(180 + L * 20, 500 + L * 100);
  const c = randInt(90 + L * 10, 300 + L * 80);
  const exact = a + b + c;
  // 概算で選べるよう、選択肢は ±8〜18% 離す
  const gap = Math.round(exact * (0.08 + L * 0.004));
  const offs = shuffle([0, gap, -gap, gap * 2]);
  const choices = offs.map((o) => exact + o);
  const ci = choices.indexOf(exact);
  return {
    type: 'choice', pillar: P,
    prompt: `だいたいの合計は？（暗算でざっくり）<small>${a} + ${b} + ${c}</small>`,
    choices: shuffle(choices).map((v) => v.toLocaleString()),
    answerIndex: 0, // 下で振り直す
    _exact: exact,
    explanation: `正確には ${exact.toLocaleString()}。各項を百の位で丸めて足すと近い値が選べる。`,
    expectedMs: 8000,
  };
}
// 概算は answerIndex を文字列一致で解決するため後処理
function fixEstimate(round) {
  const target = round._exact.toLocaleString();
  round.answerIndex = round.choices.indexOf(target);
  return round;
}

// ---------- 数的処理（割合・損益）----------
function genRatio(level) {
  const L = clamp(level, 1, 12);
  const kind = L <= 4 ? pick(['pct', 'discount']) : pick(['pct', 'discount', 'profit', 'pctof']);
  let prompt, answer, exp;
  if (kind === 'pct') {
    const base = randInt(4, 20) * 100;
    const p = pick([10, 20, 25, 30, 40, 5, 15]);
    answer = Math.round(base * p / 100);
    prompt = `${base.toLocaleString()}円の${p}%は？`;
    exp = `${base}×${p}/100 = ${answer}円。`;
  } else if (kind === 'discount') {
    const base = randInt(8, 40) * 100;
    const p = pick([10, 20, 25, 30, 15]);
    answer = Math.round(base * (100 - p) / 100);
    prompt = `${base.toLocaleString()}円の${p}%引きは？`;
    exp = `${base}×${(100 - p)}/100 = ${answer}円。`;
  } else if (kind === 'pctof') {
    const part = randInt(2, 9) * 10;
    const whole = part * pick([2, 4, 5]);
    answer = Math.round(part / whole * 100);
    prompt = `${whole}人のうち${part}人は何%？`;
    exp = `${part}/${whole} = ${answer}%。`;
  } else { // profit: 原価に利益乗せてから値引き
    const cost = randInt(5, 20) * 100;
    const up = pick([20, 30, 40, 50]);
    const off = pick([10, 20]);
    const price = cost * (100 + up) / 100;
    answer = Math.round(price * (100 - off) / 100);
    prompt = `原価${cost.toLocaleString()}円に${up}%の利益を乗せ、そこから${off}%引き。売値は？`;
    exp = `${cost}×${(100 + up)}% = ${price}、×${(100 - off)}% = ${answer}円。`;
  }
  return {
    type: 'number', pillar: P,
    prompt: `<span style="font-size:22px">${prompt}</span>`,
    answer, explanation: exp,
    expectedMs: 11000,
  };
}

export const calcDrills = [
  { id: 'calc.mental', pillar: P, title: '暗算スピード', icon: '⚡', blurb: '四則演算を速く正確に', generate: genMental },
  { id: 'calc.estimate', pillar: P, title: '概算力', icon: '🎯', blurb: 'ざっくり見積もる桁感覚', generate: (l) => fixEstimate(genEstimate(l)) },
  { id: 'calc.ratio', pillar: P, title: '割合・損益', icon: '💹', blurb: '%・損益・比率の数的処理', generate: genRatio },
];
