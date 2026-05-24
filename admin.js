import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, updateDoc, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTlpPTt_dm5wN0fXdISsPHpohsjj1mik8",
  authDomain: "kedai-warmindo-ala-bale.firebaseapp.com",
  projectId: "kedai-warmindo-ala-bale",
  storageBucket: "kedai-warmindo-ala-bale.firebasestorage.app",
  messagingSenderId: "279745964839",
  appId: "1:279745964839:web:49f378c993b8adaa97d702",
  measurementId: "G-CGPM79XTDJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const dataRef = doc(db, "data", "main");

let menu = [],settings = {},orders = [],driverChart = null;

onSnapshot(dataRef, (snap) => {
  if(snap.exists()){
    const data = snap.data();
    menu = data.menu || [];
    settings = {...settings,...data.settings};
    document.getElementById('storeName').textContent = settings.storeName || 'Admin Panel';
    document.getElementById('settingStoreName').value = settings.storeName || '';
    document.getElementById('settingWA').value = settings.whatsapp || '';
    document.getElementById('settingAddress').value = settings.address || '';
    renderDriverList();
  }
  renderCategories();
  renderProducts();
});

const ordersRef = collection(db, "orders");
const q = query(ordersRef, orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  orders = [];
  snap.forEach(doc=>orders.push({id:doc.id,...doc.data()}));
  renderAdminOrders();
  if(document.getElementById('adminReports').classList.contains('active')){
    renderReports();
  }
});

