// localStorage に進捗を保存
import { todayStr } from './util.js';

const KEY = 'nazotoki:v1';

const DEFAULT = () => ({
  solved: {},        // puzzleId -> true
  solvedCount: 0,
  noHintCount: 0,    // ヒント無しで解いた数
  speedBest: 0,      // スピード謎解きの最高スコア
  speedPlays: 0,
  streakDays: 0,
  lastDate: null,
  techRead: {},      // techniqueId -> true
  briefed: false,    // 最初の「心得」を読んだか
  dailyDone: {},     // 'YYYY-MM-DD' -> true（本日の事件クリア）
});

// 階級（解いた数で昇進）
const RANKS = [
  { min: 0, name: '見習い' },
  { min: 5, name: '巡査' },
  { min: 12, name: '刑事' },
  { min: 25, name: '警部補' },
  { min: 45, name: '警部' },
  { min: 70, name: '主任警部' },
  { min: 100, name: '名探偵' },
];
export function rankInfo() {
  const n = state.solvedCount;
  let i = 0;
  while (i + 1 < RANKS.length && RANKS[i + 1].min <= n) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1] || null;
  return {
    name: cur.name,
    index: i,
    isMax: !next,
    next: next ? next.name : null,
    toNext: next ? next.min - n : 0,
    progress: next ? (n - cur.min) / (next.min - cur.min) : 1,
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    return Object.assign(DEFAULT(), JSON.parse(raw));
  } catch (e) { return DEFAULT(); }
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
export function getState() { return state; }
export function resetAll() { state = DEFAULT(); save(); }

export function isSolved(id) { return !!state.solved[id]; }
export function markSolved(id, usedHint) {
  if (!state.solved[id]) {
    state.solved[id] = true;
    state.solvedCount += 1;
    if (!usedHint) state.noHintCount += 1;
  }
  touchStreak();
  save();
}
export function recordSolveGenerated(usedHint) {
  state.solvedCount += 1;
  if (!usedHint) state.noHintCount += 1;
  touchStreak();
  save();
}
export function recordSpeed(score) {
  state.speedPlays += 1;
  const best = score > state.speedBest;
  if (best) state.speedBest = score;
  touchStreak();
  save();
  return best;
}
export function markTechRead(id) { state.techRead[id] = true; save(); }
export function isBriefed() { return !!state.briefed; }
export function markBriefed() { state.briefed = true; save(); }
export function isDailyDone(d) { return !!state.dailyDone[d]; }
export function markDailyDone(d) { state.dailyDone[d] = true; touchStreak(); save(); }

export function touchStreak() {
  const t = todayStr();
  if (state.lastDate === t) return;
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yest = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  state.streakDays = state.lastDate === yest ? state.streakDays + 1 : 1;
  state.lastDate = t;
}
