(function () {
  const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mär",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ];

  const CONCERTS_DATA_URL = "./data/concerts.json";

  const loadEvents = async () => {
    try {
      const response = await fetch(CONCERTS_DATA_URL);

      if (!response.ok) {
        throw new Error(
          `Concert data request failed with status ${response.status}`
        );
      }

      const events = await response.json();

      if (!Array.isArray(events)) return [];

      return events
        .map((event) => ({ ...event, sortDate: parseGermanDate(event.date) }))
        .sort((eventA, eventB) => eventA.sortDate - eventB.sortDate);
    } catch (error) {
      console.error("Unable to load concert data.", error);
      return [];
    }
  };

  const parseGermanDate = (date) => {
    const [day, month, year] = String(date || "")
      .split(".")
      .map((value) => Number.parseInt(value, 10));

    if (!day || !month || !year) return new Date(0);

    return new Date(year, month - 1, day);
  };

  const getDateParts = (date) => {
    const [day = "", month = ""] = String(date || "").split(".");
    const monthIndex = Number.parseInt(month, 10) - 1;

    return {
      day,
      month: MONTHS_SHORT[monthIndex] || month,
    };
  };


  const getCompactMeta = (event) => {
    return [event.city || event.venue, event.time].filter(Boolean).join(" • ");
  };

  const createLink = (className, href, text) => {
    const link = document.createElement("a");
    link.className = className;
    link.href = href || "#";
    link.textContent = text;
    return link;
  };

  const refreshAnimations = () => {
    if (window.AOS && typeof window.AOS.refreshHard === "function") {
      window.AOS.refreshHard();
    }
  };

  const renderCompactList = (events) => {
    document.querySelectorAll("[data-concert-render='compact']").forEach((list) => {
      const upcomingEvents = events.filter((event) => event.status !== "past");
      list.replaceChildren(...upcomingEvents.map(createCompactEvent));

      if (upcomingEvents.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "event";
        emptyItem.textContent = "Aktuell sind keine Konzerttermine eingetragen.";
        list.append(emptyItem);
      }
    });
  };

  const createCompactEvent = (event) => {
    const dateParts = getDateParts(event.date);
    const item = document.createElement("li");
    item.className = "event";

    const date = document.createElement("div");
    date.className = "event-date";

    const day = document.createElement("div");
    day.className = "event-day";
    day.textContent = dateParts.day;

    const month = document.createElement("div");
    month.className = "event-month";
    month.textContent = dateParts.month;

    const body = document.createElement("div");
    body.className = "event-body";

    const title = document.createElement("div");
    title.className = "strong";
    title.textContent = event.title || "Konzert";

    const meta = document.createElement("div");
    meta.className = "muted small";
    meta.textContent = getCompactMeta(event);

    const actions = document.createElement("div");
    actions.className = "event-actions";
    actions.append(
      createLink("btn btn-small btn-ghost", event.detailsUrl, "Details"),
      createLink("btn btn-small", event.ticketsUrl, "Tickets")
    );

    date.append(day, month);
    body.append(title, meta);
    item.append(date, body, actions);

    return item;
  };

  const renderConcertCards = (events) => {
    document.querySelectorAll("[data-concert-render='cards']").forEach((grid) => {
      const status = grid.dataset.concertStatus;
      const matchingEvents = events.filter((event) => event.status === status);
      grid.replaceChildren(...matchingEvents.map(createConcertCard));

      if (matchingEvents.length === 0) {
        const emptyCard = document.createElement("article");
        emptyCard.className = status === "past"
          ? "card concerts-card concerts-card--past"
          : "card concerts-card";
        emptyCard.setAttribute("role", "listitem");
        emptyCard.setAttribute("data-aos", "fade-up");
        emptyCard.textContent = status === "past"
          ? "Aktuell sind keine vergangenen Konzerte eingetragen."
          : "Aktuell sind keine Konzerttermine eingetragen.";
        grid.append(emptyCard);
      }
    });
  };

  const createConcertCard = (event) => {
    const card = document.createElement("article");
    card.className = event.status === "past"
      ? "card concerts-card concerts-card--past"
      : "card concerts-card";
    card.setAttribute("data-aos", "fade-up");
    card.setAttribute("role", "listitem");

    const date = document.createElement("p");
    date.className = "concerts-card__date";
    date.textContent = event.date || "";

    const details = document.createElement("div");
    details.className = "concerts-card__details";

    const location = document.createElement("h3");
    location.className = "concerts-card__location";
    location.textContent = event.city || event.venue || "Konzert";

    const meta = document.createElement("p");
    meta.className = "concerts-card__meta";
    meta.textContent = [event.venue, event.time].filter(Boolean).join(" · ");

    details.append(location, meta);

    if (event.status !== "past") {
      const actions = document.createElement("div");
      actions.className = "concerts-card__actions";
      actions.append(
        createLink("btn btn-small btn-ghost", event.detailsUrl, "Details"),
        createLink("btn btn-small", event.ticketsUrl, "Tickets")
      );
      details.append(actions);
    }

    const programme = document.createElement("div");
    programme.className = "concerts-card__programme";

    const title = document.createElement("h4");
    title.className = "concerts-card__title";
    title.textContent = event.title || "Konzert";

    const description = document.createElement("p");
    description.className = "concerts-card__description";
    description.textContent = event.description || "";

    programme.append(title, description);
    card.append(date, details, programme);

    return card;
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const events = await loadEvents();
    renderCompactList(events);
    renderConcertCards(events);
    refreshAnimations();
  });
})();