window.showAdminTab = function(tab){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('admin'+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add('active');
  event.target.classList.add('active');
  if(tab==='orders') renderAdminOrders();
  if(tab==='reports') renderReports();
}

function renderAdminOrders(){
  document.getElementById('adminOrders').innerHTML = orders.slice(0,50).map(o=>`
    <div class="order-card">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <div>
          <b>${o.nama}</b> - ${o.orderType === 'delivery'? 'Delivery' : 'Dine In'}<br>
          <small style="color:var(--muted)">${o.phone}</small><br>
          <small style="color:var(--muted)">${o.createdAt?.seconds?new Date(o.createdAt.seconds*1000).toLocaleString('id-ID'):''}</small>
          ${o.driverName? `<br><small style="color:#4CAF50">Driver: ${o.driverName}</small>` : ''}
        </div>
        <div style="text-align:right">
          <b style="color:var(--gold)">Rp${o.total.toLocaleString('id-ID')}</b><br>
          <small>${o.paymentMethod}</small><br>
          <span class="status-badge status-${o.status}">${o.status}</span>
        </div>
      </div>
      ${o.proofPhoto? `<div style="margin-top:10px"><small>Bukti Transfer:</small><br><img src="${o.proofPhoto}" style="width:100%;max-width:200px;border-radius:8px;margin-top:5px;cursor:pointer" onclick="window.open('${o.proofPhoto}')"></div>` : ''}
      <button onclick="printReceipt('${o.id}')" class="btn-secondary" style="margin-top:10px;width:auto;padding:8px 12px">Print Struk</button>
      ${o.orderType === 'delivery' && o.status!== 'done' && o.status!== 'cancelled'? `<div style="margin-top:10px;display:flex;gap:8px"><select id="driverSelect-${o.id}" style="flex:1"><option value="">Pilih Driver</option>${(settings.drivers || []).map(d=>`<option value="${d.id}|${d.name}" ${o.driverId===d.id?'selected':''}>${d.name} - ${d.phone}</option>`).join('')}</select><button onclick="assignDriver('${o.id}')" class="btn-secondary" style="width:auto;padding:8px 12px">Assign</button></div>` : ''}
      <div style="margin-top:10px"><select onchange="updateOrderStatus('${o.id}',this.value)" style="width:100%"><option value="pending" ${o.status==='pending'?'selected':''}>Pending</option><option value="waiting_confirm" ${o.status==='waiting_confirm'?'selected':''}>Menunggu Konfirmasi</option><option value="process" ${o.status==='process'?'selected':''}>Diproses</option><option value="done" ${o.status==='done'?'selected':''}>Selesai</option><option value="cancelled" ${o.status==='cancelled'?'selected':''}>Dibatalkan</option></select></div>
    </div>
  `).join('') || '<p style="color:var(--muted)">Belum ada pesanan</p>';
}

window.printReceipt = async function(orderId){
  const order = orders.find(o=>o.id===orderId);
  if(!order) return;

  const receipt = `
${settings.storeName || 'TOKO'}
${settings.address || ''}

${new Date(order.createdAt.seconds*1000).toLocaleString('id-ID')}
Customer: ${order.nama}
${order.items.map(i=>`${i.name} x${i.qty} = Rp${(i.price*i.qty).toLocaleString('id-ID')}`).join('\n')}

Subtotal: Rp${order.subtotal.toLocaleString('id-ID')}
Diskon: -Rp${order.discount.toLocaleString('id-ID')}
Pajak: Rp${order.tax.toLocaleString('id-ID')}
Biaya: Rp${order.serviceFee.toLocaleString('id-ID')}
TOTAL: Rp${order.total.toLocaleString('id-ID')}

Terima Kasih!
  `;

  if('bluetooth' in navigator){
    try{
      const device = await navigator.bluetooth.requestDevice({filters:[{services:['000018f0-0000-1000-8000-00805f9b34fb']}]});
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      const encoder = new TextEncoder();
      await characteristic.writeValue(encoder.encode(receipt));
      alert('Struk terkirim ke printer');
    }catch(e){
      alert('Print gagal: ' + e.message);
    }
  }else{
    const w = window.open();
    w.document.write('<pre>'+receipt+'</pre>');
    w.print();
  }
}

window.assignDriver = async function(orderId){
  const select = document.getElementById(`driverSelect-${orderId}`);
  const value = select.value;
  if(!value){ alert('Pilih driver dulu'); return; }
  const [driverId, driverName] = value.split('|');
  await updateDoc(doc(db, "orders", orderId), {driverId: driverId,driverName: driverName,status: 'process'});
  alert(`Driver ${driverName} berhasil di-assign`);
}

window.updateOrderStatus = async function(orderId, status){
  await updateDoc(doc(db, "orders", orderId), {status: status});
}

function renderCategories(){
  document.getElementById('categoryList').innerHTML = (settings.categories||[]).map((c,i)=>`<div style="display:flex;gap:10px;margin-bottom:10px"><input type="text" value="${c}" onchange="updateCategory(${i},this.value)"><button onclick="removeCategory(${i})" style="width:auto;background:#f44336">Hapus</button></div>`).join('');
}

function renderProducts(){
  document.getElementById('productList').innerHTML = menu.map((p,i)=>`
    <div style="background:var(--panel);padding:16px;border-radius:8px;margin-bottom:10px">
      <img src="${p.image || 'https://via.placeholder.com/100'}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;margin-bottom:10px">
      <input type="file" accept="image/*" onchange="uploadProductImage(${i},this)">
      <input type="text" value="${p.name}" placeholder="Nama" onchange="updateProduct(${i},'name',this.value)">
      <input type="number" value="${p.price}" placeholder="Harga" onchange="updateProduct(${i},'price',this.value)">
      <input type="number" value="${p.stock?? ''}" placeholder="Stok" onchange="updateProduct(${i},'stock',this.value)">
      <select onchange="updateProduct(${i},'category',this.value)">${(settings.categories||[]).map(c=>`<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}</select>
      <button onclick="removeProduct(${i})" style="background:#f44336;margin-top:10px">Hapus</button>
    </div>`).join('');
}

window.uploadProductImage = async function(index, input){
  const file = input.files[0];
  if(!file) return;
  const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  menu[index].image = url;
  saveMenu();
}

window.addCategory = function(){
  const name = prompt('Nama kategori baru:');
  if(!name) return;
  const categories = settings.categories || [];
  categories.push(name);
  updateSetting('categories', categories);
}

window.removeCategory = function(i){
  const categories = settings.categories;
  categories.splice(i,1);
  updateSetting('categories', categories);
}

window.updateCategory = function(i,val){
  const categories = settings.categories;
  categories[i] = val;
  updateSetting('categories', categories);
}

window.addProduct = function(){
  menu.push({id:Date.now().toString(),name:'',price:0,stock:0,category:settings.categories[0]||'',image:''});
  saveMenu();
}

window.removeProduct = function(i){
  menu.splice(i,1);
  saveMenu();
}

window.updateProduct = function(i,key,val){
  menu[i][key] = key==='price'||key==='stock'?parseInt(val)||0:val;
  saveMenu();
}

async function saveMenu(){
  await updateDoc(dataRef, {menu:menu});
}

async function updateSetting(key,val){
  await updateDoc(dataRef, {[`settings.${key}`]:val});
}

window.saveSettings = function(){
  updateSetting('storeName', document.getElementById('settingStoreName').value);
  updateSetting('whatsapp', document.getElementById('settingWA').value);
  updateSetting('address', document.getElementById('settingAddress').value);
  alert('Setting tersimpan');
}

function renderDriverList(){
  const drivers = settings.drivers || [];
  document.getElementById('driverList').innerHTML = drivers.map((d,i)=>`<div class="driver-card" style="display:flex;justify-content:space-between;align-items:center"><div><b>${d.name}</b><br><small style="color:var(--muted)">${d.phone}</small></div><div style="display:flex;gap:8px"><button onclick="copyDriverLink('${d.id}','${d.name}')" style="background:#4CAF50;border:none;padding:8px 12px;border-radius:6px;color:#fff;font-size:12px">Link Dashboard</button><button onclick="removeDriver(${i})" style="background:none;border:none;color:#ff4444">Hapus</button></div></div>`).join('') || '<p style="color:var(--muted)">Belum ada driver</p>';
}

window.addDriver = function(){
  const name = document.getElementById('driverName').value.trim();
  const phone = document.getElementById('driverPhone').value.trim();
  if(!name ||!phone) return;
  const drivers = settings.drivers || [];
  drivers.push({id: Date.now().toString(),name: name,phone: phone.replace(/^0/, '62')});
  updateSetting('drivers', drivers);
  document.getElementById('driverName').value = '';
  document.getElementById('driverPhone').value = '';
}

window.removeDriver = function(index){
  const drivers = settings.drivers || [];
  drivers.splice(index, 1);
  updateSetting('drivers', drivers);
}

window.copyDriverLink = function(driverId, driverName){
  const link = `${window.location.origin}/driver-dashboard.html?driver=${driverId}&name=${encodeURIComponent(driverName)}`;
  navigator.clipboard.writeText(link);
  const phone = settings.drivers.find(d=>d.id===driverId).phone;
  const msg = `Halo ${driverName}, ini link dashboard driver kamu:\n${link}\n\nSimpan link ini ya.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function setLast7Days(){
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  document.getElementById('reportStartDate').value = start.toISOString().split('T')[0];
  document.getElementById('reportEndDate').value = end.toISOString().split('T')[0];
  renderReports();
}

function renderReports(){
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;
  if(!startDate ||!endDate){ setLast7Days(); return; }

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  const filteredOrders = orders.filter(o=>{
    if(o.status!== 'done' ||!o.completedAt) return false;
    const orderDate = o.completedAt.seconds? new Date(o.completedAt.seconds*1000) : new Date(o.completedAt);
    return orderDate >= start && orderDate <= end;
  });

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum,o)=>sum+o.total,0);
  const totalDelivery = filteredOrders.filter(o=>o.orderType==='delivery').length;
  const totalDineIn = filteredOrders.filter(o=>o.orderType==='dinein').length;

  document.getElementById('reportSummary').innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px"><div style="background:var(--panel);padding:16px;border-radius:12px;border:1px solid var(--border)"><small style="color:var(--muted)">Total Order</small><h2 style="color:var(--gold)">${totalOrders}</h2></div><div style="background:var(--panel);padding:16px;border-radius:12px;border:1px solid var(--border)"><small style="color:var(--muted)">Total Omzet</small><h2 style="color:var(--gold)">Rp${totalRevenue.toLocaleString('id-ID')}</h2></div><div style="background:var(--panel);padding:16px;border-radius:12px;border:1px solid var(--border)"><small style="color:var(--muted)">Delivery</small><h2>${totalDelivery}</h2></div><div style="background:var(--panel);padding:16px;border-radius:12px;border:1px solid var(--border)"><small style="color:var(--muted)">Dine In</small><h2>${totalDineIn}</h2></div></div>`;

  const byDriver = {};
  filteredOrders.forEach(o=>{
    if(o.orderType!== 'delivery') return;
    const driverName = o.driverName || 'Unassigned';
    if(!byDriver[driverName]) byDriver[driverName] = {orders:0, revenue:0};
    byDriver[driverName].orders++;
    byDriver[driverName].revenue += o.total;
  });

  const byDate = {};
  filteredOrders.forEach(o=>{
    const date = o.completedAt.seconds? new Date(o.completedAt.seconds*1000).toISOString().split('T')[0]: new Date(o.completedAt).toISOString().split('T')[0];
    if(!byDate[date]) byDate[date] = {orders:0, revenue:0};
    byDate[date].orders++;
    byDate[date].revenue += o.total;
  });

  renderDriverChart(byDate, startDate, endDate);
  renderDriverListReport(byDriver, filteredOrders);
}

