(function () {
  const panel = document.getElementById("authPanel");
  const accountsKey = "deinchal-login-accounts";
  const sessionKey = "deinchal-auth-session";
  const resetForTest = true;

  if (resetForTest) {
    localStorage.removeItem(accountsKey);
    localStorage.removeItem(sessionKey);
    localStorage.removeItem("deinchal-profile");
  }

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
    return `<label class="auth-field" for="${id}"><span>${label}</span><input id="${id}" type="${type}" placeholder="${placeholder}" value="${value}" autocapitalize="${autocapitalize}" autocorrect="off" spellcheck="false" /></label>`;
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
    bindTextChoice('[data-choice="no"]', renderLogin);
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
      <form class="account-popup" id="createForm">
        <label class="account-line" for="createLoginId"><span>로그인 ID</span><input id="createLoginId" type="text" placeholder="login_id" autocapitalize="none" autocorrect="off" spellcheck="false" /></label>
        <label class="account-line" for="createPassword"><span>비밀번호</span><input id="createPassword" type="password" placeholder="비밀번호" autocapitalize="none" autocorrect="off" /></label>
        <label class="account-line" for="createPasswordConfirm"><span>비밀번호 확인</span><input id="createPasswordConfirm" type="password" placeholder="비밀번호 확인" autocapitalize="none" autocorrect="off" /></label>
        <div class="account-line readonly-account"><span>닉네임</span><span class="readonly-value">${member.nickname}</span></div>
        <div class="account-line readonly-account"><span>인스타그램 ID</span><span class="readonly-value">${member.instagramId || "-"}</span></div>
        <label class="account-check check-first"><input id="createAuto" type="checkbox" checked /><span>자동로그인</span></label>
        <button class="account-submit" id="createSubmit" type="submit" disabled>계정생성</button>
      </form>
    `;
    requestAnimationFrame(fitSubName);
    const requiredIds = ["createLoginId", "createPassword", "createPasswordConfirm"];
    const submit = document.getElementById("createSubmit");
    const updateActive = () => {
      const ready = requiredIds.every((id) => document.getElementById(id).value.trim()) &&
        document.getElementById("createPassword").value === document.getElementById("createPasswordConfirm").value;
      submit.disabled = !ready;
      submit.classList.toggle("active", ready);
    };
    requiredIds.forEach((id) => document.getElementById(id).addEventListener("input", updateActive));
    updateActive();
    document.getElementById("createForm").addEventListener("submit", (event) => {
      event.preventDefault();
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
      <form class="auth-form" id="loginForm">
        ${field("loginId", "로그인 ID", "login_id")}
        ${field("loginPassword", "비밀번호", "비밀번호", "password")}
        <label class="auth-check"><input id="loginAuto" type="checkbox" checked /> 자동로그인</label>
        <button class="primary" type="submit">로그인</button>
        <button class="secondary" id="backStart" type="button">처음으로</button>
      </form>
    `;
    document.getElementById("backStart").addEventListener("click", () => renderStart());
    document.getElementById("loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
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
      <form class="account-popup" id="newForm">
        <p class="account-question">계정을 생성하시겠습니까?</p>
        <label class="account-line" for="newLoginId"><span>로그인 ID</span><input id="newLoginId" type="text" placeholder="login_id" /></label>
        <label class="account-line" for="newPassword"><span>비밀번호</span><input id="newPassword" type="password" placeholder="비밀번호" /></label>
        <label class="account-line" for="newPasswordConfirm"><span>비밀번호 확인</span><input id="newPasswordConfirm" type="password" placeholder="비밀번호 확인" /></label>
        <label class="account-line" for="newNickname"><span>닉네임</span><input id="newNickname" type="text" placeholder="닉네임" /></label>
        <label class="account-line" for="newInstagram"><span>인스타그램 ID</span><input id="newInstagram" type="text" placeholder="instagram_id" /></label>
        <label class="account-check check-first"><input id="newAuto" type="checkbox" checked /><span>자동로그인</span></label>
        <button class="account-submit" id="newSubmit" type="submit" disabled>계정생성</button>
      </form>
      <div id="candidateList" class="candidate-list"></div>
    `;
    const requiredIds = ["newLoginId", "newPassword", "newPasswordConfirm", "newNickname", "newInstagram"];
    const submit = document.getElementById("newSubmit");
    const updateActive = () => {
      submit.disabled = !requiredIds.every((id) => document.getElementById(id).value.trim()) ||
        document.getElementById("newPassword").value !== document.getElementById("newPasswordConfirm").value;
      submit.classList.toggle("active", !submit.disabled);
    };
    requiredIds.forEach((id) => document.getElementById(id).addEventListener("input", updateActive));
    updateActive();
    document.getElementById("newForm").addEventListener("submit", (event) => {
      event.preventDefault();
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
  const phone = document.querySelector(".auth-phone");
  if (phone && window.visualViewport) {
    const updateHeight = () => {
      requestAnimationFrame(() => {
        phone.style.height = window.visualViewport.height + "px";
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
  renderStart();
})();
