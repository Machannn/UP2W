// ==========================================
// DASHBOARD CORE (STATE, TABLE, MODAL, FETCH)
// ==========================================
import { db } from "./firebase-config.js";
import { initAuth, aturPrivilege } from "./auth.js";
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

let modulAktif = null; 
let semuaDataK3L = []; 
const daftarModul = ['apar', 'apab', 'firealarm', 'boxhydrant', 'apd', 'pompahydrant', 'p3k', 'cctv'];

window.dbDataLokal = {};
const sortConfig = {};

daftarModul.forEach(m => {
  window.dbDataLokal[m] = [];
  sortConfig[m] = { col: 'kode', dir: 'asc' };
});

let activePinCode = null;
const warnaPinModul = {
  apar: 'bg-red-600',
  apab: 'bg-blue-600',
  firealarm: 'bg-orange-500',
  boxhydrant: 'bg-emerald-600',
  apd: 'bg-purple-600',
  pompahydrant: 'bg-cyan-600',
  p3k: 'bg-pink-600',
  cctv: 'bg-amber-600'
};

const namaBulanIndo = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// ==========================================
// DINAMIS FETCH KOMPONEN HALAMAN
// ==========================================
window.bukaHalaman = async function(namaHalaman) {
  const areaTabel = document.getElementById('area-tabel-komponen');
  const iconContainer = document.getElementById('icon-container');
  if (!areaTabel || !iconContainer) return;

  const semuaIkon = iconContainer.querySelectorAll('button');
  const tombolDiklik = iconContainer.querySelector(`button[data-modul="${namaHalaman}"]`);
  const isSudahAktif = tombolDiklik && tombolDiklik.dataset.aktif === 'true';

  // LOGIKA TOGGLE: Jika ikon yang sedang aktif diklik lagi, tutup tabel dan kembalikan ke denah global
  if (isSudahAktif) {
    areaTabel.innerHTML = ""; // Bersihkan tabel
    modulAktif = null;
    activePinCode = null;

    // Reset semua ikon ke warna normal (berwarna)
    semuaIkon.forEach(item => {
      item.dataset.aktif = 'false';
      item.classList.remove('grayscale', 'opacity-50');
    });

    // Tampilkan kembali pin semua modul di denah utama
    renderSemuaPinGlobal(semuaDataK3L);
    return;
  }

  // JIKA MODUL BARU DIKLIK:
  try {
    const response = await fetch(`components/${namaHalaman}.html`);
    if (!response.ok) throw new Error("Komponen halaman tidak ditemukan");

    const html = await response.text();
    areaTabel.innerHTML = html; // Masukkan HTML tabel tanpa menghapus denah di bawahnya

    // Set status aktif pada ikon yang diklik dan buat ikon lain jadi desaturate
    semuaIkon.forEach(item => {
      if (item.dataset.modul === namaHalaman) {
        item.dataset.aktif = 'true';
        item.classList.remove('grayscale', 'opacity-50');
      } else {
        item.dataset.aktif = 'false';
        item.classList.add('grayscale', 'opacity-50');
      }
    });

    modulAktif = namaHalaman;
    activePinCode = null;

    // Render data tabel dan event listener live search
    renderTabelCustom(namaHalaman, window.roleUserSaatIni);
    setupLiveSearchModul(namaHalaman);

    // Inisialisasi logika khusus modul jika ada
    if (namaHalaman === 'apar' && typeof window.initApar === 'function') {
      window.initApar();
    }

  } catch (error) {
    console.error("Gagal memuat komponen:", error);
    areaTabel.innerHTML = `<h2 class="text-center text-red-500 my-6 font-semibold">Gagal memuat modul ${namaHalaman.toUpperCase()}</h2>`;
  }
};

function setupLiveSearchModul(modul) {
  const sInput = document.getElementById(`search-${modul}`);
  if (sInput) {
    sInput.addEventListener('input', () => {
      renderTabelCustom(modul, window.roleUserSaatIni);
    });
  }
}

// ==========================================
// SORTING & RENDER TABEL
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

  const userRoleElem = document.getElementById('user-role');
  renderTabelCustom(modul, userRoleElem ? userRoleElem.innerText : window.roleUserSaatIni);
};

