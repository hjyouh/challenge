(function () {
  let mode = "month";
  let selectedYear = DC.today.getFullYear();
  const switcher = document.getElementById("rankSwitch");
  const more = document.querySelector(".rank-more");
  const list = document.getElementById("rankingList");

  function years() {
    const set = new Set([DC.today.getFullYear()]);
    Object.values(window.DC_IMPORTED_DATA?.months || {}).forEach((month) => set.add(month.year));
    return Array.from(set).sort((a, b) => b - a);
  }

  function rowsFor(tab) {
    return tab.mode === "month" ? DC.userRows("month") : DC.userRows("year", tab.year);
  }

  function tabs() {
    return [
      { mode: "month", label: "이달의 랭킹" },
      ...years().map((year) => ({ mode: "year", year, label: `${year}` })),
    ];
  }

  function shortName(name) {
    return name.length > 11 ? `${name.slice(0, 11)}...` : name;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function selectedTabMatches(tab) {
    return mode === tab.mode && (tab.mode === "month" || tab.year === selectedYear);
  }

  function renderTabs() {
    switcher.innerHTML = tabs()
      .map((tab) => {
        const rows = rowsFor(tab);
        const active = selectedTabMatches(tab) ? "active" : "";
        const yearAttr = tab.year ? ` data-rank-year="${tab.year}"` : "";
        return `<button class="${active}" data-rank-mode="${tab.mode}"${yearAttr} type="button">${tab.label} (${rows.length}명)</button>`;
      })
      .join("");
    switcher.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        mode = button.dataset.rankMode;
        selectedYear = Number(button.dataset.rankYear) || DC.today.getFullYear();
        renderTabs();
        render();
      });
    });
    updateMoreHint();
  }

  function currentRows() {
    return mode === "month" ? DC.userRows("month") : DC.userRows("year", selectedYear);
  }

  function nickPx(text) {
    const chars = [...text];
    const wide = chars.filter((c) => c.charCodeAt(0) > 255).length;
    const narrow = chars.length - wide;
    return wide * 14 + narrow * 8;
  }

  function render() {
    const rows = DC.assignRanks(currentRows());
    if (rows.length === 0) {
      let msg;
      if (mode === "month") {
        const todayKey = DC.dateKey(DC.today);
        const hasDates = DC.missionDates(DC.today.getFullYear(), DC.today.getMonth()).some(k => k <= todayKey);
        msg = hasDates ? "아직 참여자가 없습니다" : "아직 이달의 미션이 시작되지 않았습니다";
      } else {
        msg = `${selectedYear}년의 미션 데이터가 없어요`;
      }
      list.innerHTML = `<p class="rank-empty-msg">${msg}</p>`;
      return;
    }
    const maxNickW = rows.reduce((max, row) => {
      return Math.max(max, nickPx(shortName(row.nickname || row.instagramId || row.id)));
    }, 60);
    list.style.setProperty("--nick-col", Math.min(Math.ceil(maxNickW) + 8, 120) + "px");
    list.innerHTML = rows
      .map((row, i) => {
        const fullName = row.nickname || row.instagramId || row.id;
        const divider = i > 0 && i % 10 === 0
          ? `<div class="rank-section-divider"></div>`
          : "";
        return `${divider}<article class="rank-card ${row.isMe || row.id === "me" ? "me" : ""}">
          <span class="rank-num">${row.rank}등</span>
          <span class="rank-grade">${row.emoji || "🙂"}</span>
          <button class="rank-name" type="button" data-full-name="${escapeHtml(fullName)}">${escapeHtml(shortName(fullName))}</button>
          <span class="rank-attend">${row.total}번중 ${row.done}번 출석</span>
          <span class="rank-pct">${row.percent}%</span>
        </article>`;
      })
      .join("");
    list.querySelectorAll(".rank-name").forEach((button) => {
      button.addEventListener("click", () => {
        const open = button.classList.toggle("show-bubble");
        list.querySelectorAll(".rank-name").forEach((item) => {
          if (item !== button) item.classList.remove("show-bubble");
        });
        if (!open) button.classList.remove("show-bubble");
      });
    });
  }

  function updateMoreHint() {
    const overflow = switcher.scrollWidth > switcher.clientWidth + 2;
    const atEnd = switcher.scrollLeft + switcher.clientWidth >= switcher.scrollWidth - 2;
    switcher.classList.toggle("scrollable", overflow);
    more.classList.toggle("show", overflow && !atEnd);
  }

  switcher.addEventListener("scroll", updateMoreHint);
  window.addEventListener("resize", updateMoreHint);

  renderTabs();
  render();
})();
