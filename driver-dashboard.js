import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTlpPTt_dm5wN0fXdISsPHpohsjj1mik8",
  authDomain: "kedai-warmindo-ala-bale.firebaseapp.com",
  projectId: "kedai-warmindo-ala-bale",
  storageBucket: "kedai-warmindo-ala-bale.firebasestorage.app",
  messagingSenderId: "279745964839",
  appId: "1:279745964839:web:49f378c993b8adaa97d702"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const driverId = urlParams.get('driver');
const driverName = urlParams.get('name');

document.getElementById('driverName').textContent = driverName || 'Driver';

const ordersRef = collection(db, "orders");
const qActive = query(ordersRef, where("driverId", "==", driverId), where("status", "in", ["process", "pending"]));
const qHistory = query(ordersRef, where("driverId", "==", driverId), where("status", "==", "done"));

onSnapshot(qActive, (snap) => {
  let html = '';
  snap.forEach(doc=>{
    const o = doc.data();
    html += `
      <div class="order-card">
        <b>${o.nama}</b><br>
        <small>${o.phone}</small><br>
        <small style="color:var(--muted)">${o.address || 'Dine In'}</small><br>
        <div style="margin:10px 0">
          ${o.items.map(i=>`${i.name} x${i.qty}`).join('<br>')}
        </div>
        <b style="color:var(--gold)">Rp${o.total.toLocaleString('id-ID')}</b><br>
        <button onclick="updateStatus('${doc.id}', 'done')" class="btn btn-primary" style="margin-top:10px">Selesai Antar</button>
      </div>
    `;
  });
  document.getElementById('driverActive').innerHTML = html || '<p class="empty">Tidak ada order aktif</p>';
});

onSnapshot(qHistory, (snap) => {
  let html = '';
  snap.forEach(doc=>{
    const o = doc.data();
    html += `
      <div class="order-card">
        <b>${o.nama}</b><br>
        <small style="color:var(--muted)">${o.completedAt?.seconds?new Date(o.completedAt.seconds*1000).toLocaleString('id-ID'):''}</small><br>
        <b>Rp${o.total.toLocaleString('id-ID')}</b>
      </div>
    `;
  });
  document.getElementById('driverHistory').innerHTML = html || '<p class="empty">Belum ada riwayat</p>';
});

window.showDriverTab = function(tab){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('driver'+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add('active');
  event.target.classList.add('active');
}

window.updateStatus = async function(orderId, status){
  await updateDoc(doc(db, "orders", orderId), {
    status: status,
    completedAt: new Date()
  });
  alert('Order selesai');
}