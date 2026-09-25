export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const nClasses = n => `${n} ${n === 1 ? "class" : "classes"}`;
export const localId = p => p + Date.now() + Math.random().toString(16).slice(2,6);

export function toast(msg){
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 4200);
}
