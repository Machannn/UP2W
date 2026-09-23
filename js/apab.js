window.initApab = function() {
  const btnTambahApab = document.getElementById('btn-tambah-apab');
  const roleAktif = window.roleUserSaatIni || "Akun Tamu";
  if (btnTambahApab) {
    if (roleAktif === 'Superadmin' || roleAktif === 'Super Admin') btnTambahApab.classList.remove('hidden');
    else btnTambahApab.classList.add('hidden');
  }
  if (typeof renderTabelCustom === 'function') renderTabelCustom('apab', roleAktif);
};