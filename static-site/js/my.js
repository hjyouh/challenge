(function () {
  const profile = DC.profile();
  const userId = document.getElementById("userId");
  const nickname = document.getElementById("nickname");
  const instagramId = document.getElementById("instagramId");
  const instagramStatus = document.getElementById("instagramStatus");
  const validateInstagramButton = document.getElementById("validateInstagram");
  const password = document.getElementById("password");
  const changePassword = document.getElementById("changePassword");
  const autoLogin = document.getElementById("autoLogin");
  const emojiPicker = document.getElementById("emojiPicker");
  const emojiMenu = document.getElementById("emojiMenu");
  const emojiArrow = document.getElementById("emojiArrow");
  const installToggle = document.getElementById("installToggle");
  const installDetail = document.getElementById("installDetail");
  let emojiIndex = Math.max(0, DC.emojiSet.indexOf(profile.emoji));
  let instagramVerified = false;
  let originalPassword = "";
  let fullNickname = "";
  let fullInstagramId = "";

  function truncate(str, max) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max) + "…" : str;
  }

  function attachScrollLine(scroller, host) {
    const rail = document.createElement("div");
    const thumb = document.createElement("span");
    let timer = null;
    rail.className = "scroll-line";
    thumb.className = "scroll-thumb";
    rail.appendChild(thumb);
    host.appendChild(rail);

    function update() {
      const overflow = scroller.scrollHeight > scroller.clientHeight + 1;
      rail.classList.toggle("show", overflow);
      if (!overflow) return;
      const top = scroller.offsetTop;
      const height = scroller.clientHeight;
      const proportionalHeight = Math.round((height / scroller.scrollHeight) * height);
      const thumbHeight = Math.max(20, Math.min(48, proportionalHeight));
      const maxTop = height - thumbHeight;
      const progress = scroller.scrollTop / Math.max(1, scroller.scrollHeight - height);
      rail.style.top = `${top}px`;
      rail.style.height = `${height}px`;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${Math.round(maxTop * progress)}px)`;
    }

    scroller.addEventListener("scroll", () => {
      update();
      rail.classList.add("active");
      clearTimeout(timer);
      timer = setTimeout(() => rail.classList.remove("active"), 850);
    });
    window.addEventListener("resize", update);
    setTimeout(update, 0);
    return update;
  }

  function emptyIfDefault(value, defaults) {
    return defaults.includes(value) ? "" : value || "";
  }

  function fill() {
    userId.value = emptyIfDefault(profile.userId, ["myID", "My ID"]);
    fullNickname = emptyIfDefault(profile.nickname, ["닉네임"]);
    nickname.value = truncate(fullNickname, 10);
    fullInstagramId = emptyIfDefault(profile.instagramId, ["myID", "MyID"]);
    instagramId.value = truncate(fullInstagramId, 20);
    password.value = emptyIfDefault(profile.password, ["123456"]);
    originalPassword = password.value;
    autoLogin.checked = Boolean(profile.autoLogin);
    emojiPicker.textContent = `${profile.emoji} 이모지 선택`;
    if (fullInstagramId && DC.instagramValid(fullInstagramId)) {
      instagramVerified = true;
      validateInstagramButton.className = "valid-button valid";
      instagramStatus.className = "field-status valid";
      instagramStatus.textContent = "";
    } else {
      markInstagramPending();
    }
  }

  function markInstagramPending() {
    instagramVerified = false;
    validateInstagramButton.className = "valid-button";
    instagramStatus.className = "field-status";
    instagramStatus.textContent = "";
  }

  function validateInstagram() {
    const valid = DC.instagramValid(instagramId.value.trim());
    const known = !window.DC_IMPORTED_DATA || Object.values(window.DC_IMPORTED_DATA.months || {}).some((month) =>
      month.members.some((member) => member.instagramId === instagramId.value.trim())
    );
    instagramVerified = valid && known;
    validateInstagramButton.className = `valid-button ${instagramVerified ? "valid" : "invalid"}`;
    instagramStatus.className = `field-status ${instagramVerified ? "valid" : "invalid"}`;
    instagramStatus.textContent = instagramVerified ? "" : "ID를 다시 확인해 주세요";
    return instagramVerified;
  }

  function renderEmojiMenu() {
    emojiMenu.innerHTML = DC.emojiSet
      .map((emoji) => `<button type="button" class="${emoji === profile.emoji ? "selected" : ""}" data-emoji="${emoji}">${emoji}</button>`)
      .join("");
    emojiMenu.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        profile.emoji = button.dataset.emoji;
        emojiIndex = Math.max(0, DC.emojiSet.indexOf(profile.emoji));
        emojiPicker.textContent = `${profile.emoji} 이모지 선택`;
        emojiMenu.classList.remove("open");
        DC.saveProfile(profile);
      });
    });
  }

  emojiPicker.addEventListener("click", () => {
    renderEmojiMenu();
    emojiMenu.classList.toggle("open");
    updateEmojiScrollLine();
  });
  emojiArrow.addEventListener("click", () => emojiPicker.click());

  // 이모지 메뉴 바깥 탭 시 닫기
  document.addEventListener("click", (e) => {
    if (emojiMenu.classList.contains("open") && !emojiMenu.contains(e.target) && e.target !== emojiPicker && e.target !== emojiArrow) {
      emojiMenu.classList.remove("open");
    }
  });

  // ── 비밀번호 변경 모달 ──────────────────────────────────
  const pwOverlay = document.getElementById("pwModalOverlay");
  const newPwEl = document.getElementById("newPw");
  const confirmPwEl = document.getElementById("confirmPw");
  const pwMsg = document.getElementById("pwMsg");
  const confirmPwBtn = document.getElementById("confirmPwBtn");

  function openPwModal() {
    newPwEl.value = ""; confirmPwEl.value = "";
    pwMsg.textContent = ""; pwMsg.className = "modal-msg";
    confirmPwBtn.disabled = true;
    pwOverlay.setAttribute("aria-hidden", "false");
    setTimeout(() => newPwEl.focus(), 50);
  }
  function closePwModal() { pwOverlay.setAttribute("aria-hidden", "true"); }

  function checkPwMatch() {
    const v1 = newPwEl.value, v2 = confirmPwEl.value;
    if (!v1) { pwMsg.textContent = ""; confirmPwBtn.disabled = true; return; }
    if (v1 === v2) {
      pwMsg.textContent = "✅ 비밀번호가 일치합니다"; pwMsg.className = "modal-msg success";
      confirmPwBtn.disabled = false;
    } else {
      pwMsg.textContent = v2 ? "비밀번호가 다릅니다" : ""; pwMsg.className = "modal-msg error";
      confirmPwBtn.disabled = true;
    }
  }
  newPwEl.addEventListener("input", checkPwMatch);
  confirmPwEl.addEventListener("input", checkPwMatch);
  document.getElementById("cancelPwModal").addEventListener("click", closePwModal);
  confirmPwBtn.addEventListener("click", () => {
    if (confirmPwBtn.disabled) return;
    profile.password = newPwEl.value;
    DC.saveProfile(profile);
    password.value = profile.password;
    password.type = "password";
    pwMsg.textContent = "비밀번호가 변경되었습니다."; pwMsg.className = "modal-msg success";
    confirmPwBtn.disabled = true;
    setTimeout(closePwModal, 1200);
  });
  pwOverlay.addEventListener("click", (e) => { if (e.target === pwOverlay) closePwModal(); });

  // ── 닉네임 변경 모달 ──────────────────────────────────
  const nickOverlay = document.getElementById("nickModalOverlay");
  const newNickEl = document.getElementById("newNick");
  const nickMsg = document.getElementById("nickMsg");
  const confirmNickBtn = document.getElementById("confirmNickBtn");
  const nickModalDesc = document.getElementById("nickModalDesc");

  function openNickModal() {
    nickModalDesc.innerHTML = `닉네임 <strong>${(profile.nickname || "닉네임").replace(/</g,"&lt;")}</strong>을(를) 변경하시겠습니까?`;
    newNickEl.value = ""; nickMsg.textContent = ""; nickMsg.className = "modal-msg";
    confirmNickBtn.disabled = true;
    nickOverlay.setAttribute("aria-hidden", "false");
    setTimeout(() => newNickEl.focus(), 50);
  }
  function closeNickModal() { nickOverlay.setAttribute("aria-hidden", "true"); }

  newNickEl.addEventListener("input", () => {
    const v = newNickEl.value.trim();
    confirmNickBtn.disabled = !v;
    nickMsg.textContent = "";
  });
  document.getElementById("cancelNickModal").addEventListener("click", closeNickModal);
  confirmNickBtn.addEventListener("click", () => {
    const v = newNickEl.value.trim();
    if (!v) return;
    profile.nickname = v;
    fullNickname = v;
    DC.saveProfile(profile);
    nickname.value = truncate(v, 10);
    nickMsg.textContent = "닉네임이 변경되었습니다."; nickMsg.className = "modal-msg success";
    confirmNickBtn.disabled = true;
    setTimeout(closeNickModal, 1200);
  });
  nickOverlay.addEventListener("click", (e) => { if (e.target === nickOverlay) closeNickModal(); });

  // ── 기존 버튼 → 모달 오픈 ──────────────────────────
  changePassword.addEventListener("click", openPwModal);
  document.getElementById("saveProfile").addEventListener("click", openNickModal);

  instagramId.addEventListener("focus", function () { this.value = fullInstagramId; });
  instagramId.addEventListener("input", function () {
    fullInstagramId = this.value;
    markInstagramPending();
    // 실시간 검증
    const id = this.value.trim();
    if (!id) return;
    const valid = DC.instagramValid(id);
    const known = !window.DC_IMPORTED_DATA || Object.values(window.DC_IMPORTED_DATA.months || {}).some((month) =>
      month.members.some((member) => member.instagramId === id)
    );
    if (valid && known) {
      instagramVerified = true;
      validateInstagramButton.className = "valid-button valid";
      instagramStatus.className = "field-status valid";
      instagramStatus.textContent = "";
    }
  });
  instagramId.addEventListener("blur", function () {
    this.value = truncate(fullInstagramId, 20);
    if (fullInstagramId.trim()) validateInstagram();
  });
  validateInstagramButton.addEventListener("click", validateInstagram);
  installToggle.addEventListener("click", () => {
    const open = installDetail.classList.toggle("open");
    installToggle.textContent = `홈화면 설치 안내 ${open ? "△" : "▽"}`;
    installToggle.setAttribute("aria-expanded", String(open));
    updateInstallScrollLine();
  });
  document.getElementById("togglePassword").addEventListener("click", () => {
    password.type = password.type === "password" ? "text" : "password";
  });
  // autoLogin / userId 변경 즉시 저장
  autoLogin.addEventListener("change", () => { profile.autoLogin = autoLogin.checked; DC.saveProfile(profile); });
  userId.addEventListener("blur", () => { profile.userId = userId.value.trim(); DC.saveProfile(profile); });

  document.getElementById("logoutDemo").addEventListener("click", () => {
    profile.autoLogin = false;
    DC.saveProfile(profile);
    localStorage.removeItem("deinchal-auth-session");
    location.replace("./login.html?v=auth8");
  });

  fill();
  const updateInstallScrollLine = attachScrollLine(installDetail, document.querySelector(".profile-panel"));
  const updateEmojiScrollLine = attachScrollLine(emojiMenu, document.querySelector(".emoji-select-wrap"));
})();
