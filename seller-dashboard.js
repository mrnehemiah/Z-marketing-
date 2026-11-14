import { supabase } from "./supabase.js";

const sections = [
  ["overview","⌂","Muhtasari","Overview"],
  ["products","▣","Bidhaa","Products"],
  ["orders","▤","Oda","Orders"],
  ["finance","◈","Fedha","Finance"],
  ["customers","♙","Wateja","Customers"],
  ["messages","✉","Ujumbe","Messages"],
  ["marketing","✦","Masoko","Marketing"],
  ["analytics","▥","Takwimu","Analytics"],
  ["store","▧","Duka","Store"],
  ["delivery","⇢","Usafirishaji","Delivery"],
  ["reviews","☆","Maoni","Reviews"],
  ["support","?","Msaada","Support"],
  ["settings","⚙","Mipangilio","Settings"],
  ["assistant","✧","ZUNE AI","ZUNE AI"]
];

const state = { section:"overview", language:localStorage.getItem("zune_language")==="en"?"en":"sw", products:[], photos:[], orders:[], orderItems:[], wallet:null, ledger:[], store:null, badgeRequest:null, profile:null, loading:false, busy:false, error:"" };
const tr = (sw,en) => state.language==="sw"?sw:en;
const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat("sw-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(Number(value)||0);

function styles(){ /* Dashboard styles are loaded from seller-dashboard.css. */ }

function shell(){
 const nav=sections.map(([id,icon,sw,en])=>`<button type="button" data-zsd-section="${id}" class="${state.section===id?"active":""}"><span class="zsd-nav-icon">${icon}</span>${tr(sw,en)}</button>`).join("");
 return `<div class="zsd"><div class="zsd-wrap">
 <header class="zsd-top"><div class="zsd-brand">ⓏⓊⓃⒺ <span style="font-size:11px;letter-spacing:0">SELLER</span></div><div class="zsd-top-actions"><button class="zsd-btn" id="zsd-language">${state.language==="sw"?"SW / EN":"EN / SW"}</button><button class="zsd-btn" id="zsd-back">← ${tr("Soko","Marketplace")}</button></div></header>
 <div class="zsd-head"><h1>${tr("Seller Dashboard","Seller Dashboard")}</h1><p>${tr("Simamia duka, bidhaa na biashara yako sehemu moja.","Manage your store, products and business in one place.")}</p></div>
 <div class="zsd-layout"><nav class="zsd-nav">${nav}</nav><main class="zsd-content"><nav class="zsd-mobile-nav">${nav}</nav><div id="zsd-panel"></div></main></div>
 </div></div>`;
}

function renderOverview(){
 const total=state.products.length, pending=state.orders.filter(o=>["pending","new","processing"].includes(String(o.status).toLowerCase())).length;
 return `<div class="zsd-stats">
 <div class="zsd-stat"><small>${tr("Bidhaa zako","Your products")}</small><strong>${total}</strong></div>
 <div class="zsd-stat"><small>${tr("Oda zinazosubiri","Pending orders")}</small><strong>${pending}</strong></div>
 <div class="zsd-stat"><small>${tr("Oda zote","Total orders")}</small><strong>${state.orders.length}</strong></div>
 <div class="zsd-stat"><small>${tr("Hali ya akaunti","Account status")}</small><strong style="font-size:14px">${tr("Muuzaji","Seller")} ✓</strong></div></div>
 <section class="zsd-card"><div class="zsd-row"><h2>${tr("Karibu kwenye duka lako","Welcome to your store")}</h2><span class="zsd-pill blue">${tr("MUUZAJI","SELLER")}</span></div><p class="zsd-muted">${tr("Hapa utaona takwimu na kusimamia shughuli zako. Takwimu hujaza kadri oda na bidhaa halisi zinavyoingia.","Your real activity and store metrics will appear here as orders and products are added.")}</p></section>
 ${renderVerification()}
 <section class="zsd-card"><h2>${tr("Bidhaa zako za hivi karibuni","Your latest products")}</h2>${state.products.length?renderProductList(state.products.slice(0,5)):`<div class="zsd-empty">${tr("Bado hujaweka bidhaa.","You have not listed products yet.")}</div>`}</section>`;
}
function renderProductList(items){
 return `<div class="zsd-products">${items.map(p=>`<article class="zsd-product"><strong>${esc(p.title)}</strong><p class="zsd-muted">${money(p.price)} · ${tr("Stock","Stock")}: ${Number(p.stock_quantity)||0}</p></article>`).join("")}</div>`;
}
function renderVerification(){
 const req=state.badgeRequest,verified=!!state.profile?.is_verified;
 let status="";
 if(verified)status='<span class="zsd-pill" style="background:rgba(230,145,35,.14);color:#c87510">✓ Verified Account</span>';
 else if(req?.status==="pending")status='<span class="zsd-pill">Inasubiri Admin Mkuu / Pending</span>';
 else if(req?.status==="rejected")status='<span class="zsd-pill" style="background:rgba(190,50,50,.12);color:#bd3d3d">Limekataliwa / Rejected</span>';
 return `<section class="zsd-card"><div class="zsd-row"><h2>Profile Badge — Simple Verification</h2>${status}</div><p class="zsd-muted">${tr("Omba beji ya Verified Account. Admin Mkuu atakagua ombi lako; beji ya machungwa itaonekana baada ya kuidhinishwa. Verified Store ni beji tofauti ya duka.","Request the Verified Account badge. Admin Mkuu reviews your request; the orange badge appears only after approval. Verified Store is a separate store badge.")}</p><a class="zsd-btn primary" href="./verification.html">${verified?tr("Angalia verification","View verification"):tr("Omba / Angalia verification","Request / View verification")} →</a></section>`;
}
function renderProducts(){
 return `<section class="zsd-card"><div class="zsd-row"><h2>${tr("Usimamizi wa bidhaa","Product management")}</h2><span class="zsd-pill blue">${state.products.length}</span></div><p class="zsd-muted">${tr("Bidhaa zilizopo kwenye akaunti yako ya muuzaji.","Products currently linked to your seller account.")}</p>${state.products.length?renderProductList(state.products):`<div class="zsd-empty">${tr("Hakuna bidhaa bado.","No products yet.")}</div>`}
 <div class="zsd-alert">${tr("Uwekaji wa bidhaa mpya utafunguliwa baada ya ukaguzi wa usalama wa maudhui (picha, jina na maelezo) kuunganishwa. Kwa sasa hatuweki bidhaa hewani bila moderation gate.","New product publishing will be enabled after the content safety moderation gate (images, title and description) is connected. We will not publish unmoderated listings.")}</div></section>
 <section class="zsd-card"><h2>${tr("Picha nyingi za bidhaa","Multiple product photos")}</h2><p class="zsd-muted">${tr("Chagua picha nyingi kutoka Gallery/Storage ya simu au tumia kamera. Hakuna kikomo cha picha 10. Picha zitapunguzwa ukubwa na unaweza kupanga au kuchagua picha kuu.","Select multiple photos from your phone Gallery/Storage or use the camera. There is no 10-photo limit. Photos are compressed and can be reordered or set as the main image.")}</p><div class="zsd-row" style="justify-content:flex-start;flex-wrap:wrap"><label class="zsd-btn" for="zsd-gallery-input">＋ ${tr("Chagua Gallery / Storage","Choose Gallery / Storage")}</label><input id="zsd-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none"><label class="zsd-btn" for="zsd-camera-input">◎ ${tr("Piga picha","Take photo")}</label><input id="zsd-camera-input" type="file" accept="image/*" capture="environment" style="display:none"></div><div id="zsd-photo-grid" class="zsd-photo-grid" style="margin-top:13px"></div><p class="zsd-muted" id="zsd-photo-count">${tr("Bado hujachagua picha.","No photos selected yet.")}</p><div class="zsd-alert">${tr("Picha zinaweza kuchaguliwa na kupangwa sasa. Upakiaji wa mwisho kwenye Storage na uchapishaji wa bidhaa utawezeshwa baada ya moderation ya picha na maelezo kuunganishwa; hatuweki bidhaa hewani bila ukaguzi wa usalama.","You can select and arrange photos now. Final Storage upload and product publishing will be enabled after image and text moderation is connected; listings will not go live without safety checks.")}</div></section>`;
}
function renderOrders(){
 return `<section class="zsd-card"><h2>${tr("Oda za wateja","Customer orders")}</h2><p class="zsd-muted">${tr("Oda zinazoonyesha bidhaa zilizouzwa na duka lako.","Orders containing items sold by your store.")}</p>
 ${state.orders.length?`<div style="overflow:auto"><table class="zsd-table"><thead><tr><th>${tr("Oda","Order")}</th><th>${tr("Tarehe","Date")}</th><th>${tr("Hali","Status")}</th><th>${tr("Jumla ya oda","Order total")}</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td>${esc(String(o.id).slice(0,8))}</td><td>${o.created_at?new Date(o.created_at).toLocaleDateString():"—"}</td><td>${esc(o.status||"—")}</td><td>${money(o.total_price)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hakuna oda za duka lako.","There are no orders for your store yet.")}</div>`}
 </section>`;
}
function renderFinance(){
 const balance=Number(state.wallet?.balance)||0;
 return `<section class="zsd-stats"><div class="zsd-stat"><small>${tr("Salio la wallet","Wallet balance")}</small><strong style="font-size:17px">${money(balance)}</strong></div><div class="zsd-stat"><small>${tr("Miamala","Ledger entries")}</small><strong>${state.ledger.length}</strong></div></section>
 <section class="zsd-card"><h2>${tr("Historia ya miamala","Transaction history")}</h2>${state.ledger.length?`<div style="overflow:auto"><table class="zsd-table"><thead><tr><th>${tr("Tarehe","Date")}</th><th>${tr("Maelezo","Description")}</th><th>${tr("Kiasi","Amount")}</th></tr></thead><tbody>${state.ledger.map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${esc(x.reason||x.entry_type||"—")}</td><td>${money(x.amount)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hakuna miamala ya wallet.","No wallet transactions yet.")}</div>`}</section>
 <p class="zsd-muted">${tr("Ada za ZUNE, fedha zinazosubiri na utoaji wa fedha vitaonyeshwa baada ya sera za malipo na withdrawal kuunganishwa.","ZUNE fees, pending payouts and withdrawals will appear once payment and withdrawal workflows are connected.")}</p>`;
}
function renderStore(){
 const s=state.store;
 return `<section class="zsd-card"><h2>${tr("Taarifa za duka","Store information")}</h2>${s?`<p><strong>${esc(s.store_name)}</strong></p><p class="zsd-muted">${tr("Hali ya uthibitisho wa duka","Store verification")}: ${esc(s.verification_status||"pending")}</p>`:`<div class="zsd-empty">${tr("Taarifa za duka hazijapatikana bado.","Store details are not available yet.")}</div>`}<div class="zsd-alert">${tr("Uhariri wa jina, nembo, cover, saa za kazi na sera utafunguliwa baada ya sehemu hizo za duka kuongezwa kwenye database.","Editing store name, logo, cover, business hours and policies will be enabled after those store fields are added to the database.")}</div></section>`;
}

async function compressSellerPhoto(file){
 const source=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=source;});
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext("2d");context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.82));
  if(!blob)return {file,preview:source,size:file.size};
  URL.revokeObjectURL(source);
  const compressed=new File([blob],file.name.replace(/\.[^.]+$/,"")+".webp",{type:"image/webp",lastModified:Date.now()});
  return {file:compressed,preview:URL.createObjectURL(blob),size:blob.size};
 }catch(error){return {file,preview:source,size:file.size};}
}
async function addSellerPhotos(files){
 const count=document.getElementById("zsd-photo-count");
 if(count)count.textContent=tr("Inapunguza ukubwa wa picha...","Compressing photos...");
 const converted=await Promise.all(Array.from(files).filter(file=>file.type.startsWith("image/")).map(compressSellerPhoto));
 state.photos.push(...converted);
 renderPhotoSelection();
}
function renderPhotoSelection(){
 const grid=document.getElementById("zsd-photo-grid"),count=document.getElementById("zsd-photo-count");
 if(!grid||!count)return;
 grid.innerHTML=state.photos.map((photo,index)=>{
  const label=index===0?tr("Picha kuu","Main photo"):tr("Picha","Photo");
  return '<div style="position:relative;width:94px"><img class="zsd-photo" src="'+photo.preview+'" alt="Product photo '+(index+1)+'" style="width:94px;height:94px;object-fit:cover;border-color:'+(index===0?'var(--primary,#087a55)':'var(--zsd-line)')+'"><small style="display:block;font-size:10px;color:var(--zsd-muted)">'+label+' · '+(photo.size/1024).toFixed(0)+' KB</small><div style="display:flex;gap:3px;margin-top:4px"><button class="zsd-btn" type="button" data-photo-main="'+index+'">★</button><button class="zsd-btn" type="button" data-photo-up="'+index+'">←</button><button class="zsd-btn" type="button" data-photo-down="'+index+'">→</button><button class="zsd-btn" type="button" data-photo-remove="'+index+'">×</button></div></div>';
 }).join("");
 count.textContent=tr("Picha zilizochaguliwa: ","Selected photos: ")+state.photos.length;
 grid.querySelectorAll("[data-photo-main]").forEach(button=>button.addEventListener("click",()=>{const [item]=state.photos.splice(Number(button.dataset.photoMain),1);state.photos.unshift(item);renderPhotoSelection();}));
 grid.querySelectorAll("[data-photo-up]").forEach(button=>button.addEventListener("click",()=>{const i=Number(button.dataset.photoUp);if(i>0){[state.photos[i-1],state.photos[i]]=[state.photos[i],state.photos[i-1]];renderPhotoSelection();}}));
 grid.querySelectorAll("[data-photo-down]").forEach(button=>button.addEventListener("click",()=>{const i=Number(button.dataset.photoDown);if(i<state.photos.length-1){[state.photos[i+1],state.photos[i]]=[state.photos[i],state.photos[i+1]];renderPhotoSelection();}}));
 grid.querySelectorAll("[data-photo-remove]").forEach(button=>button.addEventListener("click",()=>{const i=Number(button.dataset.photoRemove);URL.revokeObjectURL(state.photos[i].preview);state.photos.splice(i,1);renderPhotoSelection();}));
}

function renderPlaceholder(){
 const names=sections.find(s=>s[0]===state.section);
 return `<section class="zsd-card"><h2>${tr(names[2],names[3])}</h2><p class="zsd-muted">${tr("Sehemu hii imeongezwa kwenye muundo wa dashboard. Itaunganishwa na jedwali na ruhusa sahihi za Supabase kabla ya kuanza kutumia data halisi.","This section is included in the dashboard structure. It will be connected to the correct Supabase tables and permissions before handling live data.")}</p><div class="zsd-empty">${tr("Inaandaliwa — hakuna data ya majaribio iliyowekwa.","In preparation — no sample data has been inserted.")}</div></section>`;
}
function renderPanel(){
 const panel=document.getElementById("zsd-panel"); if(!panel)return;
 panel.innerHTML=state.section==="overview"?renderOverview():state.section==="products"?renderProducts():state.section==="orders"?renderOrders():state.section==="finance"?renderFinance():state.section==="store"?renderStore():renderPlaceholder();
 panel.querySelectorAll("[data-zsd-section]").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.zsdSection;renderPanel();bindActiveNav();}));
 panel.querySelector("#zsd-verification-form")?.addEventListener("submit",submitVerification);
 panel.querySelector("#zsd-gallery-input")?.addEventListener("change",event=>{if(event.target.files?.length)addSellerPhotos(event.target.files);event.target.value="";});
 panel.querySelector("#zsd-camera-input")?.addEventListener("change",event=>{if(event.target.files?.length)addSellerPhotos(event.target.files);event.target.value="";});
 if(state.section==="products")renderPhotoSelection();
}
function bindActiveNav(){
 document.querySelectorAll("[data-zsd-section]").forEach(b=>b.classList.toggle("active",b.dataset.zsdSection===state.section));
}
async function submitVerification(event){
 event.preventDefault();
 const form=event.currentTarget, message=form.querySelector("#zsd-verify-message"), button=form.querySelector("button[type=submit]");
 if(state.busy)return;
 const values=new FormData(form);
 const fullName=String(values.get("full_name")||"").trim(), business=String(values.get("business_name")||"").trim();
 if(!fullName){message.textContent=tr("Jaza jina lako kamili.","Enter your full name.");return;}
 state.busy=true;button.disabled=true;message.textContent=tr("Inatuma ombi...","Submitting request...");
 try{
  const {data,error}=await supabase.from("verified_badge_requests").insert({user_id:window.__zuneSellerUser.id,full_name:fullName,business_name:business||null,status:"pending"}).select("id,status,rejection_reason,created_at").single();
  if(error)throw error;
  state.badgeRequest=data;renderPanel();
 }catch(error){console.error("ZUNE verification request:",error);message.textContent=error.message||tr("Imeshindikana kutuma ombi.","Could not submit request.");button.disabled=false;}
 finally{state.busy=false;}
}
async function loadData(user){
 state.loading=true;
 const [profile,products,items,store,badge,wallet,ledger]=await Promise.all([
  supabase.from("profiles").select("id,full_name,is_verified,role").eq("id",user.id).maybeSingle(),
  supabase.from("products").select("id,title,price,stock_quantity,created_at").eq("vendor_id",user.id).order("created_at",{ascending:false}).limit(50),
  supabase.from("order_items").select("order_id,product_id,product_name,price,quantity,created_at").eq("seller_id",user.id).limit(100),
  supabase.from("stores").select("id,store_name,verification_status").eq("owner_id",user.id).maybeSingle(),
  supabase.from("verified_badge_requests").select("id,status,rejection_reason,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle()
 ]);
 state.profile=profile.data||null;state.products=products.data||[];state.orderItems=items.data||[];state.store=store.data||null;state.badgeRequest=badge.data||null;state.wallet=wallet.data||null;state.ledger=ledger.data||[];
 const orderIds=[...new Set((items.data||[]).map(x=>x.order_id).filter(Boolean))];
 if(orderIds.length){const {data}=await supabase.from("orders").select("id,status,total_price,created_at").in("id",orderIds);state.orders=data||[];}else state.orders=[];
 state.loading=false;
}
export async function renderSellerDashboard({app,user,onBack}){
 if(!app||!user?.id)return;
 window.__zuneSellerUser=user;
 styles();state.section="overview";state.language=localStorage.getItem("zune_language")==="en"?"en":"sw";
 app.innerHTML=shell();
 window.__zuneSellerBack=onBack||(()=>{});
 bindShell();
 const panel=document.getElementById("zsd-panel");if(panel)panel.innerHTML=`<div class="zsd-empty">${tr("Inapakia dashboard...","Loading dashboard...")}</div>`;
 try{await loadData(user);}catch(error){console.error("ZUNE seller dashboard load:",error);state.error=error.message;}
 renderPanel();
}
function bindShell(){
 document.getElementById("zsd-back")?.addEventListener("click",()=>{if(typeof window.__zuneSellerBack==="function")window.__zuneSellerBack();});
 document.getElementById("zsd-language")?.addEventListener("click",()=>{
  state.language=state.language==="sw"?"en":"sw";localStorage.setItem("zune_language",state.language);
  const app=document.getElementById("app");if(app)renderSellerDashboard({app,user:window.__zuneSellerUser,onBack:window.__zuneSellerBack});
 });
 document.querySelectorAll("[data-zsd-section]").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.zsdSection;renderPanel();bindActiveNav();}));
}
