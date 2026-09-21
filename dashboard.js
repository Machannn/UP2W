import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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

const userNameElem = document.getElementById('user-name');
const userRoleElem = document.getElementById('user-role');
const btnLogout = document.getElementById('btn-logout');

// ==========================================
// STATE DATA & MODUL AKTIF (8 MODUL LENGKAP)
// ==========================================
let modulAktif = null; 
let semuaDataK3L = []; // Menampung gabungan data dari 8 modul

const daftarModul = ['apar', 'apab', 'firealarm', 'boxhydrant', 'apd', 'pompahydrant', 'p3k', 'cctv'];

const dbDataLokal = {};
const sortConfig = {};

daftarModul.forEach(m => {
  dbDataLokal[m] = [];
  sortConfig[m] = { col: 'kode', dir: 'asc' };
});

let activePinCode = null;

// ==========================================
// INTERAKSI IKON MENU ATAS
// ==========================================
const iconContainer = document.getElementById('icon-container');
const semuaIkon = iconContainer.querySelectorAll('button'); 
const semuaIdSection = daftarModul.map(m => `section-${m}`);

semuaIkon.forEach(ikon => {
  ikon.addEventListener('click', (e) => {
    e.preventDefault(); 
    
    let targetModul = ikon.dataset.modul;
    const isSudahAktif = ikon.dataset.aktif === 'true';

    // 1. Reset SEMUA ikon kembali normal terlebih dahulu
    semuaIkon.forEach(item => {
      item.classList.remove('grayscale', 'opacity-50');
      item.dataset.aktif = 'false'; 
    });
    
    // 2. Sembunyikan semua section tabel & bersihkan pin denah
    semuaIdSection.forEach(idSec => {
      const sec = document.getElementById(idSec);
      if (sec) sec.classList.add('hidden');
    });

    const pinContainer = document.getElementById('pin-container-utama');
    if (pinContainer) pinContainer.innerHTML = "";
    modulAktif = null;
    activePinCode = null;

    // 3. Jika ikon yang diklik belum dalam keadaan aktif (dan punya modul database)
    if (!isSudahAktif && targetModul) {
      ikon.dataset.aktif = 'true'; 

      // Ubah SEMUA ikon LAINNYA menjadi abu-abu (grayscale & transparan)
      semuaIkon.forEach(item => {
        if (item !== ikon) {
          item.classList.add('grayscale', 'opacity-50');
        }
      });

      // Buka tabel modul yang bersangkutan
      const targetSec = document.getElementById(`section-${targetModul}`);
      if (targetSec) {
        targetSec.classList.remove('hidden');
        modulAktif = targetModul;
        renderTabelCustom(targetModul, userRoleElem.innerText);
      }
    }
  });
});

// ==========================================
// PRIVILEGE / HAK AKSES
// ==========================================
const PERMISSIONS = {
  "Super Admin": { canAdd: true, canEdit: true, canDelete: true },
  "Petugas": { canAdd: false, canEdit: true, canDelete: false },
  "Akun Tamu": { canAdd: false, canEdit: false, canDelete: false },
  "Guest": { canAdd: false, canEdit: false, canDelete: false }
};

