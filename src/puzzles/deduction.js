// 推理・脱出（金庫コードは自動生成＋手作りの名作）
import { randInt, pick, shuffle, clamp } from '../util.js';

let counter = 0;
const uid = () => `ded_safe_${++counter}_${randInt(100, 999)}`;

function buildClues(code) {
  const n = code.length;
  const cands = [];
  const add = (text, test) => cands.push({ text, test });

  const S = code.reduce((a, b) => a + b, 0);
  add(`数字をぜんぶ足すと ${S}`, (c) => c.reduce((a, b) => a + b, 0) === S);

  for (let i = 0; i < n; i++) {
    const even = code[i] % 2 === 0;
    add(`${i + 1}つ目の数字は${even ? '偶数' : '奇数'}`, (c) => (c[i] % 2 === 0) === even);
    const hi = code[i] >= 5;
    add(`${i + 1}つ目の数字は${hi ? '5以上' : '4以下'}`, (c) => (c[i] >= 5) === hi);
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = code[i] - code[j];
      if (d !== 0) {
        const big = d > 0;
        add(`${i + 1}つ目は${j + 1}つ目より${big ? '大きい' : '小さい'}`, (c) => big ? c[i] > c[j] : c[i] < c[j]);
        add(`${i + 1}つ目は${j + 1}つ目より${Math.abs(d)}だけ${big ? '大きい' : '小さい'}`, (c) => c[i] - c[j] === d);
      }
    }
  }
  const uniq = new Set(code).size === n;
  add(uniq ? 'すべて違う数字' : '同じ数字が含まれる', (c) => (new Set(c).size === n) === uniq);

  return shuffle(cands);
}

function bruteforce(n, clues) {
  const out = [];
  const rec = (pre) => {
    if (pre.length === n) { if (clues.every((cl) => cl.test(pre))) out.push(pre.slice()); return; }
    for (let d = 1; d <= 9; d++) { pre.push(d); rec(pre); pre.pop(); }
  };
  rec([]);
  return out;
}

export function genSafe(level) {
  const n = level <= 4 ? 3 : 4;
  for (let attempt = 0; attempt < 40; attempt++) {
    const code = Array.from({ length: n }, () => randInt(1, 9));
    const cands = buildClues(code);
    let used = [];
    const seen = new Set();
    for (const cl of cands) {
      if (seen.has(cl.text)) continue;
      seen.add(cl.text);
      used.push(cl);
      if (bruteforce(n, used).length === 1) break;
    }
    // 余分な手がかりを削る（最小限に）
    if (bruteforce(n, used).length === 1) {
      for (let i = used.length - 1; i >= 0; i--) {
        const without = used.filter((_, j) => j !== i);
        if (bruteforce(n, without).length === 1) used = without;
      }
    }
    if (bruteforce(n, used).length === 1 && used.length >= 2) {
      const cluesHtml = shuffle(used).map((c) => `<li>${c.text}</li>`).join('');
      return {
        generated: true, id: uid(), cat: 'deduction', level: clamp(n === 3 ? randInt(2, 3) : randInt(4, 5), 1, 5),
        title: `金庫の暗証番号（${n}桁）`,
        q: `手がかりから<b>${n}桁の暗証番号</b>（各けた1〜9）を当てて金庫を開けよう。<ul class="clues">${cluesHtml}</ul>`,
        type: 'input', answers: [code.join('')],
        hints: ['「確実に決まる手がかり」から先に使おう', '表やメモに「ありえる数」を書き出すと速い'],
        explain: `暗証番号は <b>${code.join('')}</b>。各手がかりで候補を消していくと1つに絞れる（消去法）。`,
      };
    }
  }
  return genSafe(level); // 念のため再試行
}

// ---- 容疑者当て（自動生成）：犯人=嘘つき1人 ----
function makeCulpritStmt(speaker, people) {
  const others = people.filter((p) => p !== speaker);
  const X = pick(others);
  const t = pick(['guilty', 'innocent', 'liar']);
  if (t === 'guilty') return { speaker, text: `犯人は${X}だ`, truth: (c) => X === c };
  if (t === 'innocent') return { speaker, text: `${X}はやっていない`, truth: (c) => X !== c };
  return { speaker, text: `${X}は嘘をついている`, truth: (c) => X === c };
}
export function genCulprit() {
  const people = ['A', 'B', 'C'];
  for (let a = 0; a < 300; a++) {
    const stmts = people.map((s) => makeCulpritStmt(s, people));
    const sols = people.filter((c) => stmts.every((st) => (st.speaker !== c) === st.truth(c)));
    if (sols.length === 1) {
      const culprit = sols[0];
      const choices = shuffle(people.slice());
      return {
        generated: true, id: uid(), cat: 'deduction', level: randInt(3, 4),
        title: '容疑者は3人',
        q: `ある事件。容疑者3人のうち<b>犯人は1人だけ</b>。犯人は嘘をつき、無実の2人は本当を言う。<ul class="clues">${stmts.map((s) => `<li>${s.speaker}「${s.text}」</li>`).join('')}</ul><b>犯人は誰？</b>`,
        type: 'choice', choices, answerIndex: choices.indexOf(culprit),
        hints: ['「犯人＝嘘つき」。各供述が本当か嘘かで場合分け', 'まず1人を犯人と仮定し、矛盾が出ないか確かめる（消去法）'],
        explain: `${culprit}を犯人と仮定すると全員の供述が矛盾なく成立する（他の人だと矛盾が出る）。犯人は${culprit}。`,
      };
    }
  }
  return null;
}

