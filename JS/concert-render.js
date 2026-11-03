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
      const response = await fetch(CONCERTS_DATA_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(
          `Concert data request failed with status ${response.status}`
        );
      }

      const events = await response.json();

      if (!Array.isArray(events)) throw new Error("Invalid concert data.");

      return events
        .map((event) => ({ ...event, sortDate: parseGermanDate(event.date) }))
        .sort((eventA, eventB) => eventA.sortDate - eventB.sortDate);
    } catch (error) {
      console.error("Unable to load concert data.", error);
      return null; // Preserve the last successful listing on a transient failure.
    }
  };

  const parseGermanDate = (date) => {
    const [day, month, year] = String(date || "")
      .split(".")
      .map((value) => Number.parseInt(value, 10));

    if (!day || !month || !year) return new Date(0);

    return new Date(year, month - 1, day);
  };

  // Compare calendar dates and clock times in the concert venue's time zone,
  // regardless of the visitor's time zone or daylight saving offset.
  const berlinClock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const getBerlinTimeKey = () => {
    const parts = Object.fromEntries(
      berlinClock.formatToParts(new Date()).map(({ type, value }) => [type, value])
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };

  const getHideTimeKey = (event) => {
    const [day, month, year] = String(event.date || "")
      .split(".")
      .map((value) => Number.parseInt(value, 10));
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) ||
      Number.isNaN(date.getTime()) ||
      date.getUTCDate() !== day || date.getUTCMonth() !== month - 1 ||
      date.getUTCFullYear() !== year
    ) {
      return "";
    }

    date.setUTCDate(date.getUTCDate() + 1);
    const hideAfter = typeof event.hideAfter === "string" &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event.hideAfter)
      ? event.hideAfter
      : "03:00"; // Existing records use the admin default until saved again.
    return `${date.toISOString().slice(0, 10)}T${hideAfter}`;
  };

  const isVisible = (event, berlinNow) => {
    if (event.status === "past") return false;
    const hideTime = getHideTimeKey(event);
    return hideTime !== "" && berlinNow < hideTime;
  };

  const isCancelled = (event) => event.cancelled === true || event.status === "cancelled";

  const createCancellationNotice = (event) => {
    const notice = document.createElement("div");
    notice.className = "concert-cancellation";
    const label = document.createElement("strong");
    label.className = "concert-cancellation__label";
    label.textContent = "ABGESAGT";
    notice.append(label);

    const reason = typeof event.cancellationReason === "string" ? event.cancellationReason.trim() : "";
    if (reason) {
      const message = document.createElement("p");
      message.className = "concert-cancellation__reason";
      message.textContent = reason;
      notice.append(message);
    }
    return notice;
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

  const limitEvents = (container, events) => {
    const limit = Number.parseInt(container.dataset.concertLimit || "", 10);

    return Number.isInteger(limit) && limit > 0
      ? events.slice(0, limit)
      : events;
  };

  const renderCompactList = (events) => {
    document.querySelectorAll("[data-concert-render='compact']").forEach((list) => {
      const visibleEvents = limitEvents(list, events);
      list.replaceChildren(...visibleEvents.map(createCompactEvent));

      if (events.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "event";
        emptyItem.textContent = "Aktuell sind keine Konzerttermine angekündigt.";
        list.append(emptyItem);
      }
    });
  };

  const createCompactEvent = (event) => {
    const cancelled = isCancelled(event);
    const dateParts = getDateParts(event.date);
    const item = document.createElement("li");
    item.className = cancelled ? "event event--cancelled" : "event";

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
    actions.append(createLink("btn btn-small btn-ghost", event.detailsUrl, "Details"));
    if (!cancelled) actions.append(createLink("btn btn-small", event.ticketsUrl, "Tickets"));

    date.append(day, month);
    if (cancelled) body.append(createCancellationNotice(event));
    body.append(title, meta);
    item.append(date, body, actions);

    return item;
  };

  const renderConcertCards = (events) => {
    document.querySelectorAll("[data-concert-render='cards']").forEach((grid) => {
      const visibleEvents = limitEvents(grid, events);
      grid.replaceChildren(...visibleEvents.map(createConcertCard));

      if (events.length === 0) {
        const emptyCard = document.createElement("article");
        emptyCard.className = "card concerts-card";
        emptyCard.setAttribute("role", "listitem");
        emptyCard.setAttribute("data-aos", "fade-up");
        emptyCard.textContent = "Aktuell sind keine Konzerttermine angekündigt.";
        grid.append(emptyCard);
      }
    });
  };

  const createConcertCard = (event) => {
    const cancelled = isCancelled(event);
    const card = document.createElement("article");
    card.className = cancelled ? "card concerts-card concerts-card--cancelled" : "card concerts-card";
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

    if (cancelled) details.append(createCancellationNotice(event));
    details.append(location, meta);

    const actions = document.createElement("div");
    actions.className = "concerts-card__actions";
    actions.append(createLink("btn btn-small btn-ghost", event.detailsUrl, "Details"));
    if (!cancelled) actions.append(createLink("btn btn-small", event.ticketsUrl, "Tickets"));
    details.append(actions);

    const programme = document.createElement("div");
    programme.className = "concerts-card__programme";

    const title = document.createElement("h4");
    title.className = "concerts-card__title";
    title.textContent = event.title || "Konzert";

    const description = document.createElement("div");
    description.className = "concerts-card__description";
    const descriptionText = String(event.description || "").replace(/\r\n?/g, "\n").trim();
    if (descriptionText) {
      descriptionText.split(/\n[\t ]*\n(?:[\t ]*\n)*/).forEach((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text.trim();
        description.append(paragraph);
      });
    }

    programme.append(title);
    if (description.childElementCount) programme.append(description);
    card.append(date, details, programme);

    return card;
  };

  document.addEventListener("DOMContentLoaded", async () => {
    let events = await loadEvents() || [];
    let refreshing = false;
    let lastVisibleKey = null;

    const renderIfChanged = () => {
      const berlinNow = getBerlinTimeKey();
      const visibleEvents = events.filter((event) => isVisible(event, berlinNow));
      const visibleKey = JSON.stringify(visibleEvents);
      if (visibleKey === lastVisibleKey) return;

      lastVisibleKey = visibleKey;
      renderCompactList(visibleEvents);
      renderConcertCards(visibleEvents);
      refreshAnimations();
    };

    renderIfChanged();
    const refreshEvents = async () => {
      renderIfChanged();
      if (refreshing || document.hidden) return;
      refreshing = true;
      try {
        const updated = await loadEvents();
        if (updated !== null) {
          events = updated;
          renderIfChanged();
        }
      } finally {
        refreshing = false;
      }
    };

    // Update cancellations on open pages and recheck each Berlin clock minute.
    setTimeout(() => {
      refreshEvents();
      setInterval(refreshEvents, 60_000);
    }, 60_000 - (Date.now() % 60_000) + 100);
    document.addEventListener("visibilitychange", refreshEvents);
  });
})();
