/* Shared default activity catalogue (window.MOSAIC_DEFAULT_ACTIVITIES).
   Used by index.html (participant) and admin.html (demo view) so there is
   one source of truth. In Supabase mode the staff-managed `activities`
   table replaces this list. Mirrors seed.sql. */
window.MOSAIC_DEFAULT_ACTIVITIES = [
  // ===== Kept (updated days/times) =====
  { id: 1,  emoji: "🍳", name: "Lifestyle Cooking", days: [1],    start_block: 1, end_block: 2, time: "9am – 3pm",  category: "Capacity Building",       color: "#E8913A", mode: "program", location: "Lakes" },
  { id: 2,  emoji: "🎣", name: "Cast a Line",       days: [4],    start_block: 2, end_block: 2, time: "12pm – 3pm", category: "Community Participation", color: "#4A90D9", mode: "program", location: "Lakes", bring_money: 20 },
  { id: 3,  emoji: "🎨", name: "Art Therapy",       days: [1, 5], start_block: 2, end_block: 2, time: "1:00pm",     category: "Creative Expression",     color: "#9B59B6", mode: "program", location: "Lakes", practitioner_led: true },
  { id: 5,  emoji: "💆", name: "Beauty Therapy",    days: [5],    start_block: 1, end_block: 1, time: "11:00am",    category: "Self-Care",               color: "#E91E8C", mode: "program", location: "Lakes", practitioner_led: true },
  { id: 7,  emoji: "🔨", name: "Odd Jobs",          days: [2],    start_block: 1, end_block: 2, time: "9am – 3pm",  category: "Life Skills",             color: "#F39C12", mode: "program", location: "Lakes" },

  // ===== Monday =====
  { id: 8,  emoji: "🎵", name: "Music",                            days: [1],    start_block: 1, end_block: 2, time: "9am – 3pm", category: "Creative Expression", color: "#8E44AD", mode: "program", location: "Lakes" },
  { id: 9,  emoji: "🖌️", name: "Art",                              days: [1],    start_block: 1, end_block: 2, time: "9am – 3pm", category: "Creative Expression", color: "#E74C3C", mode: "program", location: "Lakes" },
  { id: 10, emoji: "💻", name: "Digital Design",                   days: [1, 4], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Capacity Building",   color: "#16A085", mode: "program", location: "Lakes" },
  { id: 11, emoji: "🔧", name: "Mechanics, Metal Work & Woodwork", days: [1],    start_block: 1, end_block: 2, time: "9am – 3pm", category: "Life Skills",         color: "#7F8C8D", mode: "program", location: "Bairnsdale" },

  // ===== Tuesday =====
  { id: 12, emoji: "🎲", name: "Indoor Games",             days: [2], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Social Connection",       color: "#2980B9", mode: "program", location: "Bairnsdale" },
  { id: 13, emoji: "🌱", name: "Garden Club",              days: [2], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Capacity Building",       color: "#27AE60", mode: "program", location: "Bairnsdale" },
  { id: 14, emoji: "🚐", name: "Exploring East Gippsland", days: [2], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Community Participation", color: "#D35400", mode: "program", location: "Bairnsdale" },

  // ===== Wednesday (Lakes only) =====
  { id: 15, emoji: "🏊", name: "Swimming (Aqua Dome)", days: [3], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Fitness & Wellbeing", color: "#3498DB", mode: "program", location: "Lakes" },
  { id: 16, emoji: "🏉", name: "Footy",                days: [3], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Fitness & Wellbeing", color: "#C0392B", mode: "program", location: "Lakes" },
  { id: 17, emoji: "🏠", name: "In-House Activities",  days: [3], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Social Connection",   color: "#E67E22", mode: "program", location: "Lakes" },

  // ===== Thursday =====
  { id: 18, emoji: "⛳", name: "Mini Golf", days: [4], start_block: 2, end_block: 2, time: "12pm – 3pm", category: "Community Participation", color: "#2ECC71", mode: "program", location: "Lakes" },

  // ===== Friday =====
  { id: 19, emoji: "🎳", name: "Bowling",     days: [5], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Community Participation", color: "#8E44AD", mode: "program", location: "Sale" },
  { id: 20, emoji: "🌟", name: "Free Choice", days: [5], start_block: 1, end_block: 2, time: "9am – 3pm", category: "Community Participation", color: "#F1C40F", mode: "program", location: "Lakes" },

  // ===== One-on-one =====
  { id: 101, emoji: "🚗", name: "Community Outing",                 days: [1,2,3,4,5], start_block: 1, end_block: 1, time: "9am – 12pm", category: "1:1 Support", color: "#3F51B5", mode: "one_on_one" },
  { id: 102, emoji: "🛒", name: "Shopping Support",                 days: [1,2,3,4,5], start_block: 2, end_block: 2, time: "12pm – 3pm", category: "1:1 Support", color: "#009688", mode: "one_on_one" },
  { id: 103, emoji: "🏋️", name: "Skill Building & Resume Writing", days: [1,2,3,4,5], start_block: 3, end_block: 3, time: "3pm – 6pm",  category: "1:1 Support", color: "#795548", mode: "one_on_one" },
];
