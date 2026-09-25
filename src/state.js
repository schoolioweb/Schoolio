import { COLORS } from "./config.js";
import { TODAY, addDays } from "./dates.js";

// Shared mutable app state. Mutate its fields; never reassign the object
// (other modules hold this same reference).
export const state = { user:null, demo:false, classes:[], tasks:[], grades:[], feed:null, view:"overview", classId:null, calMonth:null, platform:"moodle", syncing:false, method:"file", draft:null };

export const classById = id => state.classes.find(c => c.id === id);
export const colorOf = c => COLORS[c?.color] || COLORS.slate;

export function sampleData(){
  return {
    c:[{ id:"c1", name:"AP Calculus", teacher:"Mr. Hale", teacher_email:"hale@school.org", color:"green" },
       { id:"c2", name:"AP U.S. History", teacher:"Ms. Ortiz", color:"amber" },
       { id:"c3", name:"English Literature", teacher:"Mrs. Chen", color:"violet" },
       { id:"c4", name:"AP Physics", teacher:"Dr. Patel", color:"blue" }],
    t:[{ id:"t1", class_id:"c1", title:"Practice: derivatives", type:"assignment", due_date:TODAY(), done:false, source:"manual" },
       { id:"t2", class_id:"c3", title:"Read & annotate chapter 3", type:"assignment", due_date:TODAY(), done:false, source:"school" },
       { id:"t3", class_id:"c2", title:"Unit 2 test", type:"test", due_date:addDays(2), done:false, source:"school" },
       { id:"t4", class_id:"c4", title:"Motion lab reflection", type:"assignment", due_date:addDays(3), done:false, source:"manual" },
       { id:"t5", class_id:"c1", title:"Limits worksheet", type:"assignment", due_date:addDays(-1), done:false, source:"manual" }],
    g:[{ id:"g1", class_id:"c1", name:"Quiz 1", score:18, max_score:20, weight:1 },
       { id:"g2", class_id:"c1", name:"Unit 1 test", score:82, max_score:100, weight:2 }],
  };
}
