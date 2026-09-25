import { state, classById, colorOf } from "./state.js";
import { $, esc, toast } from "./utils.js";
import { viewOverview, viewCalendar, viewClasses, viewClass, viewGrades, viewConnect, viewReview } from "./views.js";
import { parseICSText, parsePastedLines, startReview } from "./importer.js";

function renderNav(){
  const link = c => `<button data-class="${c.id}" class="${state.view === "class" && state.classId === c.id ? "on" : ""}"><span class="dot" style="background:${colorOf(c)}"></span>${esc(c.name)}</button>`;
  $("#sideClasses").innerHTML = state.classes.map(link).join("") || `<p class="sub" style="padding:0 12px;font-size:14px">No classes yet</p>`;
  document.querySelectorAll(".side .nav button[data-go]").forEach(b => b.classList.toggle("on", b.dataset.go === state.view));
  $("#mobileBar").innerHTML =
    `<button data-go="overview" class="${state.view === "overview" ? "on" : ""}">Today</button>
     <button data-go="calendar" class="${state.view === "calendar" ? "on" : ""}">Calendar</button>
     <button data-go="classes" class="${state.view === "classes" ? "on" : ""}">Classes</button>
     <button data-go="grades" class="${state.view === "grades" ? "on" : ""}">Grades</button>
     <button data-go="connect" class="${state.view === "connect" ? "on" : ""}">Import</button>`
    + state.classes.map(link).join("");
}
export function render(){
  renderNav();
  const titles = { overview:"Today & upcoming", calendar:"Calendar", classes:"All classes", grades:"Grades", connect:"Import schoolwork", review:"Review import" };
  $("#crumb").textContent = state.view === "class" ? (classById(state.classId)?.name || "") : titles[state.view];
  $("#view").innerHTML = state.view === "overview" ? viewOverview()
    : state.view === "calendar" ? viewCalendar()
    : state.view === "classes" ? viewClasses()
    : state.view === "grades" ? viewGrades()
    : state.view === "connect" ? viewConnect()
    : state.view === "review" ? viewReview()
    : viewClass();
  const plat = $("#plat");
  if (plat) plat.onchange = e => { state.platform = e.target.value; render(); };
  const file = $("#icsFile");
  if (file) file.onchange = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5e6){ toast("That file is too big (5 MB max)."); return; }
    try {
      const text = await f.text();
      startReview(text.includes("BEGIN:VCALENDAR") ? parseICSText(text) : parsePastedLines(text), "file");
    } catch { toast("Couldn't read that file."); }
  };
}
export function go(view, classId = null){ state.view = view; state.classId = classId; render(); window.scrollTo(0,0); }
