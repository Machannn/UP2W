window.initApd = function() {
  const btnTambahApd = document.getElementById('btn-tambah-apd');
  const roleAktif = window.roleUserSaatIni || "Akun Tamu";
  if (btnTambahApd) {
    if (roleAktif === 'Superadmin' || roleAktif === 'Super Admin') btnTambahApd.classList.remove('hidden');
    else btnTambahApd.classList.add('hidden');
  }
  if (typeof renderTabelCustom === 'function') renderTabelCustom('apd', roleAktif);
};