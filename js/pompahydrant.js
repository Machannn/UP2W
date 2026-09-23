window.initPompahydrant = function() {
  const btnTambah = document.getElementById('btn-tambah-pompahydrant');
  const roleAktif = window.roleUserSaatIni || "Akun Tamu";
  if (btnTambah) {
    if (roleAktif === 'Superadmin' || roleAktif === 'Super Admin') btnTambah.classList.remove('hidden');
    else btnTambah.classList.add('hidden');
  }
  if (typeof renderTabelCustom === 'function') renderTabelCustom('pompahydrant', roleAktif);
};