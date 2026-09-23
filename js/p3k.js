window.initP3k = function() {
  const btnTambah = document.getElementById('btn-tambah-p3k');
  const roleAktif = window.roleUserSaatIni || "Akun Tamu";
  if (btnTambah) {
    if (roleAktif === 'Superadmin' || roleAktif === 'Super Admin') btnTambah.classList.remove('hidden');
    else btnTambah.classList.add('hidden');
  }
  if (typeof renderTabelCustom === 'function') renderTabelCustom('p3k', roleAktif);
};