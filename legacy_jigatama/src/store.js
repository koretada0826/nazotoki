// localStorage に進捗を保存する
import { todayStr } from './util.js';

const KEY = 'jigatama:v1';

const DEFAULT = () => ({
  createdAt: todayStr(),
  xp: 0,
  totalRounds: 0,
  totalCorrect: 0,
  streakDays: 0,
  lastTrainDate: null,
  best: {},          // drillId -> 最高難度到達
  skills: {},        // drillId -> { diff, attempts, correct, ema }
  daily: {},         // 'YYYY-MM-DD' -> { rounds, correct, done:true }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    return Object.assign(DEFAULT(), JSON.parse(raw));
  } catch (e) {
    return DEFAULT();
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) { /* storage full / private mode */ }
}

export function getState() { return state; }

export function resetAll() {
  state = DEFAULT();
  save();
}

// --- skill (難度) 管理 ---
export function getSkill(drillId) {
  if (!state.skills[drillId]) {
    state.skills[drillId] = { diff: 1.0, attempts: 0, correct: 0, ema: 0.5 };
  }
  return state.skills[drillId];
}

// プレイヤーレベル: xp から算出（累積カーブ）
export function levelInfo() {
  const xp = state.xp;
  // 必要xp: level L に到達するのに 50*L^1.6 累積（ざっくり）
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  const cur = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return { level: lvl, xp, inLevel: xp - cur, span: next - cur, progress: (xp - cur) / (next - cur) };
}
function xpForLevel(l) {
  // l=1 -> 0
  let sum = 0;
  for (let i = 1; i < l; i++) sum += Math.round(60 * Math.pow(i, 1.35));
  return sum;
}

// 日次ストリーク更新
export function touchStreak() {
  const t = todayStr();
  if (state.lastTrainDate === t) return;
  const yest = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  if (state.lastTrainDate === yest) state.streakDays += 1;
  else state.streakDays = 1;
  state.lastTrainDate = t;
}

export function recordDaily(correct) {
  const t = todayStr();
  if (!state.daily[t]) state.daily[t] = { rounds: 0, correct: 0 };
  state.daily[t].rounds += 1;
  if (correct) state.daily[t].correct += 1;
}