window.renderTabelCustom = function(modul, userRole) {
  const tbody = document.getElementById(`tbody-${modul}`);
  const searchInput = document.getElementById(`search-${modul}`);
  if (!tbody || !searchInput) return;

  const keyword = searchInput.value.toLowerCase();
  tbody.innerHTML = ""; 

  const dataLokal = window.dbDataLokal[modul] || [];

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
    const kodeUnit = data.kode || '-';
    const tr = document.createElement('tr');
    tr.className = "cursor-pointer hover:bg-gray-50 transition-colors text-center bg-white";
    tr.onclick = () => pilihBarisUnit(modul, kodeUnit);

    tr.innerHTML = `
      <td class="p-4 font-semibold text-gray-800">${kodeUnit}</td>
      <td class="p-4 text-gray-600">${data.pengawas || '-'}</td>
      <td class="p-4 text-gray-600">${data.petugas || '-'}</td>
      <td class="p-4 text-gray-600">${data.inspeksiTerakhir || '-'}</td>
      <td class="p-4 text-gray-600">${data.bulan || '-'}</td>
      <td class="p-4 text-center align-middle" onclick="event.stopPropagation()">
        <button title="Lihat Riwayat Inspeksi" onclick="window.location.href='hasil-inspeksi.html?modul=${modul}&kode=${data.kode || ''}'" class="inline-flex items-center justify-center hover:opacity-80 transition-opacity p-1">
          <img src="assets/icon/icon-print.png" alt="Riwayat" class="w-6 h-6 object-contain block" />
        </button>
      </td>
      <td class="p-4 col-aksi hidden align-middle" onclick="event.stopPropagation()">
        <div class="flex items-center justify-center gap-3 h-full">
          <button title="Isi Form Inspeksi" onclick="bukaModalInspeksi('${modul}', '${data.id}', '${data.kode || ''}')" class="hover:opacity-80 transition-opacity p-1">
            <img src="assets/icon/icon-inspect.png" alt="Inspeksi" class="w-5 h-5 object-contain" />
          </button>
          <button title="Edit Master Unit" onclick="bukaModalEdit('${modul}', '${data.id}', '${data.kode || ''}', '${data.pengawas || ''}')" class="hover:opacity-80 transition-opacity p-1">
            <img src="assets/icon/icon-edit.png" alt="Edit" class="w-5 h-5 object-contain" />
          </button>
          <button title="Hapus Unit" onclick="hapusDataUnit('${modul}', '${data.id}', '${data.kode || ''}')" class="hover:opacity-80 transition-opacity p-1">
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

  const roleAktif = userRole || window.roleUserSaatIni || "";
  if (typeof aturPrivilege === 'function') {
    aturPrivilege(roleAktif);
  }
};

window.pilihBarisUnit = function(modul, kodeUnit) {
  const searchInput = document.getElementById(`search-${modul}`);
  if (!searchInput) return;

  if (searchInput.value.trim().toUpperCase() === kodeUnit.toUpperCase()) {
    searchInput.value = '';
  } else {
    searchInput.value = kodeUnit;
  }
  renderTabelCustom(modul, window.roleUserSaatIni);
};

// ==========================================
// REALTIME LISTENER FIREBASE
// ==========================================
function muatSemuaDataFirebase(userRole) {
  daftarModul.forEach(modul => {
    const colRef = collection(db, modul);
    onSnapshot(colRef, (snapshot) => {
      window.dbDataLokal[modul] = [];
      snapshot.forEach((docSnap) => {
        window.dbDataLokal[modul].push({ id: docSnap.id, modul: modul, ...docSnap.data() });
      });

      semuaDataK3L = [];
      daftarModul.forEach(m => {
        if (window.dbDataLokal[m] && window.dbDataLokal[m].length > 0) {
          semuaDataK3L = semuaDataK3L.concat(window.dbDataLokal[m]);
        }
      });

      if (!modulAktif) {
        renderSemuaPinGlobal(semuaDataK3L);
      } else {
        renderTabelCustom(modulAktif, userRole);
      }
    });
  });
}

function renderSemuaPinGlobal(dataList) {
  const pinContainer = document.getElementById('pin-container-utama');
  if (!pinContainer) return;
  pinContainer.innerHTML = ""; 

  dataList.forEach(item => {
    if (item.posX && item.posY) {
      const pin = document.createElement('div');
      const warnaModul = warnaPinModul[item.modul] || 'bg-red-600';
      pin.className = `absolute w-4 h-4 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-transform hover:scale-125 z-25 ${warnaModul} border-2 border-white`;
      pin.style.left = `${item.posX}%`;
      pin.style.top = `${item.posY}%`;
      pin.title = `[${item.modul.toUpperCase()}] Kode: ${item.kode} - Pengawas: ${item.pengawas || '-'}`;

      pin.addEventListener('click', () => {
        alert(`Unit ${item.modul.toUpperCase()} - Kode: ${item.kode} (Pengawas: ${item.pengawas})`);
      });
      pinContainer.appendChild(pin);
    }
  });
}

function renderPinDenahUtama(dataList) {
  const pinContainer = document.getElementById('pin-container-utama');
  if (!pinContainer) return;
  pinContainer.innerHTML = ""; 

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
// LOGIKA MODAL UNIVERSAL (Tambah, Edit, Hapus, Inspeksi)
// ==========================================
let modulSedangDitambah = 'apar';

document.addEventListener('click', (e) => {
  daftarModul.forEach(modul => {
    if (e.target && e.target.id === `btn-tambah-${modul}`) {
      modulSedangDitambah = modul;
      const modalTambahApar = document.getElementById('modal-tambah-apar');
      const modalBox = document.getElementById('modal-box');
      const formTambahApar = document.getElementById('form-tambah-apar');
      const modalTitle = document.getElementById('modal-title');
      const inputKode = document.getElementById('input-kode-apar');
      const pinMarker = document.getElementById('pin-marker-apar');

      if (modalTitle) modalTitle.innerText = `Tambah Unit ${modul.toUpperCase()} Baru`;
      if (inputKode) inputKode.placeholder = `Contoh: ${modul.toUpperCase()} 01`;

      if (modalTambahApar) {
        modalTambahApar.classList.remove('opacity-0', 'pointer-events-none');
        modalTambahApar.classList.add('opacity-100');
      }
      if (modalBox) {
        modalBox.classList.remove('scale-95');
        modalBox.classList.add('scale-100');
      }
      if (formTambahApar) formTambahApar.reset();
      if (pinMarker) pinMarker.classList.add('hidden');
    }
  });

  if (e.target && (e.target.id === 'btn-tutup-tambah-apar' || e.target.id === 'btn-batal-tambah-apar')) {
    const modalTambahApar = document.getElementById('modal-tambah-apar');
    const modalBox = document.getElementById('modal-box');
    if (modalTambahApar) {
      modalTambahApar.classList.remove('opacity-100');
      modalTambahApar.classList.add('opacity-0', 'pointer-events-none');
    }
    if (modalBox) {
      modalBox.classList.remove('scale-100');
      modalBox.classList.add('scale-95');
    }
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'form-tambah-apar') {
    e.preventDefault();
    const inputKode = document.getElementById('input-kode-apar');
    const inputPengawas = document.getElementById('input-pengawas-apar');
    const inputPosX = document.getElementById('input-pos-x-apar');
    const inputPosY = document.getElementById('input-pos-y-apar');
    const btnSimpan = e.target.querySelector('button[type="submit"]');

    if (!inputPosX || !inputPosX.value || !inputPosY || !inputPosY.value) {
      alert("Silakan klik titik lokasi pada gambar denah terlebih dahulu!");
      return;
    }

    try {
      if (btnSimpan) {
        btnSimpan.innerText = "Menyimpan...";
        btnSimpan.disabled = true;
      }

      await addDoc(collection(db, modulSedangDitambah), {
        kode: inputKode.value.trim(),
        pengawas: inputPengawas.value.trim(),
        petugas: "-",           
        inspeksiTerakhir: "-", 
        bulan: "-",
        posX: inputPosX.value,
        posY: inputPosY.value
      });

      const modalTambahApar = document.getElementById('modal-tambah-apar');
      if (modalTambahApar) {
        modalTambahApar.classList.remove('opacity-100');
        modalTambahApar.classList.add('opacity-0', 'pointer-events-none');
      }
      e.target.reset();

      const targetSec = document.getElementById(`section-${modulSedangDitambah}`);
      if (targetSec) targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
      console.error("Gagal menyimpan:", error);
      alert("Gagal menyimpan data: " + error.message);
    } finally {
      if (btnSimpan) {
        btnSimpan.innerText = "Simpan Data";
        btnSimpan.disabled = false;
      }
    }
  }
});

document.addEventListener('click', (e) => {
  const denahContainer = document.getElementById('denah-container-apar');
  const pinMarker = document.getElementById('pin-marker-apar');
  const inputPosX = document.getElementById('input-pos-x-apar');
  const inputPosY = document.getElementById('input-pos-y-apar');

  if (denahContainer && denahContainer.contains(e.target)) {
    const rect = denahContainer.getBoundingClientRect();
    const xPiksel = e.clientX - rect.left;
    const yPiksel = e.clientY - rect.top;

    const xPersen = (xPiksel / rect.width) * 100;
    const yPersen = (yPiksel / rect.height) * 100;

    if (inputPosX) inputPosX.value = xPersen.toFixed(2);
    if (inputPosY) inputPosY.value = yPersen.toFixed(2);

    if (pinMarker) {
      pinMarker.style.left = `${xPersen}%`;
      pinMarker.style.top = `${yPersen}%`;
      pinMarker.classList.remove('hidden');
    }
  }
});

// ==========================================
// MODAL EDIT, HAPUS, & INSPEKSI
// ==========================================
let idEditMaster = null;
let modulEditMaster = null;
let koordinatEditBaru = { x: null, y: null };

function tutupModalEditMaster() {
  const modalEdit = document.getElementById('modal-edit');
  const modalEditBox = document.getElementById('modal-edit-box');
  if (modalEdit) {
    modalEdit.classList.remove('opacity-100');
    modalEdit.classList.add('opacity-0', 'pointer-events-none');
    if (modalEditBox) {
      modalEditBox.classList.remove('scale-100');
      modalEditBox.classList.add('scale-95');
    }
  }
}

window.bukaModalEdit = function(modul, idDokumen, kodeLama, pengawasLama) {
  const modalEdit = document.getElementById('modal-edit');
  const modalEditBox = document.getElementById('modal-edit-box');
  const editInputKode = document.getElementById('edit-input-kode');
  const editInputPengawas = document.getElementById('edit-input-pengawas');
  const imgDenahEdit = document.getElementById('img-denah-edit');
  const pinEditLokasi = document.getElementById('pin-edit-lokasi');

  modulEditMaster = modul;
  idEditMaster = idDokumen;

  if (editInputKode) editInputKode.value = kodeLama || '';
  if (editInputPengawas) editInputPengawas.value = pengawasLama || '';
  if (imgDenahEdit) imgDenahEdit.src = 'assets/bg/denah-k3l.png';

  const dataLokalModul = (window.dbDataLokal && window.dbDataLokal[modul]) ? window.dbDataLokal[modul] : [];
  const dataUnit = dataLokalModul.find(item => item.id === idDokumen);

  if (dataUnit && dataUnit.posX !== undefined && dataUnit.posY !== undefined) {
    koordinatEditBaru = { x: dataUnit.posX, y: dataUnit.posY };
    if (pinEditLokasi) {
      pinEditLokasi.style.left = `${dataUnit.posX}%`;
      pinEditLokasi.style.top = `${dataUnit.posY}%`;
      pinEditLokasi.classList.remove('hidden');
    }
  } else {
    koordinatEditBaru = { x: null, y: null };
    if (pinEditLokasi) pinEditLokasi.classList.add('hidden');
  }

  if (modalEdit) {
    modalEdit.classList.remove('opacity-0', 'pointer-events-none');
    modalEdit.classList.add('opacity-100');
    if (modalEditBox) {
      modalEditBox.classList.remove('scale-95');
      modalEditBox.classList.add('scale-100');
    }
  }
};

document.addEventListener('click', (e) => {
  const containerDenahEdit = document.getElementById('container-denah-edit');
  const pinEditLokasi = document.getElementById('pin-edit-lokasi');
  if (containerDenahEdit && containerDenahEdit.contains(e.target)) {
    const rect = containerDenahEdit.getBoundingClientRect();
    const xPixel = e.clientX - rect.left;
    const yPixel = e.clientY - rect.top;
    const xPercent = Number(((xPixel / rect.width) * 100).toFixed(2));
    const yPercent = Number(((yPixel / rect.height) * 100).toFixed(2));

    koordinatEditBaru = { x: xPercent, y: yPercent };
    if (pinEditLokasi) {
      pinEditLokasi.style.left = `${xPercent}%`;
      pinEditLokasi.style.top = `${yPercent}%`;
      pinEditLokasi.classList.remove('hidden');
    }
  }

  if ((e.target && e.target.id === 'btn-tutup-edit') || (e.target && e.target.id === 'btn-batal-edit')) {
    tutupModalEditMaster();
  }
});

const formEditData = document.getElementById('form-edit-data');
if (formEditData) {
  formEditData.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!idEditMaster || !modulEditMaster) return;

    const editInputKode = document.getElementById('edit-input-kode');
    const editInputPengawas = document.getElementById('edit-input-pengawas');

    try {
      const docRef = doc(db, modulEditMaster, idEditMaster);
      await updateDoc(docRef, {
        kode: editInputKode.value.trim().toUpperCase(),
        pengawas: editInputPengawas.value.trim(),
        ...(koordinatEditBaru.x !== null ? { posX: koordinatEditBaru.x, posY: koordinatEditBaru.y } : {})
      });

      tutupModalEditMaster();
    } catch (error) {
      console.error("Gagal update master unit:", error);
      alert("Gagal menyimpan perubahan: " + error.message);
    }
  });
}

let idUnitAkanDihapus = null;
let modulUnitAkanDihapus = null;

function tutupModalHapus() {
  const modalHapus = document.getElementById('modal-hapus');
  const modalHapusBox = document.getElementById('modal-hapus-box');
  if (modalHapus) {
    modalHapus.classList.remove('opacity-100');
    modalHapus.classList.add('opacity-0', 'pointer-events-none');
    if (modalHapusBox) modalHapusBox.classList.remove('scale-100');
  }
}

window.hapusDataUnit = function(modul, idDokumen, kodeUnit) {
  idUnitAkanDihapus = idDokumen;
  modulUnitAkanDihapus = modul;
  const teksUnitHapus = document.getElementById('teks-unit-hapus');
  if (teksUnitHapus) teksUnitHapus.innerText = kodeUnit || modul.toUpperCase();

  const modalHapus = document.getElementById('modal-hapus');
  const modalHapusBox = document.getElementById('modal-hapus-box');
  if (modalHapus) {
    modalHapus.classList.remove('opacity-0', 'pointer-events-none');
    modalHapus.classList.add('opacity-100');
    if (modalHapusBox) modalHapusBox.classList.add('scale-100');
  }
};

document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'btn-batal-hapus') tutupModalHapus();
  if (e.target && e.target.id === 'btn-konfirmasi-hapus') {
    if (!idUnitAkanDihapus || !modulUnitAkanDihapus) return;
    try {
      e.target.innerText = "Menghapus...";
      e.target.disabled = true;
      await deleteDoc(doc(db, modulUnitAkanDihapus, idUnitAkanDihapus));
      tutupModalHapus();
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      alert("Gagal menghapus: " + error.message);
    } finally {
      e.target.innerText = "Ya, Hapus";
      e.target.disabled = false;
    }
  }
});

window.bukaModalInspeksi = function(modul, idDokumen, kodeUnit) {
  const modalInspeksi = document.getElementById('modal-inspeksi-apar');
  const modalBoxInspeksi = document.getElementById('modal-box-inspeksi-apar');
  const teksJudulInspeksi = document.getElementById('teks-judul-inspeksi-apar');
  const inputTglInspeksi = document.getElementById('input-tanggal-inspeksi-apar');
  const inputBulanInspeksi = document.getElementById('input-bulan-inspeksi-apar');

  if (!modalInspeksi) return;

  window.idUnitInspeksi = idDokumen;
  window.modulUnitInspeksi = modul;

  if (teksJudulInspeksi) teksJudulInspeksi.innerText = `${modul.toUpperCase()} - ${kodeUnit}`;

  const hariIni = new Date();
  const dd = String(hariIni.getDate()).padStart(2, '0');
  const mm = String(hariIni.getMonth() + 1).padStart(2, '0');
  const yyyy = hariIni.getFullYear();

  if (inputTglInspeksi) inputTglInspeksi.value = `${yyyy}-${mm}-${dd}`;
  if (inputBulanInspeksi) inputBulanInspeksi.value = `${namaBulanIndo[hariIni.getMonth()]} ${yyyy}`;

  modalInspeksi.classList.remove('opacity-0', 'pointer-events-none');
  modalInspeksi.classList.add('opacity-100');
  if (modalBoxInspeksi) modalBoxInspeksi.classList.remove('scale-95');
};

// Inisialisasi Auth saat core dimuat
initAuth((role) => {
  muatSemuaDataFirebase(role);
});