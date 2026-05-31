/*
  Konzerttermine zentral pflegen:
  - Neue Termine als Objekt in die Liste eintragen.
  - Datum bitte im deutschen Format TT.MM.JJJJ schreiben.
  - Uhrzeit bitte mit "Uhr" schreiben, z. B. "19:30 Uhr".
  - status: "upcoming" für kommende Termine, "past" für Archivtermine.
  - detailsUrl oder ticketsUrl auf "#" lassen, wenn noch kein Link vorhanden ist.
*/
window.CONCERT_EVENTS = [
  {
    date: "12.04.2026",
    time: "19:30 Uhr",
    title: "Konzert",
    venue: "Freinsheim",
    city: "Freinsheim",
    description: "Kurze Beschreibung oder Programmhinweis ergänzen.",
    detailsUrl: "#",
    ticketsUrl: "#",
    status: "upcoming"
  }
];
