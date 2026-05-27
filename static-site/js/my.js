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
    emojiPicker.textContent = `${profile.emoji} 이모지 선택 ▽`;
    if (fullInstagramId && DC.instagramValid(fullInstagramId)) {
      instagramVerified = true;
      validateInstagramButton.className = "valid-button valid";
      instagramStatus.className = "field-status valid";
      instagramStatus.textContent = "";
    } else {
      markInstagramPending();
    }
    updatePasswordAction();
  }

  function updatePasswordAction() {
    const changed = password.value !== originalPassword;
    changePassword.classList.toggle("active", changed);
    changePassword.disabled = !changed;
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
        emojiPicker.textContent = `${profile.emoji} 이모지 선택  ▽`;
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

  nickname.addEventListener("focus", function () { this.value = fullNickname; });
  nickname.addEventListener("input", function () { fullNickname = this.value; });
  nickname.addEventListener("blur", function () { this.value = truncate(fullNickname, 10); });

  instagramId.addEventListener("focus", function () { this.value = fullInstagramId; });
  instagramId.addEventListener("input", function () {
    fullInstagramId = this.value;
    markInstagramPending();
  });
  instagramId.addEventListener("blur", function () { this.value = truncate(fullInstagramId, 20); });
  validateInstagramButton.addEventListener("click", validateInstagram);
  installToggle.addEventListener("click", () => {
    const open = installDetail.classList.toggle("open");
    installToggle.textContent = `홈화면 설치 안내 ${open ? "△" : "▽"}`;
    installToggle.setAttribute("aria-expanded", String(open));
    updateInstallScrollLine();
  });
  document.getElementById("togglePassword").addEventListener("click", () => {
    // type=text + -webkit-text-security 토글 (iOS 강력한 암호 팝업 방지)
    const hidden = password.style.webkitTextSecurity === "disc" || !password.style.webkitTextSecurity;
    password.style.webkitTextSecurity = hidden ? "none" : "disc";
  });
  password.addEventListener("input", updatePasswordAction);
  document.getElementById("saveProfile").addEventListener("click", () => {
    if (!instagramVerified && !validateInstagram()) return;
    profile.userId = userId.value.trim();
    profile.nickname = fullNickname.trim() || "닉네임";
    profile.instagramId = fullInstagramId.trim();
    profile.autoLogin = autoLogin.checked;
    DC.saveProfile(profile);
    nickname.value = truncate(profile.nickname, 10);
    instagramId.value = truncate(profile.instagramId, 20);
    instagramStatus.textContent = "저장되었습니다.";
  });
  changePassword.addEventListener("click", () => {
    if (changePassword.disabled) return;
    profile.password = password.value || "123456";
    DC.saveProfile(profile);
    originalPassword = password.value;
    updatePasswordAction();
  });
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
