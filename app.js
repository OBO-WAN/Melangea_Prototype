// Minimal JS: playlist -> plays in featured player + mobile nav toggle
const tracks = [
  { title: "Jeu des Nuages", subtitle: "Live Session", duration: "3:42", src: "assets/MP3/02-Jeu-des-Nuages.mp3" },
  { title: "Valse des Oiseaux", subtitle: "Studio Cut", duration: "4:10", src: "assets/MP3/03-Valse-des-Oiseaux.mp3" },
  { title: "Cogene", subtitle: "Acoustic", duration: "3:15", src: "assets/MP3/09-Cogene.mp3" }
];

const featuredAudio = document.getElementById("featuredAudio");
const featuredTitle = document.getElementById("featuredTitle");
const featuredDuration = document.getElementById("featuredDuration");
const trackList = document.getElementById("trackList");
const trackCount = document.getElementById("trackCount");

function setFeatured(track) {
  featuredTitle.textContent = track.title;
  featuredDuration.textContent = track.duration;
  if (track.src) {
    featuredAudio.src = track.src;
  } else {
    featuredAudio.removeAttribute("src");
    featuredAudio.load();
  }
}

function renderTracks() {
  trackCount.textContent = `${tracks.length} Tracks`;
  trackList.innerHTML = "";

  tracks.forEach((t, idx) => {
    const li = document.createElement("li");
    li.className = "track";

    li.innerHTML = `
      <div class="meta">
        <div class="title">${t.title}</div>
        <div class="sub">${t.subtitle} • ${t.duration}</div>
      </div>
      <button type="button" data-idx="${idx}">
        ▶︎ Play
      </button>
    `;

    const btn = li.querySelector("button");

    btn.addEventListener("click", () => {
      const isCurrent = featuredAudio.src.includes(t.src);
      const isPlaying = !featuredAudio.paused;

      // If clicking the same track while playing → pause
      if (isCurrent && isPlaying) {
        featuredAudio.pause();
        btn.textContent = "▶︎ Play";
        return;
      }

      // Otherwise load & play selected track
      setFeatured(t);
      featuredAudio.play().catch(() => {});

      // Reset all buttons
      document.querySelectorAll(".track button").forEach(b => {
        b.textContent = "▶︎ Play";
      });

      btn.textContent = "⏸ Pause";
    });

    trackList.appendChild(li);
  });
}

// Init
renderTracks();
setFeatured(tracks[0] || { title: "—", duration: "—", src: "" });

// Mobile nav toggle (simple demo)
const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.style.display === "flex";
    nav.style.display = open ? "none" : "flex";
    nav.style.flexDirection = "column";
    nav.style.position = "absolute";
    nav.style.right = "1rem";
    nav.style.top = "64px";
    nav.style.padding = "1rem";
    nav.style.background = "rgba(17,21,38,.95)";
    nav.style.border = "1px solid rgba(255,255,255,.08)";
    nav.style.borderRadius = "16px";
    toggle.setAttribute("aria-expanded", String(!open));
  });
}


