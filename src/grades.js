import { state } from "./state.js";
import { $, esc, plural } from "./utils.js";

export function classAvg(classId){
  const items = state.grades.filter(g => g.class_id === classId);
  if (!items.length) return null;
  let pts = 0, weight = 0;
  items.forEach(g => { const max = +g.max_score || 0; if (!max) return; const w = +g.weight || 1; pts += (+g.score / max) * w; weight += w; });
  if (!weight) return null;
  return Math.round((pts / weight) * 1000) / 10;
}
export const letter = p => p === null ? "" : p >= 90 ? "A" : p >= 80 ? "B" : p >= 70 ? "C" : p >= 60 ? "D" : "F";

export function gradePanel(c){
  const items = state.grades.filter(g => g.class_id === c.id);
  const avg = classAvg(c.id);
  return `<div class="panel">
    <div class="head" style="margin-bottom:10px">
      <div><span class="big-num">${avg === null ? "—" : avg + "%"}</span> <strong style="font-size:20px;color:var(--muted)">${letter(avg)}</strong>
        <p class="sub">${items.length ? `Based on ${plural(items.length,"score")} you entered` : "Add your scores to see your average"}</p></div>
      <button class="btn sm" data-addgrade="${c.id}">+ Add score</button>
    </div>
    ${items.map(g => `<div class="kv"><div><strong>${esc(g.name)}</strong>
      <div class="t-meta">${g.score}/${g.max_score}${+g.weight !== 1 ? ` · weight ${g.weight}` : ""} · ${Math.round((g.score / g.max_score) * 1000) / 10}%</div></div>
      <button class="x" data-delgrade="${g.id}" aria-label="Delete ${esc(g.name)}">×</button></div>`).join("")}
    ${avg !== null ? finalCalc(c.id, avg) : ""}
  </div>`;
}
function finalCalc(classId, avg){
  return `<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px">
    <strong>What do I need on the final?</strong>
    <div class="two" style="margin-top:10px">
      <label>Grade I want<input type="number" id="want-${classId}" value="90" step="0.1"></label>
      <label>Final is worth (%)<input type="number" id="fw-${classId}" value="20" step="1" min="1" max="99"></label>
    </div>
    <button class="btn ghost sm" data-final="${classId}">Work it out</button>
    <p class="sub" id="finalOut-${classId}" style="margin-top:10px">Your average so far is ${avg}%.</p>
  </div>`;
}
export function runFinal(classId){
  const avg = classAvg(classId);
  const want = parseFloat($("#want-" + classId).value);
  const w = parseFloat($("#fw-" + classId).value) / 100;
  const out = $("#finalOut-" + classId);
  if (isNaN(want) || isNaN(w) || w <= 0 || w >= 1){ out.textContent = "Enter a target grade and how much the final is worth."; return; }
  const needed = Math.round(((want - avg * (1 - w)) / w) * 10) / 10;
  const best = Math.round((avg * (1 - w) + 100 * w) * 10) / 10;
  out.textContent = needed <= 0 ? `You've already got ${want}% locked in, even with a zero on the final.`
    : needed > 100 ? `Even a perfect final lands you around ${best}%, short of ${want}%.`
    : `You need about ${needed}% on the final to finish at ${want}%.`;
}
