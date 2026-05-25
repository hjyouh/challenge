(function () {
  const summary = document.getElementById("adminSummary");
  const table = document.getElementById("adminTable");
  const rows = DC.assignRanks(DC.userRows("month"));
  const activeUsers = rows.length;
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const done = rows.reduce((sum, row) => sum + row.done, 0);
  const percent = DC.rate(done, total);

  summary.innerHTML = `
    <div><p>전체 회원 수</p><strong>${activeUsers}</strong></div>
    <div><p>active 회원 수</p><strong>${activeUsers}</strong></div>
    <div><p>이번 달 미션 수</p><strong>${rows[0]?.total || 0}</strong></div>
    <div><p>전체 참여율</p><strong>${percent}%</strong></div>
  `;

  table.innerHTML = `
    <div class="admin-headline">
      <h2>회원별 출석 현황</h2>
      <span class="soft-pill">로컬 데모</span>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr><th>등수</th><th>이모지</th><th>닉네임</th><th>인스타그램 ID</th><th>완료</th><th>출석률</th></tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr><td>${row.rank}</td><td>${row.emoji}</td><td>${row.nickname}</td><td>@${row.instagramId}</td><td>${row.total}번중 ${row.done}번</td><td>${row.percent}%</td></tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
})();
