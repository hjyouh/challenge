(function () {
  // 이미 이번 세션에 스플래시를 표시했으면 즉시 숨김 (페이지 이동 시 검은 화면 방지)
  if (sessionStorage.getItem("splash-shown")) {
    var s = document.getElementById("splash");
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }

  const today = new Date();
  // supabase-data.js 로드 완료 후 사용 (동기 스크립트 실행 시에는 아직 null일 수 있음)
  // DC_DATA_READY Promise가 있으면 해당 Promise 완료 후 imported 갱신
  let imported = window.DC_IMPORTED_DATA || null;
  if (window.DC_DATA_READY) {
    window.DC_DATA_READY.then(() => {
      if (window.DC_IMPORTED_DATA) imported = window.DC_IMPORTED_DATA;
    });
  }

  const demoUsers = [
    { id: "me", emoji: "😀", nickname: "나의챌린지", instagramId: "my.challenge", completedBias: 0 },
    { id: "u1", emoji: "😇", nickname: "천사러버", instagramId: "angel_like", completedBias: 2 },
    { id: "u2", emoji: "🧧", nickname: "복주머니왕", instagramId: "bok_king", completedBias: 1 },
    { id: "u3", emoji: "🌟", nickname: "성실체크", instagramId: "daily.star", completedBias: 0 },
    { id: "u4", emoji: "🔥", nickname: "좋아요장인", instagramId: "like_master", completedBias: -1 },
    { id: "u5", emoji: "🍀", nickname: "행운참가자", instagramId: "lucky.join", completedBias: -2 },
    { id: "u6", emoji: "💛", nickname: "노랑하트", instagramId: "yellow_heart", completedBias: -3 },
    { id: "u7", emoji: "🎯", nickname: "정조준", instagramId: "target.like", completedBias: -4 },
    { id: "u8", emoji: "🌙", nickname: "달빛챌린지", instagramId: "moon_chal", completedBias: -5 },
    { id: "u9", emoji: "☀️", nickname: "햇살회원", instagramId: "sunny_member", completedBias: -6 },
    { id: "u10", emoji: "🎁", nickname: "선물요정", instagramId: "gift_fairy", completedBias: -7 },
    { id: "u11", emoji: "🪽", nickname: "날개출석", instagramId: "wing.check", completedBias: -8 },
  ];

  const emojiSet = ["😀", "😇", "🧧", "🌟", "🔥", "🍀", "💛", "🎯", "🌙", "☀️", "🎁", "🪽", "🥰", "😎", "🤍", "💎", "🥇", "🥈", "🥉", "🌱", "✨", "🫶", "🙌", "🎀", "🌈", "🍯", "🍑", "🍒", "🍋", "🌷", "🌹", "🌻", "🌿", "🪄", "🎊", "🎉", "🪩", "🧡", "💚", "💙", "💜", "🤎", "🖤", "🤍", "⭐", "🌞", "🌝", "🦋", "🍭", "🧁"];

  // ID 기반 결정론적 이모지 — 같은 사람은 항상 같은 이모지
  function seedEmoji(seed) {
    const n = [...(seed || "x")].reduce((a, c) => ((a * 31) + c.charCodeAt(0)) & 0xffff, 0);
    return emojiSet[n % emojiSet.length];
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function shortDate(key) {
    const date = typeof key === "string" ? parseKey(key) : key;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function isMissionDay(date) {
    return date.getDay() === 2 || date.getDay() === 6;
  }

  function missionDates(year, monthIndex) {
    const importedMonth = imported?.months?.[`${year}-${monthIndex + 1}`];
    if (importedMonth) return importedMonth.missions.map((mission) => mission.date);
    const result = [];
    const cursor = new Date(year, monthIndex, 1);
    while (cursor.getMonth() === monthIndex) {
      if (isMissionDay(cursor)) result.push(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  function previousMissionDate(from = today) {
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - 1);
    while (!isMissionDay(cursor)) cursor.setDate(cursor.getDate() - 1);
    return cursor;
  }

  function nextMissionDate(from = today) {
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    while (!isMissionDay(cursor)) cursor.setDate(cursor.getDate() + 1);
    return cursor;
  }

  function profile() {
    const saved = JSON.parse(localStorage.getItem("deinchal-profile") || "null");
    if (saved) return saved;
    const base = { id: "me", emoji: "😀", userId: "", nickname: "", instagramId: "", password: "", autoLogin: true };
    localStorage.setItem("deinchal-profile", JSON.stringify(base));
    return base;
  }

  function saveProfile(next) {
    localStorage.setItem("deinchal-profile", JSON.stringify(next));
  }

  function currentMemberId() {
    const saved = profile();
    const latest = imported?.latest;
    const latestMonth = latest ? imported?.months?.[`${latest.year}-${latest.month}`] : null;
    const members = latestMonth?.members || [];
    const matched = members.find((member) => member.instagramId === saved.instagramId || member.nickname === saved.nickname);
    if (matched) return matched.id;
    const checked = members.find((member) => Object.values(member.checks || {}).some(Boolean));
    return checked?.id || members[0]?.id || "me";
  }

  function checks() {
    return JSON.parse(localStorage.getItem("deinchal-checks") || "[]");
  }

  function saveChecks(next) {
    localStorage.setItem("deinchal-checks", JSON.stringify(next));
  }

  function hasAttended(key, memberId = currentMemberId()) {
    if (checks().some((item) => item.userId === "me" && item.date === key && item.status === "attended")) return true;
    if (!imported) return false;
    const date = parseKey(key);
    const month = imported.months?.[`${date.getFullYear()}-${date.getMonth() + 1}`];
    const member = month?.members?.find((item) => item.id === memberId || item.instagramId === memberId);
    return Boolean(member?.checks?.[key]);
  }

  // DB만 확인 (localStorage 무시) — Admin 초기화 후 동기화용
  function hasAttendedInDB(key, memberId = currentMemberId()) {
    if (!imported) return false;
    const date = parseKey(key);
    const month = imported.months?.[`${date.getFullYear()}-${date.getMonth() + 1}`];
    const member = month?.members?.find((item) => item.id === memberId || item.instagramId === memberId);
    return Boolean(member?.checks?.[key]);
  }

  // 오늘 localStorage 출석 기록 제거 (Admin 초기화 동기화용)
  function clearTodayLocal() {
    const key = dateKey(today);
    saveChecks(checks().filter((item) => !(item.userId === "me" && item.date === key)));
  }

  function attendToday() {
    const key = dateKey(today);
    const next = checks().filter((item) => !(item.userId === "me" && item.date === key));
    next.push({ userId: "me", date: key, status: "attended", createdAt: new Date().toISOString() });
    saveChecks(next);
  }

  function rate(done, total) {
    return total ? Math.round((done / total) * 1000) / 10 : 0;
  }

  function rankGrade(percent) {
    if (percent >= 90) return "💎";
    if (percent >= 80) return "🥇";
    if (percent >= 70) return "🥈";
    if (percent >= 60) return "🥉";
    return "🌱";
  }

  function instagramValid(id) {
    return /^[A-Za-z0-9._]{1,30}$/.test(id) && !id.includes("..") && !id.endsWith(".");
  }

  function monthStats(year, monthIndex) {
    const allDates = missionDates(year, monthIndex);
    const todayKey = dateKey(today);
    // 지난 달은 전체, 이번 달은 오늘 이전까지만
    const isPastMonth = year < today.getFullYear() || (year === today.getFullYear() && monthIndex < today.getMonth());
    const dates = isPastMonth ? allDates : allDates.filter((key) => key <= todayKey);
    const done = dates.filter(hasAttended).length;
    return { dates, done, total: dates.length, percent: rate(done, dates.length) };
  }

  function importedMemberStats(memberId, dates) {
    const done = dates.filter((key) => hasAttended(key, memberId)).length;
    return { done, total: dates.length, percent: rate(done, dates.length) };
  }

  function importedGroupStats(memberIds, dates) {
    const done = dates.filter((key) => memberIds.some((memberId) => hasAttended(key, memberId))).length;
    return { done, total: dates.length, percent: rate(done, dates.length) };
  }

  function userRows(mode = "month", targetYear = today.getFullYear()) {
    const year = Number(targetYear) || today.getFullYear();
    const todayKeyValue = dateKey(today);
    const monthLimit = year === today.getFullYear() ? today.getMonth() : 11;
    const dates = mode === "year"
      ? Array.from({ length: monthLimit + 1 }, (_, month) => missionDates(year, month)).flat()
        .filter((key) => year < today.getFullYear() || key <= todayKeyValue)
      : missionDates(year, today.getMonth()).filter((key) => key <= todayKeyValue);
    if (imported) {
      const memberMap = new Map();
      Object.values(imported.months || {}).forEach((month) => {
        if (mode === "month" && (month.year !== today.getFullYear() || month.month !== today.getMonth() + 1)) return;
        if (mode === "year" && month.year !== year) return;
        month.members.forEach((member) => {
          const nickKey = member.nickname || member.instagramId || member.id;
          if (!memberMap.has(nickKey)) {
            const globalMember = (imported.members || []).find((m) => m.id === member.id);
            const rawEmoji = member.emoji || (globalMember && globalMember.emoji) || "";
            memberMap.set(nickKey, {
              id: member.id,
              memberIds: [],
              emoji: (rawEmoji && rawEmoji !== "🙂") ? rawEmoji : seedEmoji(member.id || member.instagramId || nickKey),
              nickname: member.nickname,
              instagramId: member.instagramId,
            });
          }
          const row = memberMap.get(nickKey);
          if (!row.memberIds.includes(member.id)) row.memberIds.push(member.id);
          if (!row.instagramId && member.instagramId) row.instagramId = member.instagramId;
        });
      });
      const me = currentMemberId();
      const myProfile = profile();
      return Array.from(memberMap.values())
        .map((member) => {
          const stat = importedGroupStats(member.memberIds, dates);
          const isMe = member.memberIds.includes(me);
          // 현재 사용자는 로컬 프로필 이모지 우선 사용
          const finalEmoji = isMe && myProfile.emoji ? myProfile.emoji : member.emoji;
          return { ...member, emoji: finalEmoji, ...stat, grade: rankGrade(stat.percent), isMe };
        })
        .sort((a, b) => b.percent - a.percent || b.done - a.done || a.nickname.localeCompare(b.nickname, "ko"));
    }
    const myDone = dates.filter(hasAttended).length;
    return demoUsers
      .map((user) => {
        const done = user.id === "me" ? myDone : Math.max(Math.min(dates.length, dates.length + user.completedBias), 0);
        const percent = rate(done, dates.length);
        return { ...user, done, total: dates.length, percent, grade: rankGrade(percent) };
      })
      .sort((a, b) => b.percent - a.percent || a.nickname.localeCompare(b.nickname, "ko"));
  }

  function assignRanks(rows) {
    let lastPercent = null;
    let lastRank = 0;
    return rows.map((row, index) => {
      const rank = row.percent === lastPercent ? lastRank : index + 1;
      lastPercent = row.percent;
      lastRank = rank;
      return { ...row, rank };
    });
  }

  // 특정 월의 내 랭킹 순위 계산 (하드코딩 제거용)
  function monthRank(year, monthIndex) {
    if (!imported) return null;
    const monthKey = `${year}-${monthIndex + 1}`;
    const monthData = imported.months?.[monthKey];
    if (!monthData) return null;

    const todayKey = dateKey(today);
    const allDates = missionDates(year, monthIndex);
    const dates = allDates.filter((key) =>
      year < today.getFullYear() ||
      (year === today.getFullYear() && monthIndex < today.getMonth()) ||
      key <= todayKey
    );
    if (!dates.length) return null;

    const me = currentMemberId();
    const memberMap = new Map();
    monthData.members.forEach((member) => {
      const nickKey = member.nickname || member.instagramId || member.id;
      if (!memberMap.has(nickKey)) {
        memberMap.set(nickKey, { memberIds: [member.id], nickname: member.nickname });
      } else {
        const row = memberMap.get(nickKey);
        if (!row.memberIds.includes(member.id)) row.memberIds.push(member.id);
      }
    });

    const rows = Array.from(memberMap.values()).map((entry) => {
      const stat = importedGroupStats(entry.memberIds, dates);
      return { ...entry, ...stat, isMe: entry.memberIds.includes(me) };
    }).sort((a, b) => b.percent - a.percent || b.done - a.done);

    const ranked = assignRanks(rows);
    const meRow = ranked.find((r) => r.isMe);
    return meRow ? meRow.rank : null;
  }

  const splashStart = Date.now();

  function hideSplash() {
    const s = document.getElementById("splash");
    if (!s) return;
    // 처음 앱 실행 시에만 1.5초 스플래시 표시
    sessionStorage.setItem("splash-shown", "1");
    const elapsed = Date.now() - splashStart;
    const delay = Math.max(0, 3000 - elapsed);
    setTimeout(() => {
      s.classList.add("out");
      setTimeout(() => { if (s.parentNode) s.parentNode.removeChild(s); }, 380);
    }, delay);
  }

  window.DC = {
    today,
    emojiSet,
    hideSplash,
    dateKey,
    parseKey,
    shortDate,
    isMissionDay,
    missionDates,
    previousMissionDate,
    nextMissionDate,
    profile,
    saveProfile,
    currentMemberId,
    checks,
    saveChecks,
    hasAttended,
    hasAttendedInDB,
    clearTodayLocal,
    attendToday,
    rate,
    rankGrade,
    instagramValid,
    monthStats,
    userRows,
    assignRanks,
    monthRank,
  };
})();
