// ドリル登録 & 柱メタ
import { logicDrills } from './logic.js';
import { calcDrills } from './calc.js';
import { frameworkDrills } from './framework.js';
import { memoryDrills } from './memory.js';

export const PILLARS = {
  logic:     { key: 'logic',     name: '論理・推理', short: '論理', icon: '🧩', desc: '謎を解いて筋道を立てる力' },
  calc:      { key: 'calc',      name: '計算・数的処理', short: '計算', icon: '🔢', desc: '数を素早く正確に扱う力' },
  framework: { key: 'framework', name: '思考の型', short: '思考', icon: '🧠', desc: '考えるための道具箱' },
  memory:    { key: 'memory',    name: '記憶・WM', short: '記憶', icon: '⚡', desc: '頭の中で情報を保持する力' },
};

export const DRILLS = [...logicDrills, ...calcDrills, ...frameworkDrills, ...memoryDrills];

export const drillById = (id) => DRILLS.find((d) => d.id === id);
export const drillsByPillar = (p) => DRILLS.filter((d) => d.pillar === p);
