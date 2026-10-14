const $ = (id) => document.getElementById(id);
const KEYS = { users: "temuanku_users_v1", reports: "temuanku_reports_v1", session: "temuanku_session_v1" };
let reports = read(KEYS.reports, []);
let currentUser = read(KEYS.session, null);
let toastTimer;

function read(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function showToast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}
function switchAuth(mode) {
  const login = mode === "login";
  $("loginForm").classList.toggle("hidden", !login);
  $("registerForm").classList.toggle("hidden", login);
  $("showLogin").classList.toggle("active", login);
  $("showRegister").classList.toggle("active", !login);
  $("authMessage").textContent = "";
}
$("showLogin").addEventListener("click", () => switchAuth("login"));
$("showRegister").addEventListener("click", () => switchAuth("register"));

$("registerForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim().toLowerCase();
  const password = $("registerPassword").value;
  const users = read(KEYS.users, []);
  if (users.some(user => user.email === email)) {
    $("authMessage").textContent = "Email tersebut sudah terdaftar. Silakan masuk.";
    return;
  }
  users.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name, email, password });
  save(KEYS.users, users);
  $("registerForm").reset();
  $("authMessage").style.color = "#168568";
  $("authMessage").textContent = "Pendaftaran berhasil. Silakan masuk dengan akun kamu.";
  switchAuth("login");
  $("loginEmail").value = email;
  $("authMessage").style.color = "#168568";
  $("authMessage").textContent = "Akun berhasil dibuat. Silakan masuk.";
});

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;
  const user = read(KEYS.users, []).find(item => item.email === email && item.password === password);
  if (!user) {
    $("authMessage").style.color = "#b42318";
    $("authMessage").textContent = "Email atau kata sandi salah. Jika belum punya akun, silakan daftar.";
    return;
  }
  currentUser = { id: user.id, name: user.name, email: user.email };
  save(KEYS.session, currentUser);
  $("authMessage").textContent = "";
  enterApp();
});

function enterApp() {
  if (!currentUser) return;
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userName").textContent = currentUser.name;
  $("userInitial").textContent = currentUser.name.trim().charAt(0).toUpperCase() || "U";
  renderAll();
}
$("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem(KEYS.session);
  $("appView").classList.add("hidden");
  $("authView").classList.remove("hidden");
  $("loginForm").reset();
  switchAuth("login");
  $("sidebar").classList.remove("open");
});

function goTo(page) {
  const pages = ["dashboard", "data", "reports"];
  if (!pages.includes(page)) page = "dashboard";
  pages.forEach(name => $(name + "Page").classList.toggle("hidden", name !== page));
  document.querySelectorAll(".nav-item[data-page]").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  $("pageHeading").textContent = ({ dashboard: "Dashboard", data: "Data Barang", reports: "Rekap Laporan" })[page];
  $("sidebar").classList.remove("open");
  if (page === "data") renderData();
  if (page === "reports") renderReports();
}
document.querySelectorAll(".nav-item[data-page]").forEach(button => button.addEventListener("click", () => goTo(button.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(button => button.addEventListener("click", () => goTo(button.dataset.goto)));
$("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("quickAdd").addEventListener("click", () => openModal());
$("emptyAdd").addEventListener("click", () => openModal());
$("addReportBtn").addEventListener("click", () => openModal());
$("searchInput").addEventListener("input", renderData);
$("typeFilter").addEventListener("change", renderData);
$("statusFilter").addEventListener("change", renderData);
$("printBtn").addEventListener("click", () => window.print());

function statusBadge(status) {
  const cls = status.toLowerCase();
  return `<span class="status status-${cls}">${escapeHTML(status)}</span>`;
}
function dateDisplay(date) {
  if (!date) return "-";
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? escapeHTML(date) : parsed.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
}
function sortedReports() {
  return [...reports].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
function renderAll() {
  reports = read(KEYS.reports, []);
  const lost = reports.filter(r => r.type === "Hilang").length;
  const found = reports.filter(r => r.type === "Temuan").length;
  const done = reports.filter(r => r.status === "Selesai").length;
  $("totalCount").textContent = reports.length;
  $("lostCount").textContent = lost;
  $("foundCount").textContent = found;
  $("doneCount").textContent = done;
  const latest = sortedReports().slice(0, 5);
  $("recentRows").innerHTML = latest.map(r => `<tr><td><div class="item-cell"><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.description || "Tidak ada deskripsi")}</small></div></td><td><span class="type-label">${r.type === "Hilang" ? "Barang hilang" : "Barang temuan"}</span></td><td>${escapeHTML(r.location)}</td><td>${dateDisplay(r.date)}</td><td>${statusBadge(r.status)}</td></tr>`).join("");
  $("recentEmpty").classList.toggle("hidden", latest.length > 0);
  renderData();
  renderReports();
}
function renderData() {
  if (!$("dataRows")) return;
  const q = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;
  const status = $("statusFilter").value;
  const filtered = sortedReports().filter(r => {
    const searchable = [r.name, r.location, r.reporter, r.description].join(" ").toLowerCase();
    return searchable.includes(q) && (!type || r.type === type) && (!status || r.status === status);
  });
  $("dataRows").innerHTML = filtered.map(r => `<tr>
    <td><div class="item-cell"><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.description || "Tidak ada deskripsi")}</small></div></td>
    <td><span class="type-label">${r.type === "Hilang" ? "Barang hilang" : "Barang temuan"}</span></td>
    <td>${escapeHTML(r.location)}</td><td>${dateDisplay(r.date)}</td><td>${statusBadge(r.status)}</td>
    <td><div class="action-group"><button class="mini-btn" data-edit="${escapeHTML(r.id)}">Edit</button><button class="mini-btn delete" data-delete="${escapeHTML(r.id)}">Hapus</button></div></td>
  </tr>`).join("");
  $("dataEmpty").classList.toggle("hidden", filtered.length > 0);
  $("tableFoot").textContent = `Menampilkan ${filtered.length} dari ${reports.length} laporan`;
  document.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => openModal(btn.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => deleteReport(btn.dataset.delete)));
}
function renderReports() {
  const lost = reports.filter(r => r.type === "Hilang").length;
  const found = reports.filter(r => r.type === "Temuan").length;
  const done = reports.filter(r => r.status === "Selesai").length;
  $("reportTotal").textContent = reports.length;
  $("reportLost").textContent = lost;
  $("reportFound").textContent = found;
  $("reportDone").textContent = done;
  $("reportRows").innerHTML = sortedReports().map((r, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHTML(r.name)}</strong></td><td>${r.type === "Hilang" ? "Barang hilang" : "Barang temuan"}</td><td>${escapeHTML(r.reporter)}</td><td>${statusBadge(r.status)}</td><td>${escapeHTML(r.location)}</td></tr>`).join("");
  $("reportEmpty").classList.toggle("hidden", reports.length > 0);
}

function openModal(id = "") {
  $("reportForm").reset();
  $("editId").value = "";
  $("formMessage").textContent = "";
  $("modalTitle").textContent = id ? "Edit laporan barang" : "Tambah laporan barang";
  $("itemDate").value = new Date().toISOString().slice(0, 10);
  if (id) {
    const r = reports.find(item => item.id === id);
    if (!r) return;
    $("editId").value = r.id;
    $("itemName").value = r.name;
    $("itemType").value = r.type;
    $("itemStatus").value = r.status;
    $("itemLocation").value = r.location;
    $("itemDate").value = r.date;
    $("reporterName").value = r.reporter;
    $("itemDescription").value = r.description || "";
  } else {
    $("reporterName").value = currentUser ? currentUser.name : "";
  }
  $("reportModal").classList.remove("hidden");
  $("itemName").focus();
}
function closeModal() { $("reportModal").classList.add("hidden"); }
$("closeModal").addEventListener("click", closeModal);
$("cancelModal").addEventListener("click", closeModal);
$("reportModal").addEventListener("click", event => { if (event.target === $("reportModal")) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

$("reportForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("editId").value;
  const existing = reports.find(r => r.id === id);
  const report = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    name: $("itemName").value.trim(),
    type: $("itemType").value,
    status: $("itemStatus").value,
    location: $("itemLocation").value.trim(),
    date: $("itemDate").value,
    reporter: $("reporterName").value.trim(),
    description: $("itemDescription").value.trim(),
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (existing) reports = reports.map(r => r.id === id ? report : r);
  else reports.push(report);
  save(KEYS.reports, reports);
  closeModal();
  renderAll();
  showToast(existing ? "Laporan berhasil diperbarui." : "Laporan berhasil ditambahkan.");
});
function deleteReport(id) {
  const report = reports.find(r => r.id === id);
  if (!report) return;
  if (!confirm(`Hapus laporan "${report.name}"?`)) return;
  reports = reports.filter(r => r.id !== id);
  save(KEYS.reports, reports);
  renderAll();
  showToast("Laporan berhasil dihapus.");
}

if (currentUser) enterApp();
