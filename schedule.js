// Upcoming EOS 14 matches, edited by hand. Times are Finnish time (EET).
// Group stage: {stage, date: 'YYYY-MM-DD', time: 'HH:MM', a, b} with team names exactly as in the stats.
// Playoffs: {stage: 'Playoffs', date, time, label, bo}; add a and b once the teams are known.
// A match disappears once its result is in the stats (or a day after it was scheduled).
window.EOS_SCHEDULE = [
  {"stage": "Round 3", "date": "2026-11-09", "time": "17:30", "a": "HAVU", "b": "BOJONG"},
  {"stage": "Round 3", "date": "2026-11-09", "time": "20:00", "a": "SINQU", "b": "Nordic Valor"},
  {"stage": "Round 3", "date": "2026-11-10", "time": "17:30", "a": "Prestige", "b": "ROUNDS"},
  {"stage": "Round 3", "date": "2026-11-10", "time": "20:00", "a": "KUUSAMO.gg", "b": "boyband"},
  {"stage": "Round 4", "date": "2026-11-11", "time": "17:30", "a": "SINQU", "b": "KUUSAMO.gg"},
  {"stage": "Round 4", "date": "2026-11-11", "time": "20:00", "a": "HAVU", "b": "boyband"},
  {"stage": "Round 4", "date": "2026-11-12", "time": "17:30", "a": "Prestige", "b": "BOJONG"},
  {"stage": "Round 4", "date": "2026-11-12", "time": "20:00", "a": "Nordic Valor", "b": "ROUNDS"},
  {"stage": "Round 5", "date": "2026-11-16", "time": "17:30", "a": "ROUNDS", "b": "BOJONG"},
  {"stage": "Round 5", "date": "2026-11-16", "time": "20:00", "a": "KUUSAMO.gg", "b": "Nordic Valor"},
  {"stage": "Round 5", "date": "2026-11-17", "time": "17:30", "a": "HAVU", "b": "Prestige"},
  {"stage": "Round 5", "date": "2026-11-17", "time": "20:00", "a": "SINQU", "b": "boyband"},
  {"stage": "Round 6", "date": "2026-11-18", "time": "17:30", "a": "KUUSAMO.gg", "b": "ROUNDS"},
  {"stage": "Round 6", "date": "2026-11-18", "time": "20:00", "a": "Nordic Valor", "b": "BOJONG"},
  {"stage": "Round 6", "date": "2026-11-19", "time": "17:30", "a": "SINQU", "b": "HAVU"},
  {"stage": "Round 6", "date": "2026-11-19", "time": "20:00", "a": "Prestige", "b": "boyband"},
  {"stage": "Round 7", "date": "2026-11-23", "time": "17:30", "a": "SINQU", "b": "ROUNDS"},
  {"stage": "Round 7", "date": "2026-11-23", "time": "20:00", "a": "Prestige", "b": "Nordic Valor"},
  {"stage": "Round 7", "date": "2026-11-24", "time": "17:30", "a": "boyband", "b": "BOJONG"},
  {"stage": "Round 7", "date": "2026-11-24", "time": "20:00", "a": "HAVU", "b": "KUUSAMO.gg"},
  {"stage": "Playoffs", "date": "2026-11-27", "time": "17:30", "label": "Upper Bracket Semi-final #1", "bo": 3},
  {"stage": "Playoffs", "date": "2026-11-27", "time": "20:00", "label": "Upper Bracket Semi-final #2", "bo": 3},
  {"stage": "Playoffs", "date": "2026-11-28", "time": "17:30", "label": "Lower Bracket Final", "bo": 3},
  {"stage": "Playoffs", "date": "2026-11-28", "time": "20:00", "label": "Upper Bracket Final", "bo": 3},
  {"stage": "Playoffs", "date": "2026-11-29", "time": "17:30", "label": "Consolidation Final", "bo": 3},
  {"stage": "Playoffs", "date": "2026-11-29", "time": "20:30", "label": "Grand Final", "bo": 3}
];
