// Every Supabase call lives here.
import { SUPABASE_URL, SUPABASE_KEY, SYNC_FN } from "./config.js";
import { state } from "./state.js";
import { plural, localId, toast } from "./utils.js";
import { render, go } from "./router.js";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Auth */
export const getSession = () => sb.auth.getSession();
export const onAuthStateChange = cb => sb.auth.onAuthStateChange(cb);
export const signInWithGoogle = () => sb.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: location.origin + location.pathname } });
export const signOut = () => sb.auth.signOut();

/* Data */
export async function load(){
  if (state.demo) return;
  const [c,t,g,f] = await Promise.all([
    sb.from("classes").select("*").order("created_at"),
    sb.from("tasks").select("*").order("due_date", { nullsFirst:false }),
    sb.from("grade_items").select("*").order("created_at"),
    sb.from("school_feeds").select("*").order("created_at", { ascending:false }).limit(1),
  ]);
  if (c.error || t.error){ toast("Couldn't load your work. Check your connection and refresh."); return; }
  state.classes = c.data || []; state.tasks = t.data || [];
  state.grades = g.error ? [] : (g.data || []);
  state.feed = f.error ? null : (f.data?.[0] || null);
}

export async function addClass(row){
  if (state.demo){ state.classes.push({ id:localId("c"), ...row }); return true; }
  const { data, error } = await sb.from("classes").insert(row).select().single();
  if (error){ toast("Class wasn't saved: " + error.message); return false; }
  state.classes.push(data); return true;
}
export async function updateClass(id, row){
  const c = state.classes.find(x => x.id === id); if (c) Object.assign(c, row);
  if (!state.demo){
    const { error } = await sb.from("classes").update(row).eq("id", id);
    if (error){ toast("Couldn't save that change."); return false; }
  }
  return true;
}
export async function addTask(row){
  if (state.demo){ state.tasks.push({ id:localId("t"), done:false, source:"manual", ...row }); return true; }
  const { data, error } = await sb.from("tasks").insert(row).select().single();
  if (error){ toast("Task wasn't saved: " + error.message); return false; }
  state.tasks.push(data); return true;
}
export async function updateTask(id, row){
  const t = state.tasks.find(x => x.id === id); if (t) Object.assign(t, row);
  if (!state.demo){
    const { error } = await sb.from("tasks").update(row).eq("id", id);
    if (error){ toast("Couldn't save that change."); return false; }
  }
  return true;
}
export async function toggleTask(id){
  const t = state.tasks.find(x => x.id === id); if (!t) return;
  t.done = !t.done; render();
  if (!state.demo){
    const { error } = await sb.from("tasks").update({ done:t.done }).eq("id", id);
    if (error){ t.done = !t.done; render(); toast("Couldn't update that task."); }
  }
}
export async function deleteTask(id){
  const before = state.tasks.slice();
  state.tasks = state.tasks.filter(x => x.id !== id); render();
  if (!state.demo){
    const { error } = await sb.from("tasks").delete().eq("id", id);
    if (error){ state.tasks = before; render(); toast("Couldn't delete that task."); }
  }
}
export async function deleteClass(id){
  const c = state.classes.find(x => x.id === id);
  if (!confirm(`Delete ${c.name}, its tasks and its grades?`)) return;
  if (!state.demo){
    const { error } = await sb.from("classes").delete().eq("id", id);
    if (error){ toast("Couldn't delete that class."); return; }
  }
  state.classes = state.classes.filter(x => x.id !== id);
  state.tasks = state.tasks.filter(t => t.class_id !== id);
  state.grades = state.grades.filter(g => g.class_id !== id);
  go("classes");
}
export async function addGrade(row){
  if (state.demo){ state.grades.push({ id:localId("g"), ...row }); return true; }
  const { data, error } = await sb.from("grade_items").insert(row).select().single();
  if (error){ toast("Score wasn't saved: " + error.message); return false; }
  state.grades.push(data); return true;
}
export async function deleteGrade(id){
  state.grades = state.grades.filter(g => g.id !== id); render();
  if (!state.demo) await sb.from("grade_items").delete().eq("id", id);
}
// Bulk insert used by the importer's review screen.
export const insertTasks = rows => sb.from("tasks").insert(rows);

/* School sync */
export async function syncSchool(feedUrl){
  if (state.demo){ toast("Sign in with Google first, then you can connect your school."); return; }
  if (state.syncing) return;
  state.syncing = true; render();
  try {
    const body = feedUrl ? { feed_url:feedUrl, platform:state.platform } : {};
    const { data, error } = await sb.functions.invoke(SYNC_FN, { body });
    if (error){
      let msg = "Sync failed. Double-check the link and try again.";
      try { const j = await error.context?.json(); if (j?.error) msg = j.error; } catch {}
      toast(msg); return;
    }
    if (data?.error){ toast(data.error); return; }
    await load();
    const bits = [`${plural(data.imported || 0, "assignment")} imported`];
    if (data.skipped) bits.push(`${data.skipped} skipped`);
    if (data.unmatched) bits.push(`${data.unmatched} with no class yet`);
    toast(bits.join(" · "));
    state.view = "overview";
  } finally {
    state.syncing = false; render();
  }
}
