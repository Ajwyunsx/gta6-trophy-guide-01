/* Leonida Ledger — view layer.
   Classic script, no build step, no network: the trophy set arrives as window.LEONIDA from
   data/trophies.js (a mirror of data/trophies.json, which is the file the entry is graded on).
   All state lives in localStorage; nothing is posted anywhere. */

(function () {
  "use strict";

  var DATA = window.LEONIDA;
  var STORE = "leonida-ledger-v1";

  var GRADES = ["platinum", "gold", "silver", "bronze"];
  var KIND_LABEL = {
    story: "Story",
    side: "Side missions",
    robberies: "Robberies",
    activities: "Activities",
    challenges: "Challenges",
    collectibles: "Collectibles",
    secrets: "Secrets",
    platinum: "Platinum"
  };
  var KIND_ORDER = ["story", "side", "robberies", "activities", "challenges", "collectibles", "secrets", "platinum"];

  var state = {
    earned: {},
    view: "board",
    q: "",
    kinds: {},       // kind -> true when the chip is on
    grades: {},
    missable: false,
    earnedOnly: false,
    unearnedOnly: false,
    spoilers: true,
    selected: null,
    demo: false      // ?demo=1: a sample save held in memory, never written to localStorage
  };

  /* A demo save exists so a screenshot (or a curious visitor) can see the tracker with progress
     in it without inheriting somebody else's ticks. It is read-only: with ?demo=1 loaded, save()
     does nothing and the toolbar says so. */
  var DEMO_EARNED = [
    "vice-got-a-price", "just-like-paradise", "paradise-lost", "t-stars-ass-drug-money",
    "vice-city-baby", "top-of-the-world-ma", "you-gotta-know-when-to-get-off", "trust",
    "break-the-bank", "family-matters", "dwnfall", "hi-jacked", "snow-storm",
    "retail-therapy", "sneakthief", "lets-go-bowling", "dime-on-the-dollar",
    "baited-my-tackle", "strangers-and-freaks", "master-of-none", "top-fun",
    "earn-cash-not-kudos", "stick-fiddler", "one-last-thing", "hot-together",
    "whip-it-good", "you-wainker", "the-goodtime-state", "little-boxes",
    "in-the-beginning", "treat-yo-self", "positive-mental-attitude"
  ];

  function param(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(String(window.location.href));
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* ── storage ─────────────────────────────────────────── */

  function load() {
    if (param("demo") === "1") {
      state.demo = true;
      DEMO_EARNED.forEach(function (slug) { state.earned[slug] = 1; });
      var sp = param("spoilers");
      if (sp === "0") state.spoilers = false;
      return;
    }
    var raw = null;
    try { raw = window.localStorage.getItem(STORE); } catch (e) { raw = null; }
    if (!raw) return;
    try {
      var saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        state.earned = (saved.earned && typeof saved.earned === "object") ? saved.earned : {};
        if (typeof saved.spoilers === "boolean") state.spoilers = saved.spoilers;
      }
    } catch (e) { /* a corrupt slot is just an empty slot */ }
  }

  function save() {
    if (state.demo) { renderSavePreview(); return; }
    var payload = {
      v: 1,
      game: DATA.game,
      platform: DATA.platform,
      savedAt: new Date().toISOString(),
      earned: state.earned,
      spoilers: state.spoilers
    };
    try { window.localStorage.setItem(STORE, JSON.stringify(payload)); } catch (e) { /* private mode */ }
    renderSavePreview();
  }

  /* ── helpers ─────────────────────────────────────────── */

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function isEarned(t) { return !!state.earned[t.slug]; }

  function setEarned(t, on) {
    if (on) state.earned[t.slug] = 1;
    else delete state.earned[t.slug];
    // The platinum is not tickable on its own: it is earned by finishing the other 54.
    if (t.grade === "platinum" && on && earnedCount() < DATA.trophies.length) {
      delete state.earned[t.slug];
      toast("The platinum waits for the other 54.");
    }
    save();
    renderAll();
  }

  function earnedCount() {
    return DATA.trophies.filter(isEarned).length;
  }

  function bySlug(slug) {
    for (var i = 0; i < DATA.trophies.length; i++) if (DATA.trophies[i].slug === slug) return DATA.trophies[i];
    return null;
  }

  function masked(t) {
    return state.spoilers && t.hidden && !isEarned(t);
  }

  function sourceList(t) {
    return (t.sources || []).map(function (k) { return DATA.sources[k]; }).filter(Boolean);
  }

  var toastTimer = null;
  function toast(msg) {
    var n = $("toast");
    n.textContent = msg;
    n.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { n.classList.remove("on"); }, 2400);
  }

  /* ── filters ─────────────────────────────────────────── */

  function matches(t) {
    if (state.kinds[t.kind] !== true) {
      // no kind chosen at all means "all kinds"
      if (Object.keys(state.kinds).some(function (k) { return state.kinds[k]; })) return false;
    }
    if (Object.keys(state.grades).some(function (g) { return state.grades[g]; }) && !state.grades[t.grade]) return false;
    if (state.missable && !t.missable) return false;
    if (state.earnedOnly && !isEarned(t)) return false;
    if (state.unearnedOnly && isEarned(t)) return false;
    if (state.q) {
      var hay = (t.name + " " + t.description + " " + (masked(t) ? "" : t.guide) + " " + KIND_LABEL[t.kind] + " " + (t.countLabel || "")).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  /* ── board ───────────────────────────────────────────── */

  function buildChips() {
    var kindBox = $("kindFilters");
    var counts = {};
    DATA.trophies.forEach(function (t) { counts[t.kind] = (counts[t.kind] || 0) + 1; });

    KIND_ORDER.forEach(function (kind) {
      if (!counts[kind]) return;
      var b = el("button", "chip", KIND_LABEL[kind]);
      b.type = "button";
      b.appendChild(el("b", null, String(counts[kind])));
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        state.kinds[kind] = !state.kinds[kind];
        b.classList.toggle("is-on", !!state.kinds[kind]);
        b.setAttribute("aria-pressed", String(!!state.kinds[kind]));
        renderBoard();
      });
      kindBox.appendChild(b);
    });

    var gradeBox = $("gradeFilters");
    GRADES.forEach(function (g) {
      var b = el("button", "chip", g.charAt(0).toUpperCase() + g.slice(1));
      b.type = "button";
      b.appendChild(el("b", null, String(DATA.trophies.filter(function (t) { return t.grade === g; }).length)));
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        state.grades[g] = !state.grades[g];
        b.classList.toggle("is-on", !!state.grades[g]);
        b.setAttribute("aria-pressed", String(!!state.grades[g]));
        renderBoard();
      });
      gradeBox.appendChild(b);
    });
  }

  function renderBoard() {
    var list = $("board");
    list.innerHTML = "";
    var shown = DATA.trophies.filter(matches);

    shown.forEach(function (t) {
      var li = el("li", "row");
      li.dataset.slug = t.slug;
      li.tabIndex = 0;
      if (isEarned(t)) li.classList.add("is-done");
      if (state.selected === t.slug) li.classList.add("is-sel");

      var check = el("span", "check" + (isEarned(t) ? " on" : ""));
      check.setAttribute("role", "checkbox");
      check.setAttribute("aria-checked", String(!!isEarned(t)));
      check.setAttribute("aria-label", "Mark " + (masked(t) ? "hidden trophy" : t.name) + " earned");
      check.addEventListener("click", function (ev) {
        ev.stopPropagation();
        setEarned(t, !isEarned(t));
      });

      var grade = el("span", "grade g-" + t.grade, t.grade);

      var nameWrap = el("div");
      var name = el("span", "rname");
      if (masked(t)) {
        name.appendChild(el("span", "row-mask", "Hidden story trophy"));
      } else {
        name.textContent = t.name;
      }
      nameWrap.appendChild(name);

      var sub = el("span", "rsub");
      sub.textContent = masked(t) ? "Earn it to reveal the name and description." : t.description;
      nameWrap.appendChild(sub);

      var tags = el("div", "tags");
      if (t.missable) tags.appendChild(el("span", "tag miss", "missable"));
      if (t.hidden) tags.appendChild(el("span", "tag hid", "hidden"));
      if (t.count) tags.appendChild(el("span", "tag cnt", t.count + " " + (t.countLabel || "")));

      li.appendChild(check);
      li.appendChild(grade);
      li.appendChild(nameWrap);
      li.appendChild(tags);

      function pick() { selectTrophy(t.slug); }
      li.addEventListener("click", pick);
      li.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); }
      });

      list.appendChild(li);
    });

    $("resultLine").textContent = shown.length + " of " + DATA.trophies.length + " shown" +
      (state.q ? " · “" + state.q + "”" : "") + " · " + earnedCount() + " earned";

    if (!shown.length) {
      var empty = el("li", "row");
      empty.style.cursor = "default";
      empty.appendChild(el("span", null, "Nothing matches those filters."));
      list.appendChild(empty);
    }
  }

  function selectTrophy(slug) {
    state.selected = slug;
    Array.prototype.forEach.call($("board").children, function (row) {
      row.classList.toggle("is-sel", row.dataset.slug === slug);
    });
    renderDetail();
  }

  function renderDetail() {
    var t = state.selected ? bySlug(state.selected) : null;
    var body = $("detailBody");
    var empty = $("detailEmpty");

    if (!t) {
      body.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    body.hidden = false;
    body.innerHTML = "";

    var head = el("div", "d-head");
    var left = el("div");
    left.appendChild(el("p", "eyebrow", KIND_LABEL[t.kind] + " · " + t.grade));
    left.appendChild(el("h3", "d-title", masked(t) ? "Hidden trophy" : t.name));
    left.appendChild(el("p", "d-desc", masked(t) ? "Its description is hidden until you earn it." : t.description));
    head.appendChild(left);
    head.appendChild(el("span", "grade g-" + t.grade, t.grade));
    body.appendChild(head);

    var meta = el("div", "d-meta");
    meta.appendChild(el("span", "tag", "no. " + String(t.id).padStart(2, "0")));
    if (t.hidden) meta.appendChild(el("span", "tag hid", "hidden on PSN"));
    if (t.missable) meta.appendChild(el("span", "tag miss", "missable"));
    if (t.count) meta.appendChild(el("span", "tag cnt", t.count + " " + (t.countLabel || "")));
    body.appendChild(meta);

    if (masked(t)) {
      var veil = el("div", "spoiler-veil");
      veil.appendChild(el("strong", null, "Spoiler shield is on"));
      veil.appendChild(document.createTextNode("This is a hidden story trophy. Tick it as earned — or switch the shield off in the toolbar — to read its name, description, guide and sources."));
      veil.style.marginTop = "16px";
      body.appendChild(veil);
    } else {
      body.appendChild(el("p", "d-guide", t.guide));

      var timing = el("div", "d-block");
      timing.appendChild(el("h4", null, t.missable ? "When it can be missed" : "When to do it"));
      timing.appendChild(el("p", t.missable ? "warn" : null, t.timing));
      body.appendChild(timing);

      var srcs = sourceList(t);
      if (srcs.length) {
        var sblock = el("div", "d-block");
        sblock.appendChild(el("h4", null, "Sources for this guide"));
        var ul = el("ul", "d-src");
        srcs.forEach(function (s, i) {
          var li = el("li");
          var a = el("a", null);
          a.href = s.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.appendChild(el("span", "num", "[" + (i + 1) + "]"));
          a.appendChild(document.createTextNode(s.name));
          li.appendChild(a);
          ul.appendChild(li);
        });
        sblock.appendChild(ul);
        body.appendChild(sblock);
      }
    }

    var btn = el("button", "d-check" + (isEarned(t) ? " on" : ""), isEarned(t) ? "Earned — tap to undo" : "Mark as earned");
    btn.type = "button";
    btn.addEventListener("click", function () { setEarned(t, !isEarned(t)); });
    body.appendChild(btn);
  }

  /* ── header ──────────────────────────────────────────── */

  function renderHeader() {
    var total = DATA.trophies.length;
    var got = earnedCount();
    var pct = Math.round((got / total) * 100);
    $("ringNum").innerHTML = pct + "<em>%</em>";
    $("ringArc").style.strokeDashoffset = String(326.7 * (1 - got / total));
    $("earnedCount").textContent = got + " / " + total;
    var plat = bySlug("vice-got-a-price");
    var others = DATA.trophies.filter(function (t) { return t.grade !== "platinum"; });
    var rest = others.filter(function (t) { return !isEarned(t); }).length;
    $("platinumLine").textContent = plat && isEarned(plat)
      ? "platinum earned"
      : rest + (rest === 1 ? " trophy" : " trophies") + " between you and the platinum";
    $("ring").setAttribute("aria-label", pct + "% complete: " + got + " of " + total + " trophies");
  }

  /* ── roadmap ─────────────────────────────────────────── */

  function renderRoadmap() {
    var ol = $("road");
    ol.innerHTML = "";
    DATA.roadmap.forEach(function (stage) {
      var items = stage.trophies.map(bySlug).filter(Boolean);
      var done = items.filter(isEarned).length;
      var li = el("li", "stage" + (done === items.length ? " is-done" : ""));

      var card = el("div", "stage-card");
      var top = el("div", "stage-top");
      top.appendChild(el("span", "stage-num", "STAGE 0" + stage.stage));
      top.appendChild(el("h3", "stage-title", stage.title));
      top.appendChild(el("span", "stage-win", stage.window));
      card.appendChild(top);

      card.appendChild(el("p", "stage-note", stage.note));

      var pills = el("div", "stage-list");
      var locked = 0;
      items.forEach(function (t) {
        if (masked(t)) { locked++; return; }
        var p = el("button", "pill" + (isEarned(t) ? " on" : "") + (t.missable ? " miss" : ""));
        p.type = "button";
        p.appendChild(el("i"));
        p.appendChild(document.createTextNode(t.name));
        p.title = t.description;
        p.addEventListener("click", function () { setEarned(t, !isEarned(t)); });
        pills.appendChild(p);
      });
      if (locked) {
        // Twelve identical "hidden story trophy" pills would say nothing. One pill, one number.
        var lp = el("button", "pill locked", locked + (locked === 1 ? " hidden story trophy" : " hidden story trophies"));
        lp.type = "button";
        lp.title = "Names hidden until earned — turn the spoiler shield off on the board to read them";
        lp.addEventListener("click", function () {
          toast("Hidden until earned. The shield switch is on the board.");
        });
        pills.appendChild(lp);
      }
      card.appendChild(pills);

      var bar = el("div", "stage-bar");
      var fill = el("i");
      fill.style.width = (items.length ? (done / items.length) * 100 : 0) + "%";
      bar.appendChild(fill);
      card.appendChild(bar);

      li.appendChild(card);
      ol.appendChild(li);
    });
  }

  /* ── missables ───────────────────────────────────────── */

  function renderMissables() {
    var box = $("missableCards");
    box.innerHTML = "";
    DATA.trophies.filter(function (t) { return t.missable; }).forEach(function (t) {
      var card = el("div", "card");
      card.appendChild(el("span", "where", "Chapter 1 · Jason's house · balcony"));
      card.appendChild(el("h3", null, t.name));
      card.appendChild(el("p", null, "Eighteen meditation spots, and one of them only exists while Chapter 1 is running. After the mission Down to Earth, talk to Lucia in the kitchen in the morning; she says she is going to meditate and walks to the balcony. Follow her and accept. It bumps the meditation counter but is never listed as a spot, and Chapter 1 ending closes it for good."));
      var why = el("div", "why");
      why.textContent = "PowerPyx still lists it as the set's only potentially missable trophy. Whether the platinum strictly requires it is unconfirmed — so do it, and the question stops mattering.";
      card.appendChild(why);
      box.appendChild(card);
    });

    var nots = [
      ["Kenton's questline", "He vanishes after Chapter 1 and looks lost. He texts Jason again in Chapters 2–3 and his seven shipwrecks stay open after the story."],
      ["Andy, Billy, Randy, Tyrone, Bret", "All five side chains are optional, but none expire. Andy is Lucia-only, Tyrone and Bret are Jason-only — a character switch, not a clock."],
      ["A Long Road (100%)", "The checklist only appears after the credits, which makes it feel late. Everything on it can still be done in free roam."],
      ["Shooting ranges and drone races", "Skill checks, not deadlines. Both can be replayed until you get the result you need."],
      ["Story trophies", "Twelve of them, all automatic. There is no mission replay, but there is also no way to fail a story trophy."],
      ["The far bank vaults", "Maximum Withdrawal wants five of eight; the 100% checklist wants all eight. Neither has a cutoff."]
    ];
    var ul = $("notMissable");
    ul.innerHTML = "";
    nots.forEach(function (pair) {
      var li = el("li");
      li.appendChild(el("b", null, pair[0]));
      li.appendChild(document.createTextNode(pair[1]));
      ul.appendChild(li);
    });
  }

  /* ── data view ───────────────────────────────────────── */

  function renderData() {
    var stats = $("setStats");
    stats.innerHTML = "";
    var rows = [
      ["Trophies", DATA.trophies.length],
      ["Platinum", DATA.trophies.filter(function (t) { return t.grade === "platinum"; }).length],
      ["Gold", DATA.trophies.filter(function (t) { return t.grade === "gold"; }).length],
      ["Silver", DATA.trophies.filter(function (t) { return t.grade === "silver"; }).length],
      ["Bronze", DATA.trophies.filter(function (t) { return t.grade === "bronze"; }).length],
      ["Hidden on PSN", DATA.trophies.filter(function (t) { return t.hidden; }).length],
      ["Missable", DATA.trophies.filter(function (t) { return t.missable; }).length],
      ["Roadmap stages", DATA.roadmap.length],
      ["Cited sources", Object.keys(DATA.sources).length]
    ];
    rows.forEach(function (r) {
      stats.appendChild(el("dt", null, r[0]));
      stats.appendChild(el("dd", null, String(r[1])));
    });

    var list = $("sourceList");
    list.innerHTML = "";
    Object.keys(DATA.sources).forEach(function (k) {
      var s = DATA.sources[k];
      var li = el("li");
      var a = el("a", null, s.name);
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function renderSavePreview() {
    if (state.demo) {
      $("savePreview").textContent = JSON.stringify({
        demo: true,
        note: "This page was opened with ?demo=1, so the 32/55 save you see is held in memory and never written to this browser.",
        earned: Object.keys(state.earned).sort()
      }, null, 1);
      return;
    }
    var raw = "{}";
    try { raw = window.localStorage.getItem(STORE) || "{}"; } catch (e) { raw = "{}"; }
    try { raw = JSON.stringify(JSON.parse(raw), null, 1); } catch (e) { /* keep raw */ }
    $("savePreview").textContent = raw;
  }

  /* ── export / import ─────────────────────────────────── */

  function exportProgress() {
    var payload = {
      app: "leonida-ledger",
      v: 1,
      game: DATA.game,
      platform: DATA.platform,
      exportedAt: new Date().toISOString(),
      earned: Object.keys(state.earned).sort(),
      count: earnedCount(),
      total: DATA.trophies.length
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "leonida-ledger-progress.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Exported " + payload.count + " of " + payload.total + " trophies.");
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var got = 0;
      try {
        var data = JSON.parse(String(reader.result));
        var list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.earned)) list = data.earned;
        else if (data && data.earned && typeof data.earned === "object") list = Object.keys(data.earned);
        list.forEach(function (slug) {
          if (bySlug(slug)) { state.earned[slug] = 1; got++; }
        });
      } catch (e) {
        toast("That file is not a Leonida Ledger save.");
        return;
      }
      save();
      renderAll();
      toast(got ? "Merged " + got + " trophies into your progress." : "No known trophies in that file.");
    };
    reader.readAsText(file);
  }

  /* ── wiring ──────────────────────────────────────────── */

  function renderAll() {
    renderHeader();
    renderBoard();
    renderDetail();
    renderRoadmap();
  }

  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
      tab.addEventListener("click", function () { showView(tab.dataset.view); });
    });

    $("q").addEventListener("input", function (ev) {
      state.q = ev.target.value.trim();
      renderBoard();
    });

    $("fMissable").addEventListener("change", function (ev) { state.missable = ev.target.checked; renderBoard(); });
    $("fEarned").addEventListener("change", function (ev) {
      state.earnedOnly = ev.target.checked;
      if (state.earnedOnly) { state.unearnedOnly = false; $("fUnearned").checked = false; }
      renderBoard();
    });
    $("fUnearned").addEventListener("change", function (ev) {
      state.unearnedOnly = ev.target.checked;
      if (state.unearnedOnly) { state.earnedOnly = false; $("fEarned").checked = false; }
      renderBoard();
    });

    $("spoilers").checked = state.spoilers;
    $("spoilers").addEventListener("change", function (ev) {
      state.spoilers = ev.target.checked;
      $("spoilerHint").textContent = state.spoilers ? "Story names hidden until earned" : "Everything visible — spoilers on";
      save();
      renderAll();
    });
    $("spoilerHint").textContent = state.spoilers ? "Story names hidden until earned" : "Everything visible — spoilers on";

    if (state.demo) {
      $("demoFlag").hidden = false;
      $("resetBtn").disabled = true;
      $("resetBtn").title = "A demo save is read-only";
    }

    $("exportBtn").addEventListener("click", exportProgress);
    $("importFile").addEventListener("change", function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (f) importProgress(f);
      ev.target.value = "";
    });
    $("resetBtn").addEventListener("click", function () {
      state.earned = {};
      save();
      renderAll();
      toast("Progress cleared.");
    });
  }

  function showView(view) {
    if (!view) return;
    state.view = view;
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (o) {
      var on = o.dataset.view === view;
      o.classList.toggle("is-on", on);
      o.setAttribute("aria-selected", String(on));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".view"), function (v) {
      v.classList.toggle("is-on", v.id === "view-" + view);
    });
  }

  /* Deep links: #roadmap, #missables, #data, #t/<slug> — a linkable trophy page is half the
     point of an offline guide, and it lets a screenshot or a bookmark land on one guide. */
  function readHash() {
    // "/board", not "#board": an id on the page would make the browser jump to that element
    // before the script runs, and the board's <ul> happens to be named board.
    var h = String(window.location.hash || "").replace(/^#\/?/, "");
    if (!h) return;
    if (h.indexOf("t/") === 0) {
      var slug = h.slice(2);
      if (bySlug(slug)) { state.selected = slug; showView("board"); return; }
    }
    if (h === "roadmap" || h === "missables" || h === "data" || h === "board") showView(h);
  }

  function boot() {
    if (!DATA || !Array.isArray(DATA.trophies)) {
      document.body.insertAdjacentHTML("afterbegin",
        '<p style="padding:20px;color:#ff6fae">Trophy data failed to load. Keep app/data/trophies.js beside index.html.</p>');
      return;
    }
    load();
    wire();
    buildChips();
    renderData();
    renderMissables();
    readHash();
    // An empty detail panel on a first visit is a dead half-screen. Open the first row instead.
    if (!state.selected) {
      var first = DATA.trophies.filter(matches)[0];
      if (first) state.selected = first.slug;
    }
    renderAll();
    renderSavePreview();
    window.addEventListener("hashchange", function () { readHash(); renderAll(); });
  }

  boot();
})();
