// ========================================
// DUITKITA - SISTEM KEWANGAN KELUARGA
// ========================================
// ========================================
// SAMBUNGAN SUPABASE
// ========================================

const SUPABASE_URL = "https://tlmruulhufautpyuqwbp.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ro2WtWhiCNS3bkxjiSVnOA_RmdP6d3D";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const STORAGE_KEY = "duitkita_v1";

const defaultState = {
  income: {
    husband: 0,
    wife: 0
  },
  commitments: [],
  budgets: {},
  expenses: []
};

let state = loadState();
let receiptData = "";

// ========================================
// ELEMEN HTML
// ========================================

const $ = (id) => document.getElementById(id);

const monthPicker = $("monthPicker");
const incomeForm = $("incomeForm");
const commitmentForm = $("commitmentForm");
const budgetForm = $("budgetForm");
const expenseForm = $("expenseForm");
const receiptInput = $("receiptInput");

// ========================================
// TARIKH DAN WANG
// ========================================

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(amount) {
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR"
  }).format(Number(amount) || 0);
}

function selectedMonth() {
  return monthPicker.value;
}

function expenseBelongsToMonth(expense, month = selectedMonth()) {
  return expense.date.startsWith(month);
}

function monthlyExpenses() {
  return state.expenses.filter(expense =>
    expenseBelongsToMonth(expense)
  );
}

function totalExpenses(expenses = monthlyExpenses()) {
  return expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
}

function totalIncome() {
  return state.income.husband + state.income.wife;
}

function totalCommitments() {
  return state.commitments.reduce(
    (sum, item) => sum + item.amount,
    0
  );
}

function remainingMoney() {
  return totalIncome() - totalCommitments() - totalExpenses();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// ========================================
// SIMPAN DATA PADA PERANTI
// ========================================

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(defaultState);
    }

    const parsed = JSON.parse(saved);

    return {
      income: {
        husband: Math.max(0, Number(parsed.income?.husband) || 0),
        wife: Math.max(0, Number(parsed.income?.wife) || 0)
      },
      commitments: Array.isArray(parsed.commitments)
        ? parsed.commitments
        : [],
      budgets: parsed.budgets &&
        typeof parsed.budgets === "object"
        ? parsed.budgets
        : {},
      expenses: Array.isArray(parsed.expenses)
        ? parsed.expenses
        : []
    };
  } catch (error) {
    console.error("Data tidak dapat dibaca:", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    alert(
      "Data gagal disimpan. Ruang simpanan mungkin penuh. " +
      "Cuba buang beberapa gambar resit atau eksport data dahulu."
    );

    console.error(error);
    return false;
  }
}

// ========================================
// PAPARAN UTAMA
// ========================================

function render() {
  const expenses = monthlyExpenses();
  const income = totalIncome();
  const commitments = totalCommitments();
  const spent = totalExpenses(expenses);
  const balance = income - commitments - spent;

  $("totalIncome").textContent = money(income);
  $("totalCommitments").textContent = money(commitments);
  $("totalExpenses").textContent = money(spent);
  $("balance").textContent = money(balance);

  $("balance").style.color =
    balance < 0 ? "var(--red)" : "var(--text)";

  $("balanceNote").textContent =
    balance < 0
      ? "Perbelanjaan melebihi pendapatan selepas komitmen"
      : "Selepas komitmen dan belanja";

  $("husbandIncome").value = state.income.husband || "";
  $("wifeIncome").value = state.income.wife || "";

  renderCommitments();
  renderBudgets(expenses);
  renderExpenses(expenses);
  renderAlerts(expenses, balance);
}

// ========================================
// PENDAPATAN
// ========================================

incomeForm.addEventListener("submit", event => {
  event.preventDefault();

  const husband = Number($("husbandIncome").value);
  const wife = Number($("wifeIncome").value);

  if (
    !Number.isFinite(husband) ||
    !Number.isFinite(wife) ||
    husband < 0 ||
    wife < 0
  ) {
    alert("Sila masukkan jumlah gaji yang sah.");
    return;
  }

  state.income.husband = husband;
  state.income.wife = wife;

  if (saveState()) {
    render();
    alert("Pendapatan keluarga berjaya disimpan.");
  }
});

// ========================================
// HUTANG DAN KOMITMEN
// ========================================

commitmentForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = $("commitmentName").value.trim();
  const amount = Number($("commitmentAmount").value);

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    alert("Sila isi nama dan jumlah komitmen yang sah.");
    return;
  }

  state.commitments.push({
    id: crypto.randomUUID(),
    name,
    amount
  });

  if (saveState()) {
    commitmentForm.reset();
    render();
  }
});