function renderDriverChart(byDate, startDate, endDate){
  const ctx = document.getElementById('driverChart').getContext('2d');
  if(driverChart) driverChart.destroy();

  const dateLabels = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while(current <= end){
    dateLabels.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  const ordersPerDay = dateLabels.map(d => byDate[d]?.orders || 0);
  const revenuePerDay = dateLabels.map(d => byDate[d]?.revenue || 0);

  driverChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dateLabels.map(d => new Date(d).toLocaleDateString('id-ID', {day:'2digit', month:'short'})),
      datasets: [
        {label: 'Jumlah Order',data: ordersPerDay,borderColor: '#D4AF37',backgroundColor: 'rgba(212,175,55,0.2)',tension: 0.3,fill: true},
        {label: 'Omzet (Rp)',data: revenuePerDay,borderColor: '#4CAF50',backgroundColor: 'rgba(76,175,80,0.2)',tension: 0.3,fill: true,yAxisID: 'y1'}
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#fff' }}},
      scales: {
        x: { ticks: { color: '#9aa0a6' }, grid: { color: '#2a2f38' } },
        y: { ticks: { color: '#9aa0a6' }, grid: { color: '#2a2f38' } },
        y1: {position: 'right',ticks:{color: '#9aa0a6',callback: value => 'Rp' + (value/1000) + 'k'},grid: { display: false }}
      }
    }
  });
}

