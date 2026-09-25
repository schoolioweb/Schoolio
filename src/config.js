export const SUPABASE_URL = "https://phiiyfnlbpsxyrwzcpqo.supabase.co";
export const SUPABASE_KEY = "sb_publishable_VKiOF0g8ipAQ3XPzJfml4g_SwlC9QK9";
export const SYNC_FN = "Sync-school";

export const COLORS = { green:"#6E9A5B", amber:"#C8883A", violet:"#8A7BC0", blue:"#5B8DB0", rose:"#C06A7A", slate:"#6B7C85" };

export const PLATFORMS = {
  moodle:{ name:"Moodle", steps:["Open your school's Moodle site and go to Calendar","Tap Import or export calendars, then Export calendar","Choose All events and Recent and next 60 days","Tap Get calendar URL, or Export to download a file"] },
  canvas:{ name:"Canvas", steps:["Open Canvas and go to Calendar","Scroll the right sidebar and tap Calendar Feed","Copy the link that appears"] },
  schoology:{ name:"Schoology", steps:["Tap your name, then Settings","Find iCal / Calendar Feed and turn it on","Copy the feed link for your courses"] },
  blackbaud:{ name:"Blackbaud", steps:["Open your Assignment Center or Calendar","Look for Subscribe, Sync, or Export calendar","Copy the iCal link it gives you"] },
  classroom:{ name:"Google Classroom", steps:["Classroom sends work to Google Calendar, so open Google Calendar","Find your class calendar in the left list","Open its Settings and copy the Secret address in iCal format"] },
  powerschool:{ name:"PowerSchool", steps:["Open PowerSchool and find your assignments or calendar","Look for Subscribe to Calendars or an export option","Copy the iCal link, or download the file"] },
  other:{ name:"Another platform", steps:["Look for Calendar, then Subscribe, Export, Sync, or iCal feed","Copy the link, or download the file (it usually ends in .ics)","If there's neither, use Type it in instead"] },
};
