import { PLATFORMS } from "./config.js";
import { state, classById, colorOf } from "./state.js";
import { ymd, TODAY, dueInfo } from "./dates.js";
import { esc, plural, nClasses } from "./utils.js";
import { classAvg, letter, gradePanel } from "./grades.js";

function taskRow(t){
  const c = classById(t.class_id), i = dueInfo(t.due_date, t.done);
  return `<div class="task ${t.done ? "done" : ""}">
    <button class="check ${t.done ? "on" : ""}" data-toggle="${t.id}" aria-label="${t.done ? "Mark not done" : "Mark done"}: ${esc(t.title)}">${t.done ? "✓" : ""}</button>
    <div><button class="t-title" data-edittask="${t.id}">${esc(t.title)}</button>
      <div class="t-meta">${c ? `<span class="dot" style="background:${colorOf(c)}"></span>${esc(c.name)}` : "No class"} <span>·</span> ${t.type === "test" ? "Test" : t.type === "other" ? "Other" : "Assignment"}${t.source && t.source !== "manual" ? ` <span class="pill">from school</span>` : ""}</div></div>
    <span class="badge ${i.cls}">${i.label}</span>
    <button class="x" data-del="${t.id}" aria-label="Delete ${esc(t.title)}">×</button>
  </div>`;
}
function groupedList(tasks, emptyMsg){
  if (!tasks.length) return `<div class="list"><div class="empty">${emptyMsg}</div></div>`;
  const g = { over:[], today:[], week:[], later:[], done:[] };
  tasks.forEach(t => g[dueInfo(t.due_date, t.done).bucket].push(t));
  const names = { over:"Overdue", today:"Due today", week:"This week", later:"Later", done:"Done" };
  return Object.keys(g).filter(k => g[k].length).map(k =>
    `<div class="group"><h3>${names[k]} (${g[k].length})</h3><div class="list">${g[k].map(taskRow).join("")}</div></div>`).join("");
}
const syncBtn = () => state.feed ? `<button class="btn ghost" data-sync ${state.syncing ? "disabled" : ""}>${state.syncing ? "Syncing…" : "Sync school"}</button>` : "";

export function viewOverview(){
  const open = state.tasks.filter(t => !t.done);
  const now = open.filter(t => ["today","over"].includes(dueInfo(t.due_date).bucket));
  const nextTest = open.filter(t => t.type === "test" && t.due_date && t.due_date >= TODAY()).sort((a,b) => a.due_date.localeCompare(b.due_date))[0];
  const first = state.user?.user_metadata?.full_name?.split(" ")[0];
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  if (!state.classes.length && !state.tasks.length){
    return `<div class="head"><div><h1>${hello}${first ? ", " + esc(first) : ""}.</h1><p class="sub">Your account is empty. Pick a starting point.</p></div></div>
      <div class="panel"><h2>Add your first class</h2><p class="sub" style="margin-top:6px">Name it, add your teacher, pick a color. Takes about ten seconds.</p>
        <div class="row-gap" style="margin-top:14px"><button class="btn" data-addclass>+ Add your first class</button></div></div>
      <div class="panel"><h2>Import schoolwork</h2><p class="sub" style="margin-top:6px">Upload a calendar file, type your assignments in, or paste a calendar link. You review everything before it saves.</p>
        <div class="row-gap" style="margin-top:14px"><button class="btn ghost" data-go="connect">Import schoolwork</button></div></div>`;
  }
  return `<div class="head">
      <div><h1>${hello}${first ? ", " + esc(first) : ""}.</h1><p class="sub">${plural(open.length,"open task")} across ${nClasses(state.classes.length)}.</p></div>
      <div class="row-gap">${syncBtn()}<button class="btn" data-addtask>+ Add task</button></div>
    </div>
    <div class="today">
      <div class="big">${now.length}</div>
      <strong>${now.length ? `${now.length === 1 ? "thing needs" : "things need"} you today` : "Nothing due today"}</strong>
      <span>${nextTest ? `Next test: ${esc(nextTest.title)}, ${dueInfo(nextTest.due_date).label}` : "No tests coming up"}</span>
    </div>
    ${groupedList(state.tasks, "No tasks yet. Add one or connect your school.")}`;
}

