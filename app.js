(async () => {
  // Load files listed in the manifest so new data groups need no loader changes.
  const manifest = await fetch("data/manifest.json").then((response) =>
    response.json(),
  );
  const [heroData, troopData, researchData, changeData, ...skillFiles] =
    await Promise.all([
      fetch(`data/${manifest.files.heroes}`).then((response) =>
        response.json(),
      ),
      fetch(`data/${manifest.files.troops}`).then((response) =>
        response.json(),
      ),
      fetch(`data/${manifest.files.research}`).then((response) =>
        response.json(),
      ),
      fetch(`data/${manifest.files.changes}`).then((response) =>
        response.json(),
      ),
      ...Object.values(manifest.files.skills).map((file) =>
        fetch(`data/${file}`).then((response) => response.json()),
      ),
    ]);
  const D = {
    version: manifest.version,
    heroes: heroData.heroes,
    troops: troopData.troops,
    research: researchData.research,
    skills: Object.assign({}, ...skillFiles.map((file) => file.skills)),
    changes: changeData.changes,
  };
  // Shared formatters, number limits, and navigation keys.
  const $ = (s) => document.querySelector(s),
    formatNumber = (n) => Math.round(n).toLocaleString("en-US"),
    sum = (a) => a.reduce((p, q) => p + q, 0);
  const formatCompactNumber = (v) =>
    v >= 1e9
      ? (v / 1e9).toFixed(2) + "B"
      : v >= 1e6
        ? (v / 1e6).toFixed(1) + "M"
        : formatNumber(v);
  const formatDuration = (s) => {
    const d = Math.floor(s / 86400),
      h = Math.round((s % 86400) / 3600);
    return d ? `${d}d ${h}h` : `${h}h`;
  };
  const clampNumber = (v, a, b) => Math.min(b, Math.max(a, +v || a));

  const LEGACY_EXCLUSIONS = [
      "Catherine",
      "Master Jin",
      "Jaden",
      "Maxine",
      "Norah",
    ],
    RESOURCES = ["Food", "Wood", "Steel", "Oil"],
    VIEWS = ["roster", "legacy", "troops", "heroes", "squad"];

  const HEROES_BY_ID = Object.fromEntries(
    D.heroes.map((hero) => [hero.id, hero]),
  );

  // Restore the saved roster and calculator settings.
  const defaultState = {
    ld: 0,
    as: 0,
    ch: 5,
    from: 5,
    to: 6,
    n: 1000000,
    sp: 0,
    lv: {},
  };
  let state = {
    roster: [],
    ui: {
      ...defaultState,
    },
  };
  try {
    const o = JSON.parse(localStorage.getItem("rd1") || "null");
    if (o && Array.isArray(o.roster))
      state = {
        roster: o.roster.filter((x) => HEROES_BY_ID[x.id]),
        ui: {
          ...defaultState,
          ...o.ui,
        },
      };
  } catch (e) {}
  const save = () => {
    try {
      localStorage.setItem("rd1", JSON.stringify(state));
    } catch (e) {}
  };
  const talentPoints = (l, r) =>
    Math.max(0, l - 1) + (r >= 6 ? 15 : r >= 5 ? 5 : 0);
  const numberField = (l, k, v, a, b) =>
    `<label class="f">${l}<input type="number" data-k="${k}" min="${a}" max="${b}" value="${v}"></label>`;

  function renderRosterRow(x, i) {
    const h = HEROES_BY_ID[x.id];
    return `<div class="hero" data-i="${i}"><div class="nm"><b>${h.name}</b><span>${h.squad}, ${h.category}${h.superhero ? ", Superhero" : ""}</span></div>
${numberField("Rank", "r", x.r, 1, 6)}${numberField("Level", "l", x.l, 1, 60)}${x.k.map((v, j) => numberField(["Rage", "Passive 1", "Passive 2", "Passive 3"][j], "k" + j, v, 1, 5)).join("")}
<label class="f">Status<select data-k="u"><option value="main"${x.u == "main" ? " selected" : ""}>In use</option><option value="donor"${x.u == "donor" ? " selected" : ""}>Unused donor</option></select></label>
<label class="c"><input type="checkbox" data-k="lead"${x.lead ? " checked" : ""}>Leader</label>
${h.superhero ? `<label class="c"><input type="checkbox" data-k="w"${x.w ? " checked" : ""}>Weapon upgraded</label>` : ""}
<button data-rm>Remove</button></div>`;
  }

  // Roster editor and legacy swap planner.
  function renderRoster() {
    $("#list").innerHTML = state.roster.length
      ? state.roster.map(renderRosterRow).join("")
      : '<p class="empty">No heroes yet. Pick one above, then set its rank, level and skill levels.</p>';
  }

  function renderLegacyPlanner() {
    const exc = (x) => {
      const h = HEROES_BY_ID[x.id];
      return LEGACY_EXCLUSIONS.some(
        (e) => h.name === e || h.name.startsWith(e + " "),
      )
        ? "excluded from the event"
        : h.superhero && x.w
          ? "its Doomsday Weapon is upgraded"
          : "";
    };
    const R = state.roster,
      don = R.filter((x) => x.u == "donor" && !exc(x)),
      tar = R.filter((x) => x.u == "main" && !exc(x)),
      c = [];
    don.forEach((d) =>
      tar.forEach((t) => {
        const net = sum(d.k) - sum(t.k),
          dr = d.r - t.r;
        if (net > 0 && !(t.lead && dr < 0))
          c.push({
            d,
            t,
            net,
            dr,
          });
      }),
    );
    c.sort((a, b) => b.net - a.net || b.dr - a.dr);
    const ud = new Set(),
      ut = new Set(),
      pl = [];
    for (const x of c) {
      if (pl.length >= state.ui.ch) break;
      if (ud.has(x.d.id) || ut.has(x.t.id)) continue;
      ud.add(x.d.id);
      ut.add(x.t.id);
      pl.push(x);
    }
    const nm = (x) => HEROES_BY_ID[x.id].name;
    let o = "";
    if (!don.length || !tar.length)
      o =
        '<p class="empty">Mark at least one hero In use and one Unused donor in My roster.</p>';
    else if (!pl.length)
      o =
        '<p class="empty">No swap would improve your heroes. A donor needs higher skill levels than its target.</p>';
    else
      o =
        `<p class="tot"><b>+${sum(pl.map((x) => x.net))}</b> skill levels from ${pl.length} of ${state.ui.ch} swaps</p><ol class="plan">` +
        pl
          .map((x, i) => {
            const a = talentPoints(x.t.l, x.t.r),
              b = talentPoints(x.d.l, x.d.r),
              w = [];
            if (x.dr < 0)
              w.push(
                `Rank drops by ${-x.dr}, so the target loses ${Math.max(0, a - b)} talent points. Fine only if it never leads.`,
              );
            if (x.d.l < x.t.l) w.push(`Level drops from ${x.t.l} to ${x.d.l}.`);
            return `<li><span class="n">${i + 1}</span><div><b>${nm(x.d)} into ${nm(x.t)}</b><div>${x.t.k.join("-")} becomes ${x.d.k.join("-")}, <span class="good">+${x.net}</span> levels. Rank ${x.t.r} to ${x.d.r}, talent points ${a} to ${b}.</div>${w.map((t) => `<div class="flare">${t}</div>`).join("")}</div></li>`;
          })
          .join("") +
        "</ol>";
    const excludedRosterHeroes = R.map((x) => [x, exc(x)]).filter((p) => p[1]);
    if (excludedRosterHeroes.length)
      o += `<h2>Left out</h2><ul>${excludedRosterHeroes.map((p) => `<li>${nm(p[0])}: ${p[1]}.</li>`).join("")}</ul>`;
    o +=
      '<p class="fine">Each swap also resets talents on both heroes. This assumes skill levels move slot by slot, which is unconfirmed. Check how many chances your event gives you.</p>';
    $("#plan").innerHTML = o;
  }

  // Troop conversion and research estimates.
  function renderTroopsAndResearch() {
    const { from, to, n, sp, lv } = state.ui;
    const fromTier = D.troops[from - 1];
    const toTier = D.troops[to - 1];
    const mightChange = (toTier.might - fromTier.might) * n;

    const statRows = [
      ["Attack", "attack"],
      ["Defense", "defense"],
      ["Health", "health"],
      ["Speed", "speed"],
      ["Capacity", "capacity"],
      ["Might", "might"],
    ]
      .map(([label, stat]) => {
        const change = (toTier[stat] / fromTier[stat] - 1) * 100;
        const changeClass = change < 0 ? "flare" : "good";
        const sign = change > 0 ? "+" : "";

        return `<tr><td>${label}</td><td>${fromTier[stat]}</td><td>${toTier[stat]}</td><td class="${changeClass}">${sign}${change.toFixed(1)}%</td></tr>`;
      })
      .join("");

    const costRows = RESOURCES.filter(
      (resource) =>
        toTier.trainingCost[resource] || fromTier.trainingCost[resource],
    )
      .map((resource) => {
        const fromCost = fromTier.trainingCost[resource] || 0;
        const toCost = toTier.trainingCost[resource] || 0;
        const promotionCost = toTier.promotionCost[resource] || 0;

        return `<tr><td>${resource}</td><td>${formatNumber(toCost * n)}</td><td>${formatNumber((toCost - fromCost) * n)}</td><td>${formatNumber(promotionCost * n)}</td></tr>`;
      })
      .join("");

    $("#tout").innerHTML = `
      <p class="tot"><b>${mightChange >= 0 ? "+" : ""}${formatNumber(mightChange)}</b> troop might</p>
      <div class="wrap">
        <table>
          <tr><th>Per troop</th><th>T${from}</th><th>T${to}</th><th>Change</th></tr>
          ${statRows}
        </table>
      </div>
      <h2>Cost for ${formatNumber(n)} troops</h2>
      <div class="wrap">
        <table>
          <tr><th>Resource</th><th>Train from scratch</th><th>Difference only</th><th>Heal at T${to}</th></tr>
          ${costRows}
        </table>
      </div>
      <p class="fine">Difference only applies if promoting charges just the gap between tiers. That is unconfirmed.</p>`;

    const researchSpeed = 1 + sp / 100;
    const researchRows = D.research.map((research) => {
      const currentLevel = Math.min(
        lv[research.id] || 0,
        research.levels.length,
      );
      const remainingLevels = research.levels.slice(currentLevel);
      const name = research.id === 5022 ? "Ranged T6 unlock" : research.name;

      return {
        id: research.id,
        name,
        maxLevel: research.levels.length,
        currentLevel,
        secondsLeft:
          sum(remainingLevels.map((level) => level.seconds)) / researchSpeed,
        costs: RESOURCES.map((resource) =>
          sum(remainingLevels.map((level) => level.cost[resource] || 0)),
        ),
      };
    });

    const researchHeadings = RESOURCES.map(
      (resource) => `<th>${resource}</th>`,
    ).join("");
    const researchTableRows = researchRows
      .map((research) => {
        const levelInput = `<input type="number" data-id="${research.id}" min="0" max="${research.maxLevel}" value="${research.currentLevel}">`;
        const timeLeft = research.secondsLeft
          ? formatDuration(research.secondsLeft)
          : "Done";
        const costCells = research.costs
          .map((cost) => `<td>${cost ? formatCompactNumber(cost) : "-"}</td>`)
          .join("");

        return `<tr><td>${research.name}</td><td>${levelInput} / ${research.maxLevel}</td><td>${timeLeft}</td>${costCells}</tr>`;
      })
      .join("");

    $("#rtab").innerHTML = `
      <tr><th>Research</th><th>Level</th><th>Time left</th>${researchHeadings}</tr>
      ${researchTableRows}`;

    const t6ResearchIds = [2009, 3015, 5022];
    const t6UnlockSeconds = sum(
      researchRows
        .filter((research) => t6ResearchIds.includes(research.id))
        .map((research) => research.secondsLeft),
    );

    $("#path").innerHTML =
      `<b>${formatDuration(t6UnlockSeconds)}</b> to unlock T6 ranged, if Camo Finish (15), Battlefield Medicine (10), and the unlock run one after another`;
  }

  // Hero database and squad builder.
  const SKILL_KIND_LABELS = {
      rage: "Rage",
      passive: "Passive",
      awakening: "Awakening",
    },
    SQUAD_TYPES = ["Ranged", "Leader", "Infantry", "Rider", "Overall"];
  const renderHeroSkills = (id) =>
    (D.skills[id] || [])
      .map(
        (s) =>
          `<div class="sk"><b>${s.name}</b> <span>${SKILL_KIND_LABELS[s.kind]}</span><p>${s.description || "Full text for this squad type comes later."}</p></div>`,
      )
      .join("");

  function viewHeroes() {
    const q = $("#hq").value.trim().toLowerCase(),
      sq = $("#hs").value,
      so = $("#hso").checked;
    const L = D.heroes
      .filter(
        (h) =>
          (sq == "All" || h.squad == sq) &&
          (!so || h.superhero) &&
          (!q || h.name.toLowerCase().includes(q)),
      )
      .sort(
        (a, b) =>
          Number(b.superhero) - Number(a.superhero) ||
          a.name.localeCompare(b.name),
      );
    $("#hl2").innerHTML = L.length
      ? L.map(
          (h) =>
            `<details><summary><b>${h.name}</b><span>${h.squad}, ${h.category}, ${h.role}${h.superhero ? ", Superhero" : ""}</span></summary>${D.changes[h.id] ? `<p class="flare">Changed in ${D.version}: ${D.changes[h.id]}</p>` : ""}${renderHeroSkills(h.id)}</details>`,
        ).join("")
      : '<p class="empty">No hero matches.</p>';
  }

  function viewSquad() {
    const R = state.roster;
    if (R.length < 2) {
      $("#ld").innerHTML = $("#as").innerHTML = "";
      $("#sq").innerHTML =
        '<p class="empty">Add at least two heroes in My roster to build a squad.</p>';
      return;
    }
    let a = state.ui.ld,
      b = state.ui.as;
    if (!R.some((x) => x.id == a)) a = R[0].id;
    if (!R.some((x) => x.id == b) || b == a) b = R.find((x) => x.id != a).id;
    state.ui.ld = a;
    state.ui.as = b;
    const opt = (v) =>
      R.map(
        (x) =>
          `<option value="${x.id}"${x.id == v ? " selected" : ""}>${HEROES_BY_ID[x.id].name}</option>`,
      ).join("");
    $("#ld").innerHTML = opt(a);
    $("#as").innerHTML = opt(b);
    const col = (id, lead) => {
      const x = R.find((y) => y.id == id),
        h = HEROES_BY_ID[id];
      return `<div><h2>${lead ? "Leader" : "Assistant"}: ${h.name}</h2><p>${h.squad}, ${h.category}, ${h.role}. Rank ${x.r}, level ${x.l}, skills ${x.k.join("-")}.</p><p class="${lead ? "good" : "flare"}">${lead ? `Talents and armaments apply: the ${h.squad}, ${h.category} and ${h.role} trees.` : "Skills only. Talents and armaments do not apply."}</p>${!lead && x.r < 3 ? '<p class="flare">The assistant slot unlocks at rank 3.</p>' : ""}${renderHeroSkills(id)}</div>`;
    };
    const men = [a, b].flatMap((id) =>
      (D.skills[id] || [])
        .filter((s) => /Assistant|Leader/.test(s.description))
        .map(
          (s) =>
            `<li><b>${HEROES_BY_ID[id].name}, ${s.name}:</b> ${s.description}</li>`,
        ),
    );
    $("#sq").innerHTML =
      `<p class="fine">The assistant’s rage skill fires right after the leader’s, so put debuffs and setup on the leader.</p><div class="cols">${col(a, 1)}${col(b, 0)}</div>${men.length ? `<h2>Skills that mention the pair</h2><ul>${men.join("")}</ul>` : ""}`;
  }

  // Display the section selected by the URL hash.
  function renderCurrentView() {
    let v = location.hash.slice(1);
    if (!VIEWS.includes(v)) v = "roster";
    VIEWS.forEach((x) => {
      $("#" + x).hidden = x != v;
      document
        .querySelector(`[data-v="${x}"]`)
        .setAttribute("aria-current", x == v ? "page" : "false");
    });
    if (v == "roster") renderRoster();
    if (v == "legacy") {
      $("#ch").value = state.ui.ch;
      renderLegacyPlanner();
    }
    if (v == "heroes") viewHeroes();
    if (v == "squad") viewSquad();
    if (v == "troops") {
      $("#from").value = state.ui.from;
      $("#to").value = state.ui.to;
      $("#cnt").value = state.ui.n;
      $("#sp").value = state.ui.sp;
      renderTroopsAndResearch();
    }
  }
  // Populate controls and attach event handlers.
  $("#add").innerHTML = ["Ranged", "Leader", "Infantry", "Rider", "Overall"]
    .map(
      (q) =>
        `<optgroup label="${q}">${D.heroes
          .filter((h) => h.squad == q)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((h) => `<option value="${h.id}">${h.name}</option>`)
          .join("")}</optgroup>`,
    )
    .join("");
  $("#from").innerHTML = $("#to").innerHTML = [1, 2, 3, 4, 5, 6]
    .map((i) => `<option value="${i}">T${i}</option>`)
    .join("");
  $("#fine").textContent =
    `Unofficial fan tool. Numbers read from game files, data v${D.version}.`;
  $("#addb").onclick = () => {
    const id = +$("#add").value;
    if (state.roster.some((x) => x.id == id)) return;
    state.roster.push({
      id,
      r: 6,
      l: 60,
      k: [1, 1, 1, 1],
      u: "main",
      lead: 0,
      w: 0,
    });
    save();
    renderRoster();
  };
  $("#list").addEventListener("click", (e) => {
    if (e.target.dataset.rm !== undefined) {
      state.roster.splice(+e.target.closest(".hero").dataset.i, 1);
      save();
      renderRoster();
    }
  });
  $("#list").addEventListener("change", (e) => {
    const el = e.target,
      k = el.dataset.k,
      hr = el.closest(".hero");
    if (!k || !hr) return;
    const x = state.roster[+hr.dataset.i];
    if (/^k\d$/.test(k)) {
      x.k[+k[1]] = clampNumber(el.value, 1, 5);
      el.value = x.k[+k[1]];
    } else if (k == "r") {
      x.r = clampNumber(el.value, 1, 6);
      el.value = x.r;
    } else if (k == "l") {
      x.l = clampNumber(el.value, 1, 60);
      el.value = x.l;
    } else if (k == "u") x.u = el.value;
    else x[k] = el.checked ? 1 : 0;
    save();
  });
  $("#exp").onclick = () => {
    $("#bk").value = JSON.stringify(state.roster);
    $("#msg").textContent = "Copy the text above to keep it.";
  };
  $("#imp").onclick = () => {
    try {
      const a = JSON.parse($("#bk").value);
      if (!Array.isArray(a)) throw 0;
      state.roster = a
        .filter((x) => x && HEROES_BY_ID[x.id])
        .map((x) => ({
          id: +x.id,
          r: clampNumber(x.r, 1, 6),
          l: clampNumber(x.l, 1, 60),
          k: [0, 1, 2, 3].map((i) => clampNumber((x.k || [])[i], 1, 5)),
          u: x.u == "donor" ? "donor" : "main",
          lead: x.lead ? 1 : 0,
          w: x.w ? 1 : 0,
        }));
      save();
      renderRoster();
      $("#msg").textContent = `Imported ${state.roster.length} heroes.`;
    } catch (e) {
      $("#msg").textContent =
        "That backup could not be read. Paste the exported text unchanged.";
    }
  };
  $("#ch").addEventListener("input", () => {
    state.ui.ch = clampNumber($("#ch").value, 1, 20);
    save();
    renderLegacyPlanner();
  });
  $("#troops").addEventListener("input", (e) => {
    if (e.target.dataset.id) return;
    const u = state.ui;
    u.from = clampNumber($("#from").value, 1, 6);
    u.to = clampNumber($("#to").value, 1, 6);
    u.n = Math.max(0, +$("#cnt").value || 0);
    u.sp = Math.max(0, +$("#sp").value || 0);
    save();
    renderTroopsAndResearch();
  });
  $("#rtab").addEventListener("change", (e) => {
    const el = e.target;
    if (!el.dataset.id) return;
    state.ui.lv[el.dataset.id] = Math.max(0, Math.round(+el.value || 0));
    save();
    renderTroopsAndResearch();
  });
  $("#hs").innerHTML = ["All", ...SQUAD_TYPES]
    .map((q) => `<option${q == "Ranged" ? " selected" : ""}>${q}</option>`)
    .join("");
  ["hq", "hs", "hso"].forEach((i) =>
    $("#" + i).addEventListener("input", viewHeroes),
  );
  ["ld", "as"].forEach((i) =>
    $("#" + i).addEventListener("change", () => {
      state.ui.ld = +$("#ld").value;
      state.ui.as = +$("#as").value;
      save();
      viewSquad();
    }),
  );
  addEventListener("hashchange", renderCurrentView);
  renderCurrentView();
})();
