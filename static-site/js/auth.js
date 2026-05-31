(function () {
  const panel = document.getElementById("authPanel");
  const accountsKey = "deinchal-login-accounts";
  const sessionKey = "deinchal-auth-session";
  const resetForTest = false;

  function accounts() {
    return JSON.parse(localStorage.getItem(accountsKey) || "[]");
  }

  function saveAccounts(next) {
    localStorage.setItem(accountsKey, JSON.stringify(next));
  }

  function allMembers() {
    const map = new Map();
    Object.values(window.DC_IMPORTED_DATA?.months || {}).forEach((month) => {
      month.members.forEach((member) => {
        const key = member.nickname || member.instagramId || member.id;
        if (!map.has(key)) {
          map.set(key, {
            id: member.id,
            memberIds: [],
            nickname: member.nickname,
            instagramId: member.instagramId,
          });
        }
        const row = map.get(key);
        if (!row.memberIds.includes(member.id)) row.memberIds.push(member.id);
        if (!row.instagramId && member.instagramId) row.instagramId = member.instagramId;
      });
    });
    return Array.from(map.values());
  }

  function normalize(value) {
    return (value || "").trim().toLowerCase();
  }

  function findMembers(nickname, instagramId) {
    const nick = normalize(nickname);
    const insta = normalize(instagramId);
    const members = allMembers();
    const exact = members.filter((member) =>
      (nick && normalize(member.nickname) === nick) || (insta && normalize(member.instagramId) === insta)
    );
    if (exact.length) return { type: "exact", rows: exact };
    const similar = members.filter((member) =>
      (nick && normalize(member.nickname).includes(nick)) ||
      (nick && nick.includes(normalize(member.nickname))) ||
      (insta && normalize(member.instagramId).includes(insta)) ||
      (insta && insta.includes(normalize(member.instagramId)))
    );
    return { type: "similar", rows: similar.slice(0, 8) };
  }

  function claimed(member) {
    return accounts().find((account) =>
      account.memberIds?.some((id) => member.memberIds.includes(id)) ||
      normalize(account.instagramId) === normalize(member.instagramId) ||
      normalize(account.nickname) === normalize(member.nickname)
    );
  }

  function setProfile(account, autoLogin = true) {
    const profile = {
      id: "me",
      emoji: account.emoji || "😀",
      userId: account.loginId,
      nickname: account.nickname,
      instagramId: account.instagramId,
      password: account.password,
      autoLogin,
      memberIds: account.memberIds,
      accountCreated: true,
    };
    DC.saveProfile(profile);
    localStorage.setItem(sessionKey, JSON.stringify({ loginId: account.loginId, at: new Date().toISOString() }));
  }

  function goHome() {
    location.href = "../index.html";
  }

  function field(id, label, placeholder, type = "text", value = "", autocapitalize = "none") {
    // iOS "강력한 암호" 팝업 방지: type=password 대신 text + -webkit-text-security:disc
    const isPw = type === "password";
    const inputType = isPw ? "text" : type;
    const pwExtra = isPw ? ' style="-webkit-text-security:disc" autocomplete="current-password" data-form-type="other"' : "";
    return `<label class="auth-field" for="${id}"><span>${label}</span><input id="${id}" type="${inputType}" placeholder="${placeholder}" value="${value}" autocapitalize="${autocapitalize}" autocorrect="off" spellcheck="false"${pwExtra} /></label>`;
  }

  function fitSubName() {
    const el = panel.querySelector(".sub-name");
    if (!el) return;
    let size = parseInt(window.getComputedStyle(el).fontSize, 10);
    while (el.scrollWidth > el.clientWidth && size > 8) {
      size -= 1;
      el.style.fontSize = size + "px";
    }
  }

  function bindTextChoice(selector, handler) {
    const node = panel.querySelector(selector);
    const run = () => {
      node.classList.add("selected");
      window.setTimeout(handler, 140);
    };
    node.addEventListener("click", run);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        run();
      }
    });
  }

  function renderStart(message = "") {
    panel.innerHTML = `
      <div class="login-popup">
        <h2>처음 접속하시는 것입니까?</h2>
        <p>기존 챌린지 명단에서<br />본인 계정을 먼저 찾습니다.</p>
        ${message ? `<p class="auth-message">${message}</p>` : ""}
        <div class="popup-actions">
          <span class="text-choice" data-choice="no" role="button" tabindex="0">아니오</span>
          <span class="text-choice" data-choice="yes" role="button" tabindex="0">예</span>
        </div>
      </div>
    `;
    bindTextChoice('[data-choice="yes"]', renderFind);
    bindTextChoice('[data-choice="no"]', renderReturning);
  }

  // 처음접속 N → 기존 계정 있나?
  function renderReturning() {
    panel.innerHTML = `
      <div class="login-popup">
        <h2>기존 계정이 있나요?</h2>
        <p>이전에 만드신 로그인 ID와<br />비밀번호가 있으면 '예'를 선택하세요.</p>
        <div class="popup-actions">
          <span class="text-choice" data-choice="no" role="button" tabindex="0">아니오</span>
          <span class="text-choice" data-choice="yes" role="button" tabindex="0">예</span>
        </div>
      </div>
    `;
    bindTextChoice('[data-choice="yes"]', renderLogin);
    bindTextChoice('[data-choice="no"]', renderNewAccount);
  }

  function renderFind(message = "") {
    panel.innerHTML = `
      <div class="login-popup find-popup">
        <h2>기존 계정 찾기</h2>
        <p>그동안 사용하신 닉네임 또는<br />인스타그램 ID를 입력해 주세요.</p>
        ${message ? `<p class="auth-message">${message}</p>` : ""}
        <form class="auth-form" id="findForm">
          ${field("findNickname", "닉네임", "")}
          ${field("findInstagram", "인스타그램 ID", "")}
          <div class="find-actions">
            <span class="text-choice" id="newAccount" role="button" tabindex="0">새 계정 생성</span>
            <span class="text-choice" id="findSubmit" role="button" tabindex="0">계정찾기</span>
          </div>
        </form>
      </div>
      <div id="candidateList" class="candidate-list"></div>
    `;
    const submitFind = () => {
      const result = findMembers(
        document.getElementById("findNickname").value,
        document.getElementById("findInstagram").value
      );
      renderCandidates(result);
    };
    const updateFindState = () => {
      const nickname = document.getElementById("findNickname");
      const instagram = document.getElementById("findInstagram");
      const ready = Boolean(nickname.value.trim() || instagram.value.trim());
      nickname.classList.toggle("has-value", Boolean(nickname.value.trim()));
      instagram.classList.toggle("has-value", Boolean(instagram.value.trim()));
      document.getElementById("findSubmit").classList.toggle("ready", ready);
    };
    const activateThen = (node, handler) => {
      node.classList.add("selected");
      window.setTimeout(handler, 140);
    };
    document.getElementById("findNickname").addEventListener("input", updateFindState);
    document.getElementById("findInstagram").addEventListener("input", updateFindState);
    updateFindState();
    document.getElementById("newAccount").addEventListener("click", () => activateThen(document.getElementById("newAccount"), renderNewAccount));
    document.getElementById("newAccount").addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateThen(document.getElementById("newAccount"), renderNewAccount);
      }
    });
    document.getElementById("findSubmit").addEventListener("click", () => activateThen(document.getElementById("findSubmit"), submitFind));
    document.getElementById("findSubmit").addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateThen(document.getElementById("findSubmit"), submitFind);
      }
    });
    document.getElementById("findForm").addEventListener("submit", (event) => {
      event.preventDefault();
      submitFind();
    });
  }

  function renderCandidates(result) {
    const target = document.getElementById("candidateList");
    if (!result.rows.length) {
      target.innerHTML = `
        <p class="auth-message">계정을 찾지 못했습니다. 다시 입력하거나 새 계정을 생성해 주세요.</p>
      `;
      return;
    }
    target.innerHTML = `
      <p class="candidate-title">${result.type === "exact" ? "이 계정이 맞나요?" : "비슷한 계정이 있습니다."}</p>
      ${result.rows.map((member, index) => `
        <button class="candidate-row" type="button" data-index="${index}">
          <strong>${member.nickname}</strong>
          <span>@${member.instagramId || "-"}</span>
        </button>
      `).join("")}
    `;
    target.querySelectorAll(".candidate-row").forEach((button) => {
      button.addEventListener("click", () => {
        const member = result.rows[Number(button.dataset.index)];
        renderCreate(member);
      });
    });
  }

  function renderCreate(member) {
    panel.innerHTML = `
      <div class="account-subheader">
        <p class="sub-question">이 계정으로 생성하시겠습니까?</p>
        <p class="sub-name"><span>${member.nickname}</span> / <span>@${member.instagramId || "-"}</span></p>
      </div>
      <form class="account-popup" id="createForm" autocomplete="off">
        <label class="account-line" for="createLoginId"><span>로그인 ID</span><input id="createLoginId" type="text" placeholder="login_id" autocapitalize="none" autocorrect="off" spellcheck="false" /></label>
        <label class="account-line" for="createPassword"><span>비밀번호</span><input id="createPassword" type="text" style="-webkit-text-security:disc" placeholder="비밀번호" autocapitalize="none" autocorrect="off" autocomplete="current-password" data-form-type="other" /></label>
        <label class="account-line pw-check-line" for="createPasswordConfirm"><span>비밀번호 확인</span><input id="createPasswordConfirm" type="text" style="-webkit-text-security:disc" placeholder="비밀번호 확인" autocapitalize="none" autocorrect="off" autocomplete="current-password" data-form-type="other" /><span class="pw-match" id="pwMatchIcon">✓</span></label>
        <div class="account-line readonly-account"><span>닉네임</span><span class="readonly-value">${member.nickname}</span></div>
        <div class="account-line readonly-account"><span>인스타그램 ID</span><span class="readonly-value">${member.instagramId || "-"}</span></div>
        <label class="account-check check-first"><input id="createAuto" type="checkbox" checked /><span>자동로그인</span></label>
        <button class="account-submit" id="createSubmit" type="button" disabled>계정생성</button>
      </form>
    `;
    requestAnimationFrame(fitSubName);
    const requiredIds = ["createLoginId", "createPassword", "createPasswordConfirm"];
    const submit = document.getElementById("createSubmit");
    const updateActive = () => {
      const pw = document.getElementById("createPassword").value;
      const pw2 = document.getElementById("createPasswordConfirm").value;
      const matched = pw.length > 0 && pw === pw2;
      const ready = requiredIds.every((id) => document.getElementById(id).value.trim()) && matched;
      submit.disabled = !ready;
      submit.classList.toggle("active", ready);
      const icon = document.getElementById("pwMatchIcon");
      if (icon) icon.classList.toggle("matched", matched);
    };
    requiredIds.forEach((id) => document.getElementById(id).addEventListener("input", updateActive));
    updateActive();
    document.getElementById("createSubmit").addEventListener("click", () => {
      const loginId = document.getElementById("createLoginId").value.trim();
      const password = document.getElementById("createPassword").value.trim();
      if (submit.disabled || !loginId || !password) return;
      if (accounts().some((account) => normalize(account.loginId) === normalize(loginId))) {
        renderCreate(member);
        panel.insertAdjacentHTML("beforeend", `<p class="auth-message">이미 사용 중인 로그인 ID입니다.</p>`);
        return;
      }
      const account = {
        loginId,
        password,
        nickname: member.nickname,
        instagramId: member.instagramId || "",
        memberIds: member.memberIds,
        createdAt: new Date().toISOString(),
      };
      saveAccounts([...accounts(), account]);
      setProfile(account, document.getElementById("createAuto").checked);
      goHome();
    });
  }

  function renderLogin(message = "") {
    panel.innerHTML = `
      <div class="auth-copy">
        <h2>로그인</h2>
        <p>이미 만든 로그인 ID와 비밀번호로 접속합니다.</p>
        ${message ? `<p class="auth-message">${message}</p>` : ""}
      </div>
      <form class="auth-form" id="loginForm" autocomplete="off">
        ${field("loginId", "로그인 ID", "login_id")}
        ${field("loginPassword", "비밀번호", "비밀번호", "password")}
        <label class="auth-check"><input id="loginAuto" type="checkbox" checked /> 자동로그인</label>
        <div class="login-actions">
          <button class="login-btn" id="backStart" type="button">처음으로</button>
          <button class="login-btn login-btn-primary" id="loginSubmit" type="button" disabled>로그인</button>
          <button class="login-btn" id="goNewAccount" type="button">계정 생성</button>
        </div>
      </form>
    `;
    const submit = document.getElementById("loginSubmit");
    const updateActive = () => {
      const hasId = Boolean(document.getElementById("loginId").value.trim());
      const hasPw = Boolean(document.getElementById("loginPassword").value.trim());
      submit.disabled = !(hasId && hasPw);
      submit.classList.toggle("active", hasId && hasPw);
    };
    document.getElementById("loginId").addEventListener("input", updateActive);
    document.getElementById("loginPassword").addEventListener("input", updateActive);
    updateActive();
    document.getElementById("backStart").addEventListener("click", () => renderStart());
    document.getElementById("goNewAccount").addEventListener("click", () => renderNewAccount());
    document.getElementById("loginSubmit").addEventListener("click", () => {
      if (submit.disabled) return;
      const loginId = document.getElementById("loginId").value.trim();
      const password = document.getElementById("loginPassword").value.trim();
      const account = accounts().find((item) => item.loginId === loginId && item.password === password);
      if (!account) {
        renderLogin("로그인 정보를 찾지 못했습니다. 기존 계정을 먼저 찾아 주세요.");
        return;
      }
      setProfile(account, document.getElementById("loginAuto").checked);
      goHome();
    });
  }

  function renderNewAccount() {
    panel.innerHTML = `
      <form class="account-popup" id="newForm" autocomplete="off">
        <p class="account-question">계정을 생성하시겠습니까?</p>
        <label class="account-line" for="newLoginId"><span>로그인 ID</span><input id="newLoginId" type="text" placeholder="login_id" /></label>
        <label class="account-line" for="newPassword"><span>비밀번호</span><input id="newPassword" type="text" style="-webkit-text-security:disc" placeholder="비밀번호" autocorrect="off" autocomplete="current-password" data-form-type="other" /></label>
        <label class="account-line pw-check-line" for="newPasswordConfirm"><span>비밀번호 확인</span><input id="newPasswordConfirm" type="text" style="-webkit-text-security:disc" placeholder="비밀번호 확인" autocorrect="off" autocomplete="current-password" data-form-type="other" /><span class="pw-match" id="newPwMatchIcon">✓</span></label>
        <label class="account-line" for="newNickname"><span>닉네임</span><input id="newNickname" type="text" placeholder="닉네임" /></label>
        <label class="account-line" for="newInstagram"><span>인스타그램 ID</span><input id="newInstagram" type="text" placeholder="instagram_id" /></label>
        <label class="account-check check-first"><input id="newAuto" type="checkbox" checked /><span>자동로그인</span></label>
        <button class="account-submit" id="newSubmit" type="button" disabled>계정생성</button>
      </form>
      <div id="candidateList" class="candidate-list"></div>
    `;
    const requiredIds = ["newLoginId", "newPassword", "newPasswordConfirm", "newNickname", "newInstagram"];
    const submit = document.getElementById("newSubmit");
    const updateActive = () => {
      const pw = document.getElementById("newPassword").value;
      const pw2 = document.getElementById("newPasswordConfirm").value;
      const matched = pw.length > 0 && pw === pw2;
      submit.disabled = !requiredIds.every((id) => document.getElementById(id).value.trim()) || !matched;
      submit.classList.toggle("active", !submit.disabled);
      const icon = document.getElementById("newPwMatchIcon");
      if (icon) icon.classList.toggle("matched", matched);
    };
    requiredIds.forEach((id) => document.getElementById(id).addEventListener("input", updateActive));
    updateActive();
    document.getElementById("newSubmit").addEventListener("click", () => {
      const nickname = document.getElementById("newNickname").value.trim();
      const instagramId = document.getElementById("newInstagram").value.trim();
      const result = findMembers(nickname, instagramId);
      if (result.rows.length) {
        renderCandidates({ type: "similar", rows: result.rows });
        return;
      }
      const account = {
        loginId: document.getElementById("newLoginId").value.trim(),
        password: document.getElementById("newPassword").value.trim(),
        nickname,
        instagramId,
        memberIds: [],
        createdAt: new Date().toISOString(),
      };
      if (submit.disabled || !account.loginId || !account.password || !account.nickname) return;
      saveAccounts([...accounts(), account]);
      setProfile(account, document.getElementById("newAuto").checked);
      goHome();
    });
  }

  // 키보드 올라올 때: phone 높이 = visual viewport (헤더 고정 유지)
  // 키보드 닫혀있을 때: auth-panel overflow hidden → Safari 주소창 pill 방지
  // 키보드 열려있을 때: auth-panel overflow auto → 긴 폼 스크롤 허용
  const phone = document.querySelector(".auth-phone");
  const authPanelEl = document.getElementById("authPanel");
  if (phone && window.visualViewport) {
    const updateHeight = () => {
      requestAnimationFrame(() => {
        const vvh = window.visualViewport.height;
        phone.style.height = vvh + "px";
        const keyboardOpen = window.innerHeight > vvh + 150;
        if (authPanelEl) {
          authPanelEl.style.overflowY = keyboardOpen ? "auto" : "hidden";
        }
        window.scrollTo(0, 0);
      });
    };
    window.visualViewport.addEventListener("resize", updateHeight);
    window.visualViewport.addEventListener("scroll", updateHeight);
    updateHeight();
  }

  // input 포커스 시 auth-panel 내에서만 scrollIntoView
  const authPanel = document.getElementById("authPanel");
  if (authPanel) {
    authPanel.addEventListener("focusin", (e) => {
      if (e.target.tagName === "INPUT") {
        setTimeout(() => {
          e.target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 320);
      }
    });
  }

  localStorage.removeItem(sessionKey);
  DC.hideSplash();
  // 계정이 있으면 처음접속 화면 없이 바로 로그인으로
  if (accounts().length > 0) {
    renderLogin();
  } else {
    renderStart();
  }
})();
