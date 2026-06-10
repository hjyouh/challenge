(function () {
  const testMode = new URLSearchParams(location.search).has("test");
  const todayKey = DC.dateKey(DC.today);
  const isMission = testMode || DC.isMissionDay(DC.today);
  const circle = document.getElementById("attendanceButton");
  const stage = document.getElementById("missionStage");
  const message = document.getElementById("messageArea");
  const grid = document.getElementById("pouchGrid");
  const monthTitle = document.getElementById("monthTitle");
  const monthRate = document.getElementById("monthRate");
  const missionScore = document.getElementById("missionScore");
  // 당일 출석 여부 (테스트 모드에서는 항상 미출석)
  let attended = !testMode && isMission && DC.hasAttended(todayKey);
  let sessionAttendedKey = attended ? todayKey : "";
  let scoreTimer = null;

  function attendedOn(key) {
    return DC.hasAttended(key);
  }

  function koreanDate(key) {
    const date = DC.parseKey(key);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  function drawHome(dropToday = false) {
    // 비동기 데이터 로드 후 attended 상태 재체크
    if (!attended) {
      attended = isMission && DC.hasAttended(todayKey);
      if (attended) sessionAttendedKey = todayKey;
    }
    const stats = DC.monthStats(DC.today.getFullYear(), DC.today.getMonth());
    const prevKey = DC.dateKey(DC.previousMissionDate());
    const prevIndex = stats.dates.indexOf(prevKey);
    const prevDone = attendedOn(prevKey, prevIndex);
    const nextKey = DC.dateKey(DC.nextMissionDate(new Date(DC.today.getFullYear(), DC.today.getMonth(), DC.today.getDate() + 1)));
    const circleDate = document.getElementById("circleDate");
    const circleState = document.getElementById("circleState");
    const showActiveBag = attended;

    monthTitle.textContent = `${DC.today.getFullYear()}/${String(DC.today.getMonth() + 1).padStart(2, "0")} 출석부`;
    const countedDates = stats.dates.filter((key) => key <= todayKey);
    const countedDone = countedDates.filter((key) => attendedOn(key) || key === sessionAttendedKey).length;
    const countedRate = DC.rate(countedDone, countedDates.length);
    const displayDone = dropToday ? Math.max(countedDone - 1, 0) : countedDone;
    const displayRate = DC.rate(displayDone, countedDates.length);
    monthRate.textContent = "";
    missionScore.innerHTML = `<strong>${countedDates.length}</strong>번중 <strong>${displayDone}</strong>번<span>(${displayRate}%)</span>`;
    missionScore.classList.remove("score-pop");
    if (dropToday) {
      clearTimeout(scoreTimer);
      scoreTimer = setTimeout(() => {
        missionScore.innerHTML = `<strong>${countedDates.length}</strong>번중 <strong>${countedDone}</strong>번<span>(${countedRate}%)</span>`;
        missionScore.classList.remove("score-pop");
        void missionScore.offsetWidth;
        missionScore.classList.add("score-pop");
      }, 1850);
    }
    circleDate.textContent = attended
      ? `${DC.today.getMonth() + 1}월 ${DC.today.getDate()}일 출석 완료`
      : !isMission && prevDone
        ? `${koreanDate(prevKey)} 출석 완료`
        : !isMission
          ? ""
          : `${DC.today.getMonth() + 1}월 ${DC.today.getDate()}일 출석`;

    circle.classList.toggle("active", showActiveBag);
    circle.classList.toggle("done", showActiveBag);
    stage.classList.toggle("offday", !isMission);
    stage.classList.toggle("offday-done", !isMission && prevDone);
    stage.classList.toggle("offday-missed", !isMission && !prevDone);
    circleState.textContent = "";
    message.classList.toggle("complete", attended);

    const gold = (text) => `<span style="color:var(--gold)">${text}</span>`;
    if (isMission && !attended) {
      message.innerHTML = "회색 복주머니를 눌러<br />출석체크해 주세요";
    } else if (attended) {
      message.innerHTML = "오늘 출석 완료!<br />복주머니가 출석부에 전달되었습니다.";
    } else {
      // 비미션일: "오늘은 출석체크 없습니다." 항상 노란색
      // 전날 결석이면 "결석하셨네요." 추가, 출석했으면 그 줄 없음
      // 다음 출석 날짜만 노란색
      message.innerHTML = `${gold("오늘은 출석체크 없습니다.")}<br />${gold(koreanDate(nextKey))}에 출석해 주세요.`;
    }

    const renderCard = (key) => {
        const dateIndex = stats.dates.indexOf(key);
        const done = attendedOn(key, dateIndex) || key === sessionAttendedKey;
        const past = key < todayKey;
        const future = key > todayKey;
        const cls = done ? "attended" : past ? "absent" : "";
        const label = done ? "출석완료" : future ? "" : "결석";
        const drop = dropToday && key === sessionAttendedKey ? "drop" : "";
        const labelHtml = label ? `<br/>${label}` : "";
        return `<div class="pouch-card ${cls} ${drop}"><span class="emoji"></span><span class="date">${DC.shortDate(key)}${labelHtml}</span></div>`;
    };
    const firstRow = stats.dates.slice(0, 4);
    const secondRow = stats.dates.slice(4, 9);
    if (firstRow.length === 0) {
      grid.innerHTML = `<p class="pouch-empty-msg">아직 이달의 미션이 시작되지 않았어요</p>`;
    } else {
      grid.innerHTML = `
        ${`<div class="pouch-row row-4">${firstRow.map(renderCard).join("")}</div>`}
        ${secondRow.length ? `<div class="pouch-row row-5">${secondRow.map(renderCard).join("")}</div>` : ""}
      `;
    }
  }

  const angelEl   = document.getElementById("angel");
  const arrowEl   = document.getElementById("arrow");
  const missionMeta = document.querySelector(".mission-meta");
  const angelImg = "angel-yellow-new.png";
  angelEl.style.backgroundImage = `url("./assets/images/${angelImg}")`;

  function getAnimSec() {
    try {
      const s = JSON.parse(localStorage.getItem("dc-anim") || "{}");
      return {
        angel:         Number(s.angel)         || 2,
        arrow:         Number(s.arrow)         || 1,
        pouchActivate: Number(s.pouchActivate) || 0.75,
        pouchDrop:     Number(s.pouchDrop)     || 1.65,
      };
    } catch { return { angel: 2, arrow: 1, pouchActivate: 0.75, pouchDrop: 1.65 }; }
  }

  function applyAnimVars(a) {
    const root = document.documentElement;
    root.style.setProperty("--anim-pouch-activate", a.pouchActivate + "s");
    root.style.setProperty("--anim-pouch-drop",     a.pouchDrop     + "s");
  }

  // 정확한 각도를 계산해 저장 (WAAPI에서 사용)
  let _deg = 0, _arrowLen = 0;
  function positionAnimation() {
    const stageRect  = stage.getBoundingClientRect();
    const circleRect = circle.getBoundingClientRect();

    // 천사 위치: 뷰포트 좌표 (fixed 오버레이 기준) — mission-meta 높이에 맞춤
    const metaRect  = missionMeta.getBoundingClientRect();
    const angelLeft = stageRect.left - 20;
    const angelTop  = metaRect.top - 10;
    const angelCX   = angelLeft + 46; // 천사 중심 X
    const angelCY   = angelTop  + 46; // 천사 중심 Y

    // 복주머니 중심: 뷰포트 좌표
    const pouchCX = circleRect.left + circleRect.width  / 2;
    const pouchCY = circleRect.top  + circleRect.height / 2;

    const dx = pouchCX - angelCX;
    const dy = pouchCY - angelCY;
    _arrowLen = Math.sqrt(dx * dx + dy * dy);
    _deg      = Math.atan2(dy, dx) * 180 / Math.PI;

    document.documentElement.style.setProperty("--arrow-length", _arrowLen + "px");

    // fixed 오버레이 안에서 뷰포트 좌표로 위치 설정
    angelEl.style.left = angelLeft + "px";
    angelEl.style.top  = angelTop  + "px";
    arrowEl.style.left = angelCX   + "px";
    arrowEl.style.top  = (angelCY - 4) + "px";
  }

  circle.addEventListener("click", () => {
    if (attended) return;
    const anim = getAnimSec();
    applyAnimVars(anim);
    positionAnimation();
    angelEl.style.backgroundImage = `url("./assets/images/${angelImg}")`;
    stage.classList.add("shooting");

    const deg       = _deg;
    const angelMs   = anim.angel * 1000;
    const arrowMs   = anim.arrow * 1000;
    const arrowHitMs = angelMs + arrowMs;

    // ── WAAPI: 천사 grow ──────────────────────────────────
    angelEl.getAnimations().forEach(a => a.cancel());
    angelEl.animate([
      { transform: `scale(0.15)`, opacity: 0,   offset: 0    },
      { transform: `scale(0.15)`, opacity: 0,   offset: 0.15 },
      { transform: `scale(1.3)`,  opacity: 1,   offset: 0.8  },
      { transform: `scale(1.3)`,  opacity: 1,   offset: 1    }
    ], { duration: angelMs, easing: "ease-out", fill: "forwards" });

    // ── WAAPI: 화살 발사 (천사 완료 후 시작) ─────────────
    arrowEl.getAnimations().forEach(a => a.cancel());
    arrowEl.animate([
      { transform: `rotate(${deg}deg) scaleX(0.02) scaleY(0.25)`, opacity: 0, offset: 0    },
      { transform: `rotate(${deg}deg) scaleX(0.02) scaleY(0.25)`, opacity: 0, offset: 0.10 },
      { transform: `rotate(${deg}deg) scaleX(1)    scaleY(1)`,    opacity: 1, offset: 0.82 },
      { transform: `rotate(${deg}deg) scaleX(1)    scaleY(1)`,    opacity: 0, offset: 1    }
    ], { duration: arrowMs, delay: angelMs, easing: "ease-out", fill: "forwards" });

    // ── 화살 히트: 천사 dimout + 출석 처리 ───────────────
    setTimeout(() => {
      // 천사 dimout (WAAPI)
      angelEl.animate([
        { transform: `scale(1.3)`, opacity: 1 },
        { transform: `scale(1.3)`, opacity: 0 }
      ], { duration: 500, easing: "ease-out", fill: "forwards" });

      const stats = DC.monthStats(DC.today.getFullYear(), DC.today.getMonth());
      const countedDates = stats.dates.filter((key) => key <= todayKey);
      sessionAttendedKey = countedDates[countedDates.length - 1] || todayKey;
      if (!testMode) DC.attendToday();
      attended = true;
      circle.classList.add("active", "done");
      setTimeout(() => {
        message.innerHTML = "오늘 출석 완료!<br />복주머니가 출석부에 전달되었습니다.";
        message.classList.add("complete");
      }, anim.pouchActivate * 1000);
      setTimeout(() => drawHome(true), anim.pouchActivate * 1000 + 500);
    }, arrowHitMs);

    // ── 전체 완료 후 정리 ─────────────────────────────────
    const totalMs = arrowHitMs + (anim.pouchActivate + 0.5 + anim.pouchDrop + 0.5) * 1000;
    setTimeout(() => {
      stage.classList.remove("shooting");
      angelEl.getAnimations().forEach(a => a.cancel());
      arrowEl.getAnimations().forEach(a => a.cancel());
      if (testMode) {
        attended = false;
        sessionAttendedKey = "";
        drawHome(false);
      }
    }, totalMs);
  });

  drawHome(false);

  // Supabase 데이터 로드 완료 후 attended 상태 재확인 + DB 동기화
  if (window.DC_DATA_READY) {
    window.DC_DATA_READY.then(() => {
      // Admin이 DB에서 출석을 초기화했는데 localStorage에 남아 있는 경우 동기화
      if (attended && isMission && !DC.hasAttendedInDB(todayKey)) {
        DC.clearTodayLocal();
        attended = false;
        sessionAttendedKey = "";
        drawHome(false);
        return;
      }
      // 비미션일: 이전 미션일 localStorage sync
      if (!isMission) {
        const prevKey = DC.dateKey(DC.previousMissionDate());
        const prevLocal = DC.checks().some(c => c.userId === "me" && c.date === prevKey && c.status === "attended");
        if (prevLocal && !DC.hasAttendedInDB(prevKey)) {
          DC.saveChecks(DC.checks().filter(c => !(c.userId === "me" && c.date === prevKey)));
          drawHome(false);
          return;
        }
      }
      if (!attended) {
        attended = isMission && DC.hasAttended(todayKey);
        if (attended) sessionAttendedKey = todayKey;
        drawHome(false);
      }
    });
  }
})();
