(() => {
  // src/util.js
  var PAGES = ["Income", "Expense", "Savings", "Interest"];
  var CAT_COLORS = ["#3b6df0", "#23b26d", "#f0a63b", "#e8465f", "#b28dff", "#00c2c2", "#ff8fb3", "#7ee0c3"];
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }
  function safeColor(c, fallback) {
    return typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback || "#3b6df0";
  }
  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== void 0) e.innerHTML = html;
    return e;
  }
  function optionsHTML(options, def) {
    return (options || []).map((o) => {
      const val = o && o.value !== void 0 ? o.value : o;
      const lab = o && o.label !== void 0 ? o.label : o;
      const sel = def !== void 0 && def !== null && String(val) === String(def) ? "selected" : "";
      return '<option value="'.concat(esc(val), '" ').concat(sel, ">").concat(esc(lab), "</option>");
    }).join("");
  }
  function catOptions(list) {
    return list.map((c) => "<option>".concat(esc(c), "</option>")).join("");
  }
  function isoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return "".concat(y, "-").concat(m, "-").concat(day);
  }
  function todayISO() {
    return isoDate(/* @__PURE__ */ new Date());
  }
  function parseISO(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function addDaysISO(iso, n) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  }
  function daysBetween(aIso, bIso) {
    return Math.round((parseISO(bIso) - parseISO(aIso)) / 864e5);
  }
  function currentYM() {
    const d = /* @__PURE__ */ new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function monthsDiff(fromYM, toYM) {
    const [fy, fm] = fromYM.split("-").map(Number);
    const [ty, tm] = toYM.split("-").map(Number);
    return (ty - fy) * 12 + (tm - fm);
  }
  function daysInMonth(year, month0) {
    return new Date(year, month0 + 1, 0).getDate();
  }

  // src/state.js
  var STORAGE_KEY = "finsta_state_v1";
  var saveHooks = [];
  function onSave(fn) {
    saveHooks.push(fn);
  }
  function emptyPageBalances() {
    return { Income: {}, Expense: {}, Savings: {}, Interest: {} };
  }
  function defaultState() {
    const accId = uid();
    return {
      settings: { theme: "simplistic-light", currency: "PHP", username: "You" },
      accounts: [{ id: accId, name: "Main Account", type: "Cash" }],
      activeAccountId: accId,
      categories: {
        Income: ["Allowance", "Gifts", "Salary"],
        Expense: ["Bills", "Shopping", "Transport"],
        Savings: ["Emergency", "Investment", "Tuition Fee"],
        Interest: ["Bank Interest", "Card Interest", "Loan Interest"]
      },
      balances: { [accId]: emptyPageBalances() },
      transactions: [],
      budgets: [],
      reminders: [],
      autoInterestRules: [],
      loans: [],
      credits: [],
      instants: [],
      recurring: [],
      lockedCats: [],
      // Savings categories that can't be withdrawn from
      widgets: {}
    };
  }
  function migrate(s) {
    const d = defaultState();
    if (!s.settings) s.settings = d.settings;
    if (!Array.isArray(s.accounts) || !s.accounts.length) s.accounts = [{ id: uid(), name: "Main Account", type: "Cash" }];
    if (!s.balances) s.balances = {};
    if (!s.categories) s.categories = d.categories;
    PAGES.forEach((p) => {
      if (!Array.isArray(s.categories[p])) s.categories[p] = d.categories[p];
    });
    if (!Array.isArray(s.transactions)) s.transactions = [];
    s.accounts.forEach((a) => {
      if (!s.balances[a.id]) s.balances[a.id] = emptyPageBalances();
    });
    if (s.activeAccountId !== "overall" && !s.accounts.some((a) => a.id === s.activeAccountId)) s.activeAccountId = s.accounts[0].id;
    if (!s.widgets) s.widgets = {};
    if (!s.budgets) s.budgets = [];
    if (!s.reminders) s.reminders = [];
    if (!s.autoInterestRules) s.autoInterestRules = [];
    if (!s.loans) s.loans = [];
    if (!s.credits) s.credits = [];
    if (!s.instants) s.instants = [];
    if (!s.recurring) s.recurring = [];
    if (s.lockedSavings !== void 0) {
      if (s.lockedSavings && !Array.isArray(s.lockedCats)) s.lockedCats = s.categories.Savings.slice();
      delete s.lockedSavings;
    }
    if (!Array.isArray(s.lockedCats)) s.lockedCats = [];
    s.loans.forEach((l) => {
      if (!Array.isArray(l.payments)) l.payments = [];
    });
    s.credits.forEach((c) => {
      if (typeof c.feePercent !== "number") c.feePercent = 0;
    });
    return s;
  }
  function load() {
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return migrate(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("load failed", e);
    }
    return defaultState();
  }
  var STATE = load();
  function setState(s) {
    STATE = migrate(s);
  }
  function save() {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    } catch (e) {
      console.warn("save failed", e);
    }
    saveHooks.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn("save hook failed", e);
      }
    });
  }
  function snapshot() {
    return JSON.stringify(STATE);
  }
  function restoreFrom(snap) {
    STATE = migrate(JSON.parse(snap));
  }
  function fmt(n) {
    const c = STATE.settings.currency || "PHP";
    const sym2 = { PHP: "\u20B1", USD: "$", EUR: "\u20AC", JPY: "\xA5", GBP: "\xA3" }[c] || c + " ";
    const v = Number(n || 0);
    return (v < 0 ? "-" : "") + sym2 + Math.abs(v).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // src/bus.js
  var bus = {
    render() {
    },
    // re-render the current page
    refreshWidgets() {
    },
    // re-render open widgets that depend on data
    refreshWidget(name) {
    },
    // re-render ONE widget
    navigate(page2) {
    }
  };
  function commit() {
    save();
    bus.render();
    bus.refreshWidgets();
  }

  // src/ui.js
  function toast(msg, undoFn) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = msg;
    t.appendChild(span);
    if (undoFn) {
      const b = document.createElement("button");
      b.className = "toast-undo";
      b.textContent = "Undo";
      b.addEventListener("click", () => {
        t.classList.add("hidden");
        clearTimeout(toast._t);
        undoFn();
      });
      t.appendChild(b);
    }
    t.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add("hidden"), undoFn ? 5e3 : 2400);
  }
  function openModal({ title, message, fields: fields2 = [], confirmText = "OK", cancelText = "Cancel", danger = false }) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("app-modal");
      overlay.innerHTML = "";
      const card2 = el("div", "app-modal-card");
      card2.setAttribute("role", "dialog");
      card2.setAttribute("aria-modal", "true");
      const titleEl = el("div", "app-modal-title");
      titleEl.textContent = title;
      card2.appendChild(titleEl);
      if (message) {
        const m = el("div", "app-modal-message muted");
        m.textContent = message;
        card2.appendChild(m);
      }
      const inputs = {};
      fields2.forEach((f) => {
        const wrap = el("div");
        wrap.style.marginBottom = "2px";
        if (f.label) {
          const l = el("div", "app-modal-field-label");
          l.textContent = f.label;
          wrap.appendChild(l);
        }
        let inputEl;
        if (f.type === "select") {
          inputEl = el("select");
          inputEl.innerHTML = optionsHTML(f.options, f.default);
        } else {
          inputEl = el("input");
          inputEl.type = f.type || "text";
          if (f.default !== void 0) inputEl.value = f.default;
          if (f.placeholder) inputEl.placeholder = f.placeholder;
          if (f.type === "number") inputEl.step = "any";
        }
        if (f.key) inputEl.dataset.key = f.key;
        wrap.appendChild(inputEl);
        card2.appendChild(wrap);
        inputs[f.key] = inputEl;
      });
      fields2.forEach((f) => {
        if (f.onChange) inputs[f.key].addEventListener("change", () => f.onChange(inputs[f.key].value, inputs));
      });
      fields2.forEach((f) => {
        if (f.onChange && f.initOnChange) f.onChange(inputs[f.key].value, inputs);
      });
      const actions = el("div", "app-modal-actions");
      const cancelBtn = el("button", "btn secondary");
      cancelBtn.textContent = cancelText;
      const okBtn = el("button", "btn" + (danger ? " danger" : ""));
      okBtn.textContent = confirmText;
      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      card2.appendChild(actions);
      overlay.appendChild(card2);
      overlay.classList.remove("hidden");
      function close(result) {
        overlay.classList.add("hidden");
        overlay.innerHTML = "";
        overlay.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onBackdrop(e) {
        if (e.target === overlay) close(null);
      }
      function onKey(e) {
        if (e.key === "Escape") close(null);
      }
      overlay.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKey);
      cancelBtn.addEventListener("click", () => close(null));
      okBtn.addEventListener("click", () => {
        const vals = {};
        fields2.forEach((f) => vals[f.key] = inputs[f.key].value);
        close(vals);
      });
      card2.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.tagName !== "SELECT") {
          e.preventDefault();
          okBtn.click();
        }
      });
      const first = card2.querySelector("input,select");
      if (first) setTimeout(() => first.focus(), 30);
    });
  }
  function openConfirm(message, opts = {}) {
    return openModal({ title: opts.title || "Are you sure?", message, fields: [], confirmText: opts.confirmText || "Confirm", cancelText: opts.cancelText || "Cancel", danger: opts.danger !== false }).then((r) => r !== null);
  }
  function confirmToast(msg, onYes) {
    openConfirm(msg).then((ok) => {
      if (ok) onYes();
    });
  }
  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  // src/money.js
  var isOverall = () => STATE.activeAccountId === "overall";
  var activeAccount = () => STATE.accounts.find((a) => a.id === STATE.activeAccountId);
  function getBal(accountId, page2, cat) {
    const b = STATE.balances[accountId];
    return b && b[page2] && b[page2][cat] || 0;
  }
  function addBal(accountId, page2, cat, delta) {
    if (!STATE.balances[accountId]) STATE.balances[accountId] = emptyPageBalances();
    const b = STATE.balances[accountId][page2];
    b[cat] = round2((b[cat] || 0) + delta);
  }
  function overallBal(page2, cat) {
    return round2(STATE.accounts.reduce((s, a) => s + getBal(a.id, page2, cat), 0));
  }
  function balFor(accId, page2, cat) {
    return accId === "overall" ? overallBal(page2, cat) : getBal(accId, page2, cat);
  }
  function pageTotal(accountId, page2) {
    if (accountId === "overall") return round2(STATE.accounts.reduce((s, a) => s + pageTotal(a.id, page2), 0));
    const b = STATE.balances[accountId] && STATE.balances[accountId][page2] || {};
    return round2(Object.values(b).reduce((s, v) => s + v, 0));
  }
  function assetsTotal(accountId) {
    return round2(["Income", "Savings", "Interest"].reduce((s, p) => s + pageTotal(accountId, p), 0));
  }
  function loanRemaining(l) {
    if (l.paid) return 0;
    const paid = (l.payments || []).reduce((s, p) => s + p.amount, 0);
    return Math.max(0, round2(l.amount - paid));
  }
  function liabilities(accId) {
    const ids = accId === "overall" ? STATE.accounts.map((a) => a.id) : [accId];
    const loans = STATE.loans.filter((l) => ids.includes(l.accountId)).reduce((s, l) => s + loanRemaining(l), 0);
    const credits = STATE.credits.filter((c) => ids.includes(c.accountId)).reduce((s, c) => s + c.outstandingBalance, 0);
    return round2(loans + credits);
  }
  var netBalance = (accId) => round2(assetsTotal(accId) - liabilities(accId));
  function addAccount(name, type) {
    name = (name || "").trim();
    if (!name) return { ok: false, error: "Give the account a name." };
    if (STATE.accounts.some((a) => a.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: "You already have an account with that name." };
    const id = uid();
    STATE.accounts.push({ id, name, type: type || "Cash" });
    STATE.balances[id] = emptyPageBalances();
    STATE.activeAccountId = id;
    return { ok: true, id };
  }
  function renameAccount(id, name, type) {
    const a = STATE.accounts.find((x) => x.id === id);
    name = (name || "").trim();
    if (!a) return { ok: false, error: "Account not found." };
    if (!name) return { ok: false, error: "Give the account a name." };
    if (STATE.accounts.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: "You already have an account with that name." };
    a.name = name;
    if (type) a.type = type;
    return { ok: true };
  }
  function accountFootprint(id) {
    return {
      transactions: STATE.transactions.filter((t) => t.accountId === id).length,
      loans: STATE.loans.filter((l) => l.accountId === id).length,
      credits: STATE.credits.filter((c) => c.accountId === id).length,
      recurring: STATE.recurring.filter((r) => r.accountId === id).length
    };
  }
  function resetAccount(id) {
    if (!STATE.accounts.some((a) => a.id === id)) return { ok: false, error: "Account not found." };
    const labels = [
      ...STATE.loans.filter((l) => l.accountId === id).flatMap((l) => ["Loan Due: ".concat(l.label), "Loan Installment: ".concat(l.label)]),
      ...STATE.credits.filter((c) => c.accountId === id).map((c) => "Credit Due: ".concat(c.label))
    ];
    const loanLabels = new Set(STATE.loans.filter((l) => l.accountId === id).map((l) => l.label));
    STATE.balances[id] = emptyPageBalances();
    STATE.transactions = STATE.transactions.filter((t) => t.accountId !== id);
    STATE.loans = STATE.loans.filter((l) => l.accountId !== id);
    STATE.credits = STATE.credits.filter((c) => c.accountId !== id);
    STATE.recurring = STATE.recurring.filter((r) => r.accountId !== id);
    STATE.autoInterestRules = STATE.autoInterestRules.filter((r) => r.accountId !== id);
    STATE.reminders = STATE.reminders.filter((r) => !labels.includes(r.title));
    loanLabels.forEach((l) => {
      if (Math.abs(overallBal("Income", l)) < 5e-3) STATE.categories.Income = STATE.categories.Income.filter((c) => c !== l);
    });
    return { ok: true };
  }
  function deleteAccount(id) {
    if (STATE.accounts.length <= 1) return { ok: false, error: "You need at least one account." };
    if (!STATE.accounts.some((a) => a.id === id)) return { ok: false, error: "Account not found." };
    STATE.accounts = STATE.accounts.filter((a) => a.id !== id);
    delete STATE.balances[id];
    STATE.transactions = STATE.transactions.filter((t) => t.accountId !== id);
    STATE.loans = STATE.loans.filter((l) => l.accountId !== id);
    STATE.credits = STATE.credits.filter((c) => c.accountId !== id);
    STATE.recurring = STATE.recurring.filter((r) => r.accountId !== id);
    STATE.autoInterestRules = STATE.autoInterestRules.filter((r) => r.accountId !== id);
    if (STATE.activeAccountId === id) STATE.activeAccountId = STATE.accounts[0].id;
    return { ok: true };
  }
  function addCategory(page2, name) {
    name = (name || "").trim();
    if (!name) return { ok: false, error: "Give the category a name." };
    if (STATE.categories[page2].includes(name)) return { ok: false, error: "Category already exists." };
    STATE.categories[page2].push(name);
    return { ok: true };
  }
  function ensureCategory(page2, name) {
    if (!STATE.categories[page2].includes(name)) STATE.categories[page2].push(name);
  }
  function uniqueCategoryName(page2, base) {
    let name = base, i = 2;
    while (STATE.categories[page2].includes(name)) {
      name = "".concat(base, " (").concat(i, ")");
      i++;
    }
    return name;
  }
  function removeCategory(page2, name) {
    const total = overallBal(page2, name);
    if (Math.abs(total) > 4e-3) return { ok: false, error: '"'.concat(name, '" still holds ').concat(fmt(total), ". Move it with a transfer first.") };
    STATE.categories[page2] = STATE.categories[page2].filter((c) => c !== name);
    if (page2 === "Savings") STATE.lockedCats = STATE.lockedCats.filter((c) => c !== name);
    return { ok: true };
  }
  var isLocked = (page2, cat) => page2 === "Savings" && STATE.lockedCats.includes(cat);
  function setLocked(cat, locked) {
    const has = STATE.lockedCats.includes(cat);
    if (locked && !has) STATE.lockedCats.push(cat);
    if (!locked && has) STATE.lockedCats = STATE.lockedCats.filter((c) => c !== cat);
  }
  function sourceError(page2, cat) {
    if (!STATE.categories[page2] || !STATE.categories[page2].includes(cat)) return "That source category no longer exists.";
    if (isLocked(page2, cat)) return "Savings / ".concat(cat, " is locked. Unlock it in the Savings page first.");
    return "";
  }
  function pushTx(accountId, page2, category, amount, note, meta, groupId, extra) {
    const tx = {
      id: uid(),
      groupId: groupId || null,
      accountId,
      page: page2,
      category,
      amount: round2(amount),
      date: extra && extra.date || todayISO(),
      note: note || "",
      meta: meta || ""
    };
    if (extra) {
      if (extra.kind) tx.kind = extra.kind;
      if (extra.creditId) {
        tx.creditId = extra.creditId;
        tx.creditDelta = extra.creditDelta;
      }
      if (extra.loanId) {
        tx.loanId = extra.loanId;
        if (extra.paymentId) tx.paymentId = extra.paymentId;
      }
    }
    STATE.transactions.unshift(tx);
    return tx;
  }
  function txKind(t) {
    if (t.kind) return t.kind;
    const m = t.meta || "";
    if (/^Transfer (in|out)|^Full-balance transfer/.test(m)) return "transfer";
    if (m === "Loan disbursement") return "loan";
    if (/^Loan repayment:|^Used to repay Loan/.test(m)) return "loanpay";
    if (/^Credit payment:|^Used to pay Credit/.test(m)) return "creditpay";
    if (/^Auto interest/.test(m)) return "interest";
    return "";
  }
  function addEntry(accId, page2, category, amount, note, date) {
    if (!accId || accId === "overall") return { ok: false, error: "Pick a specific account first (see Accounts widget)." };
    if (!STATE.categories[page2].includes(category)) return { ok: false, error: "That category no longer exists." };
    addBal(accId, page2, category, amount);
    pushTx(accId, page2, category, amount, note, "", null, { date });
    return { ok: true };
  }
  function transfer(accId, sp, sc, dp, dc, amount, note, meta) {
    if (!accId || accId === "overall") return { ok: false, error: "Pick a specific account first (see Accounts widget)." };
    if (!(amount > 0)) return { ok: false, error: "Enter a valid amount." };
    const err = sourceError(sp, sc);
    if (err) return { ok: false, error: err };
    if (!STATE.categories[dp] || !STATE.categories[dp].includes(dc)) return { ok: false, error: "That destination no longer exists." };
    if (sp === dp && sc === dc) return { ok: false, error: "Pick a different destination category." };
    const have = getBal(accId, sp, sc);
    if (round2(have - amount) < 0) return { ok: false, error: "Not enough in ".concat(sp, "/").concat(sc, " (").concat(fmt(have), ").") };
    const gid = uid();
    addBal(accId, sp, sc, -amount);
    addBal(accId, dp, dc, amount);
    pushTx(accId, sp, sc, -amount, note, meta || "Transfer out", gid, { kind: "transfer" });
    pushTx(accId, dp, dc, amount, note, meta || "Transfer in", gid, { kind: "transfer" });
    return { ok: true };
  }
  function applyExpense({ accId, cat, amt, note, date, srcPage, srcCat, metaPrefix }) {
    if (!accId || accId === "overall") return { ok: false, error: "Pick a specific account first (see Accounts widget)." };
    if (!(amt > 0)) return { ok: false, error: "Enter a valid amount." };
    const pre = metaPrefix ? metaPrefix + " \xB7 " : "";
    if (!STATE.categories.Expense.includes(cat)) return { ok: false, error: "That expense category no longer exists." };
    if (srcPage === "Credit") {
      const credit = STATE.credits.find((c) => c.id === srcCat && c.accountId === accId) || STATE.credits.find((c) => c.id === srcCat);
      if (!credit) return { ok: false, error: "Pick a credit line." };
      const fee = creditFee(credit, amt);
      const avail = round2(credit.limit - credit.outstandingBalance);
      if (round2(amt + fee) > avail) return { ok: false, error: "Exceeds available credit (".concat(fmt(avail), " left").concat(fee ? ", fee ".concat(fmt(fee), " included") : "", ").") };
      const gid2 = fee > 0 ? uid() : null;
      credit.outstandingBalance = round2(credit.outstandingBalance + amt + fee);
      addBal(accId, "Expense", cat, -amt);
      const tx2 = pushTx(accId, "Expense", cat, -amt, note, "".concat(pre, "Charged to Credit / ").concat(credit.label).concat(fee ? " (+".concat(fmt(fee), " fee)") : ""), gid2, { date, creditId: credit.id, creditDelta: amt });
      if (fee > 0) {
        ensureCategory("Expense", "Credit Fee");
        addBal(accId, "Expense", "Credit Fee", -fee);
        pushTx(accId, "Expense", "Credit Fee", -fee, "", "Credit fee ".concat(credit.feePercent, "%: ").concat(credit.label), gid2, { date, kind: "fee", creditId: credit.id, creditDelta: fee });
      }
      return { ok: true, tx: tx2, fee };
    }
    const err = sourceError(srcPage, srcCat);
    if (err) return { ok: false, error: err };
    const gid = uid();
    addBal(accId, srcPage, srcCat, -amt);
    const remaining = getBal(accId, srcPage, srcCat);
    addBal(accId, "Expense", cat, -amt);
    const tx = pushTx(accId, "Expense", cat, -amt, note, "".concat(pre, "Deducted from ").concat(srcPage, " / ").concat(srcCat), gid, { date });
    pushTx(accId, srcPage, srcCat, -amt, note, "Used for Expense / ".concat(cat), gid, { date });
    return { ok: true, tx, warn: remaining < 0 ? "".concat(srcPage, "/").concat(srcCat, " balance is now negative (").concat(fmt(remaining), ").") : "" };
  }
  function deleteTransaction(t) {
    const group = t.groupId ? STATE.transactions.filter((x) => x.groupId === t.groupId) : [t];
    group.forEach((x) => {
      addBal(x.accountId, x.page, x.category, -x.amount);
      if (x.creditId) {
        const c = STATE.credits.find((c2) => c2.id === x.creditId);
        if (c) c.outstandingBalance = round2(Math.max(0, c.outstandingBalance - (x.creditDelta || 0)));
      }
      if (x.loanId) {
        const l = STATE.loans.find((l2) => l2.id === x.loanId);
        if (l) {
          if (x.paymentId) l.payments = l.payments.filter((p) => p.id !== x.paymentId);
          l.paid = false;
          const paid = l.payments.reduce((s, p) => s + p.amount, 0);
          if (round2(l.amount - paid) <= 4e-3 && l.payments.length) l.paid = true;
        }
      }
    });
    const ids = new Set(group.map((x) => x.id));
    STATE.transactions = STATE.transactions.filter((x) => !ids.has(x.id));
  }
  function performInstant(item, accId, date) {
    date = date || todayISO();
    if (!accId || accId === "overall") return { ok: false, error: "Pick a specific account first (see Accounts widget)." };
    if (item.type === "gain") {
      if (!STATE.categories.Income.includes(item.gainCategory))
        return { ok: false, error: 'Income category "'.concat(item.gainCategory || "", '" is gone. Edit this item to pick another.') };
      addBal(accId, "Income", item.gainCategory, item.amount);
      pushTx(accId, "Income", item.gainCategory, item.amount, item.note || "", "Instant: ".concat(item.name), null, { date });
      return { ok: true };
    }
    const r = applyExpense({
      accId,
      cat: item.spendCategory,
      amt: item.amount,
      note: item.note || "",
      date,
      srcPage: item.srcPage,
      srcCat: item.srcCat,
      metaPrefix: "Instant: ".concat(item.name)
    });
    if (!r.ok) r.error += " Edit this item to fix it.";
    return r;
  }
  function instantTodayTotals(accId, today) {
    today = today || todayISO();
    let gained = 0, spent = 0;
    STATE.transactions.forEach((t) => {
      if (t.date !== today) return;
      if (accId !== "overall" && t.accountId !== accId) return;
      const k = txKind(t);
      if (t.page === "Income" && t.amount > 0 && k !== "transfer" && k !== "loan") gained += t.amount;
      else if (t.page === "Expense" && t.amount < 0 && k !== "transfer" && k !== "loanpay" && k !== "creditpay") spent += -t.amount;
    });
    return { gained: round2(gained), spent: round2(spent) };
  }
  var INTEREST_TYPES = {
    "Simple Interest": ["Principal Amount", "Interest Rate per Period (%)", "Time (years)"],
    "Compound Interest": ["Principal Amount", "Annual Interest Rate (%)", "Compounding Frequency (per yr)", "Time (years)"],
    "Effective Interest Rate": ["Nominal Rate (%)", "Compounding Frequency (per yr)", "Principal Amount"],
    "Nominal Interest Rate": ["Principal Amount", "Rate (%) (bank-given or manual)"],
    "Accrued Interest": ["Principal Amount", "Rate (%)", "Time Since Last Calculation (years)"],
    "Variable / Floating Interest": ["Principal Amount", "Rate Schedule (comma-separated %, e.g. 4,5,6)", "Time (years, total)"],
    "Real Interest": ["Amount", "Nominal Rate (%)", "Inflation Rate (%)"]
  };
  function computeInterest(type, vals) {
    const n = (i) => parseFloat(vals[i]) || 0;
    switch (type) {
      case "Simple Interest":
        return n(0) * (n(1) / 100) * n(2);
      case "Compound Interest": {
        const P = n(0), r = n(1) / 100, f = n(2) || 1, t = n(3);
        return P * Math.pow(1 + r / f, f * t) - P;
      }
      case "Effective Interest Rate": {
        const r = n(0) / 100, f = n(1) || 1, P = n(2);
        return P * (Math.pow(1 + r / f, f) - 1);
      }
      case "Nominal Interest Rate":
        return n(0) * (n(1) / 100);
      case "Accrued Interest":
        return n(0) * (n(1) / 100) * n(2);
      case "Variable / Floating Interest": {
        const P = n(0), rates = (vals[1] || "").split(",").map((x) => parseFloat(x) || 0), t = n(2);
        if (!rates.length) return 0;
        return rates.reduce((s, r) => s + P * (r / 100) * (t / rates.length), 0);
      }
      case "Real Interest":
        return n(0) * ((1 + n(1) / 100) / (1 + n(2) / 100) - 1);
    }
    return 0;
  }
  function applyAutoInterestRules(nowYM) {
    nowYM = nowYM || currentYM();
    let changed = false;
    STATE.autoInterestRules.forEach((rule) => {
      if (!rule.lastAppliedMonth) {
        rule.lastAppliedMonth = nowYM;
        changed = true;
        return;
      }
      let diff = monthsDiff(rule.lastAppliedMonth, nowYM);
      if (diff <= 0) return;
      diff = Math.min(diff, 60);
      for (let i = 0; i < diff; i++) {
        const principal = getBal(rule.accountId, rule.sourcePage, rule.sourceCategory);
        if (principal > 0) {
          const amt = round2(principal * (rule.ratePercent / 100));
          if (amt > 0) {
            addBal(rule.accountId, "Interest", rule.destCategory, amt);
            pushTx(rule.accountId, "Interest", rule.destCategory, amt, "", "Auto interest: ".concat(rule.ratePercent, "% of ").concat(rule.sourcePage, "/").concat(rule.sourceCategory), null, { kind: "interest" });
            changed = true;
          }
        }
      }
      rule.lastAppliedMonth = nowYM;
    });
    return changed;
  }
  function createLoan(accId, { label, amount, dueDate, frequency, note }, today) {
    if (!accId || accId === "overall") return { ok: false, error: "Pick a specific account first (see Accounts widget)." };
    today = today || todayISO();
    amount = round2(amount);
    if (!(amount > 0)) return { ok: false, error: "Enter a valid loan amount." };
    if (!dueDate) return { ok: false, error: "Pick a due date." };
    const name = uniqueCategoryName("Income", (label || "").trim() || "Loan ".concat(STATE.loans.length + 1));
    ensureCategory("Income", name);
    addBal(accId, "Income", name, amount);
    pushTx(accId, "Income", name, amount, note || "", "Loan disbursement", null, { kind: "loan" });
    const loan = { id: uid(), accountId: accId, label: name, amount, dueDate, frequency: frequency || "fixed", note: note || "", paid: false, payments: [] };
    STATE.loans.push(loan);
    STATE.reminders.push({ id: uid(), title: "Loan Due: ".concat(name), note: "Pay back ".concat(fmt(amount)), start: dueDate, end: dueDate, color: "#e8465f" });
    const step = { monthly: 1, quarterly: 3, yearly: 12 }[frequency];
    if (step) {
      const [dy, dm] = dueDate.split("-").map(Number);
      let periods = Math.floor(monthsDiff(today.slice(0, 7), "".concat(dy, "-").concat(String(dm).padStart(2, "0"))) / step);
      periods = Math.min(Math.max(periods, 0), 12);
      const inst = periods > 0 ? amount / (periods + 1) : amount;
      const now = parseISO(today);
      for (let i = 1; i <= periods; i++) {
        const iso = isoDate(new Date(now.getFullYear(), now.getMonth() + step * i, now.getDate()));
        if (iso < dueDate) STATE.reminders.push({ id: uid(), title: "Loan Installment: ".concat(name), note: "~".concat(fmt(inst), " suggested"), start: iso, end: iso, color: "#f0a63b" });
      }
    }
    return { ok: true, loan };
  }
  function payLoan(loan, amount, srcPage, srcCat, date, note) {
    date = date || todayISO();
    const remaining = loanRemaining(loan);
    if (remaining <= 0) return { ok: false, error: "This loan is already paid." };
    const amt = round2(Math.min(amount, remaining));
    if (!(amt > 0)) return { ok: false, error: "Enter a valid amount." };
    const err = sourceError(srcPage, srcCat);
    if (err) return { ok: false, error: err };
    const accId = loan.accountId, gid = uid(), payId = uid();
    ensureCategory("Expense", "Loan Repayment");
    addBal(accId, srcPage, srcCat, -amt);
    const left = getBal(accId, srcPage, srcCat);
    addBal(accId, "Expense", "Loan Repayment", -amt);
    pushTx(accId, "Expense", "Loan Repayment", -amt, note || "", "Loan repayment: ".concat(loan.label), gid, { date, kind: "loanpay", loanId: loan.id, paymentId: payId });
    pushTx(accId, srcPage, srcCat, -amt, "", "Used to repay Loan / ".concat(loan.label), gid, { date, kind: "loanpay" });
    loan.payments.push({ id: payId, amount: amt, date });
    if (round2(remaining - amt) <= 4e-3) loan.paid = true;
    return { ok: true, amount: amt, paidOff: loan.paid, remaining: loanRemaining(loan), warn: left < 0 ? "".concat(srcPage, "/").concat(srcCat, " balance is now negative (").concat(fmt(left), ").") : "" };
  }
  var creditFee = (credit, amt) => round2(amt * (Number(credit.feePercent) || 0) / 100);
  var clampDay = (v) => Math.min(28, Math.max(1, parseInt(v) || 1));
  var clampPct = (v) => Math.min(100, Math.max(0, parseFloat(v) || 0));
  function editCredit(credit, { label, limit, dueDay, resetDay, feePercent, note }) {
    label = (label || "").trim();
    limit = round2(limit);
    if (!label) return { ok: false, error: "Give the credit line a name." };
    if (!(limit > 0)) return { ok: false, error: "Enter a valid credit limit." };
    if (limit < credit.outstandingBalance) return { ok: false, error: "The limit can't be lower than what you owe (".concat(fmt(credit.outstandingBalance), ").") };
    const old = credit.label;
    if (label !== old) {
      const groups = new Set(STATE.transactions.filter((t) => t.creditId === credit.id && t.groupId).map((t) => t.groupId));
      STATE.transactions.forEach((t) => {
        if (t.creditId === credit.id || t.groupId && groups.has(t.groupId)) t.meta = (t.meta || "").split(old).join(label);
      });
      STATE.reminders.forEach((r) => {
        if (r.title === "Credit Due: ".concat(old)) r.title = "Credit Due: ".concat(label);
      });
    }
    Object.assign(credit, { label, limit, dueDay: clampDay(dueDay), resetDay: clampDay(resetDay), feePercent: clampPct(feePercent), note: note || "" });
    return { ok: true };
  }
  function createCredit(accId, { label, limit, dueDay, resetDay, feePercent, note }) {
    if (!accId || accId === "overall") return { ok: false, error: "Pick a specific account first (see Accounts widget)." };
    limit = round2(limit);
    if (!(limit > 0)) return { ok: false, error: "Enter a valid credit limit." };
    const credit = {
      id: uid(),
      accountId: accId,
      label: (label || "").trim() || "Credit ".concat(STATE.credits.length + 1),
      limit,
      outstandingBalance: 0,
      dueDay: clampDay(dueDay),
      resetDay: clampDay(resetDay),
      feePercent: clampPct(feePercent),
      note: note || "",
      lastDueReminderMonth: ""
    };
    STATE.credits.push(credit);
    return { ok: true, credit };
  }
  function payCredit(credit, amount, srcPage, srcCat, date) {
    date = date || todayISO();
    if (credit.outstandingBalance <= 0) return { ok: false, error: "No outstanding balance." };
    const amt = round2(Math.min(amount, credit.outstandingBalance));
    if (!(amt > 0)) return { ok: false, error: "Enter a valid amount." };
    const err = sourceError(srcPage, srcCat);
    if (err) return { ok: false, error: err };
    const accId = credit.accountId, gid = uid();
    ensureCategory("Expense", "Credit Payment");
    addBal(accId, srcPage, srcCat, -amt);
    addBal(accId, "Expense", "Credit Payment", -amt);
    pushTx(accId, "Expense", "Credit Payment", -amt, "", "Credit payment: ".concat(credit.label), gid, { date, kind: "creditpay", creditId: credit.id, creditDelta: -amt });
    pushTx(accId, srcPage, srcCat, -amt, "", "Used to pay Credit / ".concat(credit.label), gid, { date, kind: "creditpay" });
    credit.outstandingBalance = round2(credit.outstandingBalance - amt);
    return { ok: true, amount: amt };
  }
  function creditDaysUntilDue(credit, today) {
    today = today || todayISO();
    const t = parseISO(today);
    const due = t.getDate() <= credit.dueDay ? new Date(t.getFullYear(), t.getMonth(), credit.dueDay) : new Date(t.getFullYear(), t.getMonth() + 1, credit.dueDay);
    return daysBetween(today, isoDate(due));
  }
  function creditCycle(credit, today) {
    today = today || todayISO();
    const t = parseISO(today);
    let y = t.getFullYear(), m = t.getMonth();
    if (t.getDate() < credit.resetDay) m -= 1;
    const start = isoDate(new Date(y, m, credit.resetDay));
    const next = isoDate(new Date(y, m + 1, credit.resetDay));
    let charged = 0, paid = 0;
    STATE.transactions.forEach((x) => {
      if (x.creditId !== credit.id || x.date < start || x.date >= next) return;
      if (x.creditDelta > 0) charged += x.creditDelta;
      else if (x.creditDelta < 0) paid += -x.creditDelta;
    });
    return { start, next, charged: round2(charged), paid: round2(paid), daysToReset: daysBetween(today, next) };
  }
  function loanCreditAlerts(today) {
    today = today || todayISO();
    const out = [];
    STATE.loans.forEach((l) => {
      if (loanRemaining(l) > 0) {
        const d = daysBetween(today, l.dueDate);
        if (d <= 3) out.push('Loan "'.concat(l.label, '" ').concat(d < 0 ? "is overdue" : d === 0 ? "is due today" : "due in ".concat(d, "d"), " \u2014 ").concat(fmt(loanRemaining(l)), " left"));
      }
    });
    STATE.credits.forEach((c) => {
      const d = creditDaysUntilDue(c, today);
      if (d <= 3 && c.outstandingBalance > 0) out.push('Credit "'.concat(c.label, '" payment ').concat(d === 0 ? "is due today" : "due in ".concat(d, "d")));
    });
    return out;
  }
  function ensureCreditReminders(today) {
    today = today || todayISO();
    let changed = false;
    const ym = today.slice(0, 7);
    STATE.credits.forEach((c) => {
      if (c.lastDueReminderMonth !== ym) {
        const due = addDaysISO(today, creditDaysUntilDue(c, today));
        STATE.reminders.push({ id: uid(), title: "Credit Due: ".concat(c.label), note: "Outstanding ".concat(fmt(c.outstandingBalance), " / Limit ").concat(fmt(c.limit)), start: due, end: due, color: "#f0a63b" });
        c.lastDueReminderMonth = ym;
        changed = true;
      }
    });
    return changed;
  }
  var FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];
  function advanceDate(iso, freq, anchorDay) {
    const d = parseISO(iso);
    if (freq === "daily") return addDaysISO(iso, 1);
    if (freq === "weekly") return addDaysISO(iso, 7);
    const months = freq === "yearly" ? 12 : 1;
    const y = d.getFullYear(), m = d.getMonth() + months;
    const ty = y + Math.floor(m / 12), tm = (m % 12 + 12) % 12;
    return isoDate(new Date(ty, tm, Math.min(anchorDay || d.getDate(), daysInMonth(ty, tm))));
  }
  function addRecurring(accId, r) {
    if (!accId || accId === "overall") return { ok: false, error: "Pick a specific account first (see Accounts widget)." };
    const amount = round2(r.amount);
    if (!(amount > 0)) return { ok: false, error: "Enter a valid amount." };
    if (!(r.name || "").trim()) return { ok: false, error: "Give it a name." };
    if (!FREQUENCIES.includes(r.frequency)) return { ok: false, error: "Pick how often it repeats." };
    if (!r.startDate) return { ok: false, error: "Pick a start date." };
    if (r.type === "income" && !STATE.categories.Income.includes(r.category)) return { ok: false, error: "Pick an Income category." };
    if (r.type === "expense" && !STATE.categories.Expense.includes(r.category)) return { ok: false, error: "Pick an Expense category." };
    const item = {
      id: uid(),
      accountId: accId,
      type: r.type,
      name: r.name.trim(),
      amount,
      category: r.category,
      srcPage: r.srcPage || "",
      srcCat: r.srcCat || "",
      frequency: r.frequency,
      startDate: r.startDate,
      nextDate: r.startDate,
      anchorDay: parseISO(r.startDate).getDate(),
      active: true,
      lastError: ""
    };
    STATE.recurring.push(item);
    return { ok: true, item };
  }
  function processRecurring(today) {
    today = today || todayISO();
    const result = { posted: 0, errors: [] };
    STATE.recurring.forEach((r) => {
      if (!r.active) return;
      let guard = 0;
      while (r.nextDate <= today && guard++ < 400) {
        let res;
        if (r.type === "income") {
          res = addEntry(r.accountId, "Income", r.category, r.amount, "", r.nextDate);
          if (res.ok) {
            const t = STATE.transactions[0];
            t.meta = "Recurring: ".concat(r.name);
          }
        } else {
          res = applyExpense({
            accId: r.accountId,
            cat: r.category,
            amt: r.amount,
            note: "",
            date: r.nextDate,
            srcPage: r.srcPage,
            srcCat: r.srcCat,
            metaPrefix: "Recurring: ".concat(r.name)
          });
        }
        if (!res.ok) {
          r.lastError = res.error;
          result.errors.push("".concat(r.name, ": ").concat(res.error));
          break;
        }
        r.lastError = "";
        result.posted++;
        r.nextDate = advanceDate(r.nextDate, r.frequency, r.anchorDay);
      }
    });
    return result;
  }
  function spentThisMonth(accId, category, ym) {
    ym = ym || currentYM();
    return round2(Math.abs(STATE.transactions.filter((t) => t.page === "Expense" && t.category === category && t.date.startsWith(ym) && t.amount < 0 && (accId === "overall" || t.accountId === accId)).reduce((s, t) => s + t.amount, 0)));
  }

  // src/view.js
  function requireRealAccount() {
    if (isOverall()) {
      toast("Pick a specific account first (see Accounts widget).");
      return null;
    }
    return STATE.activeAccountId;
  }
  function undoTo(snap) {
    restoreFrom(snap);
    commit();
  }
  var fmtDateHeader = (iso) => {
    const [y, m, d] = iso.split("-");
    return "".concat(m, " / ").concat(d, " / ").concat(y);
  };
  var sym = (name) => '<span class="material-icons-outlined" style="vertical-align:middle;font-size:16px">'.concat(esc(name), "</span>");
  function openTransactionDetail(t) {
    const overlay = document.getElementById("app-modal");
    overlay.innerHTML = "";
    const card2 = el("div", "app-modal-card");
    const titleEl = el("div", "app-modal-title");
    titleEl.textContent = t.category;
    card2.appendChild(titleEl);
    const body = el("div");
    body.style.textAlign = "left";
    body.innerHTML = '\n    <div class="muted" style="margin-bottom:10px">'.concat(esc(t.page), " \xB7 ").concat(fmtDateHeader(t.date), '</div>\n    <div style="font-size:24px;font-weight:700;margin-bottom:14px;color:').concat(t.amount < 0 ? "var(--danger)" : "var(--accent-2)", '">').concat(fmt(t.amount), "</div>\n    ").concat(t.meta ? '<div style="margin-bottom:8px"><span class="muted">Detail:</span> '.concat(esc(t.meta), "</div>") : "", "\n    ").concat(t.note ? '<div style="margin-bottom:8px"><span class="muted">Note:</span> '.concat(esc(t.note), "</div>") : "");
    card2.appendChild(body);
    const actions = el("div", "app-modal-actions");
    const delBtn = el("button", "btn danger", "Delete");
    const closeBtn = el("button", "btn secondary", "Close");
    actions.appendChild(delBtn);
    actions.appendChild(closeBtn);
    card2.appendChild(actions);
    overlay.appendChild(card2);
    overlay.classList.remove("hidden");
    function close() {
      overlay.classList.add("hidden");
      overlay.innerHTML = "";
      overlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
    }
    function onBackdrop(e) {
      if (e.target === overlay) close();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    overlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    closeBtn.addEventListener("click", close);
    delBtn.addEventListener("click", () => {
      close();
      const linked = t.groupId && STATE.transactions.some((x) => x.groupId === t.groupId && x.id !== t.id);
      confirmToast(linked ? "Remove this transaction and its linked entry? Balances will be reversed for both." : "Remove this transaction? Its amount will be reversed from the category balance.", () => {
        const snap = snapshot();
        deleteTransaction(t);
        commit();
        toast("Transaction removed", () => undoTo(snap));
      });
    });
  }
  var ddOpen = /* @__PURE__ */ new Map();
  function dropdown(key, title, count, buildPanel) {
    const wrap = el("div", "dd");
    const btn = el("button", "dd-btn");
    btn.type = "button";
    const open = () => !!ddOpen.get(key);
    btn.innerHTML = "<span>".concat(esc(title), '</span><span class="dd-count">').concat(esc(count), '</span><span class="material-icons-outlined dd-arrow">expand_more</span>');
    const panel = el("div", "dd-panel");
    panel.appendChild(buildPanel());
    const sync2 = () => {
      wrap.classList.toggle("open", open());
      btn.setAttribute("aria-expanded", String(open()));
    };
    btn.addEventListener("click", () => {
      ddOpen.set(key, !open());
      sync2();
    });
    wrap.appendChild(btn);
    wrap.appendChild(panel);
    sync2();
    return wrap;
  }
  var NOTE_MAX = 24;
  var shortNote = (n) => {
    n = (n || "").trim().replace(/\s+/g, " ");
    return n.length > NOTE_MAX ? n.slice(0, NOTE_MAX - 1).trimEnd() + "\u2026" : n;
  };
  function collapseLinked(items) {
    const seen = /* @__PURE__ */ new Set(), out = [];
    items.forEach((t) => {
      if (!t.groupId) {
        out.push({ t, label: t.category, amount: t.amount });
        return;
      }
      if (seen.has(t.groupId)) return;
      seen.add(t.groupId);
      const legs = STATE.transactions.filter((x) => x.groupId === t.groupId);
      const exp = legs.find((x) => x.page === "Expense" && x.kind !== "fee") || legs.find((x) => x.page === "Expense");
      if (exp) {
        out.push({ t: exp, label: exp.category, amount: exp.amount });
        return;
      }
      const from = legs.find((x) => x.amount < 0), to = legs.find((x) => x.amount > 0);
      if (from && to) out.push({ t: from, label: "".concat(from.category, " \u2192 ").concat(to.category), amount: to.amount, neutral: true });
      else out.push({ t, label: t.category, amount: t.amount });
    });
    return out;
  }
  function txList(items, opts = {}) {
    const box = el("div", "tx-list");
    const rows = opts.collapse === false ? items.map((t) => ({ t, label: t.category, amount: t.amount })) : collapseLinked(items);
    if (!rows.length) {
      box.appendChild(el("div", "tx-empty", "No transactions yet."));
      return box;
    }
    const limited = rows.slice(0, 80);
    const order = [], groups = {};
    limited.forEach((r) => {
      const d = r.t.date;
      if (!groups[d]) {
        groups[d] = [];
        order.push(d);
      }
      groups[d].push(r);
    });
    order.sort((a, b) => b.localeCompare(a));
    order.forEach((date) => {
      box.appendChild(el("div", "tx-date-header", fmtDateHeader(date)));
      groups[date].forEach(({ t, label, amount, neutral }) => {
        const idx = STATE.categories[t.page] ? STATE.categories[t.page].indexOf(t.category) : -1;
        const color = CAT_COLORS[(idx >= 0 ? idx : 0) % CAT_COLORS.length];
        const note = shortNote(t.note);
        const row = el("div", "tx-item-compact");
        row.innerHTML = '<span style="display:flex;align-items:center;min-width:0">\n          <span class="tag" style="background:'.concat(color, '"></span>\n          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">').concat(esc(label)).concat(note ? ' <span class="muted">\xB7 '.concat(esc(note), "</span>") : "", '</span>\n        </span><span class="amt ').concat(neutral ? "" : amount < 0 ? "neg" : "pos", '">').concat(fmt(amount), "</span>");
        row.addEventListener("click", () => openTransactionDetail(t));
        box.appendChild(row);
      });
    });
    return box;
  }
  function categoryManageBox(page2) {
    const box = el("div", "box");
    box.appendChild(dropdown("cats-" + page2, "Manage ".concat(page2, " categories"), String(STATE.categories[page2].length), () => {
      const list = el("div", "cat-manage-list");
      STATE.categories[page2].forEach((c) => {
        list.appendChild(el("span", "cat-chip", "".concat(esc(c), ' <button data-cat="').concat(esc(c), '" aria-label="Delete category ').concat(esc(c), '">\u2715</button>')));
      });
      const addBtn = el("button", "add-cat-btn", "+ Add Category");
      list.appendChild(addBtn);
      list.querySelectorAll("button[data-cat]").forEach((b) => b.addEventListener("click", () => {
        const name = b.dataset.cat;
        const total = STATE.accounts.reduce((s, a) => s + ((STATE.balances[a.id][page2] || {})[name] || 0), 0);
        if (Math.abs(total) > 4e-3) {
          toast('"'.concat(name, '" still holds ').concat(fmt(total), ". Move it with a transfer first."));
          return;
        }
        confirmToast('Delete category "'.concat(name, '"?'), () => {
          const r = removeCategory(page2, name);
          if (!r.ok) {
            toast(r.error);
            return;
          }
          commit();
        });
      }));
      addBtn.addEventListener("click", async () => {
        const res = await openModal({ title: "New ".concat(page2, " Category"), fields: [{ key: "name", label: "Category name", type: "text", placeholder: "e.g. Groceries" }], confirmText: "Add Category" });
        if (!res) return;
        const r = addCategory(page2, res.name);
        if (!r.ok) {
          toast(r.error);
          return;
        }
        commit();
      });
      return list;
    }));
    return box;
  }

  // src/analysis.js
  var RANGES = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" }
  ];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function rangeBounds(key, today) {
    let from;
    if (key === "week") from = addDaysISO(today, -6);
    else if (key === "year") from = today.slice(0, 4) + "-01-01";
    else from = today.slice(0, 7) + "-01";
    return { from, to: today, days: daysBetween(from, today) + 1 };
  }
  function prevBounds(key, from) {
    if (key === "week") {
      const to = addDaysISO(from, -1);
      return { from: addDaysISO(to, -6), to, days: 7 };
    }
    const f = parseISO(from);
    if (key === "year") {
      const y = f.getFullYear() - 1;
      return { from: "".concat(y, "-01-01"), to: "".concat(y, "-12-31"), days: daysBetween("".concat(y, "-01-01"), "".concat(y, "-12-31")) + 1 };
    }
    const pm = new Date(f.getFullYear(), f.getMonth() - 1, 1), dim = daysInMonth(pm.getFullYear(), pm.getMonth());
    const pf = isoDate(pm), pt = isoDate(new Date(pm.getFullYear(), pm.getMonth(), dim));
    return { from: pf, to: pt, days: dim };
  }
  function sums(list) {
    const s = { earned: 0, interest: 0, spent: 0, debt: 0, borrowed: 0, byCat: {} };
    list.forEach((t) => {
      const k = txKind(t);
      if (t.page === "Income" && t.amount > 0) {
        if (k === "loan") s.borrowed += t.amount;
        else if (k !== "transfer") s.earned += t.amount;
      } else if (t.page === "Interest" && t.amount > 0 && k !== "transfer") {
        s.interest += t.amount;
      } else if (t.page === "Expense" && t.amount < 0) {
        if (k === "loanpay" || k === "creditpay") s.debt += -t.amount;
        else {
          s.spent += -t.amount;
          s.byCat[t.category] = (s.byCat[t.category] || 0) + -t.amount;
        }
      }
    });
    ["earned", "interest", "spent", "debt", "borrowed"].forEach((k) => s[k] = round2(s[k]));
    return s;
  }
  function bucketPlan(key, from) {
    const f = parseISO(from);
    if (key === "week") return {
      count: 7,
      index: (d) => daysBetween(from, d),
      label: (i) => DAYN[parseISO(addDaysISO(from, i)).getDay()],
      start: (i) => addDaysISO(from, i),
      end: (i) => addDaysISO(from, i)
    };
    if (key === "year") {
      const y = f.getFullYear();
      return {
        count: 12,
        index: (d) => parseISO(d).getMonth(),
        label: (i) => MON[i],
        start: (i) => isoDate(new Date(y, i, 1)),
        end: (i) => isoDate(new Date(y, i, daysInMonth(y, i)))
      };
    }
    const dim = daysInMonth(f.getFullYear(), f.getMonth());
    return {
      count: Math.ceil(dim / 7),
      index: (d) => Math.floor((parseISO(d).getDate() - 1) / 7),
      label: (i) => "W" + (i + 1),
      start: (i) => addDaysISO(from, i * 7),
      end: (i) => addDaysISO(from, Math.min(i * 7 + 6, dim - 1))
    };
  }
  function analyze(accId, rangeKey, today) {
    today = today || todayISO();
    const mine = STATE.transactions.filter((t) => accId === "overall" || t.accountId === accId);
    if (!RANGES.some((r) => r.key === rangeKey)) rangeKey = "month";
    const { from, to, days } = rangeBounds(rangeKey, today);
    const inRange = mine.filter((t) => t.date >= from && t.date <= to);
    const cur = sums(inRange);
    const pb = prevBounds(rangeKey, from);
    const prev = sums(mine.filter((t) => t.date >= pb.from && t.date <= pb.to));
    const income = round2(cur.earned + cur.interest);
    const net = round2(income - cur.spent);
    const out = {
      from,
      to,
      days,
      cur,
      prev,
      income,
      net,
      savingsRate: income > 0 ? net / income : null,
      avgIncomeDaily: round2(income / days),
      avgDaily: round2(cur.spent / days),
      prevAvgDaily: round2(prev.spent / pb.days),
      spentChange: prev.spent > 0 ? (cur.spent / days - prev.spent / pb.days) / (prev.spent / pb.days) : null,
      empty: !inRange.length
    };
    const plan = bucketPlan(rangeKey, from);
    const buckets = Array.from({ length: plan.count }, (_, i) => ({ label: plan.label(i), income: 0, spent: 0, start: plan.start(i), end: plan.end(i) }));
    inRange.forEach((t) => {
      const i = plan.index(t.date);
      if (i < 0 || i >= buckets.length) return;
      const k = txKind(t);
      if (t.page === "Expense" && t.amount < 0 && k !== "loanpay" && k !== "creditpay") buckets[i].spent += -t.amount;
      else if (t.amount > 0 && (t.page === "Income" && k !== "loan" && k !== "transfer" || t.page === "Interest" && k !== "transfer")) buckets[i].income += t.amount;
    });
    buckets.forEach((b) => {
      b.income = round2(b.income);
      b.spent = round2(b.spent);
    });
    out.buckets = buckets;
    const asset = mine.filter((t) => t.page !== "Expense").sort((a, b) => a.date.localeCompare(b.date));
    let run = 0, ai = 0;
    while (ai < asset.length && asset[ai].date < from) {
      run += asset[ai].amount;
      ai++;
    }
    out.startHeld = round2(run);
    out.trend = buckets.filter((b) => b.start <= today).map((b) => {
      while (ai < asset.length && asset[ai].date <= b.end) {
        run += asset[ai].amount;
        ai++;
      }
      return { label: b.label, value: round2(run) };
    });
    const cats = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]);
    const total = cur.spent;
    const top = cats.slice(0, 6).map(([name, value]) => ({ name, value: round2(value), pct: total ? value / total : 0 }));
    const rest = cats.slice(6).reduce((s, [, v]) => s + v, 0);
    if (rest > 0) top.push({ name: "Other", value: round2(rest), pct: total ? rest / total : 0 });
    out.categories = top;
    const ym = today.slice(0, 7);
    out.budgets = STATE.budgets.filter((g) => g.kind === "expense").map((g) => {
      const spent = spentThisMonth(accId, g.category, ym);
      return { category: g.category, spent, limit: g.limit, pct: g.limit ? spent / g.limit : 0 };
    });
    out.goals = STATE.budgets.filter((g) => g.kind === "savings").map((g) => {
      const bal = balFor(accId, "Savings", g.category);
      return { category: g.category, balance: bal, goal: g.goalAmount, pct: g.goalAmount ? bal / g.goalAmount : 0 };
    });
    out.owed = liabilities(accId);
    out.held = round2(out.trend.length ? out.trend[out.trend.length - 1].value : 0);
    const ins = [];
    if (out.spentChange !== null && Math.abs(out.spentChange) >= 0.05) {
      const up = out.spentChange > 0;
      ins.push({ tone: up ? "warn" : "good", text: "Daily spending is ".concat(up ? "up" : "down", " ").concat(Math.round(Math.abs(out.spentChange) * 100), "% compared with the previous ").concat(rangeKey, ".") });
    }
    if (top.length && top[0].name !== "Other" && total > 0)
      ins.push({ tone: "info", text: "".concat(top[0].name, " is your biggest expense: ").concat(Math.round(top[0].pct * 100), "% of spending (").concat(fmt(top[0].value), ").") });
    if (out.savingsRate !== null) {
      if (out.net < 0) ins.push({ tone: "warn", text: "You spent ".concat(fmt(-out.net), " more than you earned in this period.") });
      else if (out.savingsRate >= 0.2) ins.push({ tone: "good", text: "You kept ".concat(Math.round(out.savingsRate * 100), "% of what you earned. Nice.") });
    } else if (cur.spent > 0) {
      ins.push({ tone: "info", text: "No income was recorded in this period, so there is no savings rate to show." });
    }
    out.budgets.forEach((b) => {
      if (b.pct >= 1) ins.push({ tone: "warn", text: "".concat(b.category, " is over its monthly limit by ").concat(fmt(b.spent - b.limit), ".") });
      else if (b.pct >= 0.8) ins.push({ tone: "warn", text: "".concat(b.category, " has used ").concat(Math.round(b.pct * 100), "% of its monthly limit.") });
    });
    if (rangeKey === "month" && cur.spent > 0) {
      const dom = parseISO(today).getDate(), dim = daysInMonth(parseISO(today).getFullYear(), parseISO(today).getMonth());
      if (dom < dim) ins.push({ tone: "info", text: "At this pace you will spend about ".concat(fmt(round2(cur.spent / dom * dim)), " this month.") });
    }
    if (out.owed > 0) ins.push({ tone: "info", text: "You currently owe ".concat(fmt(out.owed), " across loans and credit.") });
    out.insights = ins;
    return out;
  }

  // src/charts.js
  var compact = (n) => {
    const a = Math.abs(n);
    const s = a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : a >= 1e3 ? (a / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(a));
    return (n < 0 ? "-" : "") + s;
  };
  function donut(slices, centerLabel) {
    const r = 40, C2 = 2 * Math.PI * r;
    let off = 0;
    const total = slices.reduce((s, x) => s + x.value, 0);
    const arcs = total > 0 ? slices.map((s, i) => {
      const len = s.value / total * C2;
      const el2 = '<circle cx="60" cy="60" r="'.concat(r, '" fill="none" stroke-width="16" style="stroke:').concat(CAT_COLORS[i % CAT_COLORS.length], '" stroke-dasharray="').concat(len.toFixed(2), " ").concat((C2 - len).toFixed(2), '" stroke-dashoffset="').concat((-off).toFixed(2), '" transform="rotate(-90 60 60)"><title>').concat(esc(s.name), ": ").concat(esc(fmt(s.value)), "</title></circle>");
      off += len;
      return el2;
    }).join("") : '<circle cx="60" cy="60" r="'.concat(r, '" fill="none" stroke-width="16" style="stroke:var(--border)"/>');
    return '<svg class="a-svg" viewBox="0 0 120 120" role="img" aria-label="Spending by category" style="max-width:150px;margin:0 auto">'.concat(arcs, '\n    <text x="60" y="58" text-anchor="middle" style="font-size:8px">Spent</text>\n    <text x="60" y="70" text-anchor="middle" style="font-size:10px;font-weight:700;fill:var(--text)">').concat(esc(centerLabel), "</text></svg>");
  }
  function legend(slices) {
    return '<div class="a-legend">'.concat(slices.map((s, i) => '<div class="row-l"><i style="background:'.concat(CAT_COLORS[i % CAT_COLORS.length], '"></i><span class="nm">').concat(esc(s.name), '</span><span class="pc">').concat(Math.round(s.pct * 100), "% \xB7 ").concat(esc(fmt(s.value)), "</span></div>")).join(""), "</div>");
  }
  function groupedBars(buckets) {
    const W = 300, H = 120, top = 8, bottom = 16, left = 4;
    const max = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.spent)));
    const slot = (W - left) / Math.max(1, buckets.length);
    const bw = Math.max(1.5, Math.min(14, slot / 2 - 1));
    const ch = H - top - bottom;
    const every = Math.ceil(buckets.length / 8);
    let g = '<line x1="0" x2="'.concat(W, '" y1="').concat(H - bottom, '" y2="').concat(H - bottom, '" style="stroke:var(--border)"/>');
    buckets.forEach((b, i) => {
      const x = left + i * slot + slot / 2;
      const hi = b.income / max * ch, hs = b.spent / max * ch;
      if (b.income > 0) g += '<rect x="'.concat((x - bw).toFixed(1), '" y="').concat((H - bottom - hi).toFixed(1), '" width="').concat(bw.toFixed(1), '" height="').concat(hi.toFixed(1), '" rx="1" style="fill:var(--accent-2)"><title>').concat(esc(b.label), " income: ").concat(esc(fmt(b.income)), "</title></rect>");
      if (b.spent > 0) g += '<rect x="'.concat(x.toFixed(1), '" y="').concat((H - bottom - hs).toFixed(1), '" width="').concat(bw.toFixed(1), '" height="').concat(hs.toFixed(1), '" rx="1" style="fill:var(--danger)"><title>').concat(esc(b.label), " spent: ").concat(esc(fmt(b.spent)), "</title></rect>");
      if (i % every === 0) g += '<text x="'.concat(x.toFixed(1), '" y="').concat(H - 4, '" text-anchor="middle">').concat(esc(b.label), "</text>");
    });
    g += '<text x="'.concat(left, '" y="').concat(top, '" >').concat(esc(compact(max)), "</text>");
    return '<svg class="a-svg" viewBox="0 0 '.concat(W, " ").concat(H, '" role="img" aria-label="Income versus spending">').concat(g, '</svg>\n    <div class="a-key"><span><i style="background:var(--accent-2)"></i>Income</span><span><i style="background:var(--danger)"></i>Spent</span></div>');
  }
  function line(points, startValue) {
    const W = 300, H = 90, pad = 6;
    if (points.length < 2) return '<div class="a-empty">Not enough data for a trend yet.</div>';
    const vals = points.map((p) => p.value).concat([startValue]);
    const max = Math.max(...vals), min = Math.min(...vals);
    const range2 = max - min || 1;
    const step = (W - pad * 2) / (points.length - 1);
    const y = (v) => H - 14 - (v - min) / range2 * (H - 28);
    const pts = points.map((p, i) => [pad + i * step, y(p.value)]);
    const d = pts.map((p, i) => "".concat(i ? "L" : "M").concat(p[0].toFixed(1), ",").concat(p[1].toFixed(1))).join(" ");
    const area = "".concat(d, " L").concat(pts[pts.length - 1][0].toFixed(1), ",").concat(H - 14, " L").concat(pts[0][0].toFixed(1), ",").concat(H - 14, " Z");
    const every = Math.ceil(points.length / 6);
    const labels = points.map((p, i) => i % every === 0 ? '<text x="'.concat(pts[i][0].toFixed(1), '" y="').concat(H - 2, '" text-anchor="middle">').concat(esc(p.label), "</text>") : "").join("");
    const dots = points.length <= 40 ? pts.map((p, i) => '<circle cx="'.concat(p[0].toFixed(1), '" cy="').concat(p[1].toFixed(1), '" r="2" style="fill:var(--accent-1)"><title>').concat(esc(points[i].label), ": ").concat(esc(fmt(points[i].value)), "</title></circle>")).join("") : "";
    return '<svg class="a-svg" viewBox="0 0 '.concat(W, " ").concat(H, '" role="img" aria-label="Money held over time">\n    <path d="').concat(area, '" style="fill:var(--accent-1);opacity:.12"/><path d="').concat(d, '" fill="none" stroke-width="2" style="stroke:var(--accent-1)"/>').concat(dots, '\n    <text x="').concat(pad, '" y="9">').concat(esc(compact(max)), '</text><text x="').concat(W - pad, '" y="9" text-anchor="end">').concat(esc(fmt(points[points.length - 1].value)), "</text>").concat(labels, "</svg>");
  }
  function hbar(name, value, limit, pct2, danger) {
    const w = Math.max(0, Math.min(100, pct2 * 100));
    return '<div class="hbar"><div class="hbar-top"><span class="nm">'.concat(esc(name), '</span><span class="').concat(danger ? "neg" : "", '">').concat(esc(fmt(value)), " / ").concat(esc(fmt(limit)), '</span></div>\n    <div class="hbar-track"><div class="hbar-fill" style="width:').concat(w.toFixed(0), "%;background:").concat(danger ? "var(--danger)" : "var(--accent-2)", '"></div></div></div>');
  }

  // src/widgets/analysis.js
  var range = "month";
  var card = (title, inner) => '<div class="a-card"><h4>'.concat(esc(title), "</h4>").concat(inner, "</div>");
  var tile = (lbl, val, cls) => '<div class="a-tile"><div class="lbl">'.concat(esc(lbl), '</div><div class="val ').concat(cls || "", '">').concat(val, "</div></div>");
  var pct = (n) => Math.round(Math.abs(n) * 100) + "%";
  function renderAnalysis() {
    const box = el("div", "analysis-section");
    const chips = el("div", "a-range");
    RANGES.forEach((r) => {
      const b = el("button", r.key === range ? "active" : "", r.label);
      b.setAttribute("aria-pressed", r.key === range ? "true" : "false");
      b.addEventListener("click", () => {
        range = r.key;
        bus.render();
      });
      chips.appendChild(b);
    });
    box.appendChild(chips);
    const a = analyze(STATE.activeAccountId, range);
    if (a.empty && !a.budgets.length && !a.goals.length) {
      box.appendChild(el("div", "a-empty", "No transactions in this period yet. Add some and your charts will show up here."));
      return box;
    }
    const change = a.spentChange === null ? "" : '<div class="muted" style="font-size:10px">'.concat(a.spentChange > 0 ? "\u25B2" : "\u25BC", " ").concat(pct(a.spentChange), " vs previous ").concat(esc(range), "</div>");
    const tiles = el("div", "a-tiles", [
      tile("Income per day", fmt(a.avgIncomeDaily) + '<div class="muted" style="font-size:10px">'.concat(esc(fmt(a.income)), " total</div>"), "pos"),
      tile("Spent per day", fmt(a.avgDaily) + '<div class="muted" style="font-size:10px">'.concat(esc(fmt(a.cur.spent)), " total</div>") + change, a.cur.spent > 0 ? "neg" : ""),
      tile("Net", fmt(a.net), a.net >= 0 ? "pos" : "neg"),
      tile("Savings rate", a.savingsRate === null ? "\u2014" : Math.round(a.savingsRate * 100) + "%", a.savingsRate !== null && a.savingsRate < 0 ? "neg" : ""),
      tile("Interest earned", fmt(a.cur.interest))
    ].join(""));
    box.appendChild(tiles);
    if (a.insights.length) {
      const ul = el("div", "a-card");
      ul.innerHTML = "<h4>Insights</h4>" + a.insights.map((i) => '<div style="font-size:12px;margin-bottom:6px;display:flex;gap:6px"><span class="material-icons-outlined" style="font-size:16px;color:'.concat(i.tone === "warn" ? "var(--danger)" : i.tone === "good" ? "var(--accent-2)" : "var(--text-dim)", '">').concat(i.tone === "warn" ? "warning_amber" : i.tone === "good" ? "trending_up" : "info", "</span><span>").concat(esc(i.text), "</span></div>")).join("");
      box.appendChild(ul);
    }
    box.appendChild(el("div", "", card(range === "week" ? "Income vs spending, by day" : range === "month" ? "Income vs spending, by week" : "Income vs spending, by month", groupedBars(a.buckets))));
    if (a.categories.length) box.appendChild(el("div", "", card("Where your money went", donut(a.categories, fmt(a.cur.spent)) + legend(a.categories))));
    box.appendChild(el("div", "", card("Money held over time", line(a.trend, a.startHeld))));
    if (a.budgets.length) box.appendChild(el("div", "", card("Monthly budgets", a.budgets.map((b) => hbar(b.category, b.spent, b.limit, b.pct, b.pct >= 1)).join(""))));
    if (a.goals.length) box.appendChild(el("div", "", card("Savings goals", a.goals.map((g) => hbar(g.category, g.balance, g.goal, g.pct, false)).join(""))));
    if (a.cur.debt > 0 || a.cur.borrowed > 0 || a.owed > 0)
      box.appendChild(el("div", "", card("Debt", '<div style="font-size:12px;line-height:1.7">Borrowed this period: '.concat(esc(fmt(a.cur.borrowed)), "<br>Paid toward loans &amp; credit: ").concat(esc(fmt(a.cur.debt)), "<br>Still owed: ").concat(esc(fmt(a.owed)), "</div>"))));
    return box;
  }

  // src/pages/home.js
  var filter = "All";
  function renderHome() {
    const wrap = el("div");
    const accId = STATE.activeAccountId;
    const assets = assetsTotal(accId), owed = liabilities(accId);
    const hero = el("div", "balance-hero");
    hero.innerHTML = '<div class="muted">'.concat(isOverall() ? "Overall Account" : esc((activeAccount() || {}).name || ""), ' \u2014 Net Balance</div>\n    <div class="amount">').concat(fmt(assets - owed), '</div>\n    <div class="muted" style="margin-top:4px">').concat(owed > 0 ? "".concat(fmt(assets), " held, minus ").concat(fmt(owed), " owed (loans + credit)") : "No loans or credit owed", '</div>\n    <div class="totals-strip">').concat(PAGES.map((p, i) => '<span class="pill" style="border-color:'.concat(CAT_COLORS[i], ";color:").concat(CAT_COLORS[i], '">').concat(p, ": ").concat(fmt(pageTotal(accId, p)), "</span>")).join(""), "</div>");
    wrap.appendChild(hero);
    const box = el("div", "box");
    const head = el("div", "tx-head");
    head.appendChild(el("div", "section-title", "Transactions"));
    const sel = el("select");
    sel.id = "home-filter";
    sel.setAttribute("aria-label", "Filter transactions by page");
    sel.innerHTML = ["All"].concat(PAGES).map((p) => '<option value="'.concat(p, '">').concat(p === "All" ? "All pages" : p, "</option>")).join("");
    sel.value = PAGES.includes(filter) ? filter : "All";
    head.appendChild(sel);
    box.appendChild(head);
    const holder = el("div");
    box.appendChild(holder);
    const refresh = () => {
      holder.innerHTML = "";
      const items = STATE.transactions.filter((t) => (sel.value === "All" || t.page === sel.value) && (accId === "overall" || t.accountId === accId));
      holder.appendChild(txList(items, { collapse: sel.value === "All" }));
    };
    sel.addEventListener("change", () => {
      filter = sel.value;
      refresh();
    });
    refresh();
    wrap.appendChild(box);
    const an = el("div", "box analysis-box");
    an.appendChild(el("div", "section-title", "Analysis"));
    an.appendChild(renderAnalysis());
    wrap.appendChild(an);
    return wrap;
  }

  // src/pages/entry.js
  function renderEntry(page2) {
    const wrap = el("div");
    const entry = el("div", "box");
    if (page2 === "Expense") {
      entry.innerHTML = '<div class="section-title">Expense Entry</div>\n      <select id="exp-cat">'.concat(catOptions(STATE.categories.Expense), '</select>\n      <div class="muted" style="margin:-4px 0 8px">Deduct from:</div>\n      <select id="exp-src-page">').concat(PAGES.filter((p) => p !== "Expense").map((p) => "<option>".concat(p, "</option>")).join("")).concat(STATE.credits.length ? "<option>Credit</option>" : "", '</select>\n      <select id="exp-src-cat"></select>\n      <input type="number" id="exp-amount" placeholder="Amount" min="0" step="0.01">\n      <div class="muted" style="margin:-4px 0 4px">Date</div>\n      <input type="date" id="exp-date" value="').concat(todayISO(), '">\n      <input type="text" id="exp-note" placeholder="Note (optional)">\n      <button class="btn" id="exp-submit">').concat(sym("receipt_long"), " Save Expense</button>");
    } else {
      entry.innerHTML = '<div class="section-title">'.concat(page2, ' Entry</div>\n      <select id="ent-cat">').concat(catOptions(STATE.categories[page2]), '</select>\n      <input type="number" id="ent-amount" placeholder="Amount" min="0" step="0.01">\n      <div class="muted" style="margin:-4px 0 4px">Date</div>\n      <input type="date" id="ent-date" value="').concat(todayISO(), '">\n      <input type="text" id="ent-note" placeholder="Note (optional)">\n      <button class="btn" id="ent-submit">').concat(sym(page2 === "Income" ? "payments" : "savings"), " Save ").concat(page2, "</button>");
    }
    wrap.appendChild(entry);
    if (page2 === "Expense") {
      const srcPage = entry.querySelector("#exp-src-page"), srcCat = entry.querySelector("#exp-src-cat");
      const refreshSrc = () => {
        if (srcPage.value === "Credit") srcCat.innerHTML = STATE.credits.map((c) => '<option value="'.concat(esc(c.id), '">').concat(esc(c.label), " (avail ").concat(fmt(c.limit - c.outstandingBalance)).concat(c.feePercent ? ", ".concat(c.feePercent, "% fee") : "", ")</option>")).join("");
        else srcCat.innerHTML = STATE.categories[srcPage.value].map((c) => '<option value="'.concat(esc(c), '">').concat(esc(c)).concat(isLocked(srcPage.value, c) ? " \u{1F512}" : "", "</option>")).join("");
      };
      srcPage.addEventListener("change", refreshSrc);
      refreshSrc();
      entry.querySelector("#exp-submit").addEventListener("click", () => {
        const amt = round2(parseFloat(entry.querySelector("#exp-amount").value));
        if (!amt || amt <= 0) {
          toast("Enter a valid amount.");
          return;
        }
        const accId = requireRealAccount();
        if (!accId) return;
        const r = applyExpense({
          accId,
          cat: entry.querySelector("#exp-cat").value,
          amt,
          note: entry.querySelector("#exp-note").value.trim(),
          date: entry.querySelector("#exp-date").value || todayISO(),
          srcPage: srcPage.value,
          srcCat: srcCat.value
        });
        if (!r.ok) {
          toast(r.error);
          return;
        }
        commit();
        toast(r.warn ? "Saved \u2014 warning: ".concat(r.warn) : "Expense saved.");
      });
    } else {
      entry.querySelector("#ent-submit").addEventListener("click", () => {
        const amt = round2(parseFloat(entry.querySelector("#ent-amount").value));
        if (!amt || amt <= 0) {
          toast("Enter a valid amount.");
          return;
        }
        const r = addEntry(
          STATE.activeAccountId,
          page2,
          entry.querySelector("#ent-cat").value,
          amt,
          entry.querySelector("#ent-note").value.trim(),
          entry.querySelector("#ent-date").value || todayISO()
        );
        if (!r.ok) {
          toast(r.error);
          return;
        }
        commit();
        toast("".concat(page2, " saved."));
      });
    }
    if (page2 === "Savings") wrap.appendChild(lockBox());
    if (page2 === "Income" || page2 === "Savings") {
      const xfer = el("div", "box");
      xfer.innerHTML = '<div class="section-title">Transfer</div>\n      <select id="xf-srccat">'.concat(STATE.categories[page2].map((c) => '<option value="'.concat(esc(c), '">').concat(esc(c)).concat(isLocked(page2, c) ? " \u{1F512}" : "", "</option>")).join(""), '</select>\n      <select id="xf-destpage">').concat(PAGES.filter((p) => p !== "Expense").map((p) => "<option>".concat(p, "</option>")).join(""), '</select>\n      <select id="xf-destcat"></select>\n      <input type="number" id="xf-amount" placeholder="Amount" min="0" step="0.01">\n      <input type="text" id="xf-note" placeholder="Note (optional)">\n      <button class="btn secondary" id="xf-submit">').concat(sym("sync_alt"), " Transfer</button>");
      wrap.appendChild(xfer);
      const dp = xfer.querySelector("#xf-destpage"), dc = xfer.querySelector("#xf-destcat");
      const refresh = () => {
        dc.innerHTML = catOptions(STATE.categories[dp.value]);
      };
      dp.addEventListener("change", refresh);
      refresh();
      xfer.querySelector("#xf-submit").addEventListener("click", () => {
        const accId = requireRealAccount();
        if (!accId) return;
        const amt = round2(parseFloat(xfer.querySelector("#xf-amount").value));
        if (!amt || amt <= 0) {
          toast("Enter a valid amount.");
          return;
        }
        const r = transfer(accId, page2, xfer.querySelector("#xf-srccat").value, dp.value, dc.value, amt, xfer.querySelector("#xf-note").value.trim());
        if (!r.ok) {
          toast(r.error);
          return;
        }
        commit();
        toast("Transfer complete.");
      });
    }
    wrap.appendChild(categoryManageBox(page2));
    return wrap;
  }
  function lockBox() {
    const box = el("div", "box");
    const locked = STATE.lockedCats.filter((c) => STATE.categories.Savings.includes(c)).length;
    box.appendChild(dropdown("locks", "Locked Savings", "".concat(locked, " locked"), () => {
      const wrap = el("div");
      wrap.appendChild(el("div", "muted", "Locked categories can't be spent, transferred out or used to pay loans and credit."));
      const list = el("div", "lock-list");
      STATE.categories.Savings.forEach((c) => {
        const row = el("div", "lock-row");
        row.innerHTML = "<label><span>".concat(esc(c), '</span><input type="checkbox" data-cat="').concat(esc(c), '" ').concat(isLocked("Savings", c) ? "checked" : "", "></label>");
        row.querySelector("input").addEventListener("change", (e) => {
          setLocked(c, e.target.checked);
          commit();
          toast(e.target.checked ? "".concat(c, " locked.") : "".concat(c, " unlocked."));
        });
        list.appendChild(row);
      });
      wrap.appendChild(list);
      return wrap;
    }));
    return box;
  }

  // src/pages/interest.js
  function renderInterest() {
    const wrap = el("div");
    const entry = el("div", "box");
    entry.innerHTML = '<div class="section-title">Interest Entry</div>\n    <select id="int-cat">'.concat(catOptions(STATE.categories.Interest), '</select>\n    <select id="int-type">').concat(Object.keys(INTEREST_TYPES).map((t) => "<option>".concat(t, "</option>")).join(""), '</select>\n    <div class="interest-fields" id="int-fields"></div>\n    <div class="muted" style="margin-bottom:6px">Direct gained interest to:</div>\n    <select id="int-gain-mode"><option value="self">Source category (auto-add)</option><option value="existing">Existing category</option><option value="new">New category</option></select>\n    <div id="int-gain-extra"></div>\n    <input type="text" id="int-note" placeholder="Note (optional)">\n    <div class="calc-result" id="int-preview">Interest: ').concat(fmt(0), '</div>\n    <button class="btn" id="int-submit">').concat(sym("percent"), " Save Interest</button>");
    wrap.appendChild(entry);
    const typeSel = entry.querySelector("#int-type"), fieldsBox = entry.querySelector("#int-fields");
    const gainMode = entry.querySelector("#int-gain-mode"), gainExtra = entry.querySelector("#int-gain-extra"), preview = entry.querySelector("#int-preview");
    const vals = () => Array.from(fieldsBox.querySelectorAll("input")).map((i) => i.value);
    const refreshPreview = () => {
      preview.textContent = "Interest: " + fmt(round2(computeInterest(typeSel.value, vals())));
    };
    function refreshFields() {
      fieldsBox.innerHTML = "";
      INTEREST_TYPES[typeSel.value].forEach((label, i) => {
        const inp = el("input");
        inp.type = "text";
        inp.placeholder = label;
        inp.dataset.f = i;
        inp.addEventListener("input", refreshPreview);
        fieldsBox.appendChild(inp);
      });
      refreshPreview();
    }
    function refreshGain() {
      gainExtra.innerHTML = "";
      if (gainMode.value === "existing") {
        const s = el("select");
        s.id = "int-gain-existing";
        s.innerHTML = catOptions(STATE.categories.Interest);
        gainExtra.appendChild(s);
      } else if (gainMode.value === "new") {
        const i = el("input");
        i.type = "text";
        i.placeholder = "New category name";
        i.id = "int-gain-newname";
        gainExtra.appendChild(i);
      }
    }
    typeSel.addEventListener("change", refreshFields);
    gainMode.addEventListener("change", refreshGain);
    refreshFields();
    refreshGain();
    entry.querySelector("#int-submit").addEventListener("click", () => {
      const accId = requireRealAccount();
      if (!accId) return;
      const amt = round2(computeInterest(typeSel.value, vals()));
      if (!amt || !isFinite(amt)) {
        toast("Enter values to calculate interest first.");
        return;
      }
      let dest = entry.querySelector("#int-cat").value;
      if (gainMode.value === "existing") dest = entry.querySelector("#int-gain-existing").value;
      else if (gainMode.value === "new") {
        const name = entry.querySelector("#int-gain-newname").value.trim();
        if (!name) {
          toast("Name the new category.");
          return;
        }
        const r = addCategory("Interest", name);
        if (!r.ok) {
          toast(r.error);
          return;
        }
        dest = name;
      }
      addBal(accId, "Interest", dest, amt);
      pushTx(accId, "Interest", dest, amt, entry.querySelector("#int-note").value.trim(), typeSel.value);
      commit();
      toast("Interest saved.");
    });
    const xfer = el("div", "box");
    const acc = STATE.activeAccountId;
    xfer.innerHTML = '<div class="section-title">Transfer (full balance only)</div>\n    <select id="ixf-srccat">'.concat(STATE.categories.Interest.map((c) => '<option value="'.concat(esc(c), '">').concat(esc(c), " \u2014 ").concat(fmt(getBal(acc, "Interest", c)), "</option>")).join(""), '</select>\n    <select id="ixf-destpage">').concat(PAGES.filter((p) => p !== "Expense").map((p) => "<option>".concat(p, "</option>")).join(""), '</select>\n    <select id="ixf-destcat"></select>\n    <input type="text" id="ixf-note" placeholder="Note (optional)">\n    <div class="muted" id="ixf-amt-preview" style="margin-bottom:8px"></div>\n    <button class="btn secondary" id="ixf-submit">').concat(sym("sync_alt"), " Transfer Full Balance</button>");
    wrap.appendChild(xfer);
    const src = xfer.querySelector("#ixf-srccat"), dp = xfer.querySelector("#ixf-destpage"), dc = xfer.querySelector("#ixf-destcat"), pv = xfer.querySelector("#ixf-amt-preview");
    const rd = () => {
      dc.innerHTML = catOptions(STATE.categories[dp.value]);
    };
    const rp = () => {
      pv.textContent = "Will transfer: ".concat(fmt(getBal(acc, "Interest", src.value)), " (remaining after: ").concat(fmt(0), ")");
    };
    dp.addEventListener("change", rd);
    src.addEventListener("change", rp);
    rd();
    rp();
    xfer.querySelector("#ixf-submit").addEventListener("click", () => {
      const accId = requireRealAccount();
      if (!accId) return;
      const amt = getBal(accId, "Interest", src.value);
      if (!amt || amt <= 0) {
        toast("Nothing to transfer from this category.");
        return;
      }
      const r = transfer(accId, "Interest", src.value, dp.value, dc.value, amt, xfer.querySelector("#ixf-note").value.trim(), "Full-balance transfer");
      if (!r.ok) {
        toast(r.error);
        return;
      }
      commit();
      toast("Full balance transferred.");
    });
    wrap.appendChild(autoRulesBox());
    wrap.appendChild(categoryManageBox("Interest"));
    return wrap;
  }
  function autoRulesBox() {
    const box = el("div", "box");
    box.appendChild(el("div", "section-title", "Auto Interest (monthly)"));
    box.appendChild(el("div", "muted", "Automatically adds interest each month based on a category's balance \u2014 no manual entry needed."));
    const list = el("div");
    list.style.cssText = "margin-top:10px;display:flex;flex-direction:column;gap:8px";
    if (!STATE.autoInterestRules.length) list.appendChild(el("div", "tx-empty", "No auto interest rules yet."));
    STATE.autoInterestRules.forEach((rule) => {
      const row = el("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--border);border-radius:var(--radius)";
      row.innerHTML = '<span style="font-size:13px">'.concat(esc(rule.ratePercent), "%/mo of <b>").concat(esc(rule.sourcePage), "/").concat(esc(rule.sourceCategory), "</b> \u2192 <b>Interest/").concat(esc(rule.destCategory), "</b></span>");
      const del = el("button", "widget-close", "\u2715");
      del.title = "Delete rule";
      del.setAttribute("aria-label", "Delete rule");
      del.addEventListener("click", () => confirmToast("Delete this auto interest rule?", () => {
        STATE.autoInterestRules = STATE.autoInterestRules.filter((r) => r.id !== rule.id);
        commit();
      }));
      row.appendChild(del);
      list.appendChild(row);
    });
    box.appendChild(list);
    const add = el("button", "btn secondary", "+ Add Auto Interest Rule");
    add.style.cssText = "width:100%;margin-top:12px";
    add.addEventListener("click", async () => {
      const accId = requireRealAccount();
      if (!accId) return;
      const res = await openModal({ title: "New Auto Interest Rule", fields: [
        { key: "sourcePage", label: "Earns interest on", type: "select", default: "Savings", options: ["Income", "Savings", "Interest"], onChange: (v, i) => {
          i.sourceCategory.innerHTML = optionsHTML(STATE.categories[v]);
        } },
        { key: "sourceCategory", label: "Category", type: "select", options: STATE.categories.Savings },
        { key: "ratePercent", label: "Monthly interest rate (%)", type: "number", placeholder: "e.g. 2" },
        { key: "destCategory", label: "Deposit interest into", type: "select", options: STATE.categories.Interest }
      ], confirmText: "Create Rule" });
      if (!res) return;
      const rate = parseFloat(res.ratePercent);
      if (!rate || rate <= 0) {
        toast("Enter a valid rate.");
        return;
      }
      STATE.autoInterestRules.push({ id: uid(), accountId: accId, sourcePage: res.sourcePage, sourceCategory: res.sourceCategory, ratePercent: rate, destCategory: res.destCategory, lastAppliedMonth: currentYM() });
      commit();
      toast("Auto interest rule created.");
    });
    box.appendChild(add);
    return box;
  }

  // src/pages/loan.js
  async function newLoan() {
    const accId = requireRealAccount();
    if (!accId) return;
    const res = await openModal({ title: "New Loan", fields: [
      { key: "label", label: "Loan label (optional)", type: "text", placeholder: "Loan ".concat(STATE.loans.length + 1) },
      { key: "amount", label: "Amount loaned", type: "number", placeholder: "e.g. 5000" },
      { key: "dueDate", label: "Full payment due date", type: "date", default: todayISO() },
      { key: "frequency", label: "Repayment schedule", type: "select", default: "monthly", options: [
        { value: "fixed", label: "Fixed (pay in full at due date)" },
        { value: "daily", label: "Daily" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "yearly", label: "Yearly" }
      ] },
      { key: "note", label: "Note (optional)", type: "text" }
    ], confirmText: "Add Loan" });
    if (!res) return;
    const r = createLoan(accId, { label: res.label, amount: parseFloat(res.amount), dueDate: res.dueDate, frequency: res.frequency, note: res.note.trim() });
    if (!r.ok) {
      toast(r.error);
      return;
    }
    commit();
    toast("Loan added \u2014 amount credited to Income.");
  }
  async function payLoanFlow(loan) {
    const rem = loanRemaining(loan);
    if (rem <= 0) {
      toast("Already paid.");
      return;
    }
    const res = await openModal({ title: 'Pay "'.concat(loan.label, '"'), message: "Remaining: ".concat(fmt(rem), " of ").concat(fmt(loan.amount)), fields: [
      { key: "amount", label: "Payment amount (part or all)", type: "number", default: rem },
      { key: "srcPage", label: "Pay from", type: "select", default: "Income", options: ["Income", "Savings", "Interest"], onChange: (v, i) => {
        i.srcCat.innerHTML = optionsHTML(STATE.categories[v]);
      } },
      { key: "srcCat", label: "Category", type: "select", options: STATE.categories.Income },
      { key: "date", label: "Date", type: "date", default: todayISO() }
    ], confirmText: "Pay" });
    if (!res) return;
    const r = payLoan(loan, parseFloat(res.amount) || 0, res.srcPage, res.srcCat, res.date || todayISO());
    if (!r.ok) {
      toast(r.error);
      return;
    }
    commit();
    toast(r.paidOff ? "Loan fully paid." : "Paid ".concat(fmt(r.amount), " \u2014 ").concat(fmt(r.remaining), " left.").concat(r.warn ? " Warning: " + r.warn : ""));
  }
  function loanItem(loan) {
    const row = el("div", "box");
    const rem = loanRemaining(loan);
    const paidSum = loan.amount - rem;
    const pct2 = loan.amount ? Math.min(100, paidSum / loan.amount * 100) : 0;
    row.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start">\n      <div style="font-weight:700;font-size:16px">'.concat(esc(loan.label), " ").concat(rem <= 0 ? '<span class="muted" style="font-weight:400;font-size:13px">(Paid)</span>' : "", '</div>\n      <button class="widget-close" data-del aria-label="Remove loan">\u2715</button></div>\n    <div class="muted" style="font-size:12px;margin-top:3px">Remaining ').concat(fmt(rem), " of ").concat(fmt(loan.amount), " \xB7 Due ").concat(fmtDateHeader(loan.dueDate), " \xB7 ").concat(esc(loan.frequency), '</div>\n    <div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:').concat(pct2, '%;background:var(--accent-2)"></div></div>\n    <div class="muted" style="font-size:12px;margin-top:6px">Unspent from loan: ').concat(fmt(getBal(loan.accountId, "Income", loan.label)), "</div>\n    ").concat(loan.note ? '<div style="font-size:13px;margin-top:5px">'.concat(esc(loan.note), "</div>") : "");
    if (loan.payments.length) {
      const h = el("div", "pay-history");
      h.innerHTML = '<div class="muted" style="margin-bottom:2px">Payment history</div>' + loan.payments.slice().reverse().map((p) => '<div class="pay-row"><span>'.concat(fmtDateHeader(p.date), "</span><span>").concat(fmt(p.amount), "</span></div>")).join("");
      row.appendChild(h);
    }
    if (rem > 0) {
      const b = el("button", "btn secondary pay-btn", "Make a payment");
      b.style.width = "100%";
      b.addEventListener("click", () => payLoanFlow(loan));
      row.appendChild(b);
    }
    row.querySelector("[data-del]").addEventListener("click", () => confirmToast('Remove "'.concat(loan.label, "\" from your loans list? This won't undo any transactions already made."), () => {
      STATE.loans = STATE.loans.filter((l) => l.id !== loan.id);
      commit();
    }));
    return row;
  }
  function renderLoan() {
    const wrap = el("div");
    const add = el("button", "btn", "+ New Loan");
    add.style.cssText = "width:100%;margin-bottom:14px";
    add.addEventListener("click", newLoan);
    wrap.appendChild(add);
    if (!STATE.loans.length) {
      const b = el("div", "box");
      b.appendChild(el("div", "tx-empty", "No loans yet. Tap + New Loan to add one \u2014 the amount is credited to Income automatically."));
      wrap.appendChild(b);
    }
    STATE.loans.forEach((l) => wrap.appendChild(loanItem(l)));
    const accId = STATE.activeAccountId, labels = STATE.loans.map((l) => l.label);
    const tx = STATE.transactions.filter((t) => (accId === "overall" || t.accountId === accId) && (labels.includes(t.category) || t.meta && labels.some((l) => t.meta.includes(l))));
    const box = el("div", "box");
    box.style.marginTop = "14px";
    box.appendChild(el("div", "section-title", "Loan Transactions"));
    box.appendChild(txList(tx));
    wrap.appendChild(box);
    return wrap;
  }

  // src/pages/credit.js
  async function newCredit() {
    const accId = requireRealAccount();
    if (!accId) return;
    const res = await openModal({ title: "New Credit Line", fields: [
      { key: "label", label: "Name", type: "text", placeholder: "Credit ".concat(STATE.credits.length + 1) },
      { key: "limit", label: "Credit limit", type: "number", placeholder: "e.g. 20000" },
      { key: "dueDay", label: "Payment due day of month (1-28)", type: "number", placeholder: "e.g. 15" },
      { key: "resetDay", label: "Billing cycle reset day (1-28)", type: "number", placeholder: "e.g. 1" },
      { key: "feePercent", label: "Fee per charge (%) \u2014 added to what you owe", type: "number", placeholder: "e.g. 2 (leave blank for none)" },
      { key: "note", label: "Note (optional)", type: "text" }
    ], confirmText: "Add Credit" });
    if (!res) return;
    const r = createCredit(accId, { label: res.label, limit: parseFloat(res.limit), dueDay: res.dueDay, resetDay: res.resetDay, feePercent: res.feePercent, note: res.note.trim() });
    if (!r.ok) {
      toast(r.error);
      return;
    }
    commit();
    toast("Credit line added.");
  }
  async function editFlow(c) {
    const res = await openModal({ title: 'Edit "'.concat(c.label, '"'), fields: [
      { key: "label", label: "Name", type: "text", default: c.label },
      { key: "limit", label: "Credit limit", type: "number", default: c.limit },
      { key: "dueDay", label: "Payment due day of month (1-28)", type: "number", default: c.dueDay },
      { key: "resetDay", label: "Billing cycle reset day (1-28)", type: "number", default: c.resetDay },
      { key: "feePercent", label: "Fee per charge (%) \u2014 applies to new charges", type: "number", default: c.feePercent || 0 },
      { key: "note", label: "Note (optional)", type: "text", default: c.note || "" }
    ], confirmText: "Save" });
    if (!res) return;
    const r = editCredit(c, { label: res.label, limit: parseFloat(res.limit), dueDay: res.dueDay, resetDay: res.resetDay, feePercent: res.feePercent, note: res.note.trim() });
    if (!r.ok) {
      toast(r.error);
      return;
    }
    commit();
    toast("Credit line updated.");
  }
  async function payFlow(credit) {
    if (credit.outstandingBalance <= 0) {
      toast("No outstanding balance.");
      return;
    }
    const res = await openModal({ title: 'Pay "'.concat(credit.label, '"'), message: "Outstanding: ".concat(fmt(credit.outstandingBalance)), fields: [
      { key: "amount", label: "Payment amount", type: "number", default: credit.outstandingBalance },
      { key: "srcPage", label: "Pay from", type: "select", default: "Income", options: ["Income", "Savings", "Interest"], onChange: (v, i) => {
        i.srcCat.innerHTML = optionsHTML(STATE.categories[v]);
      } },
      { key: "srcCat", label: "Category", type: "select", options: STATE.categories.Income }
    ], confirmText: "Pay" });
    if (!res) return;
    const r = payCredit(credit, parseFloat(res.amount) || 0, res.srcPage, res.srcCat);
    if (!r.ok) {
      toast(r.error);
      return;
    }
    commit();
    toast("Payment recorded.");
  }
  function creditItem(c) {
    const box = el("div", "box");
    const days = creditDaysUntilDue(c), soon = days <= 3 && c.outstandingBalance > 0;
    const pct2 = Math.min(100, c.outstandingBalance / c.limit * 100);
    const cy = creditCycle(c);
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start">\n      <div style="font-weight:700;font-size:16px">'.concat(esc(c.label), '</div>\n      <span style="display:flex;gap:2px"><button class="icon-btn" data-edit title="Edit ').concat(esc(c.label), '" aria-label="Edit ').concat(esc(c.label), '"><span class="material-icons-outlined">edit</span></button>\n      <button class="widget-close" data-del aria-label="Remove credit line">\u2715</button></span></div>\n    <div class="muted" style="font-size:13px;margin-top:3px">Limit ').concat(fmt(c.limit), " \xB7 Outstanding ").concat(fmt(c.outstandingBalance)).concat(c.feePercent ? " \xB7 Fee ".concat(esc(c.feePercent), "% per charge") : "", '</div>\n    <div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:').concat(pct2, "%;background:").concat(soon ? "var(--danger)" : "var(--accent-1)", '"></div></div>\n    <div style="font-size:12px;margin-top:8px;').concat(soon ? "color:var(--danger);font-weight:700" : "color:var(--text-dim)", '">Due day ').concat(esc(c.dueDay), " of month").concat(days <= 3 && c.outstandingBalance > 0 ? " \xB7 ".concat(days === 0 ? "Due today" : "Due in ".concat(days, "d")) : "", '</div>\n    <div class="credit-cycle">Cycle since ').concat(fmtDateHeader(cy.start), ": charged ").concat(fmt(cy.charged), ", paid ").concat(fmt(cy.paid), " \xB7 resets ").concat(fmtDateHeader(cy.next), " (in ").concat(cy.daysToReset, "d)</div>\n    ").concat(c.note ? '<div style="font-size:13px;margin-top:6px">'.concat(esc(c.note), "</div>") : "");
    const pay = el("button", "btn secondary", "Pay");
    pay.style.cssText = "width:100%;margin-top:10px";
    pay.addEventListener("click", () => payFlow(c));
    box.appendChild(pay);
    box.querySelector("[data-edit]").addEventListener("click", () => editFlow(c));
    box.querySelector("[data-del]").addEventListener("click", () => confirmToast('Remove "'.concat(c.label, "\"? This won't undo any transactions already made."), () => {
      STATE.credits = STATE.credits.filter((x) => x.id !== c.id);
      commit();
    }));
    return box;
  }
  function renderCredit() {
    const wrap = el("div");
    const add = el("button", "btn", "+ New Credit Line");
    add.style.cssText = "width:100%;margin-bottom:14px";
    add.addEventListener("click", newCredit);
    wrap.appendChild(add);
    if (!STATE.credits.length) {
      const b = el("div", "box");
      b.appendChild(el("div", "tx-empty", 'No credit lines yet. Add one, then choose "Credit" as the deduction source on the Expense page to charge purchases to it.'));
      wrap.appendChild(b);
    }
    STATE.credits.forEach((c) => wrap.appendChild(creditItem(c)));
    const accId = STATE.activeAccountId, labels = STATE.credits.map((c) => c.label);
    const tx = STATE.transactions.filter((t) => (accId === "overall" || t.accountId === accId) && t.meta && labels.some((l) => t.meta.includes(l)));
    const box = el("div", "box");
    box.style.marginTop = "14px";
    box.appendChild(el("div", "section-title", "Credit Transactions"));
    box.appendChild(txList(tx));
    wrap.appendChild(box);
    return wrap;
  }

  // src/pages/instant.js
  var ICONS = [
    { value: "payments", label: "Cash" },
    { value: "directions_bus", label: "Transport" },
    { value: "local_cafe", label: "Coffee" },
    { value: "restaurant", label: "Food" },
    { value: "shopping_cart", label: "Shopping" },
    { value: "local_gas_station", label: "Fuel" },
    { value: "school", label: "School" },
    { value: "savings", label: "Savings" }
  ];
  var editMode = false;
  var iconOf = (it) => ICONS.some((i) => i.value === it.icon) ? it.icon : "payments";
  var srcCats = (page2) => page2 === "Credit" ? STATE.credits.map((c) => ({ value: c.id, label: c.label })) : STATE.categories[page2] || [];
  function tap(item) {
    const accId = requireRealAccount();
    if (!accId) return;
    const snap = snapshot();
    const r = performInstant(item, accId);
    if (!r.ok) {
      toast(r.error);
      return;
    }
    commit();
    toast((r.warn ? "Warning: " + r.warn + " " : "") + "".concat(item.type === "gain" ? "Gained" : "Spent", " ").concat(fmt(item.amount), " \u2014 ").concat(item.name), () => undoTo(snap));
  }
  async function form(existing) {
    const it = existing || {};
    const srcPages = ["Income", "Savings", "Interest"].concat(STATE.credits.length ? ["Credit"] : []);
    const srcPage = srcPages.includes(it.srcPage) ? it.srcPage : "Income";
    const showFor = (val, inputs) => {
      const gain = val === "gain";
      inputs.gainCategory.parentElement.style.display = gain ? "" : "none";
      ["spendCategory", "srcPage", "srcCat"].forEach((k) => inputs[k].parentElement.style.display = gain ? "none" : "");
    };
    const res = await openModal({ title: existing ? "Edit instant item" : "New instant item", fields: [
      { key: "name", label: "Name", type: "text", default: it.name || "", placeholder: "e.g. Transport" },
      { key: "amount", label: "Price per tap", type: "number", default: it.amount !== void 0 ? it.amount : "", placeholder: "e.g. 50" },
      { key: "type", label: "Type", type: "select", default: it.type || "spend", options: [{ value: "spend", label: "Spent (expense)" }, { value: "gain", label: "Gained (income)" }], onChange: showFor, initOnChange: true },
      { key: "icon", label: "Icon", type: "select", default: iconOf(it), options: ICONS },
      { key: "gainCategory", label: "Add to Income category", type: "select", default: it.gainCategory, options: STATE.categories.Income },
      { key: "spendCategory", label: "Expense category", type: "select", default: it.spendCategory, options: STATE.categories.Expense },
      { key: "srcPage", label: "Deduct from", type: "select", default: srcPage, options: srcPages, onChange: (v, i) => {
        i.srcCat.innerHTML = optionsHTML(srcCats(v));
      } },
      { key: "srcCat", label: "Source category", type: "select", default: it.srcCat, options: srcCats(srcPage) }
    ], confirmText: "Save" });
    if (!res) return;
    const name = res.name.trim(), amount = round2(parseFloat(res.amount));
    if (!name) {
      toast("Give the item a name.");
      return;
    }
    if (!amount || amount <= 0) {
      toast("Enter a valid price.");
      return;
    }
    if (res.type === "gain" && !res.gainCategory) {
      toast("Pick an Income category.");
      return;
    }
    if (res.type === "spend" && (!res.spendCategory || !res.srcCat)) {
      toast("Pick an expense category and a source.");
      return;
    }
    const data = { name, amount, type: res.type, icon: res.icon, gainCategory: res.gainCategory, spendCategory: res.spendCategory, srcPage: res.srcPage, srcCat: res.srcCat };
    if (existing) Object.assign(existing, data);
    else STATE.instants.push(Object.assign({ id: uid() }, data));
    commit();
    toast(existing ? "Item updated." : "Item added.");
  }
  function renderInstant() {
    const wrap = el("div");
    const accId = STATE.activeAccountId;
    const head = el("div", "instant-head");
    head.appendChild(el("h2", "", "Instant"));
    const pen = el("button", "icon-btn" + (editMode ? " active" : ""));
    pen.innerHTML = '<span class="material-icons-outlined">'.concat(editMode ? "check" : "edit", "</span>");
    pen.title = editMode ? "Done editing" : "Adjust items";
    pen.setAttribute("aria-label", pen.title);
    pen.addEventListener("click", () => {
      editMode = !editMode;
      commit();
    });
    head.appendChild(pen);
    wrap.appendChild(head);
    const t = instantTodayTotals(accId);
    const strip = el("div", "instant-totals");
    strip.innerHTML = '<div class="instant-stat gain"><div class="lbl">Gained today</div><div class="val">'.concat(fmt(t.gained), '</div></div>\n    <div class="instant-stat spend"><div class="lbl">Spent today</div><div class="val">').concat(fmt(t.spent), "</div></div>");
    wrap.appendChild(strip);
    const box = el("div", "box");
    const acc = activeAccount();
    box.appendChild(el("div", "muted", isOverall() ? "Pick a specific account in the Accounts widget to log instant items." : "Posting to: <b>".concat(esc(acc ? acc.name : ""), "</b>").concat(editMode ? " \xB7 edit mode" : "")));
    const list = el("div");
    list.style.marginTop = "6px";
    if (!STATE.instants.length) list.appendChild(el("div", "tx-empty", "No instant items yet. Add one for something you log every day, like Transport."));
    STATE.instants.forEach((item) => {
      const gain = item.type === "gain";
      const row = el("div", "instant-row");
      row.appendChild(el("div", "instant-ico " + (gain ? "gain" : "spend"), '<span class="material-icons-outlined">'.concat(esc(iconOf(item)), "</span>")));
      const where = gain ? "Income / ".concat(item.gainCategory || "?") : item.srcPage === "Credit" ? "Credit / ".concat((STATE.credits.find((c) => c.id === item.srcCat) || {}).label || "?", " \u2192 ").concat(item.spendCategory || "?") : "".concat(item.srcPage || "?", " / ").concat(item.srcCat || "?", " \u2192 ").concat(item.spendCategory || "?");
      const info = el("div", "instant-info", '<div class="instant-name">'.concat(esc(item.name), '</div><div class="instant-meta">').concat(gain ? "Gained" : "Spent", " \xB7 ").concat(esc(where), "</div>"));
      row.appendChild(info);
      if (editMode) {
        const acts = el("div", "instant-edit-actions");
        const e = el("button", "icon-btn", '<span class="material-icons-outlined">edit</span>');
        e.title = "Edit " + item.name;
        e.setAttribute("aria-label", e.title);
        e.addEventListener("click", () => form(item));
        const d = el("button", "icon-btn", '<span class="material-icons-outlined">delete_outline</span>');
        d.title = "Delete " + item.name;
        d.setAttribute("aria-label", d.title);
        d.addEventListener("click", () => confirmToast('Delete "'.concat(item.name, '"? Past transactions stay as they are.'), () => {
          STATE.instants = STATE.instants.filter((x) => x.id !== item.id);
          commit();
        }));
        acts.appendChild(e);
        acts.appendChild(d);
        row.appendChild(acts);
      } else {
        const act = el("button", "instant-act" + (gain ? "" : " spend"));
        act.textContent = (gain ? "Gained +" : "Spent \u2212") + fmt(item.amount);
        act.addEventListener("click", () => tap(item));
        row.appendChild(act);
      }
      list.appendChild(row);
    });
    box.appendChild(list);
    const add = el("button", "btn secondary", "+ New instant item");
    add.style.cssText = "width:100%;margin-top:12px";
    add.addEventListener("click", () => form(null));
    box.appendChild(add);
    wrap.appendChild(box);
    return wrap;
  }

  // src/pages/recurring.js
  var tab = "Instant";
  var srcCats2 = (page2) => page2 === "Credit" ? STATE.credits.map((c) => ({ value: c.id, label: c.label })) : STATE.categories[page2] || [];
  async function form2() {
    const accId = requireRealAccount();
    if (!accId) return;
    const srcPages = ["Income", "Savings", "Interest"].concat(STATE.credits.length ? ["Credit"] : []);
    const showFor = (v, i) => {
      const inc = v === "income";
      i.category.innerHTML = optionsHTML(STATE.categories[inc ? "Income" : "Expense"]);
      ["srcPage", "srcCat"].forEach((k) => i[k].parentElement.style.display = inc ? "none" : "");
    };
    const res = await openModal({ title: "New recurring item", fields: [
      { key: "name", label: "Name", type: "text", placeholder: "e.g. Rent, Salary" },
      { key: "type", label: "Type", type: "select", default: "expense", options: [{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }], onChange: showFor },
      { key: "amount", label: "Amount", type: "number" },
      { key: "category", label: "Category", type: "select", options: STATE.categories.Expense },
      { key: "srcPage", label: "Deduct from", type: "select", default: "Income", options: srcPages, onChange: (v, i) => {
        i.srcCat.innerHTML = optionsHTML(srcCats2(v));
      } },
      { key: "srcCat", label: "Source category", type: "select", options: srcCats2("Income") },
      { key: "frequency", label: "Repeats", type: "select", default: "monthly", options: FREQUENCIES },
      { key: "startDate", label: "First date", type: "date", default: todayISO() }
    ], confirmText: "Add" });
    if (!res) return;
    const r = addRecurring(accId, { name: res.name, type: res.type, amount: parseFloat(res.amount), category: res.category, srcPage: res.srcPage, srcCat: res.srcCat, frequency: res.frequency, startDate: res.startDate });
    if (!r.ok) {
      toast(r.error);
      return;
    }
    const p = processRecurring();
    commit();
    toast(p.posted ? "Added \u2014 ".concat(p.posted, " due entr").concat(p.posted === 1 ? "y" : "ies", " posted.") : "Recurring item added.");
  }
  function renderRecurring() {
    const wrap = el("div");
    const seg = el("div", "seg");
    [["Instant", "bolt"], ["Scheduled", "event_repeat"]].forEach(([name, icon]) => {
      const b = el("button", "seg-btn" + (tab === name ? " active" : ""), '<span class="material-icons-outlined">'.concat(icon, "</span>").concat(name));
      b.dataset.tab = name;
      b.setAttribute("aria-pressed", String(tab === name));
      b.addEventListener("click", () => {
        tab = name;
        commit();
      });
      seg.appendChild(b);
    });
    wrap.appendChild(seg);
    if (tab === "Instant") {
      wrap.appendChild(renderInstant());
      return wrap;
    }
    const add = el("button", "btn", "+ New recurring item");
    add.style.cssText = "width:100%;margin-bottom:14px";
    add.addEventListener("click", form2);
    wrap.appendChild(add);
    const accId = STATE.activeAccountId;
    const items = STATE.recurring.filter((r) => accId === "overall" || r.accountId === accId);
    const box = el("div", "box");
    box.appendChild(el("div", "section-title", "Recurring"));
    box.appendChild(el("div", "muted", isOverall() ? "Showing all accounts." : "For <b>".concat(esc((activeAccount() || {}).name || ""), "</b>. Due items post automatically when you open the app, including ones you missed.")));
    const list = el("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:10px";
    if (!items.length) list.appendChild(el("div", "tx-empty", "Nothing recurring yet. Add rent, salary, subscriptions\u2026"));
    items.forEach((r) => {
      const row = el("div", "rec-row" + (r.active ? "" : " paused"));
      row.style.cssText = "display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:var(--radius)";
      const inc = r.type === "income";
      row.innerHTML = '<div style="flex:1;min-width:0"><div style="font-weight:700">'.concat(esc(r.name), '<span class="chip-small">').concat(esc(r.frequency), "</span>").concat(r.active ? "" : '<span class="chip-small">paused</span>', '</div>\n      <div class="muted" style="font-size:12px">').concat(inc ? "+" : "\u2212").concat(fmt(r.amount), " \xB7 ").concat(esc(r.category)).concat(inc ? "" : " \xB7 from ".concat(esc(r.srcPage)), " \xB7 next ").concat(fmtDateHeader(r.nextDate), "</div>\n      ").concat(r.lastError ? '<div style="font-size:12px;color:var(--danger)">'.concat(esc(r.lastError), "</div>") : "", "</div>");
      const tog = el("button", "icon-btn", '<span class="material-icons-outlined">'.concat(r.active ? "pause" : "play_arrow", "</span>"));
      tog.title = r.active ? "Pause" : "Resume";
      tog.setAttribute("aria-label", tog.title);
      tog.addEventListener("click", () => {
        r.active = !r.active;
        commit();
      });
      const del = el("button", "icon-btn", '<span class="material-icons-outlined">delete_outline</span>');
      del.title = "Delete";
      del.setAttribute("aria-label", "Delete " + r.name);
      del.addEventListener("click", () => confirmToast('Delete "'.concat(r.name, '"? Past transactions stay as they are.'), () => {
        STATE.recurring = STATE.recurring.filter((x) => x.id !== r.id);
        commit();
      }));
      row.appendChild(tog);
      row.appendChild(del);
      list.appendChild(row);
    });
    box.appendChild(list);
    wrap.appendChild(box);
    return wrap;
  }

  // src/widgets/accounts.js
  var TYPES = ["Cash", "Bank", "Credit Card", "E-Wallet", "Investment"];
  function renderAccounts() {
    const box = el("div");
    const select = (id) => {
      STATE.activeAccountId = id;
      commit();
    };
    if (STATE.accounts.length > 1) {
      const o = el("div", "account-card" + (isOverall() ? " active" : ""));
      o.innerHTML = '<span>Overall Account</span><span class="bal">'.concat(fmt(STATE.accounts.reduce((s, a) => s + netBalance(a.id), 0)), "</span>");
      o.addEventListener("click", () => select("overall"));
      box.appendChild(o);
    }
    STATE.accounts.forEach((a) => {
      const card2 = el("div", "account-card" + (STATE.activeAccountId === a.id ? " active" : ""));
      card2.innerHTML = '<span style="flex:1;min-width:0">'.concat(esc(a.name), '<div class="muted">').concat(esc(a.type), '</div></span><span class="bal">').concat(fmt(netBalance(a.id)), '</span>\n      <span class="acc-actions"><button data-act="rename" title="Rename ').concat(esc(a.name), '" aria-label="Rename ').concat(esc(a.name), '"><span class="material-icons-outlined">edit</span></button>\n      <button data-act="reset" title="Reset ').concat(esc(a.name), '" aria-label="Reset ').concat(esc(a.name), '"><span class="material-icons-outlined">restart_alt</span></button>\n      <button data-act="delete" title="Delete ').concat(esc(a.name), '" aria-label="Delete ').concat(esc(a.name), '"><span class="material-icons-outlined">delete_outline</span></button></span>');
      card2.addEventListener("click", () => select(a.id));
      card2.querySelector('[data-act="rename"]').addEventListener("click", async (e) => {
        e.stopPropagation();
        const res = await openModal({ title: "Edit account", fields: [
          { key: "name", label: "Account name", type: "text", default: a.name },
          { key: "type", label: "Type", type: "select", default: a.type, options: TYPES.includes(a.type) ? TYPES : TYPES.concat([a.type]) }
        ], confirmText: "Save" });
        if (!res) return;
        const r = renameAccount(a.id, res.name, res.type);
        if (!r.ok) {
          toast(r.error);
          return;
        }
        commit();
      });
      card2.querySelector('[data-act="reset"]').addEventListener("click", async (e) => {
        e.stopPropagation();
        const f = accountFootprint(a.id);
        const ok = await openConfirm('Reset "'.concat(a.name, '"? This erases its ').concat(f.transactions, " transactions, ").concat(f.loans, " loans, ").concat(f.credits, " credit lines and ").concat(f.recurring, " recurring items and sets every balance to zero. The account and your categories stay. You can undo right after."), { title: "Reset account?", confirmText: "Reset" });
        if (!ok) return;
        const snap = snapshot();
        const r = resetAccount(a.id);
        if (!r.ok) {
          toast(r.error);
          return;
        }
        commit();
        toast('"'.concat(a.name, '" was reset.'), () => undoTo(snap));
      });
      card2.querySelector('[data-act="delete"]').addEventListener("click", async (e) => {
        e.stopPropagation();
        if (STATE.accounts.length <= 1) {
          toast("You need at least one account.");
          return;
        }
        const f = accountFootprint(a.id);
        const ok = await openConfirm('Delete "'.concat(a.name, '" and everything in it (').concat(f.transactions, " transactions, ").concat(f.loans, " loans, ").concat(f.credits, " credit lines, ").concat(f.recurring, " recurring items)? This can't be undone \u2014 export a backup first if unsure."), { title: "Delete account?", confirmText: "Delete" });
        if (!ok) return;
        const r = deleteAccount(a.id);
        if (!r.ok) {
          toast(r.error);
          return;
        }
        commit();
        toast("Account deleted.");
      });
      box.appendChild(card2);
    });
    const add = el("button", "btn secondary", "+ New Account");
    add.style.cssText = "width:100%;margin-top:8px";
    add.addEventListener("click", async () => {
      const res = await openModal({ title: "New Account", fields: [
        { key: "name", label: "Account name", type: "text", placeholder: "e.g. BPI Savings" },
        { key: "type", label: "Type", type: "select", default: "Bank", options: TYPES }
      ], confirmText: "Create Account" });
      if (!res) return;
      const r = addAccount(res.name, res.type);
      if (!r.ok) {
        toast(r.error);
        return;
      }
      commit();
    });
    box.appendChild(add);
    return box;
  }

  // src/widgets/budget.js
  function renderBudget() {
    const box = el("div");
    const add = el("button", "btn", "+ New Goal");
    add.style.cssText = "width:100%;margin-bottom:10px";
    add.addEventListener("click", async () => {
      const res = await openModal({ title: "New Goal", fields: [
        {
          key: "kind",
          label: "Goal type",
          type: "select",
          default: "expense",
          options: [{ value: "expense", label: "Expense spending limit (monthly)" }, { value: "savings", label: "Savings % goal" }],
          onChange: (v, i) => {
            i.category.innerHTML = optionsHTML(STATE.categories[v === "expense" ? "Expense" : "Savings"]);
            i.amount.placeholder = v === "expense" ? "Monthly limit, e.g. 1000" : "Goal amount, e.g. 5000";
          }
        },
        { key: "category", label: "Category", type: "select", options: STATE.categories.Expense },
        { key: "amount", label: "Amount", type: "number", placeholder: "Monthly limit, e.g. 1000" }
      ], confirmText: "Create Goal" });
      if (!res) return;
      const amt = round2(parseFloat(res.amount));
      if (!amt || amt <= 0) {
        toast("Enter a valid amount.");
        return;
      }
      if (!STATE.categories[res.kind === "expense" ? "Expense" : "Savings"].includes(res.category)) {
        toast("Pick a category from the list.");
        return;
      }
      STATE.budgets.push(res.kind === "expense" ? { id: uid(), kind: "expense", category: res.category, limit: amt } : { id: uid(), kind: "savings", category: res.category, goalAmount: amt });
      commit();
    });
    box.appendChild(add);
    const accId = STATE.activeAccountId;
    if (!STATE.budgets.length) box.appendChild(el("div", "tx-empty", "No goals yet \u2014 tap + New Goal."));
    STATE.budgets.forEach((g) => {
      const gb = el("div", "goal-box");
      let pct2, label;
      if (g.kind === "expense") {
        const s = spentThisMonth(accId, g.category);
        pct2 = Math.min(100, s / g.limit * 100);
        label = "".concat(esc(g.category), " \u2014 spent ").concat(fmt(s), " of ").concat(fmt(g.limit), " this month");
      } else {
        const b = balFor(accId, "Savings", g.category);
        pct2 = Math.min(100, b / g.goalAmount * 100);
        label = "".concat(esc(g.category), " \u2014 ").concat(pct2.toFixed(0), "% of savings goal");
      }
      gb.innerHTML = "<div>".concat(label, '</div><div class="progress-track"><div class="progress-fill" style="width:').concat(Math.max(0, pct2), "%; background:").concat(g.kind === "expense" && pct2 >= 100 ? "var(--danger)" : "var(--accent-2)", '"></div></div>');
      const acts = el("div");
      acts.style.cssText = "display:flex;gap:8px;margin-top:6px";
      const ren = el("button", "btn secondary", "Rename"), del = el("button", "btn danger", "Delete");
      [ren, del].forEach((b) => {
        b.style.fontSize = "11px";
        b.style.padding = "4px 8px";
      });
      ren.addEventListener("click", async () => {
        const r = await openModal({ title: "Rename Goal Label", fields: [{ key: "name", type: "text", default: g.category }], confirmText: "Save" });
        if (r && r.name.trim()) {
          g.category = r.name.trim();
          commit();
        }
      });
      del.addEventListener("click", () => confirmToast('Delete the "'.concat(g.category, '" goal?'), () => {
        STATE.budgets = STATE.budgets.filter((x) => x.id !== g.id);
        commit();
      }));
      acts.appendChild(ren);
      acts.appendChild(del);
      gb.appendChild(acts);
      box.appendChild(gb);
    });
    return box;
  }

  // src/calc.js
  function safeEval(expr2) {
    const clean = expr2.replace(/\s+/g, "");
    const tokens = clean.match(/\d+\.?\d*|\.\d+|[+\-*/]/g);
    if (!tokens || tokens.join("") !== clean) throw new Error("bad expression");
    const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };
    const out = [], ops = [];
    const apply = () => {
      const op = ops.pop(), b = out.pop(), a = out.pop();
      if (a === void 0 || b === void 0) throw new Error("bad expression");
      out.push(op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b);
    };
    let prevWasOp = true;
    tokens.forEach((t, i) => {
      if (prec[t]) {
        if (prevWasOp) {
          if (t === "-" && i === 0) out.push(0);
          else throw new Error("bad expression");
        }
        while (ops.length && prec[ops[ops.length - 1]] >= prec[t]) apply();
        ops.push(t);
        prevWasOp = true;
      } else {
        out.push(parseFloat(t));
        prevWasOp = false;
      }
    });
    if (prevWasOp) throw new Error("bad expression");
    while (ops.length) apply();
    const r = out[0];
    if (!isFinite(r)) throw new Error("bad expression");
    return Math.round(r * 1e8) / 1e8;
  }
  var pmt = (P, r, n) => r ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n;
  var CALC_DEFS = {
    "Currency": { fields: ["Amount", "Rate (target per 1 base)"], compute: (v) => fmt(v["Amount"] * v["Rate (target per 1 base)"]) },
    "Finance": { fields: ["Present Value", "Rate % per period", "Periods"], compute: (v) => fmt(v["Present Value"] * Math.pow(1 + v["Rate % per period"] / 100, v["Periods"])) },
    "Mortgage": { fields: ["Loan Amount", "Annual Rate %", "Years"], compute: (v) => {
      const n = v["Years"] * 12;
      if (!n) return "Enter the loan term";
      return fmt(pmt(v["Loan Amount"], v["Annual Rate %"] / 100 / 12, n)) + " / month";
    } },
    "Budget": { fields: ["Monthly Income", "Needs %", "Wants %"], compute: (v) => {
      const needs = v["Monthly Income"] * v["Needs %"] / 100, wants = v["Monthly Income"] * v["Wants %"] / 100;
      return "Needs ".concat(fmt(needs), " \xB7 Wants ").concat(fmt(wants), " \xB7 Save ").concat(fmt(v["Monthly Income"] - needs - wants));
    } },
    "Salary": { fields: ["Gross Monthly Salary", "Deductions %"], compute: (v) => fmt(v["Gross Monthly Salary"] * (1 - v["Deductions %"] / 100)) + " take-home" },
    "Credit Card": { fields: ["Balance", "Annual Rate %", "Monthly Payment"], compute: (v) => {
      const r = v["Annual Rate %"] / 100 / 12;
      let bal = v["Balance"], months = 0;
      if (bal <= 0) return "No balance to pay off";
      if (v["Monthly Payment"] <= bal * r) return "Payment too low to ever pay off";
      while (bal > 0 && months < 1200) {
        bal += bal * r;
        bal -= v["Monthly Payment"];
        months++;
      }
      return "".concat(months, " months to pay off");
    } },
    "Auto Loan": { fields: ["Loan Amount", "Annual Rate %", "Term (months)"], compute: (v) => {
      const n = v["Term (months)"];
      if (!n) return "Enter the loan term";
      return fmt(pmt(v["Loan Amount"], v["Annual Rate %"] / 100 / 12, n)) + " / month";
    } }
  };
  var CALCS = ["Normal", ...Object.keys(CALC_DEFS)];

  // src/widgets/calculator.js
  var tab2 = "Normal";
  var expr = "";
  function normal() {
    const wrap = el("div");
    const display = el("div", "calc-display", "0");
    wrap.appendChild(display);
    const keys = [
      { k: "7" },
      { k: "8" },
      { k: "9" },
      { k: "/", l: "\xF7" },
      { k: "4" },
      { k: "5" },
      { k: "6" },
      { k: "*", l: "\xD7" },
      { k: "1" },
      { k: "2" },
      { k: "3" },
      { k: "-", l: "\u2212" },
      { k: "0" },
      { k: "." },
      { k: "=" },
      { k: "+" },
      { k: "C", cls: "key-clear" },
      { k: "BACK", cls: "key-back", icon: "arrow_back" }
    ];
    const pad = el("div", "keypad");
    const show = () => {
      display.textContent = (expr || "0").replace(/\*/g, "\xD7").replace(/\//g, "\xF7").replace(/(\d)-/g, "$1\u2212");
    };
    keys.forEach((key) => {
      const b = el("button", key.cls || "");
      if (key.icon) {
        b.innerHTML = '<span class="material-icons-outlined">'.concat(key.icon, "</span>");
        b.setAttribute("aria-label", "Backspace");
      } else b.textContent = key.l || key.k;
      b.addEventListener("click", () => {
        const k = key.k;
        if (expr === "Error") expr = "";
        if (k === "C") expr = "";
        else if (k === "BACK") expr = expr.slice(0, -1);
        else if (k === "=") {
          try {
            expr = String(safeEval(expr || "0"));
          } catch (e) {
            expr = "Error";
          }
        } else expr += k;
        show();
      });
      pad.appendChild(b);
    });
    wrap.appendChild(pad);
    show();
    return wrap;
  }
  function fields(def) {
    const wrap = el("div"), inputs = {};
    def.fields.forEach((f) => {
      const i = el("input");
      i.type = "text";
      i.placeholder = f;
      inputs[f] = i;
      wrap.appendChild(i);
    });
    const result = el("div", "calc-result", "Result: \u2014");
    const btn = el("button", "btn", "Calculate");
    btn.style.cssText = "width:100%;margin-top:6px";
    btn.addEventListener("click", () => {
      const v = {};
      def.fields.forEach((f) => v[f] = parseFloat(inputs[f].value) || 0);
      result.textContent = "Result: " + def.compute(v);
    });
    wrap.appendChild(btn);
    wrap.appendChild(result);
    return wrap;
  }
  function renderCalculator() {
    const box = el("div");
    const sel = el("select", "calc-select");
    sel.innerHTML = CALCS.map((c) => '<option value="'.concat(c, '" ').concat(c === tab2 ? "selected" : "", ">").concat(c, "</option>")).join("");
    sel.addEventListener("change", () => {
      tab2 = sel.value;
      bus.refreshWidget("Calculator");
    });
    box.appendChild(sel);
    box.appendChild(tab2 === "Normal" ? normal() : fields(CALC_DEFS[tab2]));
    return box;
  }

  // src/widgets/calendar.js
  var cursor = null;
  var fmtDate = (iso) => (/* @__PURE__ */ new Date(iso + "T00:00:00")).toLocaleDateString(void 0, { month: "short", day: "numeric" });
  function renderCalendar() {
    const box = el("div");
    const now = cursor || (cursor = /* @__PURE__ */ new Date());
    const y = now.getFullYear(), m = now.getMonth();
    const header = el("div", "cal-header");
    header.innerHTML = '<button class="btn secondary" data-n="-1" aria-label="Previous month">\u2039</button><strong>'.concat(esc(now.toLocaleString(void 0, { month: "long", year: "numeric" })), '</strong><button class="btn secondary" data-n="1" aria-label="Next month">\u203A</button>');
    header.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      cursor = new Date(y, m + Number(b.dataset.n), 1);
      bus.refreshWidget("Calendar");
    }));
    box.appendChild(header);
    const grid = el("div", "cal-grid");
    ["S", "M", "T", "W", "T", "F", "S"].forEach((d) => grid.appendChild(el("div", "dow", d)));
    const startDow = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), today = todayISO();
    const acc = STATE.activeAccountId;
    for (let i = 0; i < startDow; i++) grid.appendChild(el("div"));
    for (let d = 1; d <= dim; d++) {
      const iso = "".concat(y, "-").concat(String(m + 1).padStart(2, "0"), "-").concat(String(d).padStart(2, "0"));
      const cell = el("div", "cal-day" + (iso === today ? " today" : ""), String(d));
      const rem = STATE.reminders.find((r) => iso >= r.start && iso <= (r.end || r.start));
      const noted2 = STATE.transactions.some((t) => t.date === iso && t.note && t.note.trim() && (acc === "overall" || t.accountId === acc));
      if (rem || noted2) {
        const dots = el("span");
        dots.style.cssText = "position:absolute;bottom:2px;left:50%;transform:translateX(-50%);display:flex;gap:2px;";
        if (rem) {
          const a = el("span");
          a.style.cssText = "width:5px;height:5px;border-radius:50%;background:".concat(safeColor(rem.color), ";");
          dots.appendChild(a);
        }
        if (noted2) {
          const b = el("span");
          b.style.cssText = "width:5px;height:5px;border-radius:50%;background:var(--text-dim);";
          dots.appendChild(b);
        }
        cell.appendChild(dots);
      }
      grid.appendChild(cell);
    }
    box.appendChild(grid);
    const add = el("button", "btn", "+ Add Reminder");
    add.style.cssText = "width:100%;margin:10px 0 6px";
    add.addEventListener("click", async () => {
      const res = await openModal({ title: "New Reminder", fields: [
        { key: "title", label: "Title", type: "text", placeholder: "e.g. Pay rent" },
        { key: "note", label: "Note (optional)", type: "text" },
        { key: "start", label: "Date", type: "date", default: today },
        { key: "end", label: "End date (optional, for a range)", type: "date", default: today },
        { key: "color", label: "Color", type: "color", default: "#3b6df0" }
      ], confirmText: "Add Reminder" });
      if (!res || !res.title.trim()) return;
      const start = res.start || today;
      STATE.reminders.push({ id: uid(), title: res.title.trim(), note: res.note || "", start, end: res.end && res.end >= start ? res.end : start, color: safeColor(res.color) });
      commit();
    });
    box.appendChild(add);
    const remBox = el("div", "box");
    remBox.style.marginTop = "4px";
    remBox.appendChild(el("div", "section-title", "Reminders"));
    const list = el("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:10px;max-height:220px;overflow-y:auto";
    const sorted = STATE.reminders.slice().sort((a, b) => a.start.localeCompare(b.start));
    if (!sorted.length) list.appendChild(el("div", "tx-empty", "No reminders yet \u2014 tap + Add Reminder."));
    sorted.forEach((r) => {
      const isToday = today >= r.start && today <= (r.end || r.start), rc = safeColor(r.color);
      const item = el("div");
      item.style.cssText = "display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid var(--border);border-radius:var(--radius);" + (isToday ? "border-color:var(--accent-1);" : "");
      const dot = el("span");
      dot.style.cssText = "width:16px;height:16px;border-radius:50%;background:".concat(rc, ";margin-top:4px;flex-shrink:0;box-shadow:0 0 0 3px ").concat(rc, "22");
      const label = !r.end || r.end === r.start ? fmtDate(r.start) : "".concat(fmtDate(r.start), " \u2013 ").concat(fmtDate(r.end));
      const info = el("div");
      info.style.cssText = "flex:1;min-width:0";
      info.innerHTML = '<div style="font-size:16px;font-weight:700;line-height:1.3">'.concat(esc(r.title), "</div>").concat(r.note ? '<div class="muted" style="font-size:13px;margin-top:3px">'.concat(esc(r.note), "</div>") : "", '\n      <div style="font-size:12px;margin-top:5px;color:var(--text-dim)">').concat(esc(label)).concat(isToday ? ' \xB7 <span style="color:var(--accent-1);font-weight:700">Today</span>' : "", "</div>");
      const del = el("button", "widget-close", "\u2715");
      del.title = "Delete reminder";
      del.setAttribute("aria-label", "Delete reminder");
      del.style.fontSize = "16px";
      del.addEventListener("click", () => confirmToast('Delete "'.concat(r.title, '"?'), () => {
        STATE.reminders = STATE.reminders.filter((x) => x.id !== r.id);
        commit();
      }));
      item.appendChild(dot);
      item.appendChild(info);
      item.appendChild(del);
      list.appendChild(item);
    });
    remBox.appendChild(list);
    box.appendChild(remBox);
    const nb = el("div", "box");
    nb.style.marginTop = "4px";
    nb.appendChild(el("div", "section-title", "Transaction Notes"));
    const nl = el("div");
    nl.style.cssText = "display:flex;flex-direction:column;gap:10px;max-height:220px;overflow-y:auto";
    const noted = STATE.transactions.filter((t) => t.note && t.note.trim() && (acc === "overall" || t.accountId === acc)).slice(0, 40);
    if (!noted.length) nl.appendChild(el("div", "tx-empty", "No transaction notes yet."));
    noted.forEach((t) => {
      const idx = STATE.categories[t.page] ? STATE.categories[t.page].indexOf(t.category) : -1;
      const color = CAT_COLORS[(idx >= 0 ? idx : 0) % CAT_COLORS.length];
      const item = el("div");
      item.style.cssText = "display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid var(--border);border-radius:var(--radius);";
      const dot = el("span");
      dot.style.cssText = "width:16px;height:16px;border-radius:50%;background:".concat(color, ";margin-top:4px;flex-shrink:0;");
      const info = el("div");
      info.style.cssText = "flex:1;min-width:0";
      info.innerHTML = '<div style="font-size:15px;font-weight:700;line-height:1.3">'.concat(esc(t.category), ' <span class="muted" style="font-weight:400">\xB7 ').concat(esc(t.page), '</span></div><div style="font-size:13px;margin-top:3px">').concat(esc(t.note), '</div><div style="font-size:12px;margin-top:5px;color:var(--text-dim)">').concat(esc(fmtDate(t.date)), " \xB7 ").concat(esc(fmt(t.amount)), "</div>");
      item.appendChild(dot);
      item.appendChild(info);
      nl.appendChild(item);
    });
    nb.appendChild(nl);
    box.appendChild(nb);
    return box;
  }

  // src/config.js
  var C = typeof window !== "undefined" && window.FINSTA_CONFIG || {};
  var SUPABASE_URL = C.SUPABASE_URL || "https://weqcpxmqzqztztkticgk.supabase.co";
  var SUPABASE_ANON_KEY = C.SUPABASE_ANON_KEY || "sb_publishable_Wgvv3mS-q8UnwOR2tL1UNg_4Uf5gsxj";

  // src/auth.js
  var enabled = SUPABASE_URL.startsWith("http") && !!SUPABASE_ANON_KEY;
  var isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var REDIRECT = () => isNative() ? "com.finsta.app://auth-callback" : window.location.origin + window.location.pathname;
  var $ = (id) => document.getElementById(id);
  var client = null;
  var timer = null;
  var cloudReady = false;
  var auth = {
    enabled,
    user: null,
    showOverlay(msg) {
      const o = $("auth-overlay");
      if (!o) return;
      o.classList.remove("hidden");
      if (msg) $("auth-status").textContent = msg;
    },
    hideOverlay() {
      const o = $("auth-overlay");
      if (o) o.classList.add("hidden");
    },
    async signOut() {
      if (!client) return;
      const ok = await openConfirm("Signing out clears the data cached on this device. Your account data stays safe in the cloud. Export a backup first if you're unsure.", { title: "Sign out?", confirmText: "Sign out" });
      if (!ok) return;
      await client.auth.signOut();
      auth.user = null;
      localStorage.removeItem("finsta_guest");
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    },
    init
  };
  async function signIn() {
    if (!client) return;
    const native = isNative();
    $("auth-status").textContent = "Opening Google sign-in\u2026";
    const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: REDIRECT(), skipBrowserRedirect: native } });
    if (error) {
      $("auth-status").textContent = "Sign-in failed: " + error.message;
      return;
    }
    if (native && data && data.url && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) window.Capacitor.Plugins.Browser.open({ url: data.url });
  }
  function deepLink(url) {
    try {
      const i = url.indexOf("#");
      if (i === -1) return;
      const p = new URLSearchParams(url.substring(i + 1));
      if (p.get("access_token") && p.get("refresh_token") && client) client.auth.setSession({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token") });
    } catch (e) {
      console.warn("deep link parse failed", e);
    }
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) window.Capacitor.Plugins.Browser.close().catch(() => {
    });
  }
  var K = { base: "finsta_cloud_base", local: "finsta_local_at", off: "finsta_sync_off", bak: "finsta_replaced_backup" };
  var lget = (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  var lset = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
    }
  };
  var num = (k) => Number(lget(k)) || 0;
  var ms = (iso) => Date.parse(iso) || 0;
  var autoSync = () => lget(K.off) !== "1";
  var cloudAt = num(K.base);
  var applying = false;
  var pulling = false;
  var running = false;
  var again = false;
  var sync = auth.sync = { status: "idle", at: null, error: "" };
  var setSync = (status, error) => {
    sync.status = status;
    sync.error = error || "";
    if (status === "ok") sync.at = /* @__PURE__ */ new Date();
    if (bus.refreshWidget) bus.refreshWidget("Settings");
  };
  auth.autoSync = autoSync;
  auth.hasBackup = () => !!lget(K.bak);
  auth.restoreBackup = () => {
    try {
      const b = JSON.parse(lget(K.bak));
      if (!b || !b.data) return false;
      setState(b.data);
      lset(K.local, String(Date.now()));
      localStorage.removeItem(K.bak);
      save();
      bus.render();
      bus.refreshWidgets();
      return true;
    } catch (e) {
      return false;
    }
  };
  var backup = (from, data) => {
    try {
      lset(K.bak, JSON.stringify({ at: (/* @__PURE__ */ new Date()).toISOString(), from, data }));
    } catch (e) {
    }
  };
  async function fetchCloud() {
    const { data, error } = await client.from("finsta_state").select("data, updated_at").eq("user_id", auth.user.id).maybeSingle();
    return { row: data, error };
  }
  async function upload() {
    const at = /* @__PURE__ */ new Date();
    const { error } = await client.from("finsta_state").upsert({ user_id: auth.user.id, data: STATE, updated_at: at.toISOString() });
    if (error) return error;
    let t = at.getTime();
    try {
      const r = await client.from("finsta_state").select("updated_at").eq("user_id", auth.user.id).maybeSingle();
      if (r.data && r.data.updated_at) t = ms(r.data.updated_at);
    } catch (e) {
    }
    cloudAt = t;
    lset(K.base, String(t));
    return null;
  }
  function adopt(row) {
    applying = true;
    try {
      setState(row.data);
      applyAutoInterestRules();
      ensureCreditReminders();
      processRecurring();
      save();
    } finally {
      applying = false;
    }
    cloudAt = ms(row.updated_at);
    lset(K.base, String(cloudAt));
    bus.render();
    bus.refreshWidgets();
  }
  function reconcile(row) {
    const rowT = ms(row.updated_at), localT = num(K.local);
    const cloudChanged = !cloudAt || Math.abs(rowT - cloudAt) > 1;
    if (!cloudChanged) return localT > cloudAt;
    if (localT > rowT) {
      backup("cloud", row.data);
      return true;
    }
    if (localT > cloudAt) backup("device", STATE);
    adopt(row);
    return false;
  }
  async function cycle() {
    const { row, error } = await fetchCloud();
    if (error) throw error;
    if (!row || !row.data) {
      const e = await upload();
      if (e) throw e;
      return;
    }
    if (reconcile(row)) {
      const e = await upload();
      if (e) throw e;
    }
  }
  async function loadCloud() {
    cloudReady = false;
    if (!autoSync()) {
      setSync("off");
      return;
    }
    setSync("syncing");
    try {
      const { row, error } = await fetchCloud();
      if (error) throw error;
      const hasLocal = STATE.transactions.length > 0 || STATE.loans.length > 0 || STATE.credits.length > 0;
      if (row && row.data && hasLocal && lget("finsta_guest") && !cloudAt) {
        const res = await openModal({
          title: "Data found on this device and in your account",
          message: "Which one should we keep? The other one is replaced (a copy is kept in Settings for restoring).",
          fields: [{ key: "choice", type: "select", default: "local", options: [{ value: "local", label: "Keep this device's data" }, { value: "cloud", label: "Use my account data" }] }],
          confirmText: "Continue"
        });
        if (!res) {
          setSync("off");
          return;
        }
        if (res.choice === "local") {
          backup("cloud", row.data);
          const e = await upload();
          if (e) throw e;
        } else {
          backup("device", STATE);
          adopt(row);
        }
      } else if (!row || !row.data) {
        const e = await upload();
        if (e) throw e;
      } else if (reconcile(row)) {
        const e = await upload();
        if (e) throw e;
      }
      localStorage.removeItem("finsta_guest");
      cloudReady = true;
      setSync("ok");
      applyAutoInterestRules();
      ensureCreditReminders();
      processRecurring();
      save();
      bus.render();
      bus.refreshWidgets();
    } catch (e) {
      console.warn("cloud load failed", e);
      setSync("error", e.message || String(e));
    }
  }
  function push() {
    if (!enabled || !auth.user || !cloudReady || applying || !autoSync()) return;
    clearTimeout(timer);
    setSync("syncing");
    timer = setTimeout(runCycle, 700);
  }
  async function runCycle() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      const { data: cur, error: e0 } = await client.from("finsta_state").select("updated_at").eq("user_id", auth.user.id).maybeSingle();
      if (e0) throw e0;
      if (cur && cur.updated_at && Math.abs(ms(cur.updated_at) - cloudAt) <= 1) {
        const e = await upload();
        if (e) throw e;
      } else await cycle();
      setSync("ok");
    } catch (e) {
      console.warn("cloud sync failed", e);
      setSync("error", e.message || String(e));
    } finally {
      running = false;
      if (again) {
        again = false;
        runCycle();
      }
    }
  }
  async function pull() {
    if (!enabled || !auth.user || !cloudReady || !autoSync() || pulling || running) return;
    pulling = true;
    try {
      const { row, error } = await fetchCloud();
      if (error || !row || !row.data) return;
      if (!cloudAt || Math.abs(ms(row.updated_at) - cloudAt) > 1) {
        if (reconcile(row)) {
          const e = await upload();
          if (e) throw e;
        }
        setSync("ok");
      }
    } catch (e) {
      setSync("error", e.message || String(e));
    } finally {
      pulling = false;
    }
  }
  auth.syncNow = async () => {
    if (!enabled || !auth.user) {
      toast("Sign in to sync.");
      return;
    }
    if (!autoSync()) {
      toast("Sync is switched off. Switch it on first.");
      return;
    }
    clearTimeout(timer);
    timer = null;
    setSync("syncing");
    if (!cloudReady) {
      await loadCloud();
      if (cloudReady) toast("Synced.");
      return;
    }
    try {
      await cycle();
      setSync("ok");
      toast("Synced.");
    } catch (e) {
      setSync("error", e.message || String(e));
      toast("Sync failed: " + (e.message || "network error"));
    }
  };
  auth.setAutoSync = async (on) => {
    lset(K.off, on ? "0" : "1");
    if (!on) {
      clearTimeout(timer);
      setSync("off");
      return;
    }
    if (auth.user) {
      cloudReady = false;
      await loadCloud();
    }
  };
  function gotUser(u) {
    if (auth.user && auth.user.id === u.id) return;
    auth.user = u;
    auth.hideOverlay();
    loadCloud();
  }
  function init() {
    onSave(() => {
      if (!applying) lset(K.local, String(Date.now()));
      push();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") pull();
    });
    window.addEventListener("focus", pull);
    window.addEventListener("online", pull);
    if (!enabled) {
      auth.hideOverlay();
      return;
    }
    if (window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!client) {
      auth.hideOverlay();
      return;
    }
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) window.Capacitor.Plugins.App.addListener("appUrlOpen", (d) => deepLink(d.url));
    client.auth.onAuthStateChange((_e, s) => {
      if (s && s.user) gotUser(s.user);
      else auth.user = null;
    });
    client.auth.getSession().then(({ data }) => {
      if (data && data.session && data.session.user) gotUser(data.session.user);
      else if (localStorage.getItem("finsta_guest") === "true") auth.hideOverlay();
      else auth.showOverlay();
    });
    $("auth-google-signin-btn").addEventListener("click", signIn);
    $("auth-google-signup-btn").addEventListener("click", signIn);
    $("auth-guest-btn").addEventListener("click", () => {
      localStorage.setItem("finsta_guest", "true");
      auth.hideOverlay();
    });
  }

  // src/csv.js
  function csvCell(v) {
    if (typeof v === "number") return String(v);
    let s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function buildCSV(state) {
    const names = {};
    state.accounts.forEach((a) => names[a.id] = a.name);
    const rows = [["Date", "Account", "Page", "Category", "Amount", "Note", "Detail"]];
    state.transactions.slice().reverse().forEach((t) => rows.push([t.date, names[t.accountId] || "", t.page, t.category, t.amount, t.note, t.meta]));
    return rows.map((r) => r.map(csvCell).join(",")).join("\n");
  }

  // src/widgets/settings.js
  var THEMES = [
    { id: "simplistic-light", name: "Simplistic Light", swatch: "#ffffff" },
    { id: "robotic-dark", name: "Robotic Dark", swatch: "#05070a" },
    { id: "cutesy-pink", name: "Cutesy Pink", swatch: "#ffe6f0" },
    { id: "paper-notes", name: "Paper Notes", swatch: "#efefef" }
  ];
  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        if (!p || !Array.isArray(p.accounts) || !Array.isArray(p.transactions) || typeof p.balances !== "object" || !p.categories) throw new Error("Not a FinSta backup");
        confirmToast("Replace ALL current data with this backup?", () => {
          setState(p);
          commit();
          toast("Backup restored.");
        });
      } catch (e) {
        toast("Import failed: " + e.message);
      }
    };
    reader.readAsText(file);
  }
  function renderSettings() {
    const box = el("div");
    box.style.maxWidth = "480px";
    if (!auth.enabled) {
      const off = el("div", "account-badge");
      off.innerHTML = '<span><span class="material-icons-outlined" style="vertical-align:middle;font-size:16px">cloud_off</span> Cloud sync is OFF in this build<br><small class="muted">Supabase isn\'t set up here, so data stays on this device only. Put your URL and anon key in src/config.js and rebuild.</small></span>';
      box.appendChild(off);
    }
    if (auth.enabled) {
      const acct = el("div", "account-badge");
      if (auth.user) {
        const st = auth.sync || { status: "idle" };
        const on = auth.autoSync();
        const stTxt = !on ? "Sync is off. Changes stay on this device." : st.status === "error" ? "Sync problem: " + esc(st.error) : st.status === "syncing" ? "Syncing\u2026" : st.at ? "Last synced " + st.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not synced yet";
        acct.innerHTML = '<span><span class="material-icons-outlined" style="vertical-align:middle;font-size:16px">'.concat(!on || st.status === "error" ? "cloud_off" : "cloud_done", "</span> ").concat(esc(auth.user.email || "Google account"), '<br><small class="muted">').concat(stTxt, "</small></span>");
        const tg = el("button", "btn secondary", on ? "Don't sync" : "Sync");
        tg.id = "sync-toggle";
        tg.style.cssText = "padding:4px 10px;font-size:11px";
        tg.addEventListener("click", async () => {
          await auth.setAutoSync(!on);
          bus.refreshWidget("Settings");
        });
        acct.appendChild(tg);
        if (on) {
          const sn = el("button", "btn secondary", "Sync now");
          sn.style.cssText = "padding:4px 10px;font-size:11px";
          sn.addEventListener("click", () => auth.syncNow());
          acct.appendChild(sn);
        }
        if (auth.hasBackup()) {
          const rb = el("button", "btn secondary", "Restore the copy replaced by sync");
          rb.style.cssText = "padding:4px 10px;font-size:11px";
          rb.addEventListener("click", () => confirmToast("Replace the current data with the copy that sync replaced?", () => {
            auth.restoreBackup();
            toast("Restored. Turn sync off first if you don't want it uploaded.");
            bus.refreshWidget("Settings");
          }));
          acct.appendChild(rb);
        }
        const b = el("button", "btn secondary", "Sign out");
        b.style.cssText = "padding:4px 10px;font-size:11px";
        b.addEventListener("click", () => auth.signOut());
        acct.appendChild(b);
      } else {
        acct.innerHTML = '<span><span class="material-icons-outlined" style="vertical-align:middle;font-size:16px">cloud_off</span> Guest mode \u2014 data stays on this device</span>';
        const b = el("button", "btn secondary", "Sign in");
        b.style.cssText = "padding:4px 10px;font-size:11px";
        b.addEventListener("click", () => auth.showOverlay());
        acct.appendChild(b);
      }
      box.appendChild(acct);
    }
    box.appendChild(el("div", "section-title", "Username"));
    const u = el("input");
    u.type = "text";
    u.id = "set-username";
    u.value = STATE.settings.username;
    box.appendChild(u);
    box.appendChild(el("div", "section-title", "Currency"));
    const c = el("select");
    c.id = "set-currency";
    c.innerHTML = ["PHP", "USD", "EUR", "JPY", "GBP"].map((x) => "<option ".concat(STATE.settings.currency === x ? "selected" : "", ">").concat(x, "</option>")).join("");
    box.appendChild(c);
    const note = el("div", "muted", "Changing currency only changes the symbol shown. Amounts are not converted.");
    note.style.marginBottom = "10px";
    box.appendChild(note);
    const th = el("div", "section-title", "Theme");
    th.style.marginTop = "12px";
    box.appendChild(th);
    const grid = el("div", "theme-grid");
    THEMES.forEach((t) => {
      const card2 = el("div", "theme-preview" + (STATE.settings.theme === t.id ? " active" : ""));
      card2.innerHTML = '<div class="theme-swatch" style="background:'.concat(t.swatch, ';border:1px solid #0002"></div>').concat(esc(t.name));
      card2.addEventListener("click", () => {
        STATE.settings.theme = t.id;
        commit();
        bus.refreshWidget("Settings");
      });
      grid.appendChild(card2);
    });
    box.appendChild(grid);
    const bh = el("div", "section-title", "Backup");
    bh.style.marginTop = "14px";
    box.appendChild(bh);
    const row = el("div", "backup-row");
    const eb = el("button", "btn secondary", "Export JSON"), cb = el("button", "btn secondary", "Export CSV");
    eb.addEventListener("click", () => {
      downloadText("finsta-backup-".concat(todayISO(), ".json"), JSON.stringify(STATE, null, 2), "application/json");
      toast("Backup downloaded.");
    });
    cb.addEventListener("click", () => {
      downloadText("finsta-transactions-".concat(todayISO(), ".csv"), buildCSV(STATE), "text/csv");
      toast("CSV downloaded.");
    });
    row.appendChild(eb);
    row.appendChild(cb);
    box.appendChild(row);
    const ib = el("button", "btn secondary", "Import backup (JSON)");
    ib.style.cssText = "width:100%;padding:8px 10px;font-size:12px";
    const f = el("input");
    f.type = "file";
    f.accept = "application/json,.json";
    f.style.display = "none";
    f.addEventListener("change", () => {
      if (f.files && f.files[0]) importBackup(f.files[0]);
      f.value = "";
    });
    ib.addEventListener("click", () => f.click());
    box.appendChild(ib);
    box.appendChild(f);
    u.addEventListener("change", (e) => {
      STATE.settings.username = e.target.value;
      save();
    });
    c.addEventListener("change", (e) => {
      STATE.settings.currency = e.target.value;
      commit();
    });
    return box;
  }

  // src/widgets/manager.js
  var WIDGET_DEFS = {
    Accounts: { icon: "badge", w: 300, h: 340, data: true, render: renderAccounts },
    Budget: { icon: "track_changes", w: 300, h: 380, data: true, render: renderBudget },
    Calculator: { icon: "calculate", w: 280, h: 420, data: false, render: renderCalculator },
    Calendar: { icon: "calendar_month", w: 300, h: 400, data: true, render: renderCalendar },
    Settings: { icon: "settings", w: 300, h: 420, data: false, render: renderSettings }
  };
  var PHONE_MAX = 600;
  var isPhone = () => window.innerWidth <= PHONE_MAX;
  var z = 100;
  var zOf = {};
  var nodes = {};
  var mode = null;
  var front = (name) => zOf[name] = ++z;
  function widgetState(name) {
    if (!STATE.widgets[name]) {
      const d = WIDGET_DEFS[name], i = Object.keys(WIDGET_DEFS).indexOf(name);
      STATE.widgets[name] = { open: false, edge: null, x: 40 + i * 20, y: 90 + i * 14, w: d.w, h: d.h };
    }
    return STATE.widgets[name];
  }
  function openWidget(name) {
    const ws = widgetState(name);
    if (isPhone()) Object.keys(WIDGET_DEFS).forEach((n) => {
      if (n !== name) widgetState(n).open = false;
    });
    ws.open = true;
    ws.edge = null;
    front(name);
    save();
    const dock = document.getElementById("widget-dock");
    if (dock) dock.classList.add("hidden");
    renderWidgets();
    renderEdgeDocks();
  }
  function closeWidget(name) {
    widgetState(name).open = false;
    save();
    renderWidgets();
    renderEdgeDocks();
  }
  function dockToEdge(name, edge) {
    const ws = widgetState(name);
    ws.open = false;
    ws.edge = edge;
    save();
    renderWidgets();
    renderEdgeDocks();
  }
  function fillBody(name) {
    const n = nodes[name];
    if (!n) return;
    const top = n.body.scrollTop;
    n.body.innerHTML = "";
    n.body.appendChild(WIDGET_DEFS[name].render());
    n.body.scrollTop = top;
  }
  function refreshWidget(name) {
    fillBody(name);
  }
  function refreshDataWidgets() {
    Object.keys(nodes).forEach((n) => {
      if (WIDGET_DEFS[n].data) fillBody(n);
    });
  }
  function build(name) {
    const def = WIDGET_DEFS[name], ws = widgetState(name), phone = isPhone();
    const node = el("div", "widget" + (phone ? " sheet" : ""));
    node.dataset.widget = name;
    if (!phone) {
      ws.x = Math.min(Math.max(0, ws.x), Math.max(0, window.innerWidth - 80));
      ws.y = Math.min(Math.max(64, ws.y), Math.max(64, window.innerHeight - 80));
      node.style.transform = "translate(".concat(ws.x, "px, ").concat(ws.y, "px)");
      node.style.width = Math.min(ws.w, window.innerWidth - 8) + "px";
      node.style.height = ws.h + "px";
      node.style.zIndex = zOf[name] || front(name);
      node.addEventListener("pointerdown", () => {
        node.style.zIndex = front(name);
      }, true);
    }
    const bar = el("div", "widget-titlebar");
    bar.innerHTML = '<span><span class="material-icons-outlined" style="vertical-align:middle;font-size:16px">'.concat(def.icon, "</span> ").concat(name, "</span>");
    const close = el("button", "widget-close", "\u2715");
    close.setAttribute("aria-label", "Close " + name);
    close.addEventListener("click", () => closeWidget(name));
    bar.appendChild(close);
    node.appendChild(bar);
    const body = el("div", "widget-body");
    node.appendChild(body);
    nodes[name] = { node, body };
    fillBody(name);
    if (!phone) {
      const handle = el("div", "widget-resize-handle", '<span class="material-icons-outlined" style="font-size:16px">open_in_full</span>');
      node.appendChild(handle);
      makeDraggable(node, bar, name);
      makeResizable(node, handle, name);
    }
    return node;
  }
  function closeSheetsOnLaunch() {
    if (!isPhone()) return;
    let changed = false;
    Object.keys(WIDGET_DEFS).forEach((n) => {
      const ws = widgetState(n);
      if (ws.open) {
        ws.open = false;
        changed = true;
      }
    });
    if (changed) save();
  }
  function closeAllWidgets() {
    let changed = false;
    Object.keys(WIDGET_DEFS).forEach((n) => {
      const ws = widgetState(n);
      if (ws.open) {
        ws.open = false;
        changed = true;
      }
    });
    if (changed) {
      save();
      renderWidgets();
    }
  }
  function enforceSingleSheet() {
    const open = Object.keys(WIDGET_DEFS).filter((n) => widgetState(n).open);
    if (open.length <= 1) return;
    const keep = open.reduce((a, b) => (zOf[b] || 0) >= (zOf[a] || 0) ? b : a);
    open.forEach((n) => {
      if (n !== keep) widgetState(n).open = false;
    });
    save();
  }
  function renderWidgets() {
    const layer = document.getElementById("widgets-layer");
    const nowMode = isPhone() ? "phone" : "desktop";
    if (mode !== nowMode) {
      Object.keys(nodes).forEach((n) => {
        nodes[n].node.remove();
        delete nodes[n];
      });
      layer.innerHTML = "";
      mode = nowMode;
    }
    if (nowMode === "phone") enforceSingleSheet();
    Object.keys(WIDGET_DEFS).forEach((name) => {
      const open = widgetState(name).open;
      if (open && !nodes[name]) layer.appendChild(build(name));
      else if (!open && nodes[name]) {
        nodes[name].node.remove();
        delete nodes[name];
      }
    });
    let bd = layer.querySelector(".sheet-backdrop");
    const anySheet = nowMode === "phone" && Object.keys(nodes).length > 0;
    if (anySheet && !bd) {
      bd = el("div", "sheet-backdrop");
      bd.addEventListener("click", () => Object.keys(nodes).forEach((n) => closeWidget(n)));
      layer.insertBefore(bd, layer.firstChild);
    } else if (!anySheet && bd) bd.remove();
    document.body.classList.toggle("sheet-open", anySheet);
  }
  function renderEdgeDocks() {
    const left = document.getElementById("edge-dock-left"), right = document.getElementById("edge-dock-right");
    left.innerHTML = "";
    right.innerHTML = "";
    Object.keys(WIDGET_DEFS).forEach((name) => {
      const ws = widgetState(name);
      if (!ws.edge) return;
      const btn = el("button", "edge-icon", '<span class="material-icons-outlined">'.concat(WIDGET_DEFS[name].icon, "</span>"));
      btn.title = "Reopen " + name;
      btn.setAttribute("aria-label", btn.title);
      btn.addEventListener("click", () => openWidget(name));
      (ws.edge === "left" ? left : right).appendChild(btn);
    });
  }
  function makeDraggable(node, handle, name) {
    let sx, sy, ox, oy, dragging = false, moved = false, raf = null, cx = 0, cy = 0;
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true;
      moved = false;
      sx = e.clientX;
      sy = e.clientY;
      const ws = widgetState(name);
      ox = ws.x;
      oy = ws.y;
      cx = ox;
      cy = oy;
      if (handle.setPointerCapture) try {
        handle.setPointerCapture(e.pointerId);
      } catch (_) {
      }
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - sx) > 3 || Math.abs(e.clientY - sy) > 3) moved = true;
      cx = ox + (e.clientX - sx);
      cy = Math.max(64, oy + (e.clientY - sy));
      if (raf === null) raf = requestAnimationFrame(() => {
        node.style.transform = "translate(".concat(cx, "px, ").concat(cy, "px)");
        raf = null;
      });
    });
    handle.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (!moved) return;
      const ws = widgetState(name);
      ws.x = cx;
      ws.y = cy;
      node.style.transform = "translate(".concat(ws.x, "px, ").concat(ws.y, "px)");
      if (ws.x < 24) dockToEdge(name, "left");
      else if (ws.x + ws.w > window.innerWidth - 24) dockToEdge(name, "right");
      else save();
    });
  }
  function makeResizable(node, handle, name) {
    let sx, sy, ow, oh, on = false, raf = null, cw = 0, ch = 0;
    handle.addEventListener("pointerdown", (e) => {
      on = true;
      sx = e.clientX;
      sy = e.clientY;
      const ws = widgetState(name);
      ow = ws.w;
      oh = ws.h;
      cw = ow;
      ch = oh;
      e.stopPropagation();
      if (handle.setPointerCapture) try {
        handle.setPointerCapture(e.pointerId);
      } catch (_) {
      }
    });
    handle.addEventListener("pointermove", (e) => {
      if (!on) return;
      cw = Math.max(220, ow + (e.clientX - sx));
      ch = Math.max(180, oh + (e.clientY - sy));
      if (raf === null) raf = requestAnimationFrame(() => {
        node.style.width = cw + "px";
        node.style.height = ch + "px";
        raf = null;
      });
      e.stopPropagation();
    });
    handle.addEventListener("pointerup", (e) => {
      if (on) {
        on = false;
        if (raf !== null) {
          cancelAnimationFrame(raf);
          raf = null;
        }
        const ws = widgetState(name);
        ws.w = cw;
        ws.h = ch;
        node.style.width = cw + "px";
        node.style.height = ch + "px";
        save();
      }
      e.stopPropagation();
    });
  }
  bus.refreshWidgets = refreshDataWidgets;
  bus.refreshWidget = refreshWidget;

  // src/main.js
  var page = "Home";
  var PAGES2 = { Home: renderHome, Interest: renderInterest, Loan: renderLoan, Credit: renderCredit, Recurring: renderRecurring };
  function render() {
    document.body.className = "theme-" + STATE.settings.theme + (document.body.classList.contains("sheet-open") ? " sheet-open" : "");
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    const root = document.getElementById("page-root");
    const scroll = root.scrollTop;
    root.innerHTML = "";
    try {
      root.appendChild((PAGES2[page] || (() => renderEntry(page)))());
    } catch (e) {
      console.error("render failed", e);
      const box = document.createElement("div");
      box.className = "box";
      box.innerHTML = '<div class="section-title">Something went wrong showing this page</div>';
      const msg = document.createElement("div");
      msg.className = "muted";
      msg.textContent = String(e && e.message || e);
      box.appendChild(msg);
      root.appendChild(box);
    }
    root.scrollTop = scroll;
    window.__finstaBooted = true;
    renderEdgeDocks();
  }
  bus.render = render;
  bus.navigate = (p) => {
    page = p;
    render();
  };
  function boot() {
    document.querySelectorAll(".nav-item").forEach((b) => b.addEventListener("click", () => {
      if (isPhone()) closeAllWidgets();
      page = b.dataset.page;
      render();
    }));
    const dock = document.getElementById("widget-dock"), toggle = document.getElementById("widget-dock-toggle");
    toggle.addEventListener("click", () => dock.classList.toggle("hidden"));
    document.querySelectorAll(".dock-item").forEach((b) => b.addEventListener("click", () => openWidget(b.dataset.widget)));
    document.addEventListener("click", (e) => {
      if (!dock.classList.contains("hidden") && !dock.contains(e.target) && !toggle.contains(e.target)) dock.classList.add("hidden");
    });
    window.addEventListener("resize", () => {
      clearTimeout(boot._t);
      boot._t = setTimeout(renderWidgets, 150);
    });
    let r = { posted: 0, errors: [] };
    try {
      const a = applyAutoInterestRules(), b = ensureCreditReminders();
      r = processRecurring();
      if (a || b || r.posted) save();
    } catch (e) {
      console.error("start-up tasks failed", e);
      r.errors.push("start-up tasks failed: " + (e && e.message || e));
    }
    closeSheetsOnLaunch();
    render();
    try {
      renderWidgets();
      renderEdgeDocks();
    } catch (e) {
      console.error("widgets failed", e);
    }
    try {
      auth.init();
    } catch (e) {
      console.error("auth failed", e);
    }
    if (r.posted) toast("".concat(r.posted, " recurring item").concat(r.posted === 1 ? "" : "s", " posted."));
    else if (r.errors.length) toast("Recurring: " + r.errors[0]);
    else {
      const al = loanCreditAlerts();
      if (al.length) toast(al[0] + (al.length > 1 ? " (+".concat(al.length - 1, " more)") : ""));
    }
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    if (native && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r2) => r2.unregister())).catch(() => {
      });
      if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {
      });
    } else if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController && !reloaded) {
          reloaded = true;
          location.reload();
        }
      });
      navigator.serviceWorker.register("sw.js").catch((e) => console.warn("sw failed", e));
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
