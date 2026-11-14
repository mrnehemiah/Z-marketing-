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

const state = { section:"overview", publishing:false, language:localStorage.getItem("zune_language")==="en"?"en":"sw", products:[], photos:[], orders:[], orderItems:[], wallet:null, ledger:[], store:null, badgeRequest:null, profile:null, loading:false, busy:false, error:"" };
const tr = (sw,en) => state.language==="sw"?sw:en;
const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat("sw-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(Number(value)||0);

function styles(){ /* Dashboard styles are loaded from seller-dashboard.css. */ }

function verifiedAccountMark(){
 return `<span class="zsd-verified-mark" title="Verified Account"><svg viewBox="-30 -30 60 60" role="img" aria-label="Verified Account"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Verified Account</span></span>`;
}
function shell(){
 const nav=sections.map(([id,icon,sw,en])=>`<button type="button" data-zsd-section="${id}" class="${state.section===id?"active":""}"><span class="zsd-nav-icon">${icon}</span>${tr(sw,en)}</button>`).join("");
 const name=state.profile?.full_name||window.__zuneSellerUser?.email||tr("Muuzaji","Seller");
 const initial=String(name).trim().charAt(0).toUpperCase()||"Z";
 const verified=state.profile?.is_verified===true?verifiedAccountMark():"";
 const storeVerified=["verified","approved"].includes(String(state.store?.verification_status||"").toLowerCase());
 return `<div class="zsd"><div class="zsd-wrap">
 <header class="zsd-top"><div class="zsd-brand">ⓏⓊⓃⒺ <span>SELLER CENTER</span></div><div class="zsd-top-actions"><button class="zsd-btn" id="zsd-language">${state.language==="sw"?"SW / EN":"EN / SW"}</button><button class="zsd-btn" id="zsd-back">← ${tr("Soko","Marketplace")}</button></div></header>
 <div class="zsd-head"><div><div class="zsd-section-kicker">${tr("KITUO CHA BIASHARA","BUSINESS CENTER")}</div><h1>${tr("Dashboard ya Muuzaji","Seller Dashboard")}</h1><p>${tr("Simamia duka, bidhaa na biashara yako sehemu moja.","Manage your store, products and business in one place.")}</p></div><div class="zsd-head-meta"><div class="zsd-user-chip"><span class="zsd-user-avatar">${esc(initial)}</span><span class="zsd-user-copy"><b>${esc(name)}</b><small>${verified|| (storeVerified?'<span class="zsd-store-mark"><i class="zsd-store-dot"></i> Verified Store</span>':tr("Akaunti ya Seller","Seller account"))}</small></span></div></div></div>
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
 const storeStatus=String(state.store?.verification_status||"").toLowerCase();
 const storeVerified=["verified","approved"].includes(storeStatus);
 let accountStatus="";
 if(verified)accountStatus=verifiedAccountMark();
 else if(req?.status==="pending")accountStatus='<span class="zsd-pill orange">'+tr("Inasubiri Admin Mkuu","Pending Admin review")+'</span>';
 else if(req?.status==="rejected")accountStatus='<span class="zsd-pill" style="background:color-mix(in srgb,#bd3d3d 12%,transparent);color:#bd3d3d">'+tr("Limekataliwa","Rejected")+'</span>';
 const storeBadge=storeVerified?'<span class="zsd-store-mark"><i class="zsd-store-dot"></i> Verified Store</span>':'<span class="zsd-pill blue">'+tr("Haijathibitishwa","Not verified")+'</span>';
 return `<section class="zsd-card"><div class="zsd-section-kicker">${tr("UTAMBULISHO NA UTHIBITISHO","IDENTITY & VERIFICATION")}</div><div class="zsd-verification-head"><div class="zsd-verification-title"><h2>${tr("Uthibitisho wa akaunti","Account verification")}</h2>${accountStatus}</div></div><p class="zsd-muted">${tr("Verified Account ni beji ya wasifu wako. Inaonekana tu baada ya Admin Mkuu kuidhinisha ombi lako.","Verified Account is your profile badge. It appears only after Admin Mkuu approves your request.")}</p><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:17px;padding-top:15px;border-top:1px solid var(--zsd-line)"><div><strong style="font-size:13px;display:block;margin-bottom:5px">Verified Store</strong><span class="zsd-muted">${tr("Uthibitisho wa duka ni tofauti na wa akaunti.","Store verification is separate from account verification.")}</span></div>${storeBadge}</div><div style="margin-top:17px"><a class="zsd-btn primary" href="./verification.html">${verified?tr("Angalia uthibitisho","View verification"):tr("Omba / Angalia uthibitisho","Request / View verification")} →</a></div></section>`;
}
function renderProducts(){
 return `<section class="zsd-card"><div class="zsd-row"><h2>${tr("Bidhaa zako","Your products")}</h2><span class="zsd-pill blue">${state.products.length}</span></div><p class="zsd-muted">${tr("Bidhaa zilizochapishwa kwenye duka lako.","Products published in your store.")}</p>${state.products.length?renderProductList(state.products):`<div class="zsd-empty">${tr("Bado hujaweka bidhaa.","You have not listed products yet.")}</div>`}</section>
 <section class="zsd-card"><div class="zsd-section-kicker">${tr("ONGEZA BIDHAA","ADD PRODUCT")}</div><h2>${tr("Chapisha bidhaa mpya","Publish a new product")}</h2><p class="zsd-muted">${tr("Jaza taarifa zote na chagua picha. Mfumo utakagua picha, jina na maelezo kabla ya kupakia picha kwenye Storage au kuchapisha bidhaa.","Complete the details and choose photos. The system checks images, title and description before uploading to Storage or publishing.")}</p>
 <form id="zsd-product-form" class="zsd-form">
  <label class="zsd-full">${tr("Jina la bidhaa","Product title")}<input name="title" maxlength="160" minlength="3" required placeholder="${tr("Mfano: Viatu vya michezo","Example: Sports shoes")}"></label>
  <label class="zsd-full">${tr("Maelezo ya bidhaa","Product description")}<textarea name="description" maxlength="5000" required placeholder="${tr("Eleza bidhaa kwa usahihi...","Describe the product accurately...")}"></textarea></label>
  <label>${tr("Bei (TSh)","Price (TSh)")}<input name="price" type="number" min="1" step="1" required></label>
  <label>${tr("Idadi ya stock","Stock quantity")}<input name="stock_quantity" type="number" min="0" step="1" value="1" required></label>
  <label class="zsd-full">${tr("Kundi la bidhaa","Product category")}<input name="category" maxlength="120" value="Vingine" required></label>
  <div class="zsd-full"><div class="zsd-row" style="justify-content:flex-start;flex-wrap:wrap"><label class="zsd-btn" for="zsd-gallery-input">＋ ${tr("Chagua Gallery / Storage","Choose Gallery / Storage")}</label><input id="zsd-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none"><label class="zsd-btn" for="zsd-camera-input">◎ ${tr("Piga picha","Take photo")}</label><input id="zsd-camera-input" type="file" accept="image/*" capture="environment" style="display:none"></div><div id="zsd-photo-grid" class="zsd-photo-grid" style="margin-top:13px"></div><p class="zsd-muted" id="zsd-photo-count">${tr("Bado hujachagua picha.","No photos selected yet.")}</p></div>
  <div class="zsd-full"><div id="zsd-publish-message" class="zsd-alert" role="status">${tr("Bidhaa itachapishwa sokoni mara tu unapobonyeza Chapisha.","Your product will be published as soon as you press Publish.")}</div><button class="zsd-btn primary" id="zsd-publish-button" type="submit" style="width:100%">${tr("Chapisha bidhaa","Publish product")}</button></div>
 </form></section>`;
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


async function fileAsDataUrl(file){
 return await new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||""));
  reader.onerror=()=>reject(new Error("Imeshindikana kusoma picha."));
  reader.readAsDataURL(file);
 });
}
async function publishSellerProduct(event){
 event.preventDefault();
 if(state.publishing)return;
 const form=event.currentTarget;
 const message=form.querySelector("#zsd-publish-message");
 const button=form.querySelector("#zsd-publish-button");
 const values=new FormData(form);
 const title=String(values.get("title")||"").trim();
 const description=String(values.get("description")||"").trim();
 const price=Number(values.get("price"));
 const stock=Number(values.get("stock_quantity"));
 const category=String(values.get("category")||"Vingine").trim();
 if(title.length<3||!description||!Number.isFinite(price)||price<=0||!Number.isInteger(stock)||stock<0){
  message.textContent=tr("Tafadhali hakiki taarifa za bidhaa.","Please check the product details.");return;
 }
 if(!state.photos.length){message.textContent=tr("Chagua angalau picha moja ya bidhaa.","Choose at least one product photo.");return;}
 if(state.photos.length>20){message.textContent=tr("Chagua picha zisizozidi 20 kwa bidhaa moja.","Choose no more than 20 photos for one product.");return;}
 state.publishing=true;button.disabled=true;button.textContent=tr("Inachapisha bidhaa...","Publishing product...");
 message.textContent=tr("Bidhaa inapakiwa na kuchapishwa sokoni.","Your product is being uploaded and published.");
 try{
  const images=await Promise.all(state.photos.map(async photo=>({
   name:photo.file.name,
   mimeType:photo.file.type,
   dataUrl:await fileAsDataUrl(photo.file)
  })));
  const {data,error}=await supabase.functions.invoke("zune-product-moderation",{
   body:{title,description,price,stock_quantity:stock,category,images}
  });
  let result=data;
  if(error){
   try{if(error.context instanceof Response)result=await error.context.clone().json();}catch(_){}
   throw new Error(result?.error||error.message||tr("Imeshindikana kuchapisha bidhaa.","Product publishing failed."));
  }
  if(result?.status!=="published")throw new Error(result?.error||tr("Bidhaa haikuchapishwa.","Product was not published."));
  state.photos.forEach(photo=>URL.revokeObjectURL(photo.preview));
  state.photos=[];
  form.reset();
  await loadData(window.__zuneSellerUser);
  renderPanel();
  const nextMessage=document.getElementById("zsd-publish-message");
  if(nextMessage)nextMessage.textContent=tr("Bidhaa imechapishwa sokoni kikamilifu.","Your product has been published successfully.");
 }catch(error){
  console.error("ZUNE product publishing:",error);
  message.textContent=error.message||tr("Imeshindikana kuchapisha bidhaa. Hakuna bidhaa iliyowekwa hewani.","Could not publish product. No product was made live.");
 }finally{
  state.publishing=false;
  const currentButton=document.getElementById("zsd-publish-button");
  if(currentButton){currentButton.disabled=false;currentButton.textContent=tr("Kagua na Chapisha bidhaa","Review and Publish product");}
 }
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
 if(state.section==="products"){renderPhotoSelection();panel.querySelector("#zsd-product-form")?.addEventListener("submit",publishSellerProduct);}
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
  supabase.from("products").select("id,title,price,stock_quantity,created_at,moderation_status").eq("vendor_id",user.id).order("created_at",{ascending:false}).limit(50),
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
 styles();state.section="overview";state.language=localStorage.getItem("zune_language")==="en"?"en":"sw";document.documentElement.setAttribute("data-theme",localStorage.getItem("zune_theme")||"emerald");
 app.innerHTML=shell();
 window.__zuneSellerBack=onBack||(()=>{});
 bindShell();
 const panel=document.getElementById("zsd-panel");if(panel)panel.innerHTML=`<div class="zsd-empty">${tr("Inapakia dashboard...","Loading dashboard...")}</div>`;
 try{await loadData(user);}catch(error){console.error("ZUNE seller dashboard load:",error);state.error=error.message;}
 app.innerHTML=shell();bindShell();renderPanel();
}
function bindShell(){
 document.getElementById("zsd-back")?.addEventListener("click",()=>{if(typeof window.__zuneSellerBack==="function")window.__zuneSellerBack();});
 document.getElementById("zsd-language")?.addEventListener("click",()=>{
  state.language=state.language==="sw"?"en":"sw";localStorage.setItem("zune_language",state.language);
  const app=document.getElementById("app");if(app)renderSellerDashboard({app,user:window.__zuneSellerUser,onBack:window.__zuneSellerBack});
 });
 document.querySelectorAll("[data-zsd-section]").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.zsdSection;renderPanel();bindActiveNav();}));
}
