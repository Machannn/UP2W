import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0h60Mo9eDzhoobgHETjqJo4m_QG_rsqs",
  authDomain: "monitoring-k3l-24eb5.firebaseapp.com",
  projectId: "monitoring-k3l-24eb5",
  storageBucket: "monitoring-k3l-24eb5.firebasestorage.app",
  messagingSenderId: "264914059362",
  appId: "1:264914059362:web:9e8f6e8e1002322048913b",
  measurementId: "G-WFQHL8TF1G"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elemen DOM
const containerTahun = document.getElementById('container-tahun');
const infoFilter = document.getElementById('info-filter');
const btnResetFilter = document.getElementById('btn-reset-filter');
const searchInput = document.getElementById('search-inspeksi');
const btnTambahInspeksi = document.getElementById('btn-tambah-inspeksi');
const userNameElem = document.getElementById('user-name');
const userRoleElem = document.getElementById('user-role');

// Parameter URL (dari klik di Dashboard)
const urlParams = new URLSearchParams(window.location.search);
const filterModul = urlParams.get('modul');
const filterKode = urlParams.get('kode');

let currentUserNama = "Guest";
let currentUserRole = "Akun Tamu";

// ==========================================
// CEK LOGIN & SESI
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        currentUserNama = userDocSnap.data().nama || "Pengguna";
        currentUserRole = userDocSnap.data().role || "Akun Tamu";
      } else {
        currentUserNama = user.email.split('@')[0];
        currentUserRole = "Pengguna";
      }
      userNameElem.innerText = currentUserNama;
      userRoleElem.innerText = currentUserRole;

      // Munculkan tombol tambah inspeksi jika role-nya Super Admin atau Petugas DAN sedang membuka kode spesifik
      if ((currentUserRole === "Super Admin" || currentUserRole === "Petugas") && filterModul && filterKode) {
        btnTambahInspeksi.classList.remove('hidden');
      }
    } catch (error) {
      console.error("Gagal verifikasi role:", error);
    }
  }
});

// ==========================================
// PENANGANAN FILTER
// ==========================================
if (filterKode && filterModul) {
  infoFilter.innerHTML = `Riwayat Inspeksi Unit: <span class="text-[#095a79] font-bold bg-[#d2e5ed] px-2 py-1 rounded ml-1">${filterModul.toUpperCase()} - ${filterKode}</span>`;
  btnResetFilter.classList.remove('hidden');
}

btnResetFilter.addEventListener('click', () => {
  // Hapus parameter URL dan refresh ke tampilan global
  window.location.href = 'hasil-inspeksi.html';
});

// ==========================================
// REALTIME DATA INSPEKSI & GROUPING TAHUN
// ==========================================
let dataInspeksiLokal = [];

// Buat koleksi khusus bernama 'riwayat_inspeksi' di Firebase
const colRefRiwayat = collection(db, "riwayat_inspeksi");