function aturPrivilege(role) {
  const userPerms = PERMISSIONS[role] || PERMISSIONS["Guest"];
  const semuaBtnTambah = document.querySelectorAll('[id^="btn-tambah-"]');
  const colAksi = document.querySelectorAll('.col-aksi');

  semuaBtnTambah.forEach(btn => {
    if (userPerms.canAdd) btn.classList.remove('hidden');
    else btn.classList.add('hidden');
  });

  colAksi.forEach(el => {
    if (userPerms.canEdit || userPerms.canDelete) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

// ==========================================
// SORTING & RENDER TABEL MULTI-MODUL
// ==========================================
window.sortTabelCustom = function(modul, kolom) {
  const conf = sortConfig[modul];
  if (conf.col === kolom) {
    conf.dir = conf.dir === 'asc' ? 'desc' : 'asc';
  } else {
    conf.col = kolom;
    conf.dir = 'asc';
  }

  ['kode', 'pengawas', 'petugas', 'inspeksi'].forEach(k => {
    const iconSpan = document.getElementById(`icon-sort-${modul}-${k}`);
    if (iconSpan) {
      if (k === conf.col) {
        iconSpan.innerText = conf.dir === 'asc' ? '▲' : '▼';
      } else {
        iconSpan.innerText = '';
      }
    }
  });

  renderTabelCustom(modul, userRoleElem.innerText);
};

function renderTabelCustom(modul, userRole) {
  const tbody = document.getElementById(`tbody-${modul}`);
  const searchInput = document.getElementById(`search-${modul}`);
  if (!tbody || !searchInput) return;

  const keyword = searchInput.value.toLowerCase();
  tbody.innerHTML = ""; 

  const dataLokal = dbDataLokal[modul] || [];

  if (dataLokal.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500">Belum ada data ${modul.toUpperCase()}.</td></tr>`;
    if (modulAktif === modul) renderPinDenahUtama([]);
    return;
  }

  let filteredData = dataLokal.filter(item => {
    const teksBaris = `
      ${item.kode || ''} 
      ${item.pengawas || ''} 
      ${item.petugas || ''} 
      ${item.inspeksiTerakhir || ''} 
      ${item.bulan || ''}
    `.toLowerCase();
    return teksBaris.includes(keyword);
  });

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500">Pencarian tidak ditemukan.</td></tr>`;
    if (modulAktif === modul) renderPinDenahUtama([]);
    return;
  }

  const conf = sortConfig[modul];
  filteredData.sort((a, b) => {
    let valA = '';
    let valB = '';

    if (conf.col === 'kode') {
      valA = (a.kode || "").toUpperCase();
      valB = (b.kode || "").toUpperCase();
    } else if (conf.col === 'pengawas') {
      valA = (a.pengawas || "").toUpperCase();
      valB = (b.pengawas || "").toUpperCase();
    } else if (conf.col === 'petugas') {
      valA = (a.petugas || "").toUpperCase();
      valB = (b.petugas || "").toUpperCase();
    }

    if (conf.col !== 'inspeksi') {
      if (valA === valB) {
        return (a.kode || "").localeCompare(b.kode || "");
      }
      return conf.dir === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    } else {
      const parseDate = (dString) => {
        if (!dString || dString === '-') return 0;
        const parts = dString.split('/');
        if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        return 0;
      };
      const dateA = parseDate(a.inspeksiTerakhir);
      const dateB = parseDate(b.inspeksiTerakhir);
      
      if (dateA === dateB) {
        return (a.kode || "").localeCompare(b.kode || "");
      }
      return conf.dir === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });

  filteredData.forEach((data) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50 text-center transition-colors";
    tr.innerHTML = `
      <td class="p-4 font-semibold text-gray-800">${data.kode || '-'}</td>
      <td class="p-4 text-gray-600">${data.pengawas || '-'}</td>
      <td class="p-4 text-gray-600">${data.petugas || '-'}</td>
      <td class="p-4 text-gray-600">${data.inspeksiTerakhir || '-'}</td>
      <td class="p-4 text-gray-600">${data.bulan || '-'}</td>
      
      <!-- Tombol Cetak (Sekarang Mengarah ke Halaman Hasil Inspeksi) -->
      <td class="p-4 text-center align-middle">
        <button title="Lihat Riwayat Inspeksi" onclick="window.location.href='hasil-inspeksi.html?modul=${modul}&kode=${data.kode || ''}'" class="inline-flex items-center justify-center hover:opacity-80 transition-opacity p-1">
          <img src="assets/icon/icon-print.png" alt="Riwayat" class="w-6 h-6 object-contain block" />
        </button>
      </td>

      <!-- Kolom Aksi: Inspeksi (Isi Form), Edit Master, dan Hapus -->
      <td class="p-4 col-aksi hidden align-middle">
        <div class="flex items-center justify-center gap-3 h-full">
          
          <!-- Tombol Inspeksi (Membuka Modal Form Pengisian) -->
          <button title="Isi Form Inspeksi" onclick="bukaModalInspeksi('${modul}', '${data.id}', '${data.kode || ''}')" class="hover:opacity-80 transition-opacity p-1">
            <img src="assets/icon/icon-inspect.png" alt="Inspeksi" class="w-5 h-5 object-contain" />
          </button>

          <!-- Tombol Edit Master (Pensil Biru) -->
          <button title="Edit Master Unit" onclick="bukaModalEdit('${modul}', '${data.id}', '${data.kode || ''}', '${data.pengawas || ''}')" class="hover:opacity-80 transition-opacity p-1">
            <img src="assets/icon/icon-edit.png" alt="Edit" class="w-5 h-5 object-contain" />
          </button>

          <!-- Tombol Hapus (Tempat Sampah Merah) -->
          <button title="Hapus Unit" onclick="hapusDataUnit('${modul}', '${data.id}')" class="hover:opacity-80 transition-opacity p-1">
            <img src="assets/icon/icon-delete.png" alt="Del" class="w-5 h-5 object-contain" />
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (modulAktif === modul) {
    renderPinDenahUtama(filteredData);
  }
  aturPrivilege(userRole);
}

// ==========================================
// REALTIME LISTENER FIREBASE (8 MODUL)
// ==========================================
function muatSemuaDataFirebase(userRole) {
  daftarModul.forEach(modul => {
    const colRef = collection(db, modul);
    onSnapshot(colRef, (snapshot) => {
      // Perbarui data lokal per modul
      dbDataLokal[modul] = [];
      snapshot.forEach((docSnap) => {
        dbDataLokal[modul].push({ id: docSnap.id, modul: modul, ...docSnap.data() });
      });

      // Gabungkan SEMUA data dari ke-8 modul ke dalam 1 array besar dengan aman
      semuaDataK3L = [];
      daftarModul.forEach(m => {
        if (dbDataLokal[m] && dbDataLokal[m].length > 0) {
          semuaDataK3L = semuaDataK3L.concat(dbDataLokal[m]);
        }
      });

      // Jika tidak ada modul spesifik yang sedang dibuka di tabel, 
      // tampilkan SEMUA pin global di denah utama!
      if (!modulAktif) {
        renderSemuaPinGlobal(semuaDataK3L);
      } else {
        // Jika sedang buka tabel tertentu, render pin khusus modul tersebut
        renderTabelCustom(modulAktif, userRole);
      }
    });
  });
}

const warnaPinModul = {
  apar: 'bg-red-600',         // Merah
  apab: 'bg-blue-600',        // Biru
  firealarm: 'bg-orange-500', // Oranye
  boxhydrant: 'bg-emerald-600',// Hijau Tua
  apd: 'bg-purple-600',       // Ungu
  pompahydrant: 'bg-cyan-600',  // Cyan / Biru Muda
  p3k: 'bg-pink-600',         // Pink
  cctv: 'bg-amber-600'        // Cokelat / Amber
};

function renderSemuaPinGlobal(dataList) {
  const pinContainer = document.getElementById('pin-container-utama');
  if (!pinContainer) return;
  
  pinContainer.innerHTML = ""; 

  dataList.forEach(item => {
    if (item.posX && item.posY) {
      const pin = document.createElement('div');
      
      // Ambil warna berdasarkan asal modul data tersebut
      const warnaModul = warnaPinModul[item.modul] || 'bg-red-600';
      
      pin.className = `absolute w-4 h-4 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-transform hover:scale-125 z-25 ${warnaModul} border-2 border-white`;
      
      pin.style.left = `${item.posX}%`;
      pin.style.top = `${item.posY}%`;
      pin.title = `[${item.modul.toUpperCase()}] Kode: ${item.kode} - Pengawas: ${item.pengawas || '-'}`;

      // Aksi saat pin global diklik (opsional: bisa langsung mengarahkan ke modulnya)
      pin.addEventListener('click', () => {
        alert(`Unit ${item.modul.toUpperCase()} - Kode: ${item.kode} (Pengawas: ${item.pengawas})`);
      });

      pinContainer.appendChild(pin);
    }
  });
}

// Live Search Listeners untuk 8 modul
daftarModul.forEach(modul => {
  const sInput = document.getElementById(`search-${modul}`);
  if (sInput) {
    sInput.addEventListener('input', () => {
      renderTabelCustom(modul, userRoleElem.innerText);
    });
  }
});

// ==========================================
// CEK LOGIN & SESI
// ==========================================
const isGuest = sessionStorage.getItem('isGuest');
if (isGuest === 'true') {
  userNameElem.innerText = "Guest Login";
  userRoleElem.innerText = "Akun Tamu";
  aturPrivilege("Akun Tamu");
  muatSemuaDataFirebase("Akun Tamu"); 
} else {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let userRole = "Akun Tamu";

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          userRole = userData.role || "Akun Tamu";
          userNameElem.innerText = userData.nama || "Pengguna";
          userRoleElem.innerText = userRole;
        } else {
          userNameElem.innerText = user.email.split('@')[0];
          userRoleElem.innerText = "Pengguna";
        }

        aturPrivilege(userRole);
        muatSemuaDataFirebase(userRole); 
      } catch (error) {
        console.error("Gagal mengambil data Firestore:", error);
        muatSemuaDataFirebase("Guest");
      }
    } else {
      window.location.href = "index.html";
    }
  });
}

btnLogout.addEventListener('click', async () => {
  sessionStorage.removeItem('isGuest');
  await signOut(auth);
  window.location.href = "index.html";
});

// ==========================================
// LOGIKA MODAL UNIVERSAL & DENAH INTERAKTIF
// ==========================================
const modalTambahApar = document.getElementById('modal-tambah-apar');
const btnTutupModal = document.getElementById('btn-tutup-modal');
const btnBatalModal = document.getElementById('btn-batal-modal');
const formTambahApar = document.getElementById('form-tambah-apar');
const modalTitle = document.getElementById('modal-title');
const inputKode = document.getElementById('input-kode-apar');

const inputPengawas = document.getElementById('input-pengawas');
const datalistPengawas = document.getElementById('list-pengawas-terdaftar');

const denahContainer = document.getElementById('denah-container');
const pinMarker = document.getElementById('pin-marker');
const inputPosX = document.getElementById('input-pos-x');
const inputPosY = document.getElementById('input-pos-y');

let modulSedangDitambah = 'apar';

// Tangkap semua tombol tambah dari 8 modul secara dinamis
daftarModul.forEach(modul => {
  const btnTambah = document.getElementById(`btn-tambah-${modul}`);
  if (btnTambah) {
    btnTambah.addEventListener('click', () => {
      modulSedangDitambah = modul;
      if (modalTitle) modalTitle.innerText = `Tambah Unit ${modul.toUpperCase()} Baru`;
      if (inputKode) inputKode.placeholder = `Contoh: ${modul.toUpperCase()} 01`;

      modalTambahApar.classList.remove('opacity-0', 'pointer-events-none');
      modalTambahApar.classList.add('opacity-100');
      
      const modalBox = document.getElementById('modal-box');
      modalBox.classList.remove('scale-95');
      modalBox.classList.add('scale-100');

      formTambahApar.reset();
      pinMarker.classList.add('hidden'); 
      perbaruiDatalistPengawas(modul);
    });
  }
});

function tutupModal() {
  modalTambahApar.classList.remove('opacity-100');
  modalTambahApar.classList.add('opacity-0', 'pointer-events-none');
  
  const modalBox = document.getElementById('modal-box');
  modalBox.classList.remove('scale-100');
  modalBox.classList.add('scale-95');
}

if (btnTutupModal) btnTutupModal.addEventListener('click', tutupModal);
if (btnBatalModal) btnBatalModal.addEventListener('click', tutupModal);

inputPengawas.addEventListener('input', (e) => {
  let val = e.target.value;
  let capitalized = val.replace(/\b\w/g, l => l.toUpperCase());
  e.target.value = capitalized;
});

function perbaruiDatalistPengawas(modul) {
  datalistPengawas.innerHTML = "";
  const daftarData = dbDataLokal[modul] || [];
  const daftarPengawasUnik = [...new Set(daftarData.map(item => item.pengawas).filter(Boolean))];
  daftarPengawasUnik.forEach(nama => {
    const option = document.createElement('option');
    option.value = nama;
    datalistPengawas.appendChild(option);
  });
}

denahContainer.addEventListener('click', (e) => {
  const rect = denahContainer.getBoundingClientRect();
  const xPiksel = e.clientX - rect.left;
  const yPiksel = e.clientY - rect.top;

  const xPersen = (xPiksel / rect.width) * 100;
  const yPersen = (yPiksel / rect.height) * 100;

  inputPosX.value = xPersen.toFixed(2);
  inputPosY.value = yPersen.toFixed(2);

  pinMarker.style.left = `${xPersen}%`;
  pinMarker.style.top = `${yPersen}%`;
  pinMarker.classList.remove('hidden');
});

formTambahApar.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const kodeUnit = inputKode.value.trim();
  const namaPengawas = inputPengawas.value.trim();
  const posX = inputPosX.value;
  const posY = inputPosY.value;
  const btnSimpan = document.getElementById('btn-simpan-apar');

  if (!posX || !posY) {
    alert("Silakan klik titik lokasi pada gambar denah terlebih dahulu!");
    return;
  }

  try {
    btnSimpan.innerText = "Menyimpan...";
    btnSimpan.disabled = true;

    await addDoc(collection(db, modulSedangDitambah), {
      kode: kodeUnit,
      pengawas: namaPengawas,
      petugas: "-",          
      inspeksiTerakhir: "-", 
      bulan: "-",
      posX: posX,
      posY: posY
    });

    // Alert notifikasi dihapus, langsung tutup modal dan reset form
    tutupModal();
    formTambahApar.reset();

    // Otomatis scroll kembali ke tabel modul yang bersangkutan
    const targetSec = document.getElementById(`section-${modulSedangDitambah}`);
    if (targetSec) {
      targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (error) {
    console.error("Gagal menyimpan:", error);
    alert("Gagal menyimpan data: " + error.message);
  } finally {
    btnSimpan.innerText = "Simpan Data";
    btnSimpan.disabled = false;
  }
});

// ==========================================
// RENDER PIN DI DENAH UTAMA & TOGGLE FILTER
// ==========================================
// Kamus warna khusus untuk pin masing-masing modul

function renderPinDenahUtama(dataList) {
  const pinContainer = document.getElementById('pin-container-utama');
  if (!pinContainer) return;
  
  pinContainer.innerHTML = ""; 

  // Ambil warna berdasarkan modul yang sedang aktif (default merah jika tidak ketemu)
  const warnaDasar = warnaPinModul[modulAktif] || 'bg-red-600';

  dataList.forEach(item => {
    if (item.posX && item.posY) {
      const pin = document.createElement('div');
      const isSelected = activePinCode === item.kode;
      
      pin.className = `absolute w-4 h-4 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-transform hover:scale-125 z-25 ${
        isSelected ? 'bg-indigo-600 ring-4 ring-indigo-300 scale-125' : `${warnaDasar} border-2 border-white`
      }`;
      
      pin.style.left = `${item.posX}%`;
      pin.style.top = `${item.posY}%`;
      pin.title = isSelected ? `Klik lagi untuk reset filter` : `Klik untuk filter: ${item.kode}`;

      pin.addEventListener('click', () => {
        if (!modulAktif) return;
        const targetSec = document.getElementById(`section-${modulAktif}`);
        const searchInput = document.getElementById(`search-${modulAktif}`);
        if (!searchInput) return;

        if (activePinCode === item.kode) {
          activePinCode = null;
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
        } else {
          activePinCode = item.kode;
          searchInput.value = item.kode;
          searchInput.dispatchEvent(new Event('input'));
        }
        renderPinDenahUtama(dataList);
      });

      pinContainer.appendChild(pin);
    }
  });
}

// ==========================================
// FUNGSI HAPUS DATA UNIT (Hanya Super Admin)
// ==========================================
window.hapusDataUnit = async function(modul, idDokumen) {
  // Gunakan confirm bawaan browser untuk konfirmasi keamanan ganda
  const konfirmasi = confirm(`Peringatan: Apakah Anda yakin ingin menghapus unit ${modul.toUpperCase()} ini? Data yang dihapus tidak dapat dikembalikan.`);
  
  if (konfirmasi) {
    try {
      // Proses menghapus dokumen langsung dari Firebase
      await deleteDoc(doc(db, modul, idDokumen));
      // Kita tidak perlu alert sukses, karena tabel otomatis refresh berkat onSnapshot
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      alert("Gagal menghapus data: " + error.message);
    }
  }
};

// ==========================================
// LOGIKA MODAL EDIT MASTER UNIT
// ==========================================
const modalEdit = document.getElementById('modal-edit');
const editInputKode = document.getElementById('edit-input-kode');
const editInputPengawas = document.getElementById('edit-input-pengawas');
let idEditMaster = null;
let modulEditMaster = null;

// Fungsi Buka Modal Edit Master
window.bukaModalEdit = function(modul, idDokumen, kodeLama, pengawasLama) {
  modulEditMaster = modul;
  idEditMaster = idDokumen;
  
  if(editInputKode) editInputKode.value = kodeLama || '';
  if(editInputPengawas) editInputPengawas.value = pengawasLama || '';

  if(modalEdit) {
    modalEdit.classList.remove('opacity-0', 'pointer-events-none');
    modalEdit.classList.add('opacity-100');
    const box = document.getElementById('modal-edit-box');
    if(box) { box.classList.remove('scale-95'); box.classList.add('scale-100'); }
  }
};

// Logika Submit Form Edit Master (Mencari ID 'form-edit-data')
const formEditData = document.getElementById('form-edit-data');
if (formEditData) {
  formEditData.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!idEditMaster || !modulEditMaster) return;

    const btnSimpanEdit = document.getElementById('btn-simpan-edit');
    try {
      btnSimpanEdit.innerText = "Menyimpan...";
      btnSimpanEdit.disabled = true;

      // Update Kode dan Pengawas ke Firebase
      const docRef = doc(db, modulEditMaster, idEditMaster);
      await updateDoc(docRef, {
        kode: editInputKode.value.trim(),
        pengawas: editInputPengawas.value.trim()
      });

      // Tutup Modal Edit
      modalEdit.classList.add('opacity-0', 'pointer-events-none');
      modalEdit.classList.remove('opacity-100');

    } catch (error) {
      console.error("Gagal update master:", error);
      alert("Gagal update data: " + error.message);
    } finally {
      btnSimpanEdit.innerText = "Simpan Perubahan";
      btnSimpanEdit.disabled = false;
    }
  });
}

// 1. Deklarasikan Nama Bulan di Paling Atas (Global)
const namaBulanIndo = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// ==========================================
// BUKA MODAL INSPEKSI (DIPANGGIL DARI TABEL)
// ==========================================
window.bukaModalInspeksi = function(modul, idDokumen, kodeUnit) {
  const modalInspeksi = document.getElementById('modal-inspeksi');
  const modalBoxInspeksi = document.getElementById('modal-box-inspeksi');
  const teksJudulInspeksi = document.getElementById('teks-judul-inspeksi');
  const formInspeksiRutin = document.getElementById('form-inspeksi-rutin');
  const inputTglInspeksi = document.getElementById('input-inspeksi-tanggal');
  const inputBulanInspeksi = document.getElementById('input-inspeksi-bulan');

  if (!modalInspeksi || !modalBoxInspeksi) return;

  window.idUnitInspeksi = idDokumen;
  window.modulUnitInspeksi = modul;

  if (teksJudulInspeksi) {
    teksJudulInspeksi.innerText = `${modul.toUpperCase()} - ${kodeUnit}`;
  }

  if (formInspeksiRutin) formInspeksiRutin.reset();

  // Pengisian Tanggal Hari Ini (Format YYYY-MM-DD standar bawaan HTML)
  if (inputTglInspeksi) {
    const hariIni = new Date();
    const dd = String(hariIni.getDate()).padStart(2, '0');
    const mm = String(hariIni.getMonth() + 1).padStart(2, '0');
    const yyyy = hariIni.getFullYear();

    inputTglInspeksi.value = `${yyyy}-${mm}-${dd}`;
    
    // Auto-fill Bulan Inspeksi
    if (inputBulanInspeksi) {
      inputBulanInspeksi.value = `${namaBulanIndo[hariIni.getMonth()]} ${yyyy}`;
    }
  }

  modalInspeksi.classList.remove('opacity-0', 'pointer-events-none');
  modalInspeksi.classList.add('opacity-100');
  modalBoxInspeksi.classList.remove('scale-95');
  modalBoxInspeksi.classList.add('scale-100');
};

// ==========================================
// SUBMIT FORM INSPEKSI (UPDATE KE FIREBASE)
// ==========================================
const formInspeksiRutin = document.getElementById('form-inspeksi-rutin');

if (formInspeksiRutin) {
  formInspeksiRutin.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!window.idUnitInspeksi || !window.modulUnitInspeksi) return;

    const btnKirim = document.getElementById('btn-kirim-inspeksi');
    const inputTgl = document.getElementById('input-inspeksi-tanggal');
    const inputBulan = document.getElementById('input-inspeksi-bulan');

    const tanggalVal = inputTgl.value; // Format bawaan date input selalu "YYYY-MM-DD"
    
    if (!tanggalVal) {
      alert("Pilih tanggal pemeriksaan terlebih dahulu!");
      return;
    }

    // Ubah ke format DD/MM/YYYY saat disimpan ke database agar tampilan tabel rapi
    const parts = tanggalVal.split('-'); // parts[0]=YYYY, parts[1]=MM, parts[2]=DD
    const tglFormatTabel = `${parts[2]}/${parts[1]}/${parts[0]}`;

    try {
      btnKirim.innerText = "Mengirim...";
      btnKirim.disabled = true;

      // Update Data Master di Firestore
      const docRef = doc(db, window.modulUnitInspeksi, window.idUnitInspeksi);
      await updateDoc(docRef, {
        inspeksiTerakhir: tglFormatTabel,
        bulan: inputBulan.value,
        petugas: document.getElementById('user-name').innerText || "Petugas"
      });

      // Tutup Modal
      const modalInspeksi = document.getElementById('modal-inspeksi');
      const modalBoxInspeksi = document.getElementById('modal-box-inspeksi');
      
      modalInspeksi.classList.remove('opacity-100');
      modalInspeksi.classList.add('opacity-0', 'pointer-events-none');
      if (modalBoxInspeksi) {
        modalBoxInspeksi.classList.remove('scale-100');
        modalBoxInspeksi.classList.add('scale-95');
      }

    } catch (error) {
      console.error("Gagal update inspeksi:", error);
      alert("Gagal menyimpan data: " + error.message);
    } finally {
      btnKirim.innerText = "Kirim";
      btnKirim.disabled = false;
    }
  });
}

// ==========================================
// EVENT LISTENER PENUTUP & AUTO FILL MANUAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const inputTgl = document.getElementById('input-inspeksi-tanggal');
  const inputBulan = document.getElementById('input-inspeksi-bulan');
  const btnTutup = document.getElementById('btn-tutup-form-inspeksi');
  const btnReset = document.getElementById('btn-reset-form-inspeksi');
  const modalInspeksi = document.getElementById('modal-inspeksi');
  const modalBoxInspeksi = document.getElementById('modal-box-inspeksi');

  // Auto-fill Bulan jika user mengganti Tanggal secara manual
  if (inputTgl && inputBulan) {
    inputTgl.addEventListener('change', (e) => {
      const tgl = new Date(e.target.value);
      if (!isNaN(tgl.getTime())) {
        inputBulan.value = `${namaBulanIndo[tgl.getMonth()]} ${tgl.getFullYear()}`;
      } else {
        inputBulan.value = "";
      }
    });
  }

  // Tombol Batal / Tutup
  if (btnTutup && modalInspeksi) {
    btnTutup.addEventListener('click', () => {
      modalInspeksi.classList.remove('opacity-100');
      modalInspeksi.classList.add('opacity-0', 'pointer-events-none');
      if (modalBoxInspeksi) {
        modalBoxInspeksi.classList.remove('scale-100');
        modalBoxInspeksi.classList.add('scale-95');
      }
    });
  }

  // Tombol Reset
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (formInspeksiRutin) formInspeksiRutin.reset();
      if (inputBulan) inputBulan.value = "";
    });
  }
});