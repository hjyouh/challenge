(function () {
  const todayKey = DC.dateKey(DC.today);
  const isMission = DC.isMissionDay(DC.today);
  const circle = document.getElementById("attendanceButton");
  const stage = document.getElementById("missionStage");
  const message = document.getElementById("messageArea");
  const grid = document.getElementById("pouchGrid");
  const monthTitle = document.getElementById("monthTitle");
  const monthRate = document.getElementById("monthRate");
  const missionScore = document.getElementById("missionScore");
  let attended = false;
  let sessionAttendedKey = "";
  let scoreTimer = null;

  function attendedOn(key) {
    return DC.hasAttended(key);
  }

  function koreanDate(key) {
    const date = DC.parseKey(key);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  function drawHome(dropToday = false) {
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

    if (isMission && !attended) {
      message.innerHTML = "가운데 원을 눌러<br />출석체크해 주세요";
    } else if (attended) {
      message.innerHTML = "오늘 출석 완료!<br />복주머니가 출석부에 전달되었습니다.";
    } else if (prevDone) {
      message.innerHTML = "오늘은 출석 체크<br />안하는 날";
    } else {
      message.innerHTML = `${koreanDate(prevKey)}에 결석하셨네요.<br />${koreanDate(nextKey)}에 출석해 주세요.`;
    }

    const renderCard = (key) => {
        const dateIndex = stats.dates.indexOf(key);
        const done = attendedOn(key, dateIndex) || key === sessionAttendedKey;
        const past = key < todayKey;
        const future = key > todayKey;
        const cls = done ? "attended" : past ? "absent" : "";
        const label = done ? "출석완료" : future ? "" : "결석";
        const drop = dropToday && key === sessionAttendedKey ? "drop" : "";
        return `<div class="pouch-card ${cls} ${drop}"><span class="emoji"></span><span class="date">${DC.shortDate(key)} ${label}</span></div>`;
    };
    const firstRow = stats.dates.slice(0, 4);
    const secondRow = stats.dates.slice(4, 9);
    grid.innerHTML = `
      <div class="pouch-row row-4">${firstRow.map(renderCard).join("")}</div>
      ${secondRow.length ? `<div class="pouch-row row-5">${secondRow.map(renderCard).join("")}</div>` : ""}
    `;
  }

  circle.addEventListener("click", () => {
    if (!isMission || attended) return;
    stage.classList.add("shooting");
    setTimeout(() => {
      const stats = DC.monthStats(DC.today.getFullYear(), DC.today.getMonth());
      const countedDates = stats.dates.filter((key) => key <= todayKey);
      sessionAttendedKey = countedDates[countedDates.length - 1] || todayKey;
      DC.attendToday();
      attended = true;
      message.innerHTML = "오늘 출석 완료!<br />복주머니가 출석부에 전달되었습니다.";
      message.classList.add("complete");
      setTimeout(() => drawHome(true), 500);
    }, 3400);
    setTimeout(() => stage.classList.remove("shooting"), 4550);
  });

  drawHome(false);
})();
