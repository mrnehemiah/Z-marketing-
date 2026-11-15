import { supabase } from "./supabase.js";

const sections = [
  ["overview","⌂","Muhtasari","Overview"],
  ["products","▣","Bidhaa","Products"],
  ["orders","▤","Oda","Orders"],
  ["finance","◈","Fedha","Finance"],
  ["customers","♙","Wateja","Customers"],
  ["messages","✉","Ujumbe","Messages"],
  ["marketing","✦","Matangazo","Ads & Marketing"],
  ["analytics","▥","Takwimu","Analytics"],
  ["store","▧","Duka","Store"],
  ["verification","✓","Uthibitisho","Verification"],
  ["delivery","⇢","Usafirishaji","Delivery"],
  ["reviews","☆","Maoni","Reviews"],
  ["support","?","Msaada","Support"],
  ["settings","⚙","Mipangilio","Settings"],
  ["assistant","✧","ZUNE AI","ZUNE AI"]
];

const state = { section:"overview", publishing:false, language:localStorage.getItem("zune_language")==="en"?"en":"sw", products:[], photos:[], orders:[], orderItems:[], wallet:null, ledger:[], store:null, badgeRequest:null, profile:null, adsPackages:[], adsCampaigns:[], adsWallet:null, adsTransactions:[], loading:false, busy:false, error:"" };
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
 const storeVerified=["verified","approved"].includes(String(state.store?.verification_status||"").toLowerCase());
 return `<div class="zsd"><div class="zsd-wrap">
 <header class="zsd-top"><div class="zsd-brand">ⓏⓊⓃⒺ <span>SELLER CENTER</span></div><div class="zsd-top-actions"><button class="zsd-btn" id="zsd-language">${state.language==="sw"?"SW / EN":"EN / SW"}</button><button class="zsd-btn" id="zsd-back">← ${tr("Soko","Marketplace")}</button></div></header>
 <div class="zsd-head"><div><div class="zsd-section-kicker">${tr("KITUO CHA BIASHARA","BUSINESS CENTER")}</div><h1>${tr("Dashboard ya Muuzaji","Seller Dashboard")}</h1><p>${tr("Simamia duka, bidhaa na biashara yako sehemu moja.","Manage your store, products and business in one place.")}</p></div><div class="zsd-head-meta"><div class="zsd-user-chip"><span class="zsd-user-avatar">${esc(initial)}</span><span class="zsd-user-copy"><b>${esc(name)}</b><small>${storeVerified?'<span class="zsd-store-mark"><i class="zsd-store-dot"></i> Verified Store</span>':tr("Akaunti ya Seller","Seller account")}</small></span></div></div></div>
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
 const req=state.badgeRequest;
 const storeStatus=String(state.store?.verification_status||"").toLowerCase();
 const storeVerified=["verified","approved"].includes(storeStatus);
 const requestStatus=String(req?.status||"").toLowerCase();
 let statusMarkup="";
 if(storeVerified){
  statusMarkup='<span class="zsd-store-mark"><i class="zsd-store-dot"></i> Verified Store</span>';
 }else if(requestStatus==="pending"){
  statusMarkup='<span class="zsd-pill blue">'+tr("Inasubiri Admin Mkuu","Pending Admin review")+'</span>';
 }else if(requestStatus==="rejected"){
  statusMarkup='<span class="zsd-pill" style="background:color-mix(in srgb,var(--danger) 12%,transparent);color:var(--danger)">'+tr("Ombi limekataliwa","Request rejected")+'</span>';
 }else if(["more_info_required","needs_information","more_information"].includes(requestStatus)){
  statusMarkup='<span class="zsd-pill orange">'+tr("Taarifa zaidi zinahitajika","More information required")+'</span>';
 }else{
  statusMarkup='<span class="zsd-pill blue">'+tr("Haijathibitishwa","Not verified")+'</span>';
 }
 const reason=req?.rejection_reason?'<p class="zsd-muted">'+esc(req.rejection_reason)+'</p>':"";
 const showForm=!storeVerified&&(requestStatus!=="pending"||!req?.document_path);
 return `<section class="zsd-card"><div class="zsd-section-kicker">${tr("UTHIBITISHO WA DUKA","STORE VERIFICATION")}</div><div class="zsd-verification-head"><div class="zsd-verification-title"><h2>Verified Store</h2>${statusMarkup}</div></div><p class="zsd-muted">${tr("Omba beji ya Verified Store. Beji ya blue itaonekana baada ya Admin Mkuu kukagua na kuidhinisha taarifa za duka lako. Hii ni tofauti na Verified Account ya Customer.","Apply for the Verified Store badge. The blue badge appears after Admin Mkuu reviews and approves your store details. This is separate from the Customer Verified Account badge.")}</p>${reason}${showForm?`<form id="zsd-verification-form" class="zsd-form" style="margin-top:15px"><label>${tr("Jina kamili la mmiliki","Owner full name")}<input name="full_name" maxlength="140" required value="${esc(state.profile?.full_name||"")}"></label><label>${tr("Jina la duka","Store name")}<input name="business_name" maxlength="140" required value="${esc(state.store?.store_name||"")}"></label><div class="zsd-full"><label>${tr("Picha ya nyaraka za uthibitisho wa duka","Store verification document")}<input name="identity_document" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><p class="zsd-muted">${tr("JPG, PNG, WEBP au PDF. Ukubwa usizidi MB 10. Admin Mkuu pekee ataweza kuona nyaraka.","JPG, PNG, WEBP or PDF. Maximum 10 MB. Only Admin Mkuu can view documents.")}</p><div id="zsd-verify-message" class="zsd-alert" role="status"></div><button class="zsd-btn primary" type="submit" style="width:100%">${tr("Omba Verified Store","Apply for Verified Store")}</button></div></form>`:""}<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--zsd-line)"><strong style="font-size:12px;display:block;margin-bottom:5px">${tr("Verified Account ya Customer","Customer Verified Account")}</strong><span class="zsd-muted">${tr("Uthibitisho wa Customer unaombwa kwenye ukurasa wa Account, si hapa.","Customer verification is requested from the Account page, not here.")}</span></div></section>`;
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
function sellerOrderTotal(orderId){
 const lines=state.orderItems.filter(item=>String(item.order_id)===String(orderId));
 return lines.reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.quantity)||0),0);
}
function renderOrders(){
 return `<section class="zsd-card"><h2>${tr("Oda za wateja","Customer orders")}</h2><p class="zsd-muted">${tr("Oda zinazoonyesha bidhaa zilizouzwa na duka lako.","Orders containing items sold by your store.")}</p>
 ${state.orders.length?`<div style="overflow:auto"><table class="zsd-table"><thead><tr><th>${tr("Oda","Order")}</th><th>${tr("Tarehe","Date")}</th><th>${tr("Hali","Status")}</th><th>${tr("Jumla ya bidhaa zako","Your item subtotal")}</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td>${esc(String(o.id).slice(0,8))}</td><td>${o.created_at?new Date(o.created_at).toLocaleDateString():"—"}</td><td>${esc(o.status||"—")}</td><td>${money(sellerOrderTotal(o.id))}</td></tr>`).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hakuna oda za duka lako.","There are no orders for your store yet.")}</div>`}
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
function renderMarketing(){
 const packages=state.adsPackages||[], campaigns=state.adsCampaigns||[], wallet=state.adsWallet||{};
 const typeLabel=x=>x==="sponsored_store"?"Sponsored Store":x==="sponsored_product"?"Sponsored Product":"Combo";
 const packageOptions=packages.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+money(p.price_tzs)+' · '+esc(p.duration_days)+' '+tr("siku","days")+'</option>').join("");
 const products=state.products.filter(p=>p.moderation_status==="approved");
 return `
 <section class="zsd-stats"><div class="zsd-stat"><small>Ads Available</small><strong>${money(wallet.available_tzs||0)}</strong></div><div class="zsd-stat"><small>Pending</small><strong>${money(wallet.pending_tzs||0)}</strong></div><div class="zsd-stat"><small>Reserved</small><strong>${money(wallet.reserved_tzs||0)}</strong></div></section>
 <section class="zsd-card"><div class="zsd-section-kicker">ZUNE ADS</div><h2>${tr("Omba tangazo jipya","Create an ad campaign")}</h2><p class="zsd-muted">${tr("Chagua package inayopatikana. Kampeni itapitiwa na Admin Mkuu kabla haijaonekana sokoni. Bajeti itahifadhiwa kutoka Ads Wallet baada ya kuidhinishwa.","Choose an available package. Admin Mkuu reviews every campaign before it appears on the marketplace. The campaign budget is reserved from your Ads Wallet only after approval.")}</p>
 ${packages.length?`<form id="zsd-ad-campaign-form" class="zsd-form">
 <label>${tr("Aina ya tangazo","Campaign type")}<select class="zsd-input" name="campaign_type" required><option value="sponsored_store">Sponsored Store</option><option value="sponsored_product">Sponsored Product</option><option value="combo">Combo</option></select></label>
 <label>${tr("Package","Package")}<select class="zsd-input" name="package_id" required>${packageOptions}</select></label>
 <label class="zsd-full">${tr("Bidhaa ya kutangaza (inahitajika kwa Product na Combo)","Product to promote (required for Product and Combo)")}<select class="zsd-input" name="product_id"><option value="">${tr("Chagua bidhaa","Select a product")}</option>${products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+'</option>').join("")}</select></label>
 <label class="zsd-full">${tr("Kichwa cha tangazo","Ad title")}<input name="title" maxlength="140" required></label>
 <label class="zsd-full">${tr("Kiungo cha picha ya tangazo (hiari)","Creative image URL (optional)")}<input name="creative_url" type="url" maxlength="1000" placeholder="https://..."></label>
 <label>${tr("Placement","Placement")}<select class="zsd-input" name="placement"><option value="home">Home</option><option value="category">Category</option><option value="search">Search</option><option value="recommendations">Recommendations</option></select></label>
 <div class="zsd-full"><div id="zsd-ad-campaign-message" class="zsd-alert" role="status"></div><button class="zsd-btn primary" type="submit" style="width:100%">${tr("Tuma kwa review","Submit for review")}</button></div>
 </form>`:`<div class="zsd-empty">${tr("Hakuna Ad Package inayopatikana kwa sasa. Wasiliana na Admin Mkuu.","No active Ad Packages are available yet. Contact Admin Mkuu.")}</div>`}
 </section>
 <section class="zsd-card"><h2>${tr("Omba kuongeza fedha kwenye Ads Wallet","Add funds to Ads Wallet")}</h2><p class="zsd-muted">${tr("Weka Transaction ID na risiti ya malipo. Salio litaongezwa baada ya Admin Mkuu kuthibitisha malipo.","Provide the transaction ID and payment receipt. Funds are credited only after Admin Mkuu verifies the payment.")}</p>
 <form id="zsd-ads-deposit-form" class="zsd-form"><label>${tr("Kiasi (TZS)","Amount (TZS)")}<input name="amount_tzs" type="number" min="1" step="1" required></label><label>${tr("Transaction ID","Transaction ID")}<input name="external_transaction_id" maxlength="160" required></label><label class="zsd-full">${tr("Risiti ya malipo (JPG, PNG, WEBP au PDF; hadi MB 10)","Payment receipt (JPG, PNG, WEBP or PDF; up to 10 MB)")}<input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><div class="zsd-full"><div id="zsd-ads-deposit-message" class="zsd-alert" role="status"></div><button class="zsd-btn primary" type="submit" style="width:100%">${tr("Tuma ombi la deposit","Submit deposit request")}</button></div></form></section>
 <section class="zsd-card"><h2>${tr("Historia ya kampeni","Campaign history")}</h2>${campaigns.length?`<div style="overflow:auto"><table class="zsd-table"><thead><tr><th>${tr("Kampeni","Campaign")}</th><th>${tr("Aina","Type")}</th><th>Placement</th><th>${tr("Bajeti","Budget")}</th><th>${tr("Hali","Status")}</th></tr></thead><tbody>${campaigns.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(typeLabel(x.campaign_type))+'</td><td>'+esc(x.placement)+'</td><td>'+money(x.budget_tzs)+'</td><td>'+esc(x.status.replaceAll("_"," "))+(x.review_reason?'<small>'+esc(x.review_reason)+'</small>':'')+'</td></tr>').join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hujatuma kampeni.","You have not submitted any campaigns yet.")}</div>`}</section>
 <section class="zsd-card"><h2>${tr("Historia ya Ads Wallet","Ads Wallet history")}</h2>${state.adsTransactions.length?`<div style="overflow:auto"><table class="zsd-table"><thead><tr><th>${tr("Tarehe","Date")}</th><th>${tr("Aina","Type")}</th><th>${tr("Kiasi","Amount")}</th><th>${tr("Hali","Status")}</th></tr></thead><tbody>${state.adsTransactions.map(x=>'<tr><td>'+new Date(x.created_at).toLocaleDateString()+'</td><td>'+esc(x.transaction_type.replaceAll("_"," "))+'</td><td>'+money(x.amount_tzs)+'</td><td>'+esc(x.status)+'</td></tr>').join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Hakuna miamala ya Ads Wallet.","No Ads Wallet transactions yet.")}</div>`}</section>`;
}
async function submitAdCampaign(event){
 event.preventDefault();const form=event.currentTarget,msg=form.querySelector("#zsd-ad-campaign-message"),button=form.querySelector("button[type=submit]");
 if(state.busy)return;state.busy=true;button.disabled=true;if(msg)msg.textContent=tr("Inatuma kampeni...","Submitting campaign...");
 try{
  const fd=new FormData(form),type=String(fd.get("campaign_type")),pkg=state.adsPackages.find(x=>String(x.id)===String(fd.get("package_id")));
  if(!state.store?.id)throw new Error(tr("Duka lako halijapatikana.","Your store profile is not available."));
  if(!pkg||pkg.campaign_type!==type)throw new Error(tr("Package haioani na aina ya tangazo.","The selected package does not match the campaign type."));
  const productId=String(fd.get("product_id")||"").trim();
  if(type!=="sponsored_store"&&!productId)throw new Error(tr("Chagua bidhaa ya kutangaza.","Select a product to promote."));
  const starts=new Date(),ends=new Date(starts.getTime()+Number(pkg.duration_days)*86400000);
  const payload={seller_id:window.__zuneSellerUser.id,store_id:state.store.id,product_id:type==="sponsored_store"?null:productId,package_id:pkg.id,campaign_type:type,placement:String(fd.get("placement")||"home"),title:String(fd.get("title")||"").trim(),creative_url:String(fd.get("creative_url")||"").trim()||null,budget_tzs:Number(pkg.price_tzs),starts_at:starts.toISOString(),ends_at:ends.toISOString(),status:"pending_review"};
  const {error}=await supabase.from("ad_campaigns").insert(payload);if(error)throw error;
  if(msg)msg.textContent=tr("Kampeni imetumwa kwa Admin Mkuu kwa review.","Campaign submitted to Admin Mkuu for review.");
  await loadAdsData();renderPanel();
 }catch(error){if(msg)msg.textContent=error.message||tr("Imeshindikana kutuma kampeni.","Could not submit campaign.");}
 finally{state.busy=false;if(button)button.disabled=false;}
}
async function submitAdsDeposit(event){
 event.preventDefault();const form=event.currentTarget,msg=form.querySelector("#zsd-ads-deposit-message"),button=form.querySelector("button[type=submit]");
 if(state.busy)return;state.busy=true;button.disabled=true;
 let uploadedPath=null;
 try{
  const fd=new FormData(form),file=fd.get("receipt"),amount=Number(fd.get("amount_tzs")),transactionId=String(fd.get("external_transaction_id")||"").trim();
  if(!(file instanceof File)||!file.size||file.size>10*1024*1024||!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type))throw new Error(tr("Chagua risiti sahihi isiyozidi MB 10.","Choose a valid receipt up to 10 MB."));
  const ext=file.type==="application/pdf"?"pdf":file.type.split("/")[1].replace("jpeg","jpg");
  uploadedPath=window.__zuneSellerUser.id+"/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+ext;
  const upload=await supabase.storage.from("ads-payment-receipts").upload(uploadedPath,file,{contentType:file.type,upsert:false});if(upload.error)throw upload.error;
  const {error}=await supabase.from("ads_wallet_transactions").insert({seller_id:window.__zuneSellerUser.id,transaction_type:"deposit_request",amount_tzs:amount,status:"pending",external_transaction_id:transactionId,receipt_path:uploadedPath});
  if(error)throw error;
  if(msg)msg.textContent=tr("Ombi la deposit limetumwa. Salio litaongezwa baada ya uthibitisho wa Admin Mkuu.","Deposit request submitted. Funds will be credited after Admin Mkuu verifies it.");
  form.reset();await loadAdsData();renderPanel();
 }catch(error){if(uploadedPath)await supabase.storage.from("ads-payment-receipts").remove([uploadedPath]);if(msg)msg.textContent=error.message||tr("Imeshindikana kutuma ombi.","Could not submit request.");}
 finally{state.busy=false;if(button)button.disabled=false;}
}
async function loadAdsData(){
 const user=window.__zuneSellerUser;if(!user?.id)return;
 const [packages,campaigns,wallet,transactions]=await Promise.all([
  supabase.from("ad_packages").select("*").eq("is_active",true).order("created_at",{ascending:false}),
  supabase.from("ad_campaigns").select("*").eq("seller_id",user.id).order("created_at",{ascending:false}),
  supabase.from("ads_wallets").select("seller_id,available_tzs,pending_tzs,reserved_tzs").eq("seller_id",user.id).maybeSingle(),
  supabase.from("ads_wallet_transactions").select("id,transaction_type,amount_tzs,status,created_at,external_transaction_id").eq("seller_id",user.id).order("created_at",{ascending:false}).limit(100)
 ]);
 state.adsPackages=packages.data||[];state.adsCampaigns=campaigns.data||[];state.adsWallet=wallet.data||null;state.adsTransactions=transactions.data||[];
}

function renderPlaceholder(){
 const names=sections.find(s=>s[0]===state.section);
 return `<section class="zsd-card"><h2>${tr(names[2],names[3])}</h2><p class="zsd-muted">${tr("Sehemu hii imeongezwa kwenye muundo wa dashboard. Itaunganishwa na jedwali na ruhusa sahihi za Supabase kabla ya kuanza kutumia data halisi.","This section is included in the dashboard structure. It will be connected to the correct Supabase tables and permissions before handling live data.")}</p><div class="zsd-empty">${tr("Inaandaliwa — hakuna data ya majaribio iliyowekwa.","In preparation — no sample data has been inserted.")}</div></section>`;
}
function renderPanel(){
 const panel=document.getElementById("zsd-panel"); if(!panel)return;
 panel.innerHTML=state.section==="overview"?renderOverview():state.section==="products"?renderProducts():state.section==="orders"?renderOrders():state.section==="finance"?renderFinance():state.section==="store"?renderStore():state.section==="verification"?renderVerification():state.section==="marketing"?renderMarketing():renderPlaceholder();
 panel.querySelectorAll("[data-zsd-section]").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.zsdSection;renderPanel();bindActiveNav();}));
 panel.querySelector("#zsd-verification-form")?.addEventListener("submit",submitVerification);
 panel.querySelector("#zsd-gallery-input")?.addEventListener("change",event=>{if(event.target.files?.length)addSellerPhotos(event.target.files);event.target.value="";});
 panel.querySelector("#zsd-camera-input")?.addEventListener("change",event=>{if(event.target.files?.length)addSellerPhotos(event.target.files);event.target.value="";});
 if(state.section==="products"){renderPhotoSelection();panel.querySelector("#zsd-product-form")?.addEventListener("submit",publishSellerProduct);} if(state.section==="marketing"){panel.querySelector("#zsd-ad-campaign-form")?.addEventListener("submit",submitAdCampaign);panel.querySelector("#zsd-ads-deposit-form")?.addEventListener("submit",submitAdsDeposit);}
}
function bindActiveNav(){
 document.querySelectorAll("[data-zsd-section]").forEach(b=>b.classList.toggle("active",b.dataset.zsdSection===state.section));
}
async function submitVerification(event){
 event.preventDefault();
 const form=event.currentTarget, message=form.querySelector("#zsd-verify-message"), button=form.querySelector("button[type=submit]");
 if(state.busy)return;
 const values=new FormData(form);
 const fullName=String(values.get("full_name")||"").trim(), business=String(values.get("business_name")||"").trim(), file=values.get("identity_document");
 if(!fullName||!business||!(file instanceof File)||!file.size){message.textContent=tr("Jaza majina na pakia nyaraka.","Complete the names and upload a document.");return;}
 if(file.size>10*1024*1024||!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type)){message.textContent=tr("Chagua JPG, PNG, WEBP au PDF isiyozidi MB 10.","Choose JPG, PNG, WEBP or PDF up to 10 MB.");return;}
 state.busy=true;button.disabled=true;message.textContent=tr("Inatuma ombi...","Submitting request...");
 try{
  const extension=file.type==="application/pdf"?"pdf":file.type.split("/")[1].replace("jpeg","jpg");
  const documentPath=window.__zuneSellerUser.id+"/seller/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+extension;
  const upload=await supabase.storage.from("zune-verification-documents").upload(documentPath,file,{contentType:file.type,upsert:false});
  if(upload.error)throw upload.error;
  if(state.badgeRequest?.status==="pending"&&!state.badgeRequest.document_path){
   const {data,error}=await supabase.rpc("zune_attach_verification_document",{p_request_id:state.badgeRequest.id,p_document_path:documentPath});
   if(error)throw error;
   state.badgeRequest=data;renderPanel();return;
  }
  const {data,error}=await supabase.from("verified_badge_requests").insert({user_id:window.__zuneSellerUser.id,full_name:fullName,business_name:business,document_path:documentPath,verification_type:"seller",status:"pending"}).select("id,status,rejection_reason,document_path,created_at").single();
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
  supabase.from("verified_badge_requests").select("id,status,rejection_reason,document_path,created_at").eq("user_id",user.id).eq("verification_type","seller").order("created_at",{ascending:false}).limit(1).maybeSingle(),
  supabase.from("wallets").select("user_id,balance,updated_at").eq("user_id",user.id).maybeSingle(),
  supabase.from("wallet_ledger").select("id,amount,entry_type,reason,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100)
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