function renderDriverListReport(byDriver, filteredOrders){
  document.getElementById('reportByDriver').innerHTML = `<h4 style="margin-bottom:12px">Performa Driver</h4>${Object.keys(byDriver).length? Object.keys(byDriver).map(driver=>`<div class="driver-card" style="display:flex;justify-content:space-between;align-items:center"><div><b>${driver}</b><br><small style="color:var(--muted)">${byDriver[driver].orders} order selesai</small></div><div style="text-align:right"><b style="color:var(--gold)">Rp${byDriver[driver].revenue.toLocaleString('id-ID')}</b></div></div>`).join('') : '<p style="color:var(--muted)">Belum ada data driver</p>'}<h4 style="margin:24px 0 12px">Detail Order</h4>${filteredOrders.map(o=>`<div class="order-card" style="font-size:14px"><div style="display:flex;justify-content:space-between"><div><b>#${o.id.slice(-6)}</b> - ${o.nama}<br><small style="color:var(--muted)">${o.driverName || 'Dine In'}</small></div><div style="text-align:right"><b>Rp${o.total.toLocaleString('id-ID')}</b><br><small style="color:var(--muted)">${o.completedAt?.seconds?new Date(o.completedAt.seconds*1000).toLocaleString('id-ID'):'-'}</small></div></div></div>`).join('') || '<p style="color:var(--muted)">Tidak ada data</p>'}`;
}

window.exportCSV = function(){
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  const filteredOrders = orders.filter(o=>{
    if(o.status!== 'done' ||!o.completedAt) return false;
    const orderDate = o.completedAt.seconds? new Date(o.completedAt.seconds*1000) : new Date(o.completedAt);
    return orderDate >= start && orderDate <= end;
  });

  let csv = 'Order ID,Nama,Phone,Type,Driver,Total,Status,Waktu Selesai\n';
  filteredOrders.forEach(o=>{
    const time = o.completedAt?.seconds?new Date(o.completedAt.seconds*1000).toLocaleString('id-ID'):'';
    csv += `${o.id},${o.nama},${o.phone},${o.orderType},${o.driverName||'-'},${o.total},${o.status},${time}\n`;
  });

  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-${startDate}_to_${endDate}.csv`;
  a.click();
}

setLast7Days();