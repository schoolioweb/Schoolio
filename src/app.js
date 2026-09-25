// Entry point: wires up events, dialogs, theme, auth, and boots the app.
import { COLORS } from "./config.js";
import { state, classById, sampleData } from "./state.js";
import { pad, TODAY } from "./dates.js";
import { $, esc, toast } from "./utils.js";
import { load, addClass, updateClass, addTask, updateTask, toggleTask, deleteTask, deleteClass, addGrade, deleteGrade, syncSchool, getSession, onAuthStateChange, signInWithGoogle, signOut } from "./data.js";
import { runFinal } from "./grades.js";
import { parseICSText, parsePastedLines, startReview, importDraft, pendingGrab } from "./importer.js";
import { render, go } from "./router.js";

/* Events */
let editingTask = null, editingClass = null, gradeClass = null;

document.addEventListener("click", e => {
  const el = e.target.closest("button"); if (!el) return;
  const d = el.dataset;
  if (d.go) go(d.go);
  else if (d.class) go("class", d.class);
  else if (d.toggle) toggleTask(d.toggle);
  else if (d.del) deleteTask(d.del);
  else if (d.delclass) deleteClass(d.delclass);
  else if (d.edittask) openTask(null, d.edittask);
  else if (d.editclass) openClass(d.editclass);
  else if (d.addgrade) openGrade(d.addgrade);
  else if (d.delgrade) deleteGrade(d.delgrade);
  else if (d.final) runFinal(d.final);
  else if (d.month){
    const b = state.calMonth ? new Date(state.calMonth + "-01T00:00:00") : new Date();
    b.setMonth(b.getMonth() + Number(d.month));
    state.calMonth = `${b.getFullYear()}-${pad(b.getMonth()+1)}`; render();
  }
  else if (d.addtaskDate) openTask(null, null, d.addtaskDate);
  else if ("addclass" in d) openClass();
  else if ("addtask" in d) openTask(d.addtask || null);
  else if ("sync" in d) syncSchool(null);
  else if ("connect" in d){
    const v = $("#feedUrl")?.value.trim();
    if (!v){ toast("Paste your calendar link first."); return; }
    syncSchool(v);
  }
  else if (d.method){ state.method = d.method; render(); }
  else if (d.keep){
    const r = state.draft?.rows.find(x => x.key === d.keep);
    if (r){ r.keep = !r.keep; render(); }
  }
  else if ("parsePaste" in d){
    const v = $("#pasteBox")?.value || "";
    if (!v.trim()){ toast("Type at least one assignment first."); return; }
    startReview(v.includes("BEGIN:VCALENDAR") ? parseICSText(v) : parsePastedLines(v), "typed");
  }
  else if ("import" in d) importDraft();
  else if ("copyBm" in d){
    const ta = $("#bmCode");
    if (ta){ ta.select(); try { document.execCommand("copy"); toast("Copied. Now paste it as a bookmark's address."); }
      catch { toast("Press and hold the code to copy it."); } }
  }
  else if ("close" in d) el.closest("dialog").close();
});
/* Keep review edits in memory as they're typed */
document.addEventListener("input", e => {
  const el = e.target, d = el.dataset, rows = state.draft?.rows;
  if (!rows) return;
  const key = d.rtitle || d.rdue || d.rclass; if (!key) return;
  const r = rows.find(x => x.key === key); if (!r) return;
  if (d.rtitle) r.title = el.value;
  else if (d.rdue) r.due = el.value;
  else if (d.rclass) r.class_id = el.value;
});
$("#sideAddClass").onclick = () => openClass();

/* Dialogs */
function openTask(classId, taskId = null, date = null){
  if (!state.classes.length){ openClass(); return; }
  editingTask = taskId;
  const t = taskId ? state.tasks.find(x => x.id === taskId) : null;
  $("#taskDlgTitle").textContent = t ? "Edit task" : "Add task";
  $("#taskClass").innerHTML = state.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  const f = $("#taskForm"); f.reset();
  f.title.value = t?.title || "";
  f.class_id.value = t?.class_id || classId || state.classes[0].id;
  f.type.value = t?.type || "assignment";
  f.due_date.value = t?.due_date || date || TODAY();
  $("#taskDlg").showModal();
}
function openClass(classId = null){
  editingClass = classId;
  const c = classId ? classById(classId) : null;
  $("#classDlgTitle").textContent = c ? "Edit class" : "Add class";
  const active = c?.color || "green";
  $("#swatches").innerHTML = Object.entries(COLORS).map(([k,v]) =>
    `<label><input type="radio" name="color" value="${k}" ${k === active ? "checked" : ""} aria-label="${k}"><span style="background:${v}"></span></label>`).join("");
  const f = $("#classForm");
  f.name.value = c?.name || ""; f.teacher.value = c?.teacher || ""; f.teacher_email.value = c?.teacher_email || "";
  $("#classDlg").showModal();
}
function openGrade(classId){
  gradeClass = classId;
  const f = $("#gradeForm"); f.reset(); f.max_score.value = 100; f.weight.value = 1;
  $("#gradeDlg").showModal();
}

$("#taskForm").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target;
  const row = { title:f.title.value.trim(), class_id:f.class_id.value, type:f.type.value, due_date:f.due_date.value || null };
  const ok = editingTask ? await updateTask(editingTask, row) : await addTask(row);
  if (ok){ $("#taskDlg").close(); render(); toast(editingTask ? "Task updated" : "Task saved"); }
});
$("#classForm").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target;
  const row = { name:f.name.value.trim(), teacher:f.teacher.value.trim() || null, teacher_email:f.teacher_email.value.trim() || null, color:f.color.value };
  const ok = editingClass ? await updateClass(editingClass, row) : await addClass(row);
  if (ok){ $("#classDlg").close(); render(); toast(editingClass ? "Class updated" : "Class saved"); }
});
$("#gradeForm").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target;
  const max = parseFloat(f.max_score.value);
  if (!max || max <= 0){ toast('"Out of" needs to be more than zero.'); return; }
  const ok = await addGrade({ class_id:gradeClass, name:f.name.value.trim(), score:parseFloat(f.score.value), max_score:max, weight:parseFloat(f.weight.value) || 1 });
  if (ok){ $("#gradeDlg").close(); render(); toast("Score saved"); }
});

/* Theme */
function setTheme(t){ document.documentElement.setAttribute("data-theme", t); try { localStorage.setItem("schoolio-theme", t); } catch {} }
$("#themeBtn").onclick = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
try {
  const saved = localStorage.getItem("schoolio-theme");
  if (saved) setTheme(saved);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
} catch {}

/* Account */
$("#avatarBtn").onclick = e => {
  e.stopPropagation();
  const m = $("#menu"); m.classList.toggle("hidden");
  $("#avatarBtn").setAttribute("aria-expanded", String(!m.classList.contains("hidden")));
};
document.addEventListener("click", e => { if (!e.target.closest("#menu") && !e.target.closest("#avatarBtn")) $("#menu").classList.add("hidden"); });
$("#signOutBtn").onclick = async () => { if (state.demo){ location.reload(); return; } await signOut(); location.reload(); };

async function signIn(){
  const { error } = await signInWithGoogle();
  if (error){ const p = $("#authErr"); p.textContent = "Google sign-in didn't start: " + error.message; p.classList.remove("hidden"); }
}
$("#googleBtn").onclick = signIn;
$("#bannerSignIn").onclick = signIn;
// state is a shared module export, so mutate it in place instead of reassigning.
$("#demoBtn").onclick = () => { const d = sampleData(); Object.assign(state, { demo:true, classes:d.c, tasks:d.t, grades:d.g }); showApp(); };

function showApp(){
  $("#landing").classList.add("hidden"); $("#app").classList.remove("hidden");
  $("#demoBanner").classList.toggle("hidden", !state.demo);
  const u = state.user, pic = u?.user_metadata?.avatar_url, nm = u?.user_metadata?.full_name || u?.email || "Guest";
  $("#avatarBtn").innerHTML = pic ? `<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer">` : esc(nm[0].toUpperCase());
  $("#menuEmail").textContent = state.demo ? "Sample mode" : (u?.email || "");
  $("#signOutBtn").textContent = state.demo ? "Leave sample" : "Sign out";
  render();
}

(async function start(){
  const grabbed = pendingGrab();
  const { data:{ session } } = await getSession();
  if (session){
    state.user = session.user; await load(); showApp();
    if (grabbed) startReview(parsePastedLines(grabbed), "grab");
  }
  else $("#landing").classList.remove("hidden");
  onAuthStateChange(async (event, s) => {
    if (event === "SIGNED_IN" && !state.user){ state.user = s.user; state.demo = false; await load(); showApp(); }
  });
})();
