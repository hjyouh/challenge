(function () {
  const root = document.getElementById("attendanceList");
  const currentYear = DC.today.getFullYear();
  const firstYear = 2026;
  let openKey = `${currentYear}-${DC.today.getMonth()}`;
  document.getElementById("yearTitle").textContent = "천사님 인스타 챌린지";

  function attendedOn(key) {
    return DC.hasAttended(key);
  }

  function monthCard(year, monthIndex) {
    const stats = DC.monthStats(year, monthIndex);
    const doneCount = stats.dates.filter((dateKey) => attendedOn(dateKey)).length;
    const percent = DC.rate(doneCount, stats.total);
    const rank = DC.monthRank(year, monthIndex);
    const key = `${year}-${monthIndex}`;
    const open = key === openKey ? "open" : "";
    const renderPouch = (key) => {
      const index = stats.dates.indexOf(key);
      const done = attendedOn(key, index);
      const absent = key < DC.dateKey(DC.today) && !done;
      const label = done ? "출석완료" : absent ? "결석" : "";
      return `<div class="pouch-card ${done ? "attended" : absent ? "absent" : ""}">
        <span class="emoji"></span>
        <span class="date">${DC.shortDate(key)}</span>
        <span>${label}</span>
      </div>`;
    };

    return `<article class="month-card ${open}">
      <button class="month-head" type="button" data-year="${year}" data-month="${monthIndex}" aria-expanded="${open ? "true" : "false"}">
        <h2>${monthIndex + 1}월의 미션</h2>
        <span class="soft-pill">${doneCount}/${stats.total}</span>
      </button>
      <div class="month-summary">
        <span>${stats.total}번중 ${doneCount}번 출석 · ${percent}% 출석</span>
        <span>현재 순위: ${rank !== null ? rank + "등" : "-"}</span>
      </div>
      <div class="month-body">
        <div class="pouch-grid">
          <div class="pouch-row row-4">${stats.dates.slice(0, 4).map(renderPouch).join("")}</div>
          <div class="pouch-row row-5">${stats.dates.slice(4, 9).map(renderPouch).join("")}</div>
        </div>
      </div>
    </article>`;
  }

  function yearSection(year) {
    const lastMonth = year === currentYear ? DC.today.getMonth() : 11;
    const months = Array.from({ length: lastMonth + 1 }, (_, index) => monthCard(year, lastMonth - index)).join("");

    if (year === currentYear) return months;

    return `<section class="year-archive" aria-label="${year} 출석부">
      <h2 class="year-archive-title">${year} 출석부</h2>
      <div class="month-list">${months}</div>
    </section>`;
  }

  function render() {
    root.innerHTML = Array.from({ length: currentYear - firstYear + 1 }, (_, index) => yearSection(currentYear - index)).join("");
    root.querySelectorAll(".month-head").forEach((head) => {
      head.addEventListener("click", () => {
        openKey = `${head.dataset.year}-${head.dataset.month}`;
        render();
      });
    });
  }

  render();
})();
