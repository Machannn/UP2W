// ==========================================
// INISIALISASI HALAMAN APAR
// ==========================================
window.initApar = function() {
  console.log("Modul APAR berhasil dirender dan diinisialisasi!");

  // 1. Tampilkan Tombol Tambah Sesuai Role (Superadmin / Petugas)
  const btnTambahApar = document.getElementById('btn-tambah-apar');
  const roleAktif = window.roleUserSaatIni || "Akun Tamu";
  
  if (btnTambahApar) {
    if (roleAktif === 'Superadmin' || roleAktif === 'Super Admin') {
      btnTambahApar.classList.remove('hidden');
    } else {
      btnTambahApar.classList.add('hidden');
    }
  }

  // 2. Render Tabel Data APAR Saat Komponen Dimuat
  if (typeof renderTabelCustom === 'function') {
    renderTabelCustom('apar', roleAktif);
  }
};

// ==========================================
// FUNGSI GLOBAL SPESIFIK APAR
// ==========================================

// Buka Modal Form Inspeksi APAR
window.bukaModalInspeksiApar = function(modul, idDokumen, kodeUnit) {
  const modalInspeksi = document.getElementById('modal-inspeksi-apar');
  const modalBox = document.getElementById('modal-box-inspeksi-apar');
  const teksJudul = document.getElementById('teks-judul-inspeksi-apar');
  
  if (teksJudul) teksJudul.innerText = `APAR - ${kodeUnit}`;
  
  // Simpan state aktif dokumen yang sedang diinspeksi
  window.idUnitInspeksi = idDokumen;
  window.modulUnitInspeksi = modul;

  if (modalInspeksi) {
    modalInspeksi.classList.remove('opacity-0', 'pointer-events-none');
    modalInspeksi.classList.add('opacity-100');
    if (modalBox) {
      modalBox.classList.remove('scale-95');
      modalBox.classList.add('scale-100');
    }
  }
};

// Tutup Modal Form Inspeksi APAR
window.tutupModalInspeksiApar = function() {
  const modalInspeksi = document.getElementById('modal-inspeksi-apar');
  const modalBox = document.getElementById('modal-box-inspeksi-apar');
  
  if (modalInspeksi) {
    modalInspeksi.classList.remove('opacity-100');
    modalInspeksi.classList.add('opacity-0', 'pointer-events-none');
    if (modalBox) {
      modalBox.classList.remove('scale-100');
      modalBox.classList.add('scale-95');
    }
  }
};