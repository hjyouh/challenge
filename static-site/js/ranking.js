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
    return name.length > 10 ? `${name.slice(0, 10)}...` : name;
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

  function render() {
    const rows = DC.assignRanks(currentRows());
    list.innerHTML = rows
      .map((row) => {
        const fullName = row.nickname || row.instagramId || row.id;
        return `<article class="rank-card ${row.isMe || row.id === "me" ? "me" : ""}">
          <span class="rank-place">${row.rank}등 ${row.grade}</span>
          <button class="rank-name" type="button" data-full-name="${escapeHtml(fullName)}">${escapeHtml(shortName(fullName))}</button>
          <span class="rank-count">${row.total}번중 ${row.done}번 출석</span>
          <span class="rank-percent">${row.percent}%</span>
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
