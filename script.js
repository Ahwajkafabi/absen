const video = document.getElementById("video");

// CAMERA
navigator.mediaDevices.getUserMedia({video:true})
.then(s=>video.srcObject=s);

// LOGIN
function login(){
  const n=document.getElementById("nama").value;
  if(!n) return alert("Isi nama");
  localStorage.setItem("user",n);
}

// RESET
function resetData(){
  localStorage.removeItem("absensi");
  render();
}

// GPS
function getLocation(){
  return new Promise(res=>{
    navigator.geolocation.getCurrentPosition(p=>{
      window.lastLocation={
        lat:p.coords.latitude,
        long:p.coords.longitude
      };
      res(p.coords);
    },()=>res({latitude:0,longitude:0}));
  });
}

// ADDRESS
async function getAddress(lat,lon){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const d=await r.json();
    window.lastAddress = d.display_name;
    return d.display_name;
  }catch{
    return "-";
  }
}

// FOTO FRAME
function takePhoto(){
  const canvas=document.getElementById("canvas");
  const ctx=canvas.getContext("2d");

  const w=240, h=320;
  canvas.width=w; canvas.height=h;

  ctx.drawImage(video,0,0,w,h);

  const user=localStorage.getItem("user")||"User";
  const now=new Date();

  // frame
  ctx.strokeStyle="#00ffcc";
  ctx.lineWidth=4;
  ctx.strokeRect(0,0,w,h);

  // overlay
  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(0,h-90,w,90);

  ctx.fillStyle="#fff";
  ctx.font="bold 12px Arial";
  ctx.fillText("👤 "+user,10,h-70);

  ctx.font="11px Arial";
  ctx.fillText("🕒 "+now.toLocaleString(),10,h-55);

  if(window.lastLocation){
    ctx.fillText("📍 "+window.lastLocation.lat.toFixed(4)+","+window.lastLocation.long.toFixed(4),10,h-40);
  }

  if(window.lastAddress){
    ctx.fillText("🏠 "+window.lastAddress.substring(0,28),10,h-25);
  }

  return canvas.toDataURL("image/jpeg",0.8);
}

// SAVE
function save(d){
  let logs=JSON.parse(localStorage.getItem("absensi"))||[];
  logs.push(d);
  localStorage.setItem("absensi",JSON.stringify(logs));
  render();
}

// ABSEN + STATUS
async function absen(type){
  const user=localStorage.getItem("user");
  if(!user) return alert("Login dulu");

  const loc=await getLocation();
  const addr=await getAddress(loc.latitude,loc.longitude);
  const photo=takePhoto();

  save({
    user,
    type,
    note:document.getElementById("note").value||"-",
    time:new Date().toISOString(),
    lat:loc.latitude,
    long:loc.longitude,
    address:addr,
    photo
  });
}

function setStatus(type){
  absen(type);
}

// RENDER
function render(){
  const logs=JSON.parse(localStorage.getItem("absensi"))||[];

  document.getElementById("rekap").innerText="Total: "+logs.length;

  const el=document.getElementById("riwayatList");
  el.innerHTML="";

  logs.slice().reverse().forEach(i=>{
    el.innerHTML+=`
      <div>
      <b>${i.user}</b><br>
      ${i.type}<br>
      🕒 ${new Date(i.time).toLocaleString()}<br>
      📝 ${i.note}<br>
      📍 ${i.lat},${i.long}<br>
      🏠 ${i.address}<br>
      <img class="foto" src="${i.photo}">
      </div>
    `;
  });

  loadMap(logs);
  loadChart(logs);
}

// CHART
function loadChart(logs){
  new Chart(document.getElementById("chart"),{
    type:"bar",
    data:{
      labels:["Masuk","Izin","Sakit","Alpa"],
      datasets:[{
        data:[
          logs.filter(i=>i.type==="masuk").length,
          logs.filter(i=>i.type==="izin").length,
          logs.filter(i=>i.type==="sakit").length,
          logs.filter(i=>i.type==="alpa").length
        ]
      }]
    }
  });
}

// MAP
function loadMap(logs){
  const map=L.map('map').setView([-6.2,106.8],10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  logs.forEach(i=>{
    L.marker([i.lat,i.long]).addTo(map).bindPopup(i.address);
  });
}

// PDF DETAIL
function exportPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const logs=JSON.parse(localStorage.getItem("absensi"))||[];

  let y=15;
  doc.text("LAPORAN ABSENSI",10,y);
  y+=10;

  logs.forEach(i=>{
    if(y>250){doc.addPage();y=15;}

    doc.text("Nama: "+i.user,10,y); y+=6;
    doc.text("Keterangan: "+i.type,10,y); y+=6;
    doc.text("Tanggal: "+new Date(i.time).toLocaleString(),10,y); y+=6;
    doc.text("Lokasi: "+i.lat+","+i.long,10,y); y+=6;

    const alamat = doc.splitTextToSize(i.address,180);
    doc.text("Alamat:",10,y); y+=5;
    doc.text(alamat,15,y);
    y+=alamat.length*5;

    if(i.photo){
      doc.addImage(i.photo,"JPEG",10,y,60,80);
      y+=85;
    }

    doc.line(10,y,200,y);
    y+=8;
  });

  doc.save("laporan-absensi.pdf");
}

// INIT
render();
