// CEK LOGIN, SESI, & PRIVILEGE
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const userNameElem = document.getElementById('user-name');
const userRoleElem = document.getElementById('user-role');
const btnLogout = document.getElementById('btn-logout');

const PERMISSIONS = {
  "Super Admin": { canAdd: true, canEdit: true, canDelete: true },
  "Petugas": { canAdd: false, canEdit: true, canDelete: false },
  "Akun Tamu": { canAdd: false, canEdit: false, canDelete: false },
  "Guest": { canAdd: false, canEdit: false, canDelete: false }
};

export function aturPrivilege(role) {
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

// Inisialisasi Auth Check
export function initAuth(callbackMuatData) {
  const isGuest = sessionStorage.getItem('isGuest');

  if (isGuest === 'true') {
    window.roleUserSaatIni = "Akun Tamu";
    userNameElem.innerText = "Guest Login";
    userRoleElem.innerText = "Akun Tamu";
    aturPrivilege("Akun Tamu");
    if (typeof callbackMuatData === 'function') callbackMuatData("Akun Tamu");
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

          window.roleUserSaatIni = userRole;
          aturPrivilege(userRole);
          if (typeof callbackMuatData === 'function') callbackMuatData(userRole);
        } catch (error) {
          console.error("Gagal mengambil data Firestore:", error);
          window.roleUserSaatIni = "Guest";
          aturPrivilege("Guest");
          if (typeof callbackMuatData === 'function') callbackMuatData("Guest");
        }
      } else {
        window.location.href = "index.html";
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      sessionStorage.removeItem('isGuest');
      await signOut(auth);
      window.location.href = "index.html";
    });
  }
}