// ---- 手作りの名作（じっくり系・自己申告）----
const CURATED = [
  {
    id: 'd_switch', level: 4, cat: 'deduction', title: '3つのスイッチ',
    q: '別の部屋に電球が1つ。手元には<b>3つのスイッチ</b>があり、どれか1つだけが電球につながっている。<br>部屋へ行けるのは<b>1回だけ</b>。どう確かめれば、どのスイッチか分かる？',
    type: 'reveal',
    hints: ['電球は「光」以外の手がかりも出す…', 'スイッチを入れる「時間」を変えてみる', '消えている電球にも「触れる」'],
    explain: '①1番を数分つけて消す ②2番をつけて部屋へ ③点灯＝2番、消えていて電球が温かい＝1番、消えていて冷たい＝3番。「光」だけでなく「熱」という別の手がかりを使うのが鍵。',
  },
  {
    id: 'd_river', level: 4, cat: 'deduction', title: '川渡り',
    q: 'オオカミ・ヤギ・キャベツと人。舟には<b>人＋1つ</b>しか乗れない。人がいないと「オオカミはヤギを」「ヤギはキャベツを」食べる。<br>全部を無事に向こう岸へ渡すには？',
    type: 'reveal',
    hints: ['一度運んだものを「戻す」手もアリ', 'まずヤギを渡すしかない', '危険な組み合わせを片岸に残さない'],
    explain: '①ヤギを渡す ②戻ってオオカミを渡し、ヤギを連れ戻す ③ヤギを置きキャベツを渡す ④戻ってヤギを渡す。「一度運んだヤギを戻す」発想が突破口。',
  },
  {
    id: 'd_coin', level: 5, cat: 'deduction', title: '偽コインを探せ',
    q: '見た目が同じコインが<b>9枚</b>。1枚だけ少し重い偽物がある。<br><b>天秤を2回</b>だけ使って、確実に偽物を見つけるには？',
    type: 'reveal',
    hints: ['9枚を3つの山に分ける', '天秤は「3グループのどれに偽物があるか」を1回で絞れる', '釣り合えば残りの山に偽物'],
    explain: '①3枚ずつA・B・Cに分け、AとBを比べる→重い側、釣り合えばCに偽物。②その3枚から2枚を比べる→重い側、釣り合えば残り1枚。3分割で1回ごとに1/3へ絞るのがコツ。',
  },
];

CURATED.push(
  {
    id: 'd_rope', level: 5, cat: 'deduction', title: '2本の縄で45分',
    q: '燃やすと<b>ちょうど1時間で燃え尽きる縄が2本</b>。ただし燃え方は一定でない（途中が速かったり遅かったり）。<br>この2本で<b>45分</b>を測るには？',
    type: 'reveal',
    hints: ['縄は両端から同時に火をつけられる', '両端から燃やすと、必ず30分で燃え尽きる', '残りの15分をどう作る？'],
    explain: '①縄Aは両端、縄Bは片端に同時に点火。②Aが燃え尽きた時点で30分（両端だから半分の時間）。③その瞬間にBのもう片端にも点火→Bの残りは「片端なら30分かかる分」を両端で燃やすので15分。合計45分。「両端＝半分の時間」を使う。',
  },
  {
    id: 'd_jug', level: 4, cat: 'deduction', title: '水差しで4リットル',
    q: '<b>5リットル</b>と<b>3リットル</b>の容器が1つずつ。目盛りは無い。水は使い放題。<br>ちょうど<b>4リットル</b>を量るには？',
    type: 'reveal',
    hints: ['5Lを満タンにしてから3Lへ移すと…', '5Lに2L残る', 'その2Lを空の3Lに入れてから考える'],
    explain: '①5Lを満タン→3Lへ注ぐと5Lに2L残る。②3Lを捨て、残り2Lを3Lへ移す。③5Lを再び満タン→3L（あと1L入る）へ注ぐと、5L側にちょうど4L残る。容器の差を使って端数を作る。',
  },
);

export function deductionCurated() { return CURATED; }
