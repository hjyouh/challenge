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

  const angelEl = document.getElementById("angel");
  const angelColors = ["angel-yellow.png", "angel-white.png"];
  const angelKey = "deinchal-angel-color";
  const lastIdx = parseInt(localStorage.getItem(angelKey) || "0", 10);
  const nextIdx = (lastIdx + 1) % angelColors.length;
  angelEl.style.backgroundImage = `url("./assets/images/${angelColors[lastIdx]}")`;

  function getAnimSec() {
    try {
      const s = JSON.parse(localStorage.getItem("dc-anim") || "{}");
      return {
        angel:          Number(s.angel)          || 2,
        arrow:          Number(s.arrow)          || 1,
        pouchActivate:  Number(s.pouchActivate)  || 0.75,
        pouchDrop:      Number(s.pouchDrop)      || 1.65,
      };
    } catch { return { angel: 2, arrow: 1, pouchActivate: 0.75, pouchDrop: 1.65 }; }
  }

  function applyAnimVars(a) {
    const root = document.documentElement;
    root.style.setProperty("--anim-angel",          a.angel         + "s");
    root.style.setProperty("--anim-arrow",          a.arrow         + "s");
    root.style.setProperty("--anim-pouch-activate", a.pouchActivate + "s");
    root.style.setProperty("--anim-pouch-drop",     a.pouchDrop     + "s");
  }

  function positionAnimation() {
    const stageRect  = stage.getBoundingClientRect();
    const circleRect = circle.getBoundingClientRect();
    const angelCX = -20 + 46;
    const angelCY = 0   + 46;
    const pouchCX = circleRect.left - stageRect.left + circleRect.width  / 2;
    const pouchCY = circleRect.top  - stageRect.top  + circleRect.height / 2;
    const dx      = pouchCX - angelCX;
    const dy      = pouchCY - angelCY;
    const length  = Math.sqrt(dx * dx + dy * dy);
    const deg     = Math.atan2(dy, dx) * 180 / Math.PI;

    // JS에서 keyframe 직접 주입 (Safari iOS에서 var() in keyframe 미지원 대응)
    let styleEl = document.getElementById("dc-anim-kf");
    if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "dc-anim-kf"; document.head.appendChild(styleEl); }
    styleEl.textContent = `
      @keyframes angel-grow {
        0%   { transform: rotate(${deg}deg) scale(0.15); opacity: 0; }
        15%  { opacity: 1; }
        80%  { transform: rotate(${deg}deg) scale(1);    opacity: 1; }
        100% { transform: rotate(${deg}deg) scale(1);    opacity: 1; }
      }
      @keyframes angel-dimout {
        0%   { transform: rotate(${deg}deg) scale(1); opacity: 1; }
        100% { transform: rotate(${deg}deg) scale(1); opacity: 0; }
      }
      @keyframes arrow-shoot {
        0%   { transform: rotate(${deg}deg) scaleX(0.02) scaleY(0.25); opacity: 0; }
        10%  { opacity: 1; }
        82%  { transform: rotate(${deg}deg) scaleX(1) scaleY(1); opacity: 1; }
        100% { transform: rotate(${deg}deg) scaleX(1) scaleY(1); opacity: 0; }
      }
    `;

    document.documentElement.style.setProperty("--arrow-length", length + "px");
    const arrowEl = document.getElementById("arrow");
    arrowEl.style.left = angelCX + "px";
    arrowEl.style.top  = (angelCY - 4) + "px";
  }

  circle.addEventListener("click", () => {
    if (!isMission || attended) return;
    const anim = getAnimSec();
    applyAnimVars(anim);
    positionAnimation();
    angelEl.style.backgroundImage = `url("./assets/images/${angelColors[nextIdx]}")`;
    localStorage.setItem(angelKey, String(nextIdx));
    stage.classList.add("shooting");

    // 화살이 복주머니에 닿는 순간 = 천사 grow + 화살 fly
    const arrowHitMs = (anim.angel + anim.arrow) * 1000;
    // 천사 dim out
    setTimeout(() => angelEl.classList.add("dimout"), arrowHitMs);
    // 화살 히트: 출석 처리 + 복주머니 즉시 active
    setTimeout(() => {
      const stats = DC.monthStats(DC.today.getFullYear(), DC.today.getMonth());
      const countedDates = stats.dates.filter((key) => key <= todayKey);
      sessionAttendedKey = countedDates[countedDates.length - 1] || todayKey;
      if (!testMode) DC.attendToday(); // 테스트 모드에서는 DB/localStorage 저장 안 함
      attended = true;
      // 복주머니 즉시 active (화살이 닿는 순간)
      circle.classList.add("active", "done");
      // 메시지는 복주머니 activate 완료 후 표시
      setTimeout(() => {
        message.innerHTML = "오늘 출석 완료!<br />복주머니가 출석부에 전달되었습니다.";
        message.classList.add("complete");
      }, anim.pouchActivate * 1000);
      // 복주머니 낙하는 activate + 0.5s 후
      setTimeout(() => drawHome(true), anim.pouchActivate * 1000 + 500);
    }, arrowHitMs);

    // shooting 클래스 제거 (전체 애니메이션 완료 후)
    const totalMs = arrowHitMs + (anim.pouchActivate + 0.5 + anim.pouchDrop + 0.5) * 1000;
    setTimeout(() => {
      stage.classList.remove("shooting");
      angelEl.classList.remove("dimout");
      // 테스트 모드: 애니메이션 끝나면 자동으로 초기 상태로 리셋
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