function renderCommitments() {
  const container = $("commitmentList");

  if (state.commitments.length === 0) {
    container.innerHTML =
      '<div class="empty-state">Belum ada komitmen ditambah.</div>';
    return;
  }

  container.innerHTML = state.commitments.map(item => `
    <div class="list-row">
      <div>
        <div class="item-name">${escapeHTML(item.name)}</div>
        <div class="item-subtitle">Bayaran setiap bulan</div>
      </div>

      <div class="item-right">
        <span class="item-amount">${money(item.amount)}</span>
        <button class="delete-btn"
          data-delete-commitment="${escapeHTML(item.id)}"
          type="button">Padam</button>
      </div>
    </div>
  `).join("");
}

$("commitmentList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-commitment]");

  if (!button) return;

  const id = button.dataset.deleteCommitment;

  if (!confirm("Padam komitmen ini?")) return;

  state.commitments = state.commitments.filter(item =>
    item.id !== id
  );

  if (saveState()) render();
});

// ========================================
// BAJET BULANAN
// ========================================

budgetForm.addEventListener("submit", event => {
  event.preventDefault();

  const category = $("budgetCategory").value;
  const amount = Number($("budgetAmount").value);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Sila masukkan bajet yang lebih besar daripada RM0.");
    return;
  }

  state.budgets[category] = amount;

  if (saveState()) {
    budgetForm.reset();
    render();
  }
});

function categoryExpenses(category, expenses = monthlyExpenses()) {
  return expenses
    .filter(expense => expense.category === category)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

function renderBudgets(expenses) {
  const container = $("budgetList");
  const categories = Object.keys(state.budgets);

  if (categories.length === 0) {
    container.innerHTML =
      '<div class="empty-state">Tetapkan bajet untuk mula memantau belanja.</div>';
    return;
  }

  container.innerHTML = categories.map(category => {
    const budget = Number(state.budgets[category]) || 0;
    const spent = categoryExpenses(category, expenses);
    const percent = budget > 0 ? spent / budget * 100 : 0;

    let statusClass = "";
    let statusText = `${Math.round(percent)}% digunakan`;

    if (percent >= 100) {
      statusClass = "danger";
      statusText = `Terlebih ${money(spent - budget)}`;
    } else if (percent >= 80) {
      statusClass = "warning";
      statusText = `${Math.round(percent)}% digunakan — hampir habis`;
    }

    return `
      <div class="list-row">
        <div style="flex:1; min-width:0;">
          <div class="item-name">${escapeHTML(category)}</div>

          <div class="budget-track">
            <div class="budget-fill ${statusClass}"
              style="width:${Math.min(100, percent)}%"></div>
          </div>

          <div class="budget-status">${statusText}</div>
          <div class="item-subtitle">
            ${money(spent)} daripada ${money(budget)}
          </div>
        </div>

        <button class="delete-btn"
          data-delete-budget="${escapeHTML(category)}"
          type="button">Padam</button>
      </div>
    `;
  }).join("");
}

$("budgetList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-budget]");

  if (!button) return;

  const category = button.dataset.deleteBudget;

  if (!confirm(`Padam bajet ${category}?`)) return;

  delete state.budgets[category];

  if (saveState()) render();
});

// ========================================
// GAMBAR RESIT
// ========================================

// Pilih gambar dan sediakan pratonton.
// Jumlah pada resit masih perlu dimasukkan secara manual.

receiptInput.addEventListener("change", async () => {
  const file = receiptInput.files[0];

  receiptData = "";
  $("receiptPreview").classList.add("hidden");
  $("receiptPreview").innerHTML = "";

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Sila pilih fail gambar.");
    receiptInput.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("Gambar terlalu besar. Sila pilih gambar bawah 10 MB.");
    receiptInput.value = "";
    return;
  }

  try {
    receiptData = await compressImage(file);

    $("receiptPreview").innerHTML = `
      <div class="item-name">Pratonton resit</div>
      <img src="${receiptData}" alt="Pratonton gambar resit">
      <button type="button" id="removeReceipt"
        class="btn btn-secondary">Buang gambar</button>
    `;

    $("receiptPreview").classList.remove("hidden");

    $("removeReceipt").addEventListener("click", () => {
      receiptData = "";
      receiptInput.value = "";
      $("receiptPreview").innerHTML = "";
      $("receiptPreview").classList.add("hidden");
    });
  } catch (error) {
    alert("Gambar tak dapat diproses. Cuba gambar lain.");
    receiptInput.value = "";
    console.error(error);
  }
});

