const state = {
  tab: "home",
  checked: false,
  completedToday: false,
  checks: JSON.parse(localStorage.getItem("deinchal-static-checks") || "[]"),
};

const profile = {
  id: "local-member",
  nickname: "로컬회원",
  instagramId: "deinchal_demo",
  joinedAt: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
};

const members = [
  profile,
  { id: "bok-king", nickname: "복주머니왕", instagramId: "bok_king", joinedAt: profile.joinedAt },
  { id: "angel", nickname: "천사챌린저", instagramId: "angel_challenge", joinedAt: profile.joinedAt },
];

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateOrKey) {
  const date = typeof dateOrKey === "string" ? parseKey(dateOrKey) : dateOrKey;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(date);
}

function isMissionDay(date) {
  return date.getDay() === 2 || date.getDay() === 6;
}

function missionFor(date) {
  const missionDate = new Date(date);
  const hashtagDate = new Date(missionDate);
  hashtagDate.setDate(hashtagDate.getDate() - 1);
  const mmdd = `${String(hashtagDate.getMonth() + 1).padStart(2, "0")}${String(hashtagDate.getDate()).padStart(2, "0")}`;
  const body = `디인챌_${mmdd}`;
  return {
    id: dateKey(missionDate),
    missionDate: dateKey(missionDate),
    hashtagDate: dateKey(hashtagDate),
    hashtag: `#${body}`,
    instagramUrl: `https://www.instagram.com/explore/tags/${body}/`,
  };
}

function previousMissionDate(from = new Date()) {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 1);
  while (!isMissionDay(date)) date.setDate(date.getDate() - 1);
  return date;
}

function nextMissionDate(from = new Date()) {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  while (!isMissionDay(date)) date.setDate(date.getDate() + 1);
  return date;
}

function monthMissionDates(year, monthIndex) {
  const dates = [];
  const cursor = new Date(year, monthIndex, 1);
  while (cursor.getMonth() === monthIndex) {
    if (isMissionDay(cursor)) dates.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function rate(completed, total) {
  return total ? Math.round((completed / total) * 1000) / 10 : 0;
}

function grade(value) {
  if (value >= 90) return "💎 다이아몬드";
  if (value >= 80) return "🥇 금";
  if (value >= 70) return "🥈 은";
  if (value >= 60) return "🥉 동";
  return "🌱 분발";
}

function reward(completed, total) {
  if (completed === total && total > 0) return { icon: "👼", label: "천사 배지", next: "천사 배지를 받았어요." };
  if (completed >= 8) return { icon: "🧧", label: "황금 복주머니", next: "최고 보상에 도착했어요." };
  if (completed >= 4) return { icon: "🧧", label: "은색 복주머니", next: `${8 - completed}회 더 하면 황금 복주머니` };
  if (completed >= 1) return { icon: "🧧", label: "작은 복주머니", next: `${4 - completed}회 더 하면 은색 복주머니` };
  return { icon: "🎴", label: "아직 없음", next: "1회 완료하면 작은 복주머니" };
}

function currentMonthStats() {
  const now = new Date();
  const dates = monthMissionDates(now.getFullYear(), now.getMonth());
  const completed = state.checks.filter((item) => item.userId === profile.id && dates.includes(item.missionDate)).length;
  const participation = rate(completed, dates.length);
  return { dates, completed, total: dates.length, participation, grade: grade(participation), reward: reward(completed, dates.length) };
}

function saveChecks() {
  localStorage.setItem("deinchal-static-checks", JSON.stringify(state.checks));
}

function render() {
  const app = document.getElementById("app");
  const stats = currentMonthStats();
  app.innerHTML = `
    <header class="between" style="margin-bottom: 18px">
      <div>
        <p class="gold" style="font-weight: 900">디인챌 복주머니 미션</p>
        <h1>${profile.nickname}님</h1>
      </div>
      <span class="pill success">active</span>
    </header>
    <section id="tab-content"></section>
    <nav class="bottom-tabs">
      ${tabButton("home", "홈")}
      ${tabButton("card", "내 카드")}
      ${tabButton("ranking", "랭킹")}
      ${tabButton("my", "마이")}
    </nav>
  `;
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      render();
    });
  });
  renderTab(stats);
}

