// 暗号解読（自動生成で無限に出題）
import { randInt, pick, shuffle, clamp } from '../util.js';

const GOJUON = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');
const JP_WORDS = ['さくら', 'ねこ', 'うみ', 'やま', 'つき', 'ほし', 'とり', 'はな', 'あめ', 'ゆき', 'かわ', 'もり', 'すいか', 'みかん', 'さかな', 'からす', 'つくえ', 'たいやき', 'ひこうき', 'にわとり', 'くるま', 'こおり'];
const JP_REV = [...JP_WORDS, 'りんご', 'でんしゃ', 'たまご', 'ともだち', 'なぞなぞ', 'かばん', 'えんぴつ'];
const EN_WORDS = [
  ['CAT', 'ねこ'], ['DOG', 'いぬ'], ['SUN', 'たいよう'], ['STAR', 'ほし'], ['MOON', 'つき'],
  ['KING', '王さま'], ['GOLD', '金'], ['FIRE', '火'], ['BIRD', '鳥'], ['HERO', '英雄'], ['BLUE', '青'], ['CAKE', 'ケーキ'],
];
const SYMBOLS = ['●', '▲', '■', '★', '◆', '♥', '☀', '☂', '♪', '✿', '⬡', '⚑'];

let counter = 0;
const uid = (p) => `cipher_${p}_${++counter}_${randInt(100, 999)}`;

function genReverse() {
  const w = pick(JP_REV);
  const enc = [...w].reverse().join('');
  return {
    generated: true, id: uid('rev'), cat: 'cipher', level: clamp(w.length - 1, 1, 4),
    title: '逆さ暗号',
    q: `次の文字を<b>逆から読む</b>と、ある言葉になります。何？<div class="cipher">${enc}</div>`,
    type: 'input', answers: [w],
    hints: ['後ろの文字から順に読んでみよう', `${w.length}文字の言葉だよ`],
    explain: `逆から読むと「${w}」。暗号はまず「並びを変えただけ」かを疑うのが基本。`,
  };
}

function genA1Z26() {
  const [w, mean] = pick(EN_WORDS);
  const nums = [...w].map((c) => c.charCodeAt(0) - 64).join('-');
  return {
    generated: true, id: uid('a1z'), cat: 'cipher', level: clamp(w.length - 1, 2, 4),
    title: '数字暗号（A=1）',
    q: `<b>A=1, B=2, C=3 … Z=26</b> のルール。次の数字が表す英単語は？<div class="cipher">${nums}</div>`,
    type: 'input', answers: [w, mean],
    hints: ['1ならA、2ならB…と1文字ずつ置きかえる', `意味は「${mean}」だよ`],
    explain: `${nums} → ${w}（${mean}）。数字暗号は「順番＝何文字目か」を疑う定番。`,
  };
}

function genCaesar() {
  const [w, mean] = pick(EN_WORDS);
  const k = randInt(1, 4);
  const sh = (s, d) => [...s].map((c) => String.fromCharCode((c.charCodeAt(0) - 65 + d + 26) % 26 + 65)).join('');
  const enc = sh(w, k);
  return {
    generated: true, id: uid('cae'), cat: 'cipher', level: clamp(2 + k, 2, 5),
    title: 'シーザー暗号',
    q: `各文字を<b>${k}つあと</b>にずらす暗号。<br>（例：A→${sh('A', k)}、B→${sh('B', k)}）<br>では次を元に戻すと？<div class="cipher">${enc}</div>`,
    type: 'input', answers: [w, mean],
    hints: [`逆に${k}つ前へ戻せばいい（${enc[0]}→…）`, `意味は「${mean}」`],
    explain: `${enc} を${k}つ前に戻すと ${w}（${mean}）。ずらし暗号は例から「ずらし幅」を割り出すのがコツ。`,
  };
}

function genKanaShift() {
  const w = pick(JP_WORDS);
  const k = randInt(1, 3);
  const idx = (c) => GOJUON.indexOf(c);
  const enc = [...w].map((c) => idx(c) >= 0 ? GOJUON[(idx(c) + k) % GOJUON.length] : c).join('');
  return {
    generated: true, id: uid('kana'), cat: 'cipher', level: clamp(2 + k, 2, 5),
    title: '五十音ずらし',
    q: `五十音表（あいうえお…）で<b>${k}つあと</b>の文字に置きかえた暗号。<br>（例：あ→${GOJUON[k]}、か→${GOJUON[(5 + k) % GOJUON.length]}）<br>元の言葉は？<div class="cipher">${enc}</div>`,
    type: 'input', answers: [w],
    hints: [`${k}つ前の音に戻そう（${enc[0]}→…）`, '「あいうえお…」を口に出すと戻しやすい'],
    explain: `${enc} を五十音で${k}つ戻すと「${w}」。五十音ずらしは順番の規則を見抜く練習。`,
  };
}

