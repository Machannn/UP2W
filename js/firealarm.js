window.initFirealarm = function() {
  const btnTambah = document.getElementById('btn-tambah-firealarm');
  const roleAktif = window.roleUserSaatIni || "Akun Tamu";
  if (btnTambah) {
    if (roleAktif === 'Superadmin' || roleAktif === 'Super Admin') btnTambah.classList.remove('hidden');
    else btnTambah.classList.add('hidden');
  }
  if (typeof renderTabelCustom === 'function') renderTabelCustom('firealarm', roleAktif);
};