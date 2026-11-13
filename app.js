// ==========================================
// KONFIGURASI SUPABASE (Diisi otomatis dari proyek Anda)
// ==========================================
const SUPABASE_URL = "https://nhxfezqilfwdjsbqvrsr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JojZm8AkYj2W4spP7hhXVQ_do2nMYBj";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentUserName = "Anggota Kocak";

// Cek status login saat halaman dibuka
window.onload = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await muatProfilUser();
    tampilkanAplikasi();
  }
};

// ==========================================
// 1. AUTENTIKASI (LOGIN, DAFTAR, LOGOUT)
// ==========================================
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const nama = document.getElementById("nama").value || "Anggota Baru";
  const tglLahir = document.getElementById("tgl-lahir").value;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return alert("Gagal daftar: " + error.message);

  // Simpan nama & tanggal lahir ke tabel profiles
  if (data.user) {
    await supabase.from("profiles").insert([
      { id: data.user.id, nama_panggilan: nama, tanggal_lahir: tglLahir || null }
    ]);
    alert("Berhasil daftar! Silakan klik tombol Masuk.");
  }
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("Gagal masuk: " + error.message);

  currentUser = data.user;
  await muatProfilUser();
  tampilkanAplikasi();
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

async function muatProfilUser() {
  const { data } = await supabase
    .from("profiles")
    .select("nama_panggilan")
    .eq("id", currentUser.id)
    .single();
  if (data) currentUserName = data.nama_panggilan;
}

function tampilkanAplikasi() {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("app-section").classList.remove("hidden");
  document.getElementById("user-info").classList.remove("hidden");
  document.getElementById("welcome-text").innerText = `Halo, ${currentUserName}!`;

  muatJadwal();
  muatUltah();
  muatAcara();
  muatChat();
  aktifkanRealtimeChat();
}

// Navigasi Tab
function showTab(tabName) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.remove("hidden");
  event.target.classList.add("active");
}

// ==========================================
// 2. FITUR JADWAL KUMPUL
// ==========================================
async function tambahJadwal(e) {
  e.preventDefault();
  const judul = document.getElementById("jadwal-judul").value;
  const tanggal_waktu = document.getElementById("jadwal-waktu").value;
  const lokasi = document.getElementById("jadwal-lokasi").value;
  const catatan = document.getElementById("jadwal-catatan").value;

  const { error } = await supabase.from("schedules").insert([{ judul, tanggal_waktu, lokasi, catatan }]);
  if (error) return alert("Gagal menambah jadwal: " + error.message);

  e.target.reset();
  muatJadwal();
}

async function muatJadwal() {
  const { data } = await supabase.from("schedules").select("*").order("tanggal_waktu", { ascending: true });
  const container = document.getElementById("list-jadwal");
  container.innerHTML = data.map(item => `
    <div class="item-box">
      <strong>${item.judul}</strong><br/>
      🕒 ${new Date(item.tanggal_waktu).toLocaleString("id-ID")}<br/>
      📍 ${item.lokasi}<br/>
      <small>${item.catatan || ""}</small>
    </div>
  `).join("");
}

// ==========================================
// 3. FITUR ULANG TAHUN ANGGOTA
// ==========================================
async function muatUltah() {
  const { data } = await supabase.from("profiles").select("*").not("tanggal_lahir", "is", null);
  const container = document.getElementById("list-ultah");
  container.innerHTML = data.map(p => {
    const tgl = new Date(p.tanggal_lahir).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
    return `
      <div class="item-box">
        🎂 <strong>${p.nama_panggilan}</strong> — Ulang tahun pada <b>${tgl}</b>
      </div>
    `;
  }).join("");
}

// ==========================================
// 4. FITUR ACARA KOMUNITAS
// ==========================================
async function tambahAcara(e) {
  e.preventDefault();
  const nama_acara = document.getElementById("acara-nama").value;
  const tanggal = document.getElementById("acara-tanggal").value;
  const lokasi = document.getElementById("acara-lokasi").value;
  const deskripsi = document.getElementById("acara-deskripsi").value;

  const { error } = await supabase.from("events").insert([{ nama_acara, tanggal, lokasi, deskripsi }]);
  if (error) return alert("Gagal membuat acara: " + error.message);

  e.target.reset();
  muatAcara();
}

async function muatAcara() {
  const { data } = await supabase.from("events").select("*").order("tanggal", { ascending: true });
  const container = document.getElementById("list-acara");
  container.innerHTML = data.map(ev => `
    <div class="item-box">
      🎪 <strong>${ev.nama_acara}</strong> (${ev.tanggal})<br/>
      📍 ${ev.lokasi}<br/>
      <small>${ev.deskripsi || ""}</small>
    </div>
  `).join("");
}

// ==========================================
// 5. FITUR CHATS REAL-TIME
// ==========================================
async function kirimPesan(e) {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const isi_pesan = input.value;

  await supabase.from("messages").insert([
    { user_id: currentUser.id, pengirim: currentUserName, isi_pesan }
  ]);
  input.value = "";
}

async function muatChat() {
  const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(50);
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = data.map(m => renderPesanHTML(m)).join("");
  chatBox.scrollTop = chatBox.scrollHeight;
}

function aktifkanRealtimeChat() {
  supabase
    .channel("ruang-chat-kocak")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
      const chatBox = document.getElementById("chat-box");
      chatBox.innerHTML += renderPesanHTML(payload.new);
      chatBox.scrollTop = chatBox.scrollHeight;
    })
    .subscribe();
}

function renderPesanHTML(m) {
  return `
    <div class="chat-msg">
      <strong>${m.pengirim}</strong>: ${m.isi_pesan}
    </div>
  `;
}
