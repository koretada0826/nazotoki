// 適応エンジン: 正解率と速さから難度を自動調整し、XPを付与する
import { getState, getSkill, save, touchStreak, recordDaily } from './store.js';
import { clamp } from './util.js';

export const MAX_DIFF = 12;

// 1ラウンドの結果を反映する
// result: { correct:bool, ms:number, expectedMs:number }
// returns { xpGain, diffBefore, diffAfter, leveledDrill:bool }
export function applyResult(drillId, result) {
  const st = getState();
  const sk = getSkill(drillId);
  const before = sk.diff;

  sk.attempts += 1;
  if (result.correct) sk.correct += 1;
  sk.ema = sk.ema * 0.7 + (result.correct ? 1 : 0) * 0.3;

  // 速さ係数: 期待時間より速ければ強めに上げる
  let speed = 1;
  if (result.expectedMs && result.ms) {
    speed = clamp(result.expectedMs / Math.max(result.ms, 250), 0.5, 1.8);
  }

  if (result.correct) {
    sk.diff = clamp(sk.diff + 0.30 * speed, 1, MAX_DIFF);
  } else {
    sk.diff = clamp(sk.diff - 0.55, 1, MAX_DIFF);
  }

  // XP: 難度が高いほど・正解で多い。間違いでも挑戦XP少々
  const base = result.correct ? 10 + before * 4 : 2;
  const speedBonus = result.correct ? Math.round((speed - 1) * 8) : 0;
  const xpGain = Math.max(1, Math.round(base + speedBonus));

  st.xp += xpGain;
  st.totalRounds += 1;
  if (result.correct) st.totalCorrect += 1;

  const leveledDrill = Math.floor(sk.diff) > Math.floor(before);
  if (!st.best[drillId] || sk.diff > st.best[drillId]) st.best[drillId] = sk.diff;

  recordDaily(result.correct);
  save();

  return { xpGain, diffBefore: before, diffAfter: sk.diff, leveledDrill };
}

export function startSessionStreak() {
  touchStreak();
  save();
}

// drill の現在難度（整数レベル 1..MAX）
export function currentLevel(drillId) {
  return Math.round(getSkill(drillId).diff);
}