onSnapshot(colRefRiwayat, (snapshot) => {
  dataInspeksiLokal = [];
  snapshot.forEach((docSnap) => {
    dataInspeksiLokal.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderTabelPerTahun();
});

function renderTabelPerTahun() {
  const keyword = searchInput.value.toLowerCase();
  
  // 1. Terapkan Filter (URL Parameter & Live Search)
  let dataFiltered = dataInspeksiLokal.filter(item => {
    if (filterModul && item.modul !== filterModul) return false;
    if (filterKode && item.kode !== filterKode) return false;
    
    const teks = `${item.modul} ${item.kode} ${item.petugas} ${item.status} ${item.catatan}`.toLowerCase();
    return teks.includes(keyword);
  });

  // 2. Kelompokkan Berdasarkan Tahun (Otomatis diekstrak dari properti 'tanggal')
  const dataPerTahun = {};
  dataFiltered.forEach(item => {
    // Ambil 4 digit pertama (Tahun) dari format YYYY-MM-DD
    const tahun = item.tanggal ? item.tanggal.substring(0, 4) : "Tidak Diketahui"; 
    if (!dataPerTahun[tahun]) dataPerTahun[tahun] = [];
    dataPerTahun[tahun].push(item);
  });

  // 3. Urutkan Tahun (Terbaru di atas)
  const daftarTahun = Object.keys(dataPerTahun).sort((a, b) => b - a);
  containerTahun.innerHTML = "";

  if (daftarTahun.length === 0) {
    containerTahun.innerHTML = `<div class="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm border border-gray-200">Belum ada data riwayat inspeksi.</div>`;
    return;
  }

  // 4. Buat Dropdown (Accordion) untuk masing-masing Tahun
  daftarTahun.forEach((tahun, index) => {
    const isTerbuka = index === 0 ? "open" : ""; // Tahun terbaru otomatis terbuka

    const detailsElem = document.createElement('details');
    detailsElem.className = "bg-white border border-gray-200 rounded-xl shadow-sm group";
    if (isTerbuka) detailsElem.setAttribute("open", "");

    detailsElem.innerHTML = `
      <summary class="p-5 bg-[#f8fafc] text-gray-800 font-bold cursor-pointer select-none rounded-t-xl flex justify-between items-center transition-colors group-hover:bg-[#e2e8f0] group-open:bg-[#095a79] group-open:text-white group-open:rounded-b-none border-b border-transparent group-open:border-gray-200">
        <span class="text-lg flex items-center gap-2">📅 Laporan Tahun ${tahun}</span>
        <span class="text-sm font-normal opacity-80 group-open:rotate-180 transition-transform duration-300">▼</span>
      </summary>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-gray-100 text-gray-700 text-sm font-bold border-b border-gray-200">
            <tr>
              <th class="p-4 text-center">Modul</th>
              <th class="p-4 text-center">Kode Unit</th>
              <th class="p-4 text-center">Petugas Pemeriksa</th>
              <th class="p-4 text-center">Tanggal</th>
              <th class="p-4 text-center">Kondisi / Status</th>
              <th class="p-4 text-left">Catatan</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-gray-200 bg-white">
            ${buatBarisTabel(dataPerTahun[tahun])}
          </tbody>
        </table>
      </div>
    `;
    containerTahun.appendChild(detailsElem);
  });
}

function buatBarisTabel(dataArray) {
  // Sortir per bulan/tanggal di dalam tahun tersebut (terbaru di atas)
  dataArray.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  return dataArray.map(data => {
    // Penentuan warna label status
    let warnaStatus = 'bg-gray-100 text-gray-700';
    if (data.status.includes('Aman') || data.status.includes('Layak')) warnaStatus = 'bg-green-100 text-green-700';
    if (data.status.includes('Perbaikan')) warnaStatus = 'bg-yellow-100 text-yellow-800';
    if (data.status.includes('Rusak')) warnaStatus = 'bg-red-100 text-red-700';

    return `
      <tr class="hover:bg-gray-50 text-center transition-colors">
        <td class="p-4 font-semibold text-gray-500 uppercase">${data.modul || '-'}</td>
        <td class="p-4 text-[#095a79] font-bold">${data.kode || '-'}</td>
        <td class="p-4 text-gray-800 font-medium">${data.petugas || '-'}</td>
        <td class="p-4 text-gray-600">${data.tanggal || '-'}</td>
        <td class="p-4">
          <span class="${warnaStatus} px-3 py-1 rounded-full text-xs font-bold inline-block w-max whitespace-nowrap">
            ${data.status || '-'}
          </span>
        </td>
        <td class="p-4 text-left text-gray-600 italic break-words max-w-xs">${data.catatan || '-'}</td>
      </tr>
    `;
  }).join('');
}

searchInput.addEventListener('input', renderTabelPerTahun);

// ==========================================
// LOGIKA MODAL TAMBAH INSPEKSI
// ==========================================
const modalInspeksi = document.getElementById('modal-inspeksi');
const modalBoxInspeksi = document.getElementById('modal-box-inspeksi');
const formTambahInspeksi = document.getElementById('form-tambah-inspeksi');

// Input Modal
const inputModul = document.getElementById('input-inspeksi-modul');
const inputKode = document.getElementById('input-inspeksi-kode');
const inputTanggal = document.getElementById('input-inspeksi-tanggal');

function tutupModalInspeksi() {
  modalInspeksi.classList.remove('opacity-100');
  modalInspeksi.classList.add('opacity-0', 'pointer-events-none');
  modalBoxInspeksi.classList.remove('scale-100');
  modalBoxInspeksi.classList.add('scale-95');
}

document.getElementById('btn-tutup-modal').addEventListener('click', tutupModalInspeksi);
document.getElementById('btn-batal-modal').addEventListener('click', tutupModalInspeksi);

// Buka modal khusus unit yang terfilter
btnTambahInspeksi.addEventListener('click', () => {
  inputModul.value = filterModul || '';
  inputKode.value = filterKode || '';
  
  // Set default tanggal ke hari ini
  inputTanggal.value = new Date().toISOString().split('T')[0];

  modalInspeksi.classList.remove('opacity-0', 'pointer-events-none');
  modalInspeksi.classList.add('opacity-100');
  modalBoxInspeksi.classList.remove('scale-95');
  modalBoxInspeksi.classList.add('scale-100');
});

// Submit Form Inspeksi ke Firebase
formTambahInspeksi.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btnSimpan = document.getElementById('btn-simpan-inspeksi');
  const tglInspeksi = inputTanggal.value;
  const statusKondisi = document.getElementById('input-inspeksi-status').value;
  const catatanTambahan = document.getElementById('input-inspeksi-catatan').value;

  try {
    btnSimpan.innerText = "Menyimpan...";
    btnSimpan.disabled = true;

    // 1. Simpan ke koleksi riwayat_inspeksi
    await addDoc(colRefRiwayat, {
      modul: filterModul,
      kode: filterKode,
      petugas: currentUserNama, // Diambil otomatis dari akun login
      tanggal: tglInspeksi,
      status: statusKondisi,
      catatan: catatanTambahan,
      timestamp: new Date().getTime()
    });

    tutupModalInspeksi();
    formTambahInspeksi.reset();
    
    // Auto scroll ke paling atas
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {
    console.error("Gagal menyimpan inspeksi:", error);
    alert("Gagal menyimpan data: " + error.message);
  } finally {
    btnSimpan.innerText = "Simpan Laporan";
    btnSimpan.disabled = false;
  }
});