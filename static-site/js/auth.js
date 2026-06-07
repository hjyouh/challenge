(function () {
  const panel      = document.getElementById("authPanel");
  const sessionKey = "deinchal-auth-session";
  const SB_URL     = 'https://rlzbwdvkpjfhxnxkblfg.supabase.co';
  const SB_KEY     = 'sb_publishable_S50LJ8UgfRXDXybLl2IkcA_NpI2ipw0';

  // ── Supabase 계정 API ──────────────────────────────
  async function sbGetAccounts() {
    const r = await fetch(`${SB_URL}/rest/v1/accounts?select=*`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    return r.ok ? r.json() : [];
  }

  async function sbSaveAccount(account) {
    const body = {
      login_id:     account.loginId,
      password:     account.password,
      nickname:     account.nickname,
      instagram_id: account.instagramId,
      member_ids:   account.memberIds || [],
      emoji:        account.emoji || '😀',
    };
    await fetch(`${SB_URL}/rest/v1/accounts?on_conflict=login_id`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(body),
    });
  }

  // 로컬 캐시 (로그인 중 세션용)
  function accounts() {
    return JSON.parse(localStorage.getItem('deinchal-login-accounts') || '[]');
  }
  function cacheAccounts(list) {
    localStorage.setItem('deinchal-login-accounts', JSON.stringify(list));
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

  function findMembers(nickname, instagramId, registeredIds = new Set()) {
    const nick = normalize(nickname);
    const insta = normalize(instagramId);
    const members = allMembers().filter(m => !registeredIds.has(normalize(m.instagramId)));
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
    return { type: "similar", rows: similar };
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

  const backBtn = document.getElementById("authBackBtn");
  let backHandler = null;

  function showBack(handler) {
    backHandler = handler;
    backBtn.hidden = false;
    backBtn.onclick = () => handler();
  }

  function hideBack() {
    backBtn.hidden = true;
    backBtn.onclick = null;
    backHandler = null;
  }

  function bindBack(handler) { showBack(handler); }

  function renderStart(message = "") {
    hideBack();
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
          <span class="text-choice" data-choice="no" role="button" tabindex="0">계정 생성</span>
          <span class="text-choice" data-choice="yes" role="button" tabindex="0">예</span>
        </div>
      </div>
    `;
    showBack(renderStart);
    bindTextChoice('[data-choice="yes"]', renderLogin);
    bindTextChoice('[data-choice="no"]', renderNewAccount);
  }

  function renderFind(message = "") {
    panel.innerHTML = `
      <div class="login-popup find-popup">
        <h2>기존 계정 찾기</h2>
        <p>그동안 사용하신 닉네임 또는<br />인스타그램 ID를 입력해 주세요.</p>
        ${message ? `<p class="auth-message">${message}</p>` : ""}
        <form class="auth-form" id="findForm" autocomplete="off">
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
    bindBack(renderStart);
    const submitFind = async () => {
      const nickname   = document.getElementById("findNickname").value;
      const instagramId = document.getElementById("findInstagram").value;
      // Supabase에서 이미 계정이 있는 instagram_id 목록 조회
      let registeredIds = new Set();
      try {
        const rows = await sbGetAccounts();
        rows.forEach(r => { if (r.instagram_id) registeredIds.add(r.instagram_id.toLowerCase()); });
      } catch (_) {}
      const result = findMembers(nickname, instagramId, registeredIds);
      renderCandidates(result);
    };
    const updateFindState = () => {
      const nickname = document.getElementById("findNickname");
      const instagram = document.getElementById("findInstagram");
      const ready = Boolean(nickname.value.trim() || instagram.value.trim());
      nickname.classList.toggle("has-value", Boolean(nickname.value.trim()));
      instagram.classList.toggle("has-value", Boolean(instagram.value.trim()));
      const submit = document.getElementById("findSubmit");
      submit.classList.toggle("ready", ready);
      if (!ready) submit.classList.remove("selected");
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

  function renderCandidates(result, prefilled) {
    const target = document.getElementById("candidateList");
    if (!result.rows.length) {
      target.innerHTML = `<p class="auth-message">계정을 찾지 못했습니다.</p>`;
      return;
    }
    target.innerHTML = `
      <p class="candidate-title">${result.type === "exact" ? "이 계정이 맞나요?" : "비슷한 계정이 있습니다."}</p>
      <div class="candidate-rows">
        ${result.rows.map((member, index) => `
          <button class="candidate-row" type="button" data-index="${index}">
            <strong>${member.nickname}</strong>
            <span>@${member.instagramId || "-"}</span>
          </button>
        `).join("")}
      </div>
    `;
    target.querySelectorAll(".candidate-rows .candidate-row").forEach((button) => {
      button.addEventListener("click", () => {
        const member = result.rows[Number(button.dataset.index)];
        // prefilled 없으면 loginId/비밀번호 입력 단계 먼저
        if (prefilled) {
          renderConfirm(member, prefilled);
        } else {
          renderSetCredentials(member);
        }
      });
    });
  }

  // 기존 계정 찾기 경로: loginId/비밀번호 입력 후 계정 생성
  function renderSetCredentials(member) {
    panel.innerHTML = `
      <form class="account-popup" id="credForm" autocomplete="off">
        <p class="account-question">${member.nickname} / @${member.instagramId || "-"}</p>
        <label class="account-line" for="credLoginId"><span>ID</span><input id="credLoginId" type="text" placeholder="login_id" autocapitalize="none" autocorrect="off" /></label>
        <label class="account-line" for="credPassword"><span>비번</span><input id="credPassword" type="text" style="-webkit-text-security:disc" placeholder="비밀번호" autocorrect="off" autocomplete="current-password" data-form-type="other" /></label>
        <label class="account-check check-first"><input id="credAuto" type="checkbox" checked /><span>자동로그인</span></label>
        <p id="credMsg" class="auth-message"></p>
        <button class="account-submit" id="credNext" type="button" disabled>다음</button>
      </form>
    `;
    showBack(renderFind);

    const updateState = () => {
      const hasId = Boolean(document.getElementById("credLoginId").value.trim());
      const hasPw = Boolean(document.getElementById("credPassword").value.trim());
      const btn = document.getElementById("credNext");
      btn.disabled = !(hasId && hasPw);
      btn.classList.toggle("active", hasId && hasPw);
    };
    ["credLoginId","credPassword"].forEach(id =>
      document.getElementById(id).addEventListener("input", updateState)
    );
    updateState();

    document.getElementById("credNext").addEventListener("click", () => {
      const loginId  = document.getElementById("credLoginId").value.trim();
      const password = document.getElementById("credPassword").value.trim();
      if (!loginId || !password) return;
      renderConfirm(member, { loginId, password, autoLogin: document.getElementById("credAuto").checked });
    });
  }

  // 신규 계정 확인 팝업
  function renderConfirmNew(member, prefilled) {
    panel.innerHTML = `
      <div class="login-popup">
        <h2 style="font-size:16px;margin-bottom:10px">입력하신 정보로 계정을 생성하시겠습니까?</h2>
        <p style="color:var(--gold);font-size:15px;font-weight:800;margin-bottom:6px">
          ${member.nickname} / @${member.instagramId || "-"}
        </p>
        <p style="color:#8e8a84;font-size:13px;margin-bottom:20px">ID: ${prefilled?.loginId || ""}</p>
        <div class="popup-actions">
          <span class="text-choice" id="confirmNo"  role="button" tabindex="0">아니오</span>
          <span class="text-choice" id="confirmYes" role="button" tabindex="0">예</span>
        </div>
        <p id="confirmMsg" class="auth-message" style="margin-top:12px"></p>
      </div>
    `;
    showBack(renderNewAccount);
    document.getElementById("confirmNo").addEventListener("click", () => renderNewAccount());
    document.getElementById("confirmYes").addEventListener("click", async () => {
      const yesBtn = document.getElementById("confirmYes");
      yesBtn.textContent = "생성 중...";
      const account = {
        loginId:     prefilled?.loginId || "",
        password:    prefilled?.password || "",
        nickname:    member.nickname,
        instagramId: member.instagramId || "",
        memberIds:   [],
        emoji:       "😀",
      };
      try {
        await sbSaveAccount(account);
        cacheAccounts([...accounts(), account]);
        setProfile(account, prefilled?.autoLogin ?? true);
        goHome();
      } catch {
        document.getElementById("confirmMsg").textContent = "계정 생성 중 오류가 발생했습니다.";
      }
    });
  }

  // 예/아니오 확인 팝업 (이미 입력한 정보 재사용)
  function renderConfirm(member, prefilled) {
    panel.innerHTML = `
      <div class="login-popup">
        <h2 style="font-size:16px;margin-bottom:10px">이 계정으로 생성하시겠습니까?</h2>
        <p style="color:var(--gold);font-size:15px;font-weight:800;margin-bottom:20px">
          ${member.nickname} / @${member.instagramId || "-"}
        </p>
        <div class="popup-actions">
          <span class="text-choice" id="confirmNo"  role="button" tabindex="0">아니오</span>
          <span class="text-choice" id="confirmYes" role="button" tabindex="0">예</span>
        </div>
        <p id="confirmMsg" class="auth-message" style="margin-top:12px"></p>
      </div>
    `;
    showBack(renderNewAccount);
    document.getElementById("confirmNo").addEventListener("click", () => renderNewAccount());
    document.getElementById("confirmYes").addEventListener("click", async () => {
      const yesBtn = document.getElementById("confirmYes");
      yesBtn.textContent = "생성 중...";
      const account = {
        loginId:     prefilled?.loginId || "",
        password:    prefilled?.password || "",
        nickname:    member.nickname,
        instagramId: member.instagramId || "",
        memberIds:   member.memberIds || [],
        emoji:       member.emoji || "😀",
      };
      try {
        await sbSaveAccount(account);
        cacheAccounts([account]);
        setProfile(account, prefilled?.autoLogin ?? true);
        goHome();
      } catch {
        document.getElementById("confirmMsg").textContent = "계정 생성 중 오류가 발생했습니다.";
      }
    });
  }

  function renderCreate(member, prefilled) {
    // renderConfirm으로 대체 — 이미 입력한 정보 재사용
    renderConfirm(member, prefilled);
  }

  function _renderCreateOld(member) {
    panel.innerHTML = ``;
    requestAnimationFrame(fitSubName);
    bindBack(renderFind);
    const requiredIds = ["createLoginId", "createPassword", "createPasswordConfirm"];
    const submit = document.getElementById("createSubmit");
    const updateActive = () => {
      const pw = document.getElementById("createPassword")?.value || "";
      const pw2 = document.getElementById("createPasswordConfirm")?.value || "";
      const matched = pw.length > 0 && pw === pw2;
      const ready = requiredIds.every((id) => document.getElementById(id)?.value.trim()) && matched;
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
      <form class="account-popup" id="loginForm" autocomplete="off">
        <p class="account-question">로그인</p>
        ${message ? `<p class="auth-message">${message}</p>` : ""}
        <label class="account-line" for="loginId"><span>ID</span><input id="loginId" type="text" placeholder="login_id" autocapitalize="none" autocorrect="off" /></label>
        <label class="account-line" for="loginPassword"><span>비번</span><input id="loginPassword" type="text" style="-webkit-text-security:disc" placeholder="비밀번호" autocorrect="off" autocomplete="off" data-form-type="other" /></label>
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
    bindBack(renderReturning);
    document.getElementById("backStart").addEventListener("click", () => renderStart());
    document.getElementById("goNewAccount").addEventListener("click", () => renderNewAccount());
    document.getElementById("loginSubmit").addEventListener("click", async () => {
      if (submit.disabled) return;
      const loginId  = document.getElementById("loginId").value.trim();
      const password = document.getElementById("loginPassword").value.trim();
      submit.disabled = true;
      submit.textContent = '확인 중...';
      try {
        // Supabase에서 먼저 확인
        const r = await fetch(
          `${SB_URL}/rest/v1/accounts?login_id=eq.${encodeURIComponent(loginId)}&password=eq.${encodeURIComponent(password)}&limit=1`,
          { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
        );
        const rows = await r.json();
        const sbAccount = rows[0];
        if (sbAccount) {
          const account = {
            loginId:     sbAccount.login_id,
            password:    sbAccount.password,
            nickname:    sbAccount.nickname,
            instagramId: sbAccount.instagram_id,
            memberIds:   sbAccount.member_ids || [],
            emoji:       sbAccount.emoji || '😀',
          };
          cacheAccounts([account]);
          setProfile(account, true);
          goHome();
          return;
        }
        // fallback: localStorage
        const local = accounts().find(a => a.loginId === loginId && a.password === password);
        if (local) { setProfile(local, true); goHome(); return; }
        renderLogin("로그인 정보를 찾지 못했습니다. 기존 계정을 먼저 찾아 주세요.");
      } catch {
        renderLogin("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    });
  }

  function isKnownInstagram(id) {
    if (!id) return false;
    return Object.values(window.DC_IMPORTED_DATA?.months || {}).some((month) =>
      month.members.some((m) => normalize(m.instagramId) === normalize(id))
    );
  }

  function renderNewAccount() {
    panel.innerHTML = `
      <form class="account-popup" id="newForm" autocomplete="off">
        <p class="account-question">계정을 생성하시겠습니까?</p>
        <label class="account-line" for="newLoginId"><span>로그인 ID</span><input id="newLoginId" type="text" placeholder="login_id" autocapitalize="none" autocorrect="off" /></label>
        <label class="account-line" for="newPassword"><span>비밀번호</span><input id="newPassword" type="text" style="-webkit-text-security:disc" placeholder="비밀번호" autocorrect="off" autocomplete="current-password" data-form-type="other" /></label>
        <label class="account-line pw-check-line" for="newPasswordConfirm"><span>비밀번호 확인</span><input id="newPasswordConfirm" type="text" style="-webkit-text-security:disc" placeholder="비밀번호 확인" autocorrect="off" autocomplete="current-password" data-form-type="other" /><span class="pw-match" id="newPwMatchIcon">✓</span></label>
        <label class="account-line" for="newNickname"><span>닉네임</span><input id="newNickname" type="text" placeholder="닉네임" /></label>
        <label class="account-line" for="newInstagram">
          <span>인스타그램<br/>ID @</span>
          <div class="insta-input-wrap">
            <input id="newInstagram" type="text" placeholder="instagram_id" autocapitalize="none" autocorrect="off" spellcheck="false" />
            <span id="instaCheck" class="insta-check"></span>
          </div>
        </label>
        <label class="account-check check-first"><input id="newAuto" type="checkbox" checked /><span>자동로그인</span></label>
        <button class="account-submit" id="newSubmit" type="button" disabled>계정생성</button>
      </form>
      <div id="candidateList" class="candidate-list"></div>
    `;
    bindBack(renderReturning);
    const requiredIds = ["newLoginId", "newPassword", "newPasswordConfirm", "newNickname", "newInstagram"];
    const submit = document.getElementById("newSubmit");
    const instaCheck = document.getElementById("instaCheck");

    const checkInsta = () => {
      const id = document.getElementById("newInstagram").value.trim();
      if (!id) { instaCheck.textContent = ""; instaCheck.className = "insta-check"; return; }
      const known = isKnownInstagram(id);
      // 기존 회원이면 ✓ 표시, 신규면 아무것도 표시 안 함
      instaCheck.textContent = known ? "✓" : "";
      instaCheck.className = `insta-check ${known ? "valid" : ""}`;
    };

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
    document.getElementById("newInstagram").addEventListener("input", () => { checkInsta(); updateActive(); });
    updateActive();

    document.getElementById("newSubmit").addEventListener("click", () => {
      const nickname = document.getElementById("newNickname").value.trim();
      const instagramId = document.getElementById("newInstagram").value.trim();

      // 비슷한 기존 계정이 있으면 "이 계정이 맞나요?" 표시
      const prefilled = {
        loginId:  document.getElementById("newLoginId").value.trim(),
        password: document.getElementById("newPassword").value.trim(),
        autoLogin: document.getElementById("newAuto").checked,
      };
      const result = findMembers(nickname, instagramId);
      if (result.rows.length) {
        renderCandidates({ type: "similar", rows: result.rows }, prefilled);
        return;
      }
      // 비슷한 계정 없음 → 입력 정보로 확인 팝업
      const newMember = { nickname, instagramId, memberIds: [], emoji: "😀" };
      renderConfirmNew(newMember, prefilled);
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
  DC.hideSplash();

  // ?page=N 프리뷰 모드 (UI 수정용, 나중에 제거)
  const previewPage = new URLSearchParams(location.search).get("page");
  if (previewPage) {
    const pages = {
      "1": () => renderStart(),
      "2": () => renderFind(),
      "3": () => renderFind(),
      "4": () => renderFind(),
      "5": () => renderReturning(),
      "6": () => renderLogin(),
      "7": () => renderNewAccount(),
    };
    (pages[previewPage] || pages["1"])();
    return;
  }

  // 로컬에 계정 있으면 바로 로그인
  if (accounts().length > 0) {
    renderLogin();
  } else {
    // Supabase에 계정이 있는지 확인 후 결정
    fetch(`${SB_URL}/rest/v1/accounts?select=login_id&limit=1`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    }).then(r => r.json()).then(rows => {
      if (rows.length > 0) renderLogin();
      else renderStart();
    }).catch(() => renderStart());
  }
})();
