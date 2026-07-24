/* ============================================================
   Mindray IVD International Service — Shared Login Module
   auth.js
   ------------------------------------------------------------
   Include this ONE file in any platform page:
       <script src="auth.js"></script>

   Then, near the top of that platform's own <script>, call:
       MRAuth.requireLogin({
         platform: 'TLA',              // 'TLA' | 'QE' | 'KB' — must match
                                        // one of the codes in an account's
                                        // `platforms` list below
         onSuccess: function(user) {
           // user = { username, region, label, platforms }
           // put the platform's own normal init/render code here
         }
       });

   This is a CLIENT-SIDE UI GATE ONLY (same as previously agreed for the
   TLA platform) — it controls what the browser shows, it is not a real
   security boundary. Good enough to keep casual visitors out and to give
   each region a scoped default view; not sufficient to protect data from
   a determined technical user, since credentials live in this file's
   source code.

   Session note: uses localStorage (not sessionStorage), so if all your
   platforms are hosted on the SAME domain, logging into one platform
   keeps you logged in on the others too (a lightweight single sign-on).
   If they're on different domains, each will still prompt separately —
   that's a browser limitation, not something this file can work around.
   ============================================================ */
(function (global) {
  "use strict";

  // ── 1. ACCOUNTS — edit this list to add/remove people or platforms ──
  // `platforms`: which of your platform codes this account may open.
  // `region`: used by the TLA platform to scope which region's data an
  //           account sees; other platforms can ignore this field, or
  //           adopt the same convention if useful.
  const ACCOUNTS = {
    'MRHQIVD':  { pass: 'Thomas', region: 'ALL', label: 'HQ · 总部', platforms: ['TLA', 'QE', 'RTS', 'KB', 'NPI', 'SUP', 'TRN', 'SLA'] },
    'MRINIVD':  { pass: 'Vallal', region: 'IN', label: 'India · 印度', platforms: ['TLA', 'QE', 'RTS', 'KB', 'NPI', 'TRN'] },
    'MREUIVD':  { pass: 'Tom', region: 'EU', label: 'Europe · 欧洲', platforms: ['TLA', 'QE', 'RTS', 'NPI', 'KB', 'TRN'] },
    'MRAPIVD':  { pass: 'Reed', region: 'AP', label: 'APAC · 亚太', platforms: ['TLA', 'QE', 'RTS', 'KB', 'NPI', 'TRN'] },
    'MRCAIVD':  { pass: 'Ace', region: 'CA', label: 'Central Asia · 中亚', platforms: ['TLA', 'QE', 'RTS', 'KB', 'NPI', 'TRN'] },
    'MRLAIVD':  { pass: 'Manuel', region: 'LA', label: 'LATAM · 拉美', platforms: ['TLA', 'QE', 'RTS', 'KB', 'NPI', 'TRN'] },
    'MRMEAIVD':  { pass: 'Rain', region: 'MEA', label: 'MEA · 中东非', platforms: ['TLA', 'QE', 'RTS', 'KB', 'NPI', 'TRN'] },
    'MRRUSIVD':  { pass: 'Evgeniy', region: 'RUS', label: 'Russia · 俄罗斯', platforms: ['TLA', 'QE', 'RTS', 'KB', 'NPI', 'TRN'] },
  };

  const PLATFORM_LABELS = {
    TLA: 'TLA Project Management Platform · TLA项目管理平台',
    QE: 'QE Management Platform · QE管理平台',
    RTS: 'RTS Monthly Dashboard · RTS月度数据平台',
    KB: 'Knowledge Base · 知识库平台',
    NPI: 'NPI · 新产品导入',
    SUP: 'Online Support · 在线支持业务',
    TRN: 'Training & Enablement · 培训赋能',
    SLA: 'SLA Dashboard · SLA看板',
  };

  const SESSION_KEY = 'mr_auth_session_v1';

  // ── 2. Session helpers (shared across same-origin platforms) ──
  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function writeSession(username) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username, ts: Date.now() }));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }
  function getCurrentUser() {
    const s = readSession();
    if (!s || !ACCOUNTS[s.username]) return null;
    const a = ACCOUNTS[s.username];
    return { username: s.username, region: a.region, label: a.label, platforms: a.platforms.slice() };
  }
  function logout() {
    clearSession();
    location.reload();
  }

  // ── 3. UI — injected on demand, no HTML markup needed in the host page ──
  function injectStyles() {
    if (document.getElementById('mr-auth-style')) return;
    const style = document.createElement('style');
    style.id = 'mr-auth-style';
    style.textContent = `
      #mr-auth-overlay{position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0F1923 0%,#1F2937 60%,#3a0d14 100%);
        display:flex;align-items:center;justify-content:center;font-family:'Inter','PingFang SC','Microsoft YaHei',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      #mr-auth-card{background:#fff;border-radius:14px;padding:36px 34px 30px;width:340px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.35)}
      #mr-auth-card .mr-brand{display:flex;align-items:center;gap:8px;margin-bottom:4px}
      #mr-auth-card .mr-logo{width:26px;height:26px;border-radius:6px;background:#C8102E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
      #mr-auth-card .mr-title{font-size:14px;font-weight:800;color:#1F2937}
      #mr-auth-card .mr-sub{font-size:11px;color:#6B7280;margin-bottom:22px}
      #mr-auth-card label{font-size:11px;font-weight:700;color:#374151}
      #mr-auth-card input{padding:8px 10px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;outline:none;width:100%;box-sizing:border-box;font-family:inherit}
      #mr-auth-card .mr-field{display:flex;flex-direction:column;gap:4px;margin-bottom:14px}
      #mr-auth-card .mr-err{display:none;color:#DC2626;font-size:11.5px;font-weight:600;margin:8px 0 0}
      #mr-auth-card button[type=submit]{margin-top:18px;width:100%;padding:10px;border:none;border-radius:7px;background:#C8102E;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
      #mr-auth-card .mr-note{font-size:10px;color:#9CA3AF;margin-top:14px;line-height:1.5}
    `;
    document.head.appendChild(style);
  }

  function renderLoginForm(container, platform, onSuccess) {
    const platformLabel = platform ? (PLATFORM_LABELS[platform] || platform) : 'Mindray IVD International Service';
    container.innerHTML = `
      <div id="mr-auth-overlay">
        <form id="mr-auth-form" class="mr-auth-form">
          <div id="mr-auth-card">
            <div class="mr-brand">
              <div class="mr-logo">M</div>
              <div class="mr-title">${platformLabel}</div>
            </div>
            <div class="mr-sub">Please sign in · 请登录</div>
            <div class="mr-field">
              <label>Username · 账号</label>
              <input id="mr-auth-user" type="text" autocomplete="username" placeholder="e.g. MRHQIVD">
            </div>
            <div class="mr-field">
              <label>Password · 密码</label>
              <input id="mr-auth-pass" type="password" autocomplete="current-password">
            </div>
            <div id="mr-auth-error" class="mr-err"></div>
            <button type="submit">Sign In · 登录</button>
            <div class="mr-note">Each regional account only shows that region's data. HQ accounts see everything.<br>各区域账号仅显示本区域数据，总部账号可查看全部。</div>
          </div>
        </form>
      </div>`;
    document.getElementById('mr-auth-form').addEventListener('submit', function (evt) {
      evt.preventDefault();
      const u = document.getElementById('mr-auth-user').value.trim().toUpperCase();
      const p = document.getElementById('mr-auth-pass').value;
      const acct = ACCOUNTS[u];
      const errEl = document.getElementById('mr-auth-error');
      if (!acct || acct.pass !== p) {
        errEl.textContent = 'Incorrect username or password · 账号或密码错误';
        errEl.style.display = 'block';
        return;
      }
      if (platform && acct.platforms.indexOf(platform) === -1) {
        errEl.textContent = 'This account does not have access to this platform · 该账号无权访问此平台';
        errEl.style.display = 'block';
        return;
      }
      writeSession(u);
      container.remove();
      onSuccess(getCurrentUser());
    });
  }

  function renderDenied(container, user, platform) {
    const platformLabel = PLATFORM_LABELS[platform] || platform;
    container.innerHTML = `
      <div id="mr-auth-overlay">
        <div id="mr-auth-card" style="text-align:center">
          <div class="mr-title" style="margin-bottom:10px">Access denied · 无权访问</div>
          <div style="font-size:12px;color:#4B5563;line-height:1.6;margin-bottom:18px">
            "${user.username}" does not have access to ${platformLabel}.<br>
            该账号没有 ${platformLabel} 的访问权限。
          </div>
          <button onclick="MRAuth.logout()" style="width:100%;padding:10px;border:none;border-radius:7px;background:#C8102E;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Log out · 退出登录</button>
        </div>
      </div>`;
  }

  // ── 4. Public entry point ──
  function requireLogin(opts) {
    opts = opts || {};
    const platform = opts.platform || null;
    const onSuccess = opts.onSuccess || function () {};

    injectStyles();
    const existing = getCurrentUser();

    if (existing && (!platform || existing.platforms.indexOf(platform) !== -1)) {
      onSuccess(existing);
      return;
    }

    const container = document.createElement('div');
    container.id = 'mr-auth-container';
    document.body.appendChild(container);

    if (existing && platform && existing.platforms.indexOf(platform) === -1) {
      renderDenied(container, existing, platform);
    } else {
      renderLoginForm(container, platform, onSuccess);
    }
  }

  global.MRAuth = { requireLogin: requireLogin, logout: logout, getCurrentUser: getCurrentUser };
})(window);