function genSymbol() {
  const w = pick(JP_WORDS.filter((x) => x.length <= 3));
  const uniq = [...new Set([...w])];
  const syms = shuffle(SYMBOLS).slice(0, uniq.length);
  const map = {};
  uniq.forEach((c, i) => { map[c] = syms[i]; });
  const enc = [...w].map((c) => map[c]).join(' ');
  const key = uniq.map((c) => `${map[c]}=${c}`).join('　');
  return {
    generated: true, id: uid('sym'), cat: 'cipher', level: clamp(w.length, 2, 4),
    title: '記号暗号',
    q: `記号の対応表：<div class="cipher" style="font-size:20px">${key}</div>この記号列が表す言葉は？<div class="cipher">${enc}</div>`,
    type: 'input', answers: [w],
    hints: ['表を見て1記号ずつ置きかえよう', `${w.length}文字`],
    explain: `表のとおり置きかえると「${w}」。対応表型は「鍵（key）」を丁寧に当てはめるだけ。`,
  };
}

function genAtbash() {
  const [w, mean] = pick(EN_WORDS);
  const at = (s) => [...s].map((c) => String.fromCharCode(155 - c.charCodeAt(0))).join('');
  const enc = at(w);
  return {
    generated: true, id: uid('atb'), cat: 'cipher', level: clamp(w.length, 3, 5),
    title: '逆さアルファベット暗号',
    q: `アルファベットを逆に対応させる暗号。<br>（A=Z, B=Y, C=X … Z=A）<br>元の言葉は？<div class="cipher">${enc}</div>`,
    type: 'input', answers: [w, mean],
    hints: [`A↔Z で置きかえる。${enc[0]}→…`, `意味は「${mean}」`],
    explain: `A=Z, B=Y… で戻すと ${w}（${mean}）。同じ操作をもう一度で戻る、左右対称の暗号。`,
  };
}

function genSkip() {
  const w = pick(JP_WORDS.filter((x) => x.length >= 3 && x.length <= 4));
  const parts = [];
  [...w].forEach((c, i) => { parts.push(c); if (i < w.length - 1) parts.push(pick(GOJUON)); });
  const enc = parts.join('');
  return {
    generated: true, id: uid('skip'), cat: 'cipher', level: clamp(w.length - 1, 2, 4),
    title: '飛ばし読み暗号',
    q: `<b>1文字目から1つおき</b>に読むと、ある言葉になります。<br>（1・3・5…番目を読む）<div class="cipher">${enc}</div>`,
    type: 'input', answers: [w],
    hints: ['偶数番目はダミー。奇数番目だけ拾おう', `元は${w.length}文字`],
    explain: `奇数番目だけ読むと「${w}」。間の文字は惑わせるためのダミー。`,
  };
}

const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
const toM = (s) => s.replace(/\./g, '・').replace(/-/g, '－');
function genMorse() {
  const [w, mean] = pick(EN_WORDS);
  const enc = [...w].map((c) => toM(MORSE[c])).join('   ');
  const key = [...new Set([...w])].map((c) => `${c}=${toM(MORSE[c])}`).join('　');
  return {
    generated: true, id: uid('mor'), cat: 'cipher', level: clamp(w.length, 3, 5),
    title: 'モールス信号',
    q: `モールス信号（・＝トン、－＝ツー）。下の対応表で解読せよ。<div class="cipher" style="font-size:18px;letter-spacing:3px">${key}</div><div class="cipher">${enc}</div>`,
    type: 'input', answers: [w, mean],
    hints: ['表のとおり1文字ずつ照合しよう', `意味は「${mean}」`],
    explain: `対応表のとおり解読すると ${w}（${mean}）。`,
  };
}
function genAnagram() {
  const w = pick(JP_WORDS.filter((x) => x.length >= 3 && x.length <= 4));
  let arr;
  do { arr = shuffle([...w]); } while (arr.join('') === w);
  return {
    generated: true, id: uid('ana'), cat: 'cipher', level: clamp(w.length - 1, 2, 4),
    title: 'アナグラム（並べ替え）',
    q: `バラバラの文字を<b>並べ替える</b>と、ある言葉に。（${w.length}文字の名詞）<div class="cipher">${arr.join('　')}</div>`,
    type: 'input', answers: [w],
    hints: ['同じ文字を使う、知っている言葉を探す', '頭の中で文字を入れ替えてみよう'],
    explain: `並べ替えると「${w}」。`,
  };
}

const GENERATORS = [genReverse, genA1Z26, genCaesar, genKanaShift, genSymbol, genAtbash, genSkip, genMorse, genAnagram];

export function genCipher(level) {
  // レベルが上がるほど難しめ生成器の比率を上げる
  let pool;
  if (level <= 2) pool = [genReverse, genA1Z26, genSymbol, genSkip, genAnagram];
  else if (level <= 4) pool = [genA1Z26, genCaesar, genKanaShift, genSymbol, genSkip, genAtbash, genMorse, genAnagram];
  else pool = [genCaesar, genKanaShift, genAtbash, genMorse, genA1Z26];
  return pick(pool || GENERATORS)();
}

// スピード謎解き用：英字/数字だけで答えられる（IME不要で速い）
export function genCipherEnglish() {
  return pick([genA1Z26, genCaesar, genAtbash, genMorse])();
}

export const cipherInfo = { generated: true };
