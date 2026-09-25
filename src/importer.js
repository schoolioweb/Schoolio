/* Import parsing (runs in the browser, saves nothing until importDraft) */
import { state } from "./state.js";
import { pad, ymd, addDays, TODAY } from "./dates.js";
import { plural, localId, toast } from "./utils.js";
import { load, insertTasks } from "./data.js";
import { render, go } from "./router.js";

function unfoldICS(text){
  const out = [];
  for (const raw of text.replace(/\r\n/g,"\n").split("\n")){
    if ((raw.startsWith(" ") || raw.startsWith("\t")) && out.length) out[out.length-1] += raw.slice(1);
    else out.push(raw);
  }
  return out;
}
export function parseICSText(text){
  const items = []; let cur = null;
  for (const line of unfoldICS(text)){
    if (line.startsWith("BEGIN:VEVENT")){ cur = {}; continue; }
    if (line.startsWith("END:VEVENT")){ if (cur?.title) items.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const key = line.slice(0,i).split(";")[0].toUpperCase();
    const val = line.slice(i+1).replace(/\\n/gi," ").replace(/\\,/g,",").trim();
    if (key === "UID") cur.uid = val;
    else if (key === "SUMMARY"){ const c = cleanTitle(val); cur.title = c.title; cur.course = c.course; }
    else if ((key === "DTSTART" || key === "DUE") && !cur.due){
      const m = val.match(/^(\d{4})(\d{2})(\d{2})/);
      cur.due = m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    }
    else if ((key === "CATEGORIES" || key === "LOCATION") && !cur.course) cur.course = val.split(",")[0];
  }
  return items;
}
function cleanTitle(raw){
  let t = raw, course = null;
  const b = t.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (b){ course = b[1].trim(); t = b[2]; }
  t = t.replace(/\s+is due$/i,"").replace(/\s+due$/i,"").trim();
  const d = t.match(/^(.+?)\s+[–-]\s+(.+)$/);
  if (!course && d && d[2].length > 3){ course = d[1].trim(); t = d[2].trim(); }
  return { title:(t || raw).slice(0,140), course };
}
const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
function findDate(text){
  const now = new Date(), yr = now.getFullYear();
  let m = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { due:`${m[1]}-${m[2]}-${m[3]}`, rest:text.replace(m[0],"") };
  m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m){
    let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : yr;
    const guess = new Date(y, +m[1]-1, +m[2]);
    if (!m[3] && guess < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) y++;
    return { due:`${y}-${pad(+m[1])}-${pad(+m[2])}`, rest:text.replace(m[0],"") };
  }
  m = text.match(new RegExp(`\\b(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})\\b`,"i"));
  if (m){
    const mo = MONTHS.indexOf(m[1].toLowerCase().slice(0,3));
    let y = yr;
    if (new Date(y, mo, +m[2]) < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) y++;
    return { due:`${y}-${pad(mo+1)}-${pad(+m[2])}`, rest:text.replace(m[0],"") };
  }
  m = text.match(new RegExp(`\\b(today|tomorrow|${DAYS.join("|")})\\b`,"i"));
  if (m){
    const w = m[1].toLowerCase();
    if (w === "today") return { due:TODAY(), rest:text.replace(m[0],"") };
    if (w === "tomorrow") return { due:addDays(1), rest:text.replace(m[0],"") };
    const target = DAYS.indexOf(w), d = new Date();
    let step = (target - d.getDay() + 7) % 7; if (step === 0) step = 7;
    d.setDate(d.getDate() + step);
    return { due:ymd(d), rest:text.replace(m[0],"") };
  }
  return { due:null, rest:text };
}
export function parsePastedLines(text){
  return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
    let course = null, body = line;
    const c = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (c){ course = c[1].trim(); body = c[2].trim(); }
    const { due, rest } = findDate(body);
    let title = rest.replace(/\b(due|on|by)\b/gi," ").replace(/\s{2,}/g," ").replace(/[\s,\-–]+$/,"").trim();
    if (!course){ const cl = cleanTitle(title); title = cl.title; course = cl.course; }
    return { title:title.slice(0,140) || line.slice(0,140), due, course, uid:null };
  }).filter(x => x.title);
}
const normName = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g,"");
function matchClass(course){
  if (!course) return "";
  const k = normName(course);
  for (const c of state.classes){
    const n = normName(c.name);
    if (n === k || (n.length > 3 && (k.includes(n) || n.includes(k)))) return c.id;
  }
  return "";
}
export function startReview(items, source){
  if (!items.length){ toast("Couldn't find any assignments in that. Check the file or try typing them in."); return; }
  const seen = new Set(state.tasks.filter(t => t.external_id).map(t => t.external_id));
  const rows = items
    .filter(i => !(i.uid && seen.has(i.uid)))
    .slice(0, 200)
    .map((i, n) => ({ key:"r" + n, title:i.title, due:i.due || "", class_id:matchClass(i.course), course:i.course || "", uid:i.uid || null, keep:true }));
  const dupes = items.length - rows.length;
  state.draft = { rows, source, dupes };
  go("review");
}
export async function importDraft(){
  const d = state.draft; if (!d) return;
  const keep = d.rows.filter(r => r.keep && r.title.trim());
  if (!keep.length){ toast("Nothing ticked to import."); return; }
  state.syncing = true; render();
  try {
    const rows = keep.map(r => ({
      title:r.title.trim().slice(0,140),
      class_id:r.class_id || null,
      type:/\b(test|exam|quiz|midterm|final)\b/i.test(r.title) ? "test" : "assignment",
      due_date:r.due || null,
      source:d.source,
      external_id:r.uid || null,
    }));
    if (state.demo){
      rows.forEach(r => state.tasks.push({ id:localId("t"), done:false, ...r }));
    } else {
      const { error } = await insertTasks(rows);
      if (error){ toast("Import failed: " + error.message); return; }
      await load();
    }
    state.draft = null;
    toast(`${plural(rows.length,"assignment")} imported`);
    state.view = "overview";
  } finally { state.syncing = false; render(); }
}

// Text handed over by the "One-tap grab" bookmarklet via ?grab=
export function pendingGrab(){
  const m = location.search.match(/[?&]grab=([^&]+)/);
  if (!m) return null;
  history.replaceState({}, "", location.pathname);
  try { return decodeURIComponent(m[1]); } catch { return null; }
}