function tabButton(key, label) {
  return `<button class="tab-button ${state.tab === key ? "active" : ""}" data-tab="${key}">${label}</button>`;
}

function renderTab(stats) {
  if (state.tab === "home") renderHome();
  if (state.tab === "card") renderCard(stats);
  if (state.tab === "ranking") renderRanking(stats);
  if (state.tab === "my") renderMy(stats);
}

function renderHome() {
  const root = document.getElementById("tab-content");
  const today = new Date();
  const todayKey = dateKey(today);
  const recentMission = missionFor(previousMissionDate(today));
  const recentDone = state.checks.some((item) => item.userId === profile.id && item.missionDate === recentMission.missionDate);
  const todayDone = state.checks.some((item) => item.userId === profile.id && item.missionDate === todayKey);
  const missionToday = isMissionDay(today);

  root.innerHTML = `<div class="grid">
    ${
      missionToday
        ? todayMissionCard(missionFor(today), todayDone)
        : `<section class="card">
            <h2>오늘은 미션하는 날이 아니에요.</h2>
            <p class="muted" style="margin-top: 8px">다음 미션은 ${formatDate(nextMissionDate(today))}이에요.</p>
            <p class="muted">다음 미션일에 다시 들어와 주세요.</p>
          </section>`
    }
    ${state.completedToday ? completionCard() : ""}
    <section class="card">
      <div class="between">
        <h2>최근 미션</h2>
        <span class="pill ${recentDone ? "success" : "danger"}">${recentDone ? "완료" : "미완료"}</span>
      </div>
      <p class="muted" style="margin-top: 12px">${formatDate(recentMission.missionDate)}</p>
      <p class="big-tag">${recentMission.hashtag}</p>
      ${recentDone ? "" : `<p class="notice" style="margin-top: 12px">이전 미션을 안 하셨네요 ㅠㅠ<br />이번 미션부터 다시 참여해 주세요.</p>`}
    </section>
  </div>`;

  const check = document.getElementById("mission-check");
  const doneButton = document.getElementById("mission-done");
  if (check && doneButton) {
    check.addEventListener("change", () => {
      doneButton.disabled = !check.checked;
    });
    doneButton.addEventListener("click", () => {
      state.checks.push({ id: crypto.randomUUID(), userId: profile.id, missionDate: todayKey, completedAt: new Date().toISOString() });
      state.completedToday = true;
      saveChecks();
      render();
    });
  }
}

function todayMissionCard(mission, done) {
  return `<section class="card">
    <div class="between">
      <div>
        <h2>오늘은 디인챌 미션일이에요</h2>
        <p class="big-tag">${mission.hashtag}</p>
      </div>
      <div class="reward-icon">🧧</div>
    </div>
    <a class="dark-button" style="margin-top: 16px" href="${mission.instagramUrl}" target="_blank">인스타그램에서 해시태그 보러가기</a>
    ${
      done
        ? `<span class="pill success" style="margin-top: 14px">오늘 미션 완료</span>`
        : `<label class="check-row" style="margin-top: 14px">
            <input id="mission-check" type="checkbox" />
            <span>해당 해시태그 게시물을 확인하고 좋아요를 눌렀습니다.</span>
          </label>
          <button id="mission-done" class="primary-button" style="margin-top: 14px" disabled>미션 완료</button>`
    }
  </section>`;
}

function completionCard() {
  return `<section class="card completion">
    <div style="font-size: 58px">👼</div>
    <div class="reward-icon swing" style="margin: 10px auto">🧧</div>
    <h2>참 잘했어요!</h2>
    <p class="muted" style="margin-top: 8px">오늘의 복주머니가 쌓였어요.</p>
    <p class="gold">복 많이 받으세요.</p>
  </section>`;
}

