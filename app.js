import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, addDoc, collection, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBfLpPtf_dm5wN6FdISaSPphojsijJmiK8",
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

let menu = [], settings = {}, cart = [];

onSnapshot(dataRef, (snap) => {
  if(snap.exists()){
    const data = snap.data();
    menu = data.menu || [];
    settings = data.settings || {};
    document.getElementById('storeName').textContent = settings.storeName || 'Toko';
    renderMenu();
  }
});

function renderMenu(){
  const grouped = {};
  menu.forEach(p=>{if(!grouped[p.category]) grouped[p.category] = [];grouped[p.category].push(p);});
  let html = '';
  for(let cat in grouped){
    html += `<div class="category">${cat}</div>`;
    grouped[cat].forEach(p=>{
      const stock = p.stock?? '∞';
      const stockColor = (p.stock!== undefined && p.stock < 5)? 'color:#ff4444' : 'color:var(--muted)';
      html += `
        <div class="product">
          <img src="${p.image || 'https://via.placeholder.com/60'}" style="width:60px;height:60px;object-fit:cover;border-radius:8px">
          <div style="flex:1;margin-left:12px">
            <b>${p.name}</b><br>
            <small style="color:var(--muted)">Rp${p.price.toLocaleString('id-ID')}</small><br>
            <small style="${stockColor}">Stok: ${stock}</small>
          </div>
          <button class="btn btn-primary" onclick="addToCart('${p.id}')" ${p.stock === 0? 'disabled' : ''}>+</button>
        </div>`;
    });
  }
  document.getElementById('menuList').innerHTML = html || '<p style="color:var(--muted)">Menu kosong</p>';
}

window.addToCart = function(productId){
  const product = menu.find(p=>p.id===productId);
  if(product.stock!== undefined && product.stock <= 0){alert('Stok habis');return;}
  const existing = cart.find(c=>c.id===productId);
  if(existing){existing.qty++;} else {cart.push({...product,qty:1});}
  updateCartBar();
}

function updateCartBar(){
  const totalQty = cart.reduce((sum,i)=>sum+i.qty,0);
  const subtotal = cart.reduce((sum,i)=>sum+i.price*i.qty,0);
  document.getElementById('cartCount').textContent = totalQty + ' item';
  document.getElementById('cartTotal').textContent = 'Rp' + subtotal.toLocaleString('id-ID');
  document.getElementById('cartBar').style.display = totalQty>0?'block':'none';
}

window.openCheckout = function(){
  calcCharges();
  document.getElementById('checkoutModal').style.display = 'flex';
}

window.calcCharges = function(){
  const subtotal = cart.reduce((sum,i)=>sum+i.price*i.qty,0);
  const discount = subtotal * (parseFloat(document.getElementById('discountPercent').value) || 0) / 100;
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (parseFloat(document.getElementById('taxPercent').value) || 0) / 100;
  const service = parseFloat(document.getElementById('serviceFee').value) || 0;
  const total = afterDiscount + tax + service;

  document.getElementById('orderSummary').innerHTML = `
    ${cart.map(i=>`<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span>${i.name} x${i.qty}</span><span>Rp${(i.price*i.qty).toLocaleString('id-ID')}</span></div>`).join('')}
    <hr style="margin:10px 0;border-color:var(--border)">
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>Rp${subtotal.toLocaleString('id-ID')}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Diskon</span><span>-Rp${discount.toLocaleString('id-ID')}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Pajak</span><span>Rp${tax.toLocaleString('id-ID')}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Biaya Layanan</span><span>Rp${service.toLocaleString('id-ID')}</span></div>
    <hr style="margin:10px 0;border-color:var(--border)">
    <div style="display:flex;justify-content:space-between;font-weight:600"><span>Total</span><span style="color:var(--gold)">Rp${total.toLocaleString('id-ID')}</span></div>
  `;
}

window.toggleAddress = function(){document.getElementById('custAddress').style.display = document.getElementById('orderType').value==='delivery'?'block':'none';}

window.togglePaymentInfo = function(){
  const method = document.getElementById('paymentMethod').value;
  if(method === 'transfer'){
    document.getElementById('paymentInfo').innerHTML = `
      <div style="background:var(--panel-2);padding:12px;border-radius:8px;margin:10px 0">
        <b>Transfer ke:</b><br>
        BCA 1234567890 a/n Nama Toko<br>
        <div style="margin-top:10px">
          <label style="font-size:13px;color:var(--muted)">Upload Bukti Transfer:</label>
          <input type="file" id="proofFile" accept="image/*" capture="environment" style="margin-top:5px">
          <img id="previewProof" style="width:100%;max-width:200px;border-radius:8px;margin-top:8px;display:none">
        </div>
      </div>
    `;
    document.getElementById('proofFile')?.addEventListener('change', function(e){
      const file = e.target.files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = (ev) => {
          document.getElementById('previewProof').src = ev.target.result;
          document.getElementById('previewProof').style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  } else {
    document.getElementById('paymentInfo').innerHTML = '';
  }
}

window.closeCheckout = function(){document.getElementById('checkoutModal').style.display = 'none';}

window.placeOrder = async function(){
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const orderType = document.getElementById('orderType').value;
  const address = document.getElementById('custAddress').value.trim();
  const paymentMethod = document.getElementById('paymentMethod').value;
  const proofFile = document.getElementById('proofFile')?.files[0];
  const discount = parseFloat(document.getElementById('discountPercent').value) || 0;
  const tax = parseFloat(document.getElementById('taxPercent').value) || 0;
  const serviceFee = parseFloat(document.getElementById('serviceFee').value) || 0;

  if(!name ||!phone){alert('Lengkapi nama dan no HP');return;}
  if(orderType==='delivery' &&!address){alert('Isi alamat pengiriman');return;}
  if(paymentMethod==='transfer' &&!proofFile){alert('Upload bukti transfer dulu');return;}

  try {
    await runTransaction(db, async (transaction) => {
      for(let item of cart){
        const productRef = doc(db, "data", "main");
        const productSnap = await transaction.get(productRef);
        const productData = productSnap.data().menu.find(p=>p.id===item.id);
        if(productData.stock!== undefined && productData.stock < item.qty){
          throw new Error(`Stok ${item.name} tidak cukup`);
        }
      }

      const subtotal = cart.reduce((sum,i)=>sum+i.price*i.qty,0);
      const discountAmount = subtotal * discount / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * tax / 100;
      const total = afterDiscount + taxAmount + serviceFee;

      let proofURL = '';
      if(proofFile){
        const storageRef = ref(storage, `bukti/${Date.now()}_${proofFile.name}`);
        const snapshot = await uploadBytes(storageRef, proofFile);
        proofURL = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db,"orders"),{
        nama:name,
        phone:phone,
        orderType:orderType,
        address:address,
        paymentMethod:paymentMethod,
        items:cart,
        subtotal:subtotal,
        discount:discountAmount,
        tax:taxAmount,
        serviceFee:serviceFee,
        total:total,
        status: paymentMethod === 'transfer'? 'waiting_confirm' : 'pending',
        proofPhoto: proofURL,
        createdAt:new Date()
      });

      const newMenu = [...menu];
      cart.forEach(item=>{
        const idx = newMenu.findIndex(p=>p.id===item.id);
        if(newMenu[idx].stock!== undefined){
          newMenu[idx].stock -= item.qty;
        }
      });
      transaction.update(doc(db, "data", "main"), {menu: newMenu});
    });

    alert('Pesanan berhasil dibuat!');
    cart = [];updateCartBar();closeCheckout();
  } catch(e){
    alert('Error: ' + e.message);
  }
}