// Kecilkan gambar supaya tak terlalu cepat memenuhi storan.

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("Gambar tidak sah"));

      image.onload = () => {
        const maxSide = 1000;
        const scale = Math.min(
          1,
          maxSide / Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

// ========================================
// SIMPAN PERBELANJAAN
// ========================================

expenseForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = $("expenseName").value.trim();
  const amount = Number($("expenseAmount").value);
  const category = $("expenseCategory").value;
  const person = $("expensePerson").value;
  const date = $("expenseDate").value;

  if (
    !name ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !date
  ) {
    alert("Sila semak nama, jumlah dan tarikh perbelanjaan.");
    return;
  }

  const expense = {
    id: crypto.randomUUID(),
    name,
    amount,
    category,
    person,
    date,
    receipt: receiptData
  };

  state.expenses.push(expense);

  if (saveState()) {
    expenseForm.reset();

    receiptData = "";
    $("receiptPreview").innerHTML = "";
    $("receiptPreview").classList.add("hidden");

    $("expenseDate").value = localDateString();
    $("expensePerson").value = "Suami";

    // Beralih ke bulan transaksi yang baru ditambah.
    monthPicker.value = date;

    render();
  } else {
    state.expenses.pop();
  }
});

// ========================================
// PAPAR SEJARAH BELANJA
// ========================================

function renderExpenses(expenses) {
  const container = $("expenseList");

  $("recordCount").textContent = `${expenses.length} rekod`;

  const sorted = [...expenses].sort((a, b) =>
    b.date.localeCompare(a.date) ||
    b.id.localeCompare(a.id)
  );

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        Belum ada perbelanjaan untuk bulan ini.
      </div>
    `;
    return;
  }

  const icons = {
    "Makanan": "🍜",
    "Barang dapur": "🛒",
    "Minyak & pengangkutan": "⛽",
    "Bil rumah": "💡",
    "Anak & keluarga": "👨‍👩‍👧",
    "Kesihatan": "💊",
    "Shopping": "🛍️",
    "Lain-lain": "📦"
  };

  container.innerHTML = sorted.map(expense => `
    <div class="expense-row">
      <div class="expense-details">
        <div class="expense-icon">
          ${icons[expense.category] || "🧾"}
        </div>

        <div>
          <div class="item-name">${escapeHTML(expense.name)}</div>
          <div class="item-subtitle">
            ${escapeHTML(expense.category)} ·
            ${escapeHTML(expense.person)} ·
            ${escapeHTML(expense.date)}
          </div>

          ${expense.receipt ? `
            <a href="${expense.receipt}"
              target="_blank"
              rel="noopener noreferrer">
              <img class="receipt-thumb"
                src="${expense.receipt}"
                alt="Gambar resit">
            </a>
          ` : ""}
        </div>
      </div>

      <div class="expense-amount">
        ${money(expense.amount)}
        <div style="margin-top:8px;">
          <button class="delete-btn"
            data-delete-expense="${escapeHTML(expense.id)}"
            type="button">Padam</button>
        </div>
      </div>
    </div>
  `).join("");
}

$("expenseList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-expense]");

  if (!button) return;

  const id = button.dataset.deleteExpense;

  if (!confirm("Padam rekod perbelanjaan ini?")) return;

  state.expenses = state.expenses.filter(expense =>
    expense.id !== id
  );

  if (saveState()) render();
});

// ========================================
// AMARAN BAJET DAN RAMALAN HUJUNG BULAN
// ========================================

function renderAlerts(expenses, balance) {
  const container = $("alerts");
  const alerts = [];

  const income = totalIncome();
  const commitments = totalCommitments();
  const spent = totalExpenses(expenses);

  const month = selectedMonth();
  const now = new Date();
  const currentMonth = localDateString().slice(0, 7);

  // Amaran baki semasa.

  if (income === 0) {
    alerts.push({
      type: "",
      title: "Lengkapkan pendapatan",
      message: "Masukkan gaji bersih suami dan isteri untuk mengira bajet keluarga."
    });
  } else if (balance < 0) {
    alerts.push({
      type: "danger",
      title: "Baki keluarga negatif",
      message:
        `Komitmen dan perbelanjaan melebihi pendapatan sebanyak ${money(Math.abs(balance))}.`
    });
  }

  // Amaran bajet kategori.

  Object.entries(state.budgets).forEach(([category, budgetValue]) => {
    const budget = Number(budgetValue) || 0;
    const categorySpent = categoryExpenses(category, expenses);

    if (budget <= 0) return;

    const percent = categorySpent / budget * 100;

    if (percent >= 100) {
      alerts.push({
        type: "danger",
        title: `Bajet ${category} sudah terlebih`,
        message:
          `Belanja ${money(categorySpent)}, melebihi bajet ${money(budget)} sebanyak ${money(categorySpent - budget)}.`
      });
    } else if (percent >= 80) {
      alerts.push({
        type: "",
        title: `Bajet ${category} hampir habis`,
        message:
          `${Math.round(percent)}% telah digunakan. Baki bajet ${money(budget - categorySpent)}.`
      });
    }
  });

  // Ramalan dibuat hanya untuk bulan semasa.
  // Tidak menganggap perbelanjaan akan sentiasa sama dengan tepat.

  if (month === currentMonth && income > 0) {
    const day = now.getDate();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    if (day > 0) {
      const projectedExpenses = spent / day * daysInMonth;
      const projectedBalance =
        income - commitments - projectedExpenses;

      if (projectedBalance < 0) {
        alerts.push({
          type: "danger",
          title: "Amaran ramalan hujung bulan",
          message:
            `Jika corak belanja semasa berterusan, baki mungkin ${money(projectedBalance)} pada hujung bulan. Ini anggaran, bukan kepastian.`
        });
      } else if (projectedExpenses > 0) {
        alerts.push({
          type: "",
          title: "Anggaran baki hujung bulan",
          message:
            `Baki dijangka sekitar ${money(projectedBalance)} jika kadar perbelanjaan semasa berterusan.`
        });
      }
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "good",
      title: "Kewangan dalam pemantauan",
      message:
        "Tiada amaran berdasarkan rekod dan bajet yang dimasukkan setakat ini."
    });
  }

  container.innerHTML = alerts.map(alert => `
    <div class="alert ${alert.type}">
      <strong>${escapeHTML(alert.title)}</strong>
      ${escapeHTML(alert.message)}
    </div>
  `).join("");
}

// ========================================
// TUKAR BULAN
// ========================================

monthPicker.addEventListener("change", () => {
  if (!monthPicker.value) return;
  render();
});

// ========================================
// EKSPORT REKOD KE CSV
// ========================================

$("exportBtn").addEventListener("click", () => {
  const rows = [
    ["Tarikh", "Perkara", "Kategori", "Dibelanjakan oleh", "Jumlah RM"]
  ];

  monthlyExpenses().forEach(expense => {
    rows.push([
      expense.date,
      expense.name,
      expense.category,
      expense.person,
      expense.amount.toFixed(2)
    ]);
  });

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `duitkita-${selectedMonth()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
});

// ========================================
// MULAKAN APP
// ========================================

monthPicker.value = localDateString().slice(0, 7);
$("expenseDate").value = localDateString();

render();

/* ========================================
   LOGIN DAN DAFTAR AKAUN DUITKITA
======================================== */

const authForm = document.getElementById("authForm");
const signupBtn = document.getElementById("signupBtn");
const authMessage = document.getElementById("authMessage");

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  authMessage.textContent = "Sedang login...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    authMessage.textContent = "Login gagal: " + error.message;
    return;
  }

  authMessage.textContent = "Login berjaya!";
});

signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!email || password.length < 6) {
    authMessage.textContent =
      "Masukkan email dan kata laluan sekurang-kurangnya 6 aksara.";
    return;
  }

  authMessage.textContent = "Sedang daftar akaun...";

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    authMessage.textContent = "Pendaftaran gagal: " + error.message;
    return;
  }

  authMessage.textContent =
    "Permohonan daftar dihantar. Semak email jika pengesahan diperlukan.";
});

/* KAWAL PAPARAN LOGIN DAN DASHBOARD */

async function updateAuthUI() {
  const { data: { session } } =
    await supabaseClient.auth.getSession();

  const authPanel = document.getElementById("authPanel");
  const dashboard = document.getElementById("dashboard");

  if (session) {
    authPanel.style.display = "none";
    dashboard.style.display = "";
  } else {
    authPanel.style.display = "";
    dashboard.style.display = "none";
  }
}

supabaseClient.auth.onAuthStateChange(() => {
  updateAuthUI();
});

updateAuthUI();


/* CIPTA HOUSEHOLD SENDIRI */

async function createFamilyHousehold() {
  const { data: { session } } =
    await supabaseClient.auth.getSession();

  if (!session) {
    alert("Sila login dahulu.");
    return;
  }

  const familyName = prompt(
    "Masukkan nama keluarga anda:"
  );

  if (!familyName || !familyName.trim()) {
    return;
  }

  const { data, error } = await supabaseClient.rpc(
    "create_household",
    { p_name: familyName.trim() }
  );

  if (error) {
    alert("Gagal cipta keluarga: " + error.message);
    return;
  }

  alert("Keluarga berjaya dicipta!");
  console.log("Household ID:", data);
}