export function viewCalendar(){
  const base = state.calMonth ? new Date(state.calMonth + "-01T00:00:00") : new Date();
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
  const label = first.toLocaleDateString(undefined, { month:"long", year:"numeric" });
  const byDay = {};
  state.tasks.forEach(t => { if (t.due_date){ (byDay[t.due_date] = byDay[t.due_date] || []).push(t); } });

  let cells = "";
  for (let i = 0; i < 42; i++){
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = ymd(d), items = byDay[key] || [];
    cells += `<button class="day ${d.getMonth() !== m ? "dim" : ""} ${key === TODAY() ? "now" : ""}" data-addtask-date="${key}" aria-label="Add something on ${key}">
      <span class="n">${d.getDate()}</span>
      ${items.slice(0,3).map(t => `<span class="chip ${t.done ? "" : (t.due_date < TODAY() ? "over" : t.type === "test" ? "test" : "")}">${esc(t.title)}</span>`).join("")}
      ${items.length > 3 ? `<span class="n">+${items.length - 3} more</span>` : ""}</button>`;
  }
  return `<div class="head"><div><h1>Calendar</h1><p class="sub">Tap a day to add something.</p></div>
      <div class="cal-head"><button class="btn ghost sm" data-month="-1" aria-label="Previous month">‹</button><strong>${label}</strong><button class="btn ghost sm" data-month="1" aria-label="Next month">›</button></div></div>
    <div class="cal">${["S","M","T","W","T","F","S"].map(d => `<div class="dow">${d}</div>`).join("")}${cells}</div>`;
}

