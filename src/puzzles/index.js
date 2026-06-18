// 謎解きカテゴリ登録
import { hiramekiPuzzles } from './hirameki.js';
import { genCipher, genCipherEnglish } from './cipher.js';
import { genSafe, genCulprit, deductionCurated } from './deduction.js';
import { pick, randInt } from '../util.js';

export const CATEGORIES = [
  { key: 'hirameki', name: 'ひらめき', icon: '💡', desc: '一発で「あ！」となる、なぞなぞ・発想の謎', color: '#f5c451', generated: false },
  { key: 'cipher', name: '暗号解読', icon: '🔐', desc: '規則を見破って暗号を解く（自動生成で無限）', color: '#4fd1c5', generated: true },
  { key: 'deduction', name: '推理・脱出', icon: '🔍', desc: '手がかりを組み立てて答えにたどり着く', color: '#a78bfa', generated: true },
];

export const catByKey = (k) => CATEGORIES.find((c) => c.key === k);

export function curatedOf(cat) {
  if (cat === 'hirameki') return hiramekiPuzzles;
  if (cat === 'deduction') return deductionCurated();
  return [];
}

export function generateOf(cat, level) {
  if (cat === 'cipher') return genCipher(level);
  if (cat === 'deduction') return Math.random() < 0.5 ? genSafe(level) : (genCulprit() || genSafe(level));
  return null;
}

export function puzzleById(id) {
  return [...hiramekiPuzzles, ...deductionCurated()].find((p) => p.id === id) || null;
}

export const TOTAL_CURATED =
  hiramekiPuzzles.length + deductionCurated().length;

// スピード謎解き用：英字/数字だけで素早く答えられる問題を1問
export function speedNext(level) {
  return Math.random() < 0.5 ? genCipherEnglish() : genSafe(2);
}
