// 記憶・ワーキングメモリ ドリル（インタラクティブ）
import { randInt, pick, clamp } from '../util.js';
import { el } from '../util.js';

const P = 'memory';

// ---------- 数字スパン ----------
function mountDigitSpan(container, { done, level }) {
  const len = clamp(3 + Math.floor((level - 1) / 1.6), 3, 10);
  const reverse = level >= 6 && Math.random() < 0.5;
  const digits = Array.from({ length: len }, () => randInt(0, 9));
  const target = reverse ? digits.slice().reverse() : digits;

  const info = el('div.qmeta', [el('span.qlevel', `${len}桁を覚える${reverse ? '（逆から入力）' : ''}`)]);
  const stage = el('div.stage');
  container.append(info, stage);

  let i = 0;
  const showNext = () => {
    if (i < digits.length) {
      stage.textContent = String(digits[i]);
      stage.classList.add('pop');
      setTimeout(() => stage.classList.remove('pop'), 180);
      i++;
      setTimeout(() => { stage.textContent = ''; setTimeout(showNext, 200); }, 720);
    } else {
      promptInput();
    }
  };

  function promptInput() {
    info.textContent = reverse ? '逆の順番で入力' : '見た順番で入力';
    const entered = [];
    const box = el('div.answerbox');
    const render = () => { box.innerHTML = entered.join(' ') || '<span class="muted">？</span>'; };
    render();
    stage.replaceWith(box);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
    const pad = el('div.numpad', keys.map((k) =>
      el('button.key', {
        onclick: () => {
          if (k === '⌫') entered.pop();
          else if (k === '✓') return finish();
          else if (entered.length < target.length) entered.push(Number(k));
          render();
          if (entered.length === target.length) setTimeout(finish, 120);
        },
      }, k)
    ));
    container.append(pad);

    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      const correct = entered.length === target.length && entered.every((d, idx) => d === target[idx]);
      done(correct, { explanation: `正解は ${target.join(' ')}` });
    }
  }

  setTimeout(showNext, 500);
}

// ---------- Nバック ----------
function mountNback(container, { done, level }) {
  const n = level <= 3 ? 1 : level <= 8 ? 2 : 3;
  const letters = 'BCDFGHKLMNPRSTVZ'.split('');
  const total = 7 + Math.min(level, 9);
  const dur = Math.max(750, 2000 - level * 90);

  const seq = [];
  for (let i = 0; i < total; i++) {
    if (i >= n && Math.random() < 0.32) seq.push(seq[i - n]);
    else {
      let c;
      do { c = pick(letters); } while (i >= n && c === seq[i - n] && Math.random() < 0.7);
      seq.push(c);
    }
  }

  const instr = el('div.qmeta', [el('span.qlevel', `${n}個前と同じ文字が出たら【一致】をタップ`)]);
  const cell = el('div.nbackcell');
  const stage = el('div.stage', [cell]);
  const btn = el('button.btn', { type: 'button' }, '一致 ↺');
  container.append(instr, stage, el('div', { style: { height: '14px' } }), btn);

  let idx = -1, responded = false, running = true;
  const stats = { correct: 0, scored: 0 };

  btn.addEventListener('click', () => {
    if (!running || idx < n || responded || idx >= total) return;
    responded = true;
    const isTarget = seq[idx] === seq[idx - n];
    stats.scored += 1;
    if (isTarget) { stats.correct += 1; flash(true); } else { flash(false); }
  });
  function flash(ok) {
    btn.style.filter = ok ? 'brightness(1.4)' : 'grayscale(1)';
    setTimeout(() => (btn.style.filter = ''), 200);
  }

  function step() {
    idx++;
    if (idx >= total) return finish();
    responded = false;
    cell.textContent = seq[idx];
    cell.classList.add('on');
    setTimeout(() => {
      cell.classList.remove('on');
      if (idx >= n && !responded) {
        // 押さなかった＝「一致しない」と判断したとみなす
        const isTarget = seq[idx] === seq[idx - n];
        stats.scored += 1;
        if (!isTarget) stats.correct += 1;
      }
      cell.textContent = '';
      setTimeout(step, 250);
    }, dur);
  }
  function finish() {
    running = false;
    const acc = stats.scored ? stats.correct / stats.scored : 0;
    done(acc >= 0.8, { explanation: `正答率 ${Math.round(acc * 100)}%（${n}バック・${total}回）。80%以上でクリア。` });
  }

  setTimeout(step, 600);
}

export const memoryDrills = [
  {
    id: 'memory.digitspan', pillar: P, title: '数字スパン', icon: '🔡', blurb: '見た数字を順番に思い出す',
    generate: (level) => ({ type: 'custom', pillar: P, expectedMs: null, mount: (c, o) => mountDigitSpan(c, { ...o, level }) }),
  },
  {
    id: 'memory.nback', pillar: P, title: 'Nバック', icon: '🔁', blurb: '数個前と同じか判断し続ける',
    generate: (level) => ({ type: 'custom', pillar: P, expectedMs: null, mount: (c, o) => mountNback(c, { ...o, level }) }),
  },
];