export function viewClasses(){
  return `<div class="head"><div><h1>Classes</h1><p class="sub">${nClasses(state.classes.length)}</p></div><button class="btn" data-addclass>+ Add class</button></div>
  ${state.classes.length ? `<div class="grid">${state.classes.map(c => {
    const open = state.tasks.filter(t => t.class_id === c.id && !t.done).sort((a,b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
    const next = open[0], avg = classAvg(c.id);
    return `<button class="ccard" style="--c:${colorOf(c)}" data-class="${c.id}">
      <b>${esc(c.name)}</b><span class="sub">${c.teacher ? esc(c.teacher) : "No teacher added"}${avg !== null ? ` · ${avg}%` : ""}</span>
      <span class="next">${next ? `Next: ${esc(next.title)}, ${dueInfo(next.due_date).label}` : "Nothing due"}</span></button>`; }).join("")}</div>`
    : `<div class="list"><div class="empty">No classes yet.</div></div>`}`;
}

export function viewClass(){
  const c = classById(state.classId); if (!c) return viewClasses();
  const tasks = state.tasks.filter(t => t.class_id === c.id);
  const avg = classAvg(c.id);
  const open = tasks.filter(t => !t.done).sort((a,b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"))[0];
  const subject = open ? `${c.name}: question about ${open.title}` : `${c.name}: quick question`;
  return `<div class="head">
      <div><h1 style="display:flex;align-items:center;gap:14px"><span class="dot" style="width:18px;height:18px;background:${colorOf(c)}"></span>${esc(c.name)}</h1>
        <p class="sub">${c.teacher ? esc(c.teacher) : "No teacher added"}${avg !== null ? ` · Grade ${avg}%` : ""}</p></div>
      <div class="row-gap">
        ${c.teacher_email ? `<a class="btn ghost" href="mailto:${esc(c.teacher_email)}?subject=${encodeURIComponent(subject)}">Email teacher</a>` : ""}
        <button class="btn ghost" data-editclass="${c.id}">Edit class</button>
        <button class="btn" data-addtask="${c.id}">+ Add task</button>
      </div></div>
    ${!c.teacher_email ? `<div class="banner"><span>Add your teacher's email to message them in one tap.</span><button class="linkish" data-editclass="${c.id}">Add email</button></div>` : ""}
    ${groupedList(tasks, "Nothing for this class yet.")}
    <h3 class="sec">GRADES</h3>${gradePanel(c)}
    <div class="row-gap" style="margin-top:18px"><button class="btn danger sm" data-delclass="${c.id}">Delete class</button></div>`;
}

export function viewGrades(){
  if (!state.classes.length) return `<div class="head"><h1>Grades</h1></div><div class="list"><div class="empty">Add a class first.</div></div>`;
  return `<div class="head"><div><h1>Grades</h1><p class="sub">Type in your scores and Schoolio does the math.</p></div></div>
    <div class="grid">${state.classes.map(c => { const a = classAvg(c.id);
      return `<button class="ccard" style="--c:${colorOf(c)}" data-class="${c.id}">
        <b>${esc(c.name)}</b><span class="sub">${plural(state.grades.filter(g => g.class_id === c.id).length,"score")}</span>
        <span class="next"><span class="big-num" style="font-size:28px">${a === null ? "—" : a + "%"}</span> ${letter(a)}</span></button>`; }).join("")}</div>`;
}

export function viewConnect(){
  const p = PLATFORMS[state.platform];
  const last = state.feed?.last_synced ? new Date(state.feed.last_synced).toLocaleString() : null;
  const tab = (k, label) => `<button class="btn ${state.method === k ? "" : "ghost"} sm" data-method="${k}">${label}</button>`;

  let body = "";
  if (state.method === "grab"){
    const target = location.origin + location.pathname;
    const bm = `javascript:(function(){var t=(document.body.innerText||'').split('\\n').map(function(l){return l.trim()}).filter(function(l){return l.length>3&&l.length<160&&/\\d{1,2}[\\/\\-]\\d{1,2}|\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}|\\b(mon|tue|wed|thu|fri)[a-z]*day\\b|\\bdue\\b/i.test(l)});if(!t.length){alert('No assignments with dates found on this page.');return}window.open('${target}?grab='+encodeURIComponent(t.slice(0,60).join('\\n')).slice(0,7000),'_blank')})()`;
    body = `<h2>One-tap grab</h2>
      <p class="sub" style="margin-top:6px">Add this once. Then on any assignments page you're signed into — your school site, a teacher's doc, anything — tap it and Schoolio opens with what it found, ready for you to review. Your login never leaves your browser.</p>
      <ol class="steps">
        <li>Copy the code below.</li>
        <li>In Safari, bookmark any page and name the bookmark <strong>Grab for Schoolio</strong>.</li>
        <li>Open Bookmarks, tap Edit, tap that bookmark, and replace its address with the copied code.</li>
        <li>Open your school's assignment page and tap the bookmark.</li>
      </ol>
      <div class="field" style="margin-top:14px"><label for="bmCode">Bookmark address</label>
        <textarea id="bmCode" rows="4" readonly>${esc(bm)}</textarea></div>
      <button class="btn" data-copy-bm>Copy code</button>
      <p class="sub" style="margin-top:12px">It only reads the page you're looking at when you tap it, and it saves nothing on its own.</p>`;
  } else if (state.method === "file"){
    body = `<h2>Upload a calendar file</h2>
      <p class="sub" style="margin-top:6px">Most school sites can export your calendar as a file ending in <strong>.ics</strong>. Download it, then pick it here. Nothing is saved until you review it.</p>
      <div class="field" style="margin-top:14px"><label for="plat">My school uses</label>
        <select id="plat">${Object.entries(PLATFORMS).map(([k,v]) => `<option value="${k}" ${k === state.platform ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></div>
      <ol class="steps">${p.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="field" style="margin-top:16px"><label for="icsFile">Choose the file</label>
        <input id="icsFile" type="file" accept=".ics,text/calendar,text/plain"></div>`;
  } else if (state.method === "paste"){
    body = `<h2>Type it in</h2>
      <p class="sub" style="margin-top:6px">No export at your school? Write one assignment per line and Schoolio works out the dates. You can also paste the contents of a .ics file here.</p>
      <div class="field" style="margin-top:14px"><label for="pasteBox">One per line</label>
        <textarea id="pasteBox" rows="7" placeholder="Chemistry: lab report 10/3&#10;Read chapter 8 - Friday&#10;Unit 4 test 10/9"></textarea></div>
      <button class="btn" data-parse-paste>Review what I found</button>
      <p class="sub" style="margin-top:10px">Works with formats like 10/3, Oct 3, 2026-10-03, or a weekday name. Put the class before a colon to file it automatically.</p>`;
  } else {
    body = `<h2>Use a calendar link</h2>
      <p class="sub" style="margin-top:6px">Some schools give each student a private calendar link that keeps updating. If yours does, this is the one to use, because you can re-sync any time.</p>
      <div class="field" style="margin-top:14px"><label for="plat">My school uses</label>
        <select id="plat">${Object.entries(PLATFORMS).map(([k,v]) => `<option value="${k}" ${k === state.platform ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></div>
      <ol class="steps">${p.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="field" style="margin-top:16px"><label for="feedUrl">Paste the link</label>
        <input id="feedUrl" type="url" inputmode="url" placeholder="https://…"></div>
      <button class="btn" data-connect ${state.syncing ? "disabled" : ""}>${state.syncing ? "Importing…" : "Connect and import"}</button>
      <p class="sub" style="margin-top:12px">Keep this link private. Anyone who has it can see your calendar.</p>`;
  }

  return `<div class="head"><div><h1>Import schoolwork</h1><p class="sub">Three ways in. Use whichever your school allows.</p></div></div>
  ${state.feed ? `<div class="panel"><h2>Calendar link connected</h2><p class="sub" style="margin-top:6px">Last synced: ${last || "never"}</p>
      <div class="row-gap" style="margin-top:12px"><button class="btn" data-sync ${state.syncing ? "disabled" : ""}>${state.syncing ? "Syncing…" : "Sync now"}</button></div></div>` : ""}
  <div class="row-gap" style="margin-bottom:14px">${tab("grab","One-tap grab")}${tab("file","Upload a file")}${tab("paste","Type it in")}${tab("link","Calendar link")}</div>
  <div class="panel">${body}</div>
  <div class="panel"><h2>Good to know</h2>
    <div class="kv"><span>You review everything before a single item is saved.</span></div>
    <div class="kv"><span>Imported items are tagged "from school" so you can tell them apart.</span></div>
    <div class="kv"><span>Importing the same thing twice won't create duplicates.</span></div>
    <div class="kv"><span>Grades can't be imported. Enter those in the Grades tab.</span></div>
  </div>`;
}

export function viewReview(){
  const d = state.draft;
  if (!d) return viewConnect();
  const missing = d.rows.filter(r => r.keep && !r.due).length;
  const unfiled = d.rows.filter(r => r.keep && !r.class_id).length;
  return `<div class="head"><div><h1>Review before saving</h1>
      <p class="sub">${d.rows.length} found${d.dupes ? ` · ${d.dupes} already in Schoolio, skipped` : ""}. Nothing is saved until you tap Import.</p></div>
      <button class="btn ghost" data-go="connect">Cancel</button></div>
    ${missing ? `<div class="banner"><span>${plural(missing,"item")} has no date Schoolio could read. Add one or untick it.</span></div>` : ""}
    ${unfiled && state.classes.length ? `<div class="banner"><span>${plural(unfiled,"item")} isn't matched to a class. Pick one, or leave it unfiled.</span></div>` : ""}
    <div class="list">${d.rows.map(r => `<div class="task" style="grid-template-columns:auto 1fr;align-items:start">
      <button class="check ${r.keep ? "on" : ""}" data-keep="${r.key}" aria-label="Include ${esc(r.title)}">${r.keep ? "✓" : ""}</button>
      <div>
        <input value="${esc(r.title)}" data-rtitle="${r.key}" aria-label="Title">
        <div class="two" style="margin-top:8px">
          <input type="date" value="${esc(r.due)}" data-rdue="${r.key}" aria-label="Due date">
          <select data-rclass="${r.key}" aria-label="Class"><option value="">No class${r.course ? ` (was "${esc(r.course)}")` : ""}</option>
            ${state.classes.map(c => `<option value="${c.id}" ${c.id === r.class_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
        </div>
      </div></div>`).join("")}</div>
    <div class="row-gap" style="margin-top:18px">
      <button class="btn" data-import ${state.syncing ? "disabled" : ""}>${state.syncing ? "Importing…" : `Import ${d.rows.filter(r => r.keep).length} items`}</button>
      <button class="btn ghost" data-go="connect">Back</button></div>`;
}
