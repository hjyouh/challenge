const now = new Date();
const monthDates = getMonthMissionDates(now.getFullYear(), now.getMonth());
const checks = JSON.parse(localStorage.getItem("deinchal-static-checks") || "[]");
const members = [
  { id: "local-member", nickname: "로컬회원", instagramId: "deinchal_demo", email: "local@test.com", status: "active", joinedAt: "2026-01-01" },
  { id: "bok-king", nickname: "복주머니왕", instagramId: "bok_king", email: "bok@example.com", status: "active", joinedAt: "2026-01-01" },
  { id: "angel", nickname: "천사챌린저", instagramId: "angel_challenge", email: "angel@example.com", status: "active", joinedAt: "2026-01-01" },
];

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isMissionDay(date) {
  return date.getDay() === 2 || date.getDay() === 6;
}

function getMonthMissionDates(year, monthIndex) {
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

function missionTag(dateKeyText) {
  const [y, m, d] = dateKeyText.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return `#디인챌_${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function memberRows() {
  return members.map((member, index) => {
    const completed = member.id === "local-member" ? checks.filter((item) => monthDates.includes(item.missionDate)).length : Math.max(4 - index, 0);
    const participation = rate(completed, monthDates.length);
    return { member, completed, participation, grade: grade(participation) };
  });
}

function renderAdmin() {
  const rows = memberRows();
  const totalCompleted = rows.reduce((sum, row) => sum + row.completed, 0);
  const totalSlots = members.length * monthDates.length;
  const app = document.getElementById("admin-app");
  app.innerHTML = `<div class="admin-layout">
    <header class="between">
      <div>
        <p class="gold" style="font-weight: 900">관리자 대시보드</p>
        <h1>디인챌 복주머니 미션</h1>
      </div>
      <a class="dark-button" style="padding: 0 18px" href="../index.html">회원 화면</a>
    </header>
    <div class="admin-tabs">
      <span class="pill gold">${now.getFullYear()}년 ${now.getMonth() + 1}월</span>
      <span class="pill success">로컬 데모</span>
    </div>
    <section class="admin-grid">
      ${metric("전체 회원 수", members.length)}
      ${metric("active 회원 수", members.filter((member) => member.status === "active").length)}
      ${metric("이번 달 미션 수", monthDates.length)}
      ${metric("이번 달 참여율", `${rate(totalCompleted, totalSlots)}%`)}
    </section>
    <section class="card" style="margin-top: 18px">
      <h2>회원 목록</h2>
      <div class="table-wrap" style="margin-top: 12px">
        <table>
          <thead><tr><th>닉네임</th><th>인스타그램</th><th>이메일</th><th>상태</th><th>완료 수</th><th>참여율</th><th>등급</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (row) => `<tr><td>${row.member.nickname}</td><td>@${row.member.instagramId}</td><td>${row.member.email}</td><td>${row.member.status}</td><td>${row.completed}</td><td>${row.participation}%</td><td>${row.grade}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="card" style="margin-top: 18px">
      <h2>미션 현황</h2>
      <div class="table-wrap" style="margin-top: 12px">
        <table>
          <thead><tr><th>미션 날짜</th><th>해시태그</th><th>전체 회원</th><th>완료자</th><th>미완료자</th><th>참여율</th></tr></thead>
          <tbody>
            ${monthDates
              .map((date) => {
                const completed = checks.filter((item) => item.missionDate === date).length;
                return `<tr><td>${date}</td><td>${missionTag(date)}</td><td>${members.length}</td><td>${completed}</td><td>${members.length - completed}</td><td>${rate(completed, members.length)}%</td></tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  </div>`;
}

function metric(label, value) {
  return `<section class="card"><p class="muted">${label}</p><p class="stat-value gold">${value}</p></section>`;
}

renderAdmin();