function renderCard(stats) {
  const root = document.getElementById("tab-content");
  root.innerHTML = `<div class="grid">
    <section class="card">
      <div class="row">
        <div class="reward-icon">${stats.reward.icon}</div>
        <div>
          <h2>${new Date().getMonth() + 1}월 디인챌 복주머니 현황</h2>
          <p class="muted">완료 ${stats.completed}회 / 전체 ${stats.total}회</p>
          <p class="muted">참여율 ${stats.participation}%</p>
          <p class="gold" style="font-weight: 900">현재 보상: ${stats.reward.label}</p>
          <p class="muted">${stats.reward.next}</p>
        </div>
      </div>
      <span class="pill gold" style="margin-top: 12px">${stats.grade}</span>
    </section>
    <div class="grid-2">
      ${stats.dates
        .map((date) => {
          const done = state.checks.some((item) => item.userId === profile.id && item.missionDate === date);
          const locked = date > dateKey(new Date());
          return `<section class="card">
            <p class="muted">${formatDate(date)}</p>
            <h3 style="margin-top: 8px">${done ? "completed" : locked ? "locked" : "missed"}</h3>
            <span class="pill ${done ? "success" : locked ? "" : "danger"}">${done ? "완료" : locked ? "대기" : "미완료"}</span>
          </section>`;
        })
        .join("")}
    </div>
  </div>`;
}

function renderRanking(stats) {
  const root = document.getElementById("tab-content");
  const rows = members
    .map((member, index) => {
      const bonus = member.id === profile.id ? stats.completed : Math.max(stats.completed - index + 1, 0);
      const value = rate(bonus, stats.total);
      return { member, completed: bonus, value, grade: grade(value) };
    })
    .sort((a, b) => b.value - a.value || b.completed - a.completed);
  root.innerHTML = `<div class="grid">
    <h2>이번 달 랭킹</h2>
    ${rows
      .map(
        (row, index) => `<section class="card ${row.member.id === profile.id ? "current" : ""}">
          <div class="between">
            <div class="row">
              <div class="rank-number">${index + 1}</div>
              <div>
                <h3>${row.member.nickname}</h3>
                <p class="muted">@${row.member.instagramId}</p>
              </div>
            </div>
            <div style="text-align: right">
              <h3>${row.completed}회</h3>
              <p class="gold">${row.value}% · ${row.grade}</p>
            </div>
          </div>
        </section>`
      )
      .join("")}
  </div>`;
}

function renderMy(stats) {
  const root = document.getElementById("tab-content");
  root.innerHTML = `<div class="grid">
    <section class="card">
      <h2>${profile.nickname}</h2>
      <p class="muted">@${profile.instagramId}</p>
      <div class="grid-2" style="margin-top: 14px">
        <div class="stat-box"><p class="muted">이번 달</p><p class="stat-value">${stats.completed}/${stats.total}</p><p class="gold">${stats.participation}% · ${stats.grade}</p></div>
        <div class="stat-box"><p class="muted">누적</p><p class="stat-value">${state.checks.length}/${stats.total}</p><p class="gold">${stats.grade}</p></div>
      </div>
    </section>
    <section class="card">
      <h3>PWA 홈 화면 설치</h3>
      <p class="muted" style="margin-top: 8px">이 앱을 홈 화면에 추가하면 더 편하게 사용할 수 있어요.</p>
    </section>
    <section class="card">
      <h3>앱 내부 알림</h3>
      <p class="muted" style="margin-top: 8px">오늘 미션, 미완료 상태, 복주머니 보상, 천사 배지 달성을 앱 안에서 알려드려요.</p>
    </section>
    <button class="primary-button" id="reset-demo">데모 기록 초기화</button>
  </div>`;
  document.getElementById("reset-demo").addEventListener("click", () => {
    state.checks = [];
    state.completedToday = false;
    saveChecks();
    render();
  });
}

render();
