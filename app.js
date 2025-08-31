// Variables
const form=document.getElementById("registroForm");
const inventarioList=document.getElementById("inventarioList");
const totalVentasElem=document.getElementById("totalVentas");
const totalGastosElem=document.getElementById("totalGastos");
const saldoElem=document.getElementById("saldo");
const exportPDFBtn=document.getElementById("exportPDF");
const exportCSVBtn=document.getElementById("exportCSV");
const exportPDFMesBtn=document.getElementById("exportPDFMes");
const productoInput=document.getElementById("producto");
const precioInput=document.getElementById("precioKilo");
const filtroProducto=document.getElementById("filtroProducto");

// Calculadora rápida
const calcKilos=document.getElementById("calcKilos");
const calcPrecio=document.getElementById("calcPrecio");
const calcTotal=document.getElementById("calcTotal");
document.getElementById("calcTotalBtn").addEventListener("click",()=>{
  const total=Number(calcKilos.value)*Number(calcPrecio.value);
  calcTotal.textContent=`Bs. ${total.toFixed(2)}`;
});

// Inventario y precios
let inventario=JSON.parse(localStorage.getItem("inventario"))||[];
let preciosPorProducto=JSON.parse(localStorage.getItem("preciosPorProducto"))||{};

// Autocompletar precio por kilo
productoInput.addEventListener("input",()=>{precioInput.value=preciosPorProducto[productoInput.value.trim()]||"";});

// Actualizar UI con filtros
function actualizarUI(){
  const filtro=filtroProducto.value.toLowerCase();
  inventarioList.innerHTML="";
  let totalVentas=0,totalGastos=0;

  inventario.forEach((item,index)=>{
    if(item.producto.toLowerCase().includes(filtro)){
      const li=document.createElement("li");
      li.innerHTML=`
      <img src="productos/${item.producto.toLowerCase().replace(/ /g,"_")}.jpg" alt="${item.producto}" width="40" style="margin-right:10px;border-radius:5px;">
      ${item.fecha} - ${item.tipo.toUpperCase()} - ${item.producto} - ${item.cantidadKg} kg - Bs. ${item.precioKilo}/kg - Total: Bs. ${item.totalBs.toFixed(2)}
      <button class="eliminar-btn" data-index="${index}">X</button>`;
      inventarioList.appendChild(li);
    }
    if(item.tipo==="venta") totalVentas+=item.totalBs;
    else totalGastos+=item.totalBs;
  });

  totalVentasElem.textContent=`Bs. ${totalVentas.toFixed(2)}`;
  totalGastosElem.textContent=`Bs. ${totalGastos.toFixed(2)}`;
  saldoElem.textContent=`Bs. ${(totalVentas-totalGastos).toFixed(2)}`;

  // Botón eliminar
  document.querySelectorAll(".eliminar-btn").forEach(btn=>btn.addEventListener("click",()=>{
    const index=btn.getAttribute("data-index");
    inventario.splice(index,1);
    localStorage.setItem("inventario",JSON.stringify(inventario));
    actualizarUI();
  }));

  actualizarGrafico();
}

// Gráfico de ventas y gastos
let chart=null;
function actualizarGrafico(){
  const ctx=document.getElementById("chartVentasGastos").getContext("2d");
  const labels=inventario.map(i=>i.fecha);
  const ventas=inventario.map(i=>i.tipo==="venta"?i.totalBs:0);
  const gastos=inventario.map(i=>i.tipo==="gasto"?i.totalBs:0);
  if(chart) chart.destroy();
  chart=new Chart(ctx,{type:'bar',data:{labels, datasets:[
    {label:'Ventas',data:ventas,backgroundColor:'rgba(75,192,192,0.7)'},
    {label:'Gastos',data:gastos,backgroundColor:'rgba(255,99,132,0.7)'}
  ]}});
}

// Manejar formulario
form.addEventListener("submit",(e)=>{
  e.preventDefault();
  const producto=productoInput.value.trim();
  const cantidadKg=Number(document.getElementById("cantidadKg").value);
  const precioKilo=Number(precioInput.value);
  const totalBs=Number(document.getElementById("totalBs").value);
  const tipo=document.getElementById("tipo").value;
  const cliente=document.getElementById("cliente").value;

  if(!totalBs||totalBs===0){alert("Ingresa el total pagado por el cliente.");return;}

  preciosPorProducto[producto]=precioKilo;
  localStorage.setItem("preciosPorProducto",JSON.stringify(preciosPorProducto));

  inventario.push({producto,cantidadKg,precioKilo,totalBs,tipo,cliente,fecha:new Date().toLocaleDateString()});
  localStorage.setItem("inventario",JSON.stringify(inventario));

  form.reset();
  actualizarUI();
});

// PDF y CSV
function generarPDF(datos,nombreArchivo){
  const { jsPDF } = window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(16);
  doc.text("Resumen de Ventas y Gastos",10,20);
  let y=30;
  datos.forEach(item=>{
    doc.setFontSize(12);
    doc.text(`${item.fecha} - ${item.tipo.toUpperCase()} - ${item.producto} - ${item.cantidadKg} kg - Bs. ${item.precioKilo}/kg - Total: Bs. ${item.totalBs.toFixed(2)}`,10,y);
    y+=10;if(y>270){doc.addPage();y=20;}
  });
  const totalVentas=datos.filter(i=>i.tipo==="venta").reduce((a,b)=>a+b.totalBs,0);
  const totalGastos=datos.filter(i=>i.tipo==="gasto").reduce((a,b)=>a+b.totalBs,0);
  const saldo=totalVentas-totalGastos;
  doc.text(`Total Ventas: Bs. ${totalVentas.toFixed(2)}`,10,y+10);
  doc.text(`Total Gastos: Bs. ${totalGastos.toFixed(2)}`,10,y+20);
  doc.text(`Saldo: Bs. ${saldo.toFixed(2)}`,10,y+30);
  doc.save(nombreArchivo);
}

exportPDFBtn.addEventListener("click",()=>generarPDF(inventario,"Resumen_Actual.pdf"));
exportPDFMesBtn.addEventListener("click",()=>{
  const mesActual=new Date().getMonth();
  const inventarioMes=inventario.filter(i=>new Date(i.fecha).getMonth()===mesActual);
  generarPDF(inventarioMes,`Resumen_Mes_${mesActual+1}.pdf`);
});

// Exportar CSV
exportCSVBtn.addEventListener("click",()=>{
  let csv="Fecha,Tipo,Producto,CantidadKg,PrecioKilo,TotalBs,Cliente\n";
  inventario.forEach(i=>{csv+=`${i.fecha},${i.tipo},${i.producto},${i.cantidadKg},${i.precioKilo},${i.totalBs},${i.cliente||""}\n`;});
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="inventario.csv";a.click();URL.revokeObjectURL(url);
});

// Inicializar
actualizarUI();
