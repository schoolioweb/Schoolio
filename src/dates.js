export const pad = n => String(n).padStart(2,"0");
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const addDays = n => { const d = new Date(); d.setDate(d.getDate()+n); return ymd(d); };
export const TODAY = () => ymd(new Date());
export function dueInfo(due, done){
  if (!due) return { label:"No date", cls:"", bucket:done ? "done" : "later" };
  const t = TODAY();
  const d = new Date(due + "T00:00:00");
  const pretty = d.toLocaleDateString(undefined, { month:"short", day:"numeric" });
  if (done) return { label:pretty, cls:"", bucket:"done" };
  if (due < t) return { label:"Overdue · " + pretty, cls:"over", bucket:"over" };
  if (due === t) return { label:"Today", cls:"today", bucket:"today" };
  if (due === addDays(1)) return { label:"Tomorrow", cls:"soon", bucket:"week" };
  if (due <= addDays(7)) return { label:d.toLocaleDateString(undefined,{weekday:"short"}) + " · " + pretty, cls:"soon", bucket:"week" };
  return { label:pretty, cls:"", bucket:"later" };
}
