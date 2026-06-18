// 汎用ユーティリティ
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const sample = (arr, n) => shuffle(arr).slice(0, n);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 答え合わせ用の正規化（全角/半角・空白・カナ→ひらがな等を吸収）
export function normalize(s) {
  if (s == null) return '';
  let t = String(s).trim().toLowerCase();
  t = t.replace(/[\s　]/g, '');
  // 全角英数 → 半角
  t = t.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  // カタカナ → ひらがな
  t = t.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  return t;
}

// DOM helper
export function el(tag, attrs, children) {
  let cls = '';
  const m = tag.match(/^([a-z0-9]+)((?:[.#][\w-]+)*)$/i);
  let name = tag;
  if (m) {
    name = m[1];
    if (m[2]) {
      m[2].split(/(?=[.#])/).forEach((tok) => {
        if (tok[0] === '.') cls += (cls ? ' ' : '') + tok.slice(1);
        else if (tok[0] === '#') (attrs = attrs || {}).id = tok.slice(1);
      });
    }
  }
  const node = document.createElement(name);
  if (cls) node.className = cls;
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs) && !(attrs instanceof Node)) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className += (node.className ? ' ' : '') + v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
    }
  } else {
    children = attrs;
  }
  appendChildren(node, children);
  return node;
}
function appendChildren(node, children) {
  if (children == null) return;
  if (Array.isArray(children)) children.forEach((c) => appendChildren(node, c));
  else if (children instanceof Node) node.appendChild(children);
  else node.appendChild(document.createTextNode(String(children)));
}

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = el('div.toast'); document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1600);
}
