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

const state = { section:"overview", language:localStorage.getItem("zune_language")==="en"?"en":"sw", products:[], orders:[], store:null, badgeRequest:null, profile:null, loading:false, busy:false, error:"" };
const tr = (sw,en) => state.language==="sw"?sw:en;
const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat("sw-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(Number(value)||0);

function styles(){
 if(document.getElementById("z-seller-dashboard-styles")) return;
 const style=document.createElement("style"); style.id="z-seller-dashboard-styles";
 style.textContent=`
 .zsd{--zsd-bg:var(--bg-primary,var(--background,#f5f7f6));--zsd-card:var(--surface,var(--card-bg,#fff));--zsd-text:var(--text-primary,#17231e);--zsd-muted:var(--text-secondary,#718078);--zsd-line:var(--border-color,#e4ebe7);color:var(--zsd-text);background:var(--zsd-bg);min-height:100vh;padding-bottom:28px}
 .zsd *{box-sizing:border-box}.zsd-wrap{width:min(1180px,100%);margin:auto;padding:18px 16px 36px}
 .zsd-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.zsd-brand{font-weight:900;letter-spacing:2px;color:var(--primary,var(--theme-primary,#087a55));font-size:19px}.zsd-top-actions{display:flex;gap:8px;align-items:center}
 .zsd-btn{border:1px solid var(--zsd-line);border-radius:12px;padding:10px 13px;background:var(--zsd-card);color:var(--zsd-text);font-weight:700;cursor:pointer}.zsd-btn.primary{background:var(--primary,var(--theme-primary,#087a55));border-color:transparent;color:#fff}.zsd-btn:disabled{opacity:.55;cursor:not-allowed}
 .zsd-head{margin:12px 0 18px}.zsd-head h1{font-size:25px;margin:0 0 5px}.zsd-head p{margin:0;color:var(--zsd-muted);font-size:13px}
 .zsd-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px}.zsd-nav{background:var(--zsd-card);border:1px solid var(--zsd-line);border-radius:18px;padding:10px;height:max-content;position:sticky;top:12px}
 .zsd-nav button{width:100%;border:0;background:transparent;color:var(--zsd-muted);display:flex;gap:11px;align-items:center;text-align:left;padding:11px;border-radius:11px;font-weight:650;cursor:pointer}.zsd-nav button.active{background:var(--primary-soft,rgba(8,122,85,.1));color:var(--primary,var(--theme-primary,#087a55))}
 .zsd-nav .zsd-nav-icon{width:22px;text-align:center;font-size:17px}.zsd-content{min-width:0}.zsd-card{background:var(--zsd-card);border:1px solid var(--zsd-line);border-radius:17px;padding:17px;margin-bottom:14px}.zsd-card h2{font-size:18px;margin:0 0 8px}.zsd-muted{color:var(--zsd-muted);font-size:13px;line-height:1.6}
 .zsd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:14px}.zsd-stat{background:var(--zsd-card);border:1px solid var(--zsd-line);border-radius:15px;padding:14px}.zsd-stat small{display:block;color:var(--zsd-muted);font-size:12px}.zsd-stat strong{display:block;font-size:21px;margin-top:8px}
 .zsd-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.zsd-pill{display:inline-flex;border-radius:30px;padding:5px 9px;background:rgba(230,145,35,.13);color:#c87510;font-size:11px;font-weight:800}.zsd-pill.blue{background:rgba(38,123,207,.12);color:#267bcf}
 .zsd-table{width:100%;border-collapse:collapse;font-size:13px}.zsd-table th,.zsd-table td{padding:11px 8px;border-bottom:1px solid var(--zsd-line);text-align:left}.zsd-table th{color:var(--zsd-muted);font-size:11px}
 .zsd-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.zsd-form label{display:grid;gap:6px;font-size:12px;font-weight:700}.zsd-form input,.zsd-form textarea,.zsd-form select{width:100%;border:1px solid var(--zsd-line);border-radius:10px;padding:11px;background:var(--zsd-bg);color:var(--zsd-text);font:inherit}.zsd-form textarea{min-height:80px}.zsd-full{grid-column:1/-1}
 .zsd-empty{padding:26px;text-align:center;color:var(--zsd-muted);border:1px dashed var(--zsd-line);border-radius:14px}.zsd-alert{padding:12px;border-radius:12px;background:rgba(220,150,40,.1);color:var(--zsd-text);font-size:13px;margin:10px 0}
 .zsd-mobile-nav{display:none}.zsd-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.zsd-product{border:1px solid var(--zsd-line);border-radius:13px;padding:11px;min-width:0}.zsd-product strong{display:block;overflow-wrap:anywhere}.zsd-photo-grid{display:flex;flex-wrap:wrap;gap:8px}.zsd-photo{width:78px;height:78px;object-fit:cover;border-radius:10px;border:2px solid var(--zsd-line)}
 @media(max-width:760px){.zsd-layout{display:block}.zsd-nav{display:none}.zsd-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.zsd-mobile-nav{display:flex;overflow:auto;gap:7px;margin-bottom:13px;padding-bottom:4px}.zsd-mobile-nav button{white-space:nowrap}.zsd-form{grid-template-columns:1fr}.zsd-full{grid-column:auto}.zsd-head h1{font-size:22px}.zsd-wrap{padding:12px 12px 28px}}
 @media(min-width:761px){.zsd-top{margin-bottom:22px}}
 `;
 document.head.appendChild(style);
}

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
 const req=state.badgeRequest, verified=!!state.profile?.is_verified;
 let status="";
 if(verified) status=`<span class="zsd-pill" style="background:rgba(230,145,35,.14);color:#c87510">${tr("✓ Verified Account","✓ Verified Account")}</span>`;
 else if(req?.status==="pending") status=`<span class="zsd-pill">${tr("Inasubiri Admin Mkuu","Pending Admin Mkuu review")}</span>`;
 else if(req?.status==="rejected") status=`<span class="zsd-pill" style="background:rgba(190,50,50,.12);color:#bd3d3d">${tr("Limekataliwa","Rejected")}</span>`;
 return `<section class="zsd-card"><div class="zsd-row"><h2>${tr("Profile Badge — Simple Verification","Profile Badge — Simple Verification")}</h2>${status}</div><p class="zsd-muted">${tr("Omba beji ya Verified Account. Admin Mkuu atakagua maombi yako; beji itaonekana baada ya kuidhinishwa. Hii ni tofauti na Verified Store.","Request the Verified Account badge. Admin Mkuu reviews your request; the badge appears only after approval. This is separate from Verified Store.")}</p>
 ${req?.status==="pending"||verified?"":`<form id="zsd-verification-form" class="zsd-form"><label>${tr("Jina kamili","Full name")}<input name="full_name" required maxlength="140" value="${esc(state.profile?.full_name||"")}"></label><label>${tr("Jina la duka (hiari)","Store name (optional)")}<input name="business_name" maxlength="140" value="${esc(state.store?.store_name||"")}"></label><p class="zsd-muted zsd-full">${tr("Hii ni hatua rahisi ya kuanzisha ombi. Usitume namba ya kitambulisho au nyaraka hapa mpaka ZUNE itoe njia salama ya kuzipokea.","This is a simple request. Do not submit ID numbers or documents here until ZUNE provides a secure evidence-upload flow.")}</p><div class="zsd-full"><button class="zsd-btn primary" type="submit" id="zsd-verify-submit">${tr("Omba Verified Account","Request Verified Account")}</button></div><p class="zsd-muted zsd-full" id="zsd-verify-message" aria-live="polite">${req?.status==="rejected"?esc(req.rejection_reason||""):""}</p></form>`}
 </section>`;
}
function renderProducts(){
 return `<section class="zsd-card"><div class="zsd-row"><h2>${tr("Usimamizi wa bidhaa","Product management")}</h2><span class="zsd-pill blue">${state.products.length}</span></div><p class="zsd-muted">${tr("Bidhaa zilizopo kwenye akaunti yako ya muuzaji.","Products currently linked to your seller account.")}</p>${state.products.length?renderProductList(state.products):`<div class="zsd-empty">${tr("Hakuna bidhaa bado.","No products yet.")}</div>`}
 <div class="zsd-alert">${tr("Uwekaji wa bidhaa mpya utafunguliwa baada ya ukaguzi wa usalama wa maudhui (picha, jina na maelezo) kuunganishwa. Kwa sasa hatuweki bidhaa hewani bila moderation gate.","New product publishing will be enabled after the content safety moderation gate (images, title and description) is connected. We will not publish unmoderated listings.")}</div></section>
 <section class="zsd-card"><h2>${tr("Picha nyingi za bidhaa","Multiple product photos")}</h2><p class="zsd-muted">${tr("Mfumo unaunga mkono picha zaidi ya 10, kuchagua Gallery/Storage ya simu, preview, kupanga mpangilio na kuchagua picha kuu. Picha zitapunguzwa ukubwa kabla ya kupakiwa kwenye Supabase Storage.","The uploader will support more than 10 photos, phone Gallery/Storage selection, preview, reordering and a main image. Images will be compressed before upload to Supabase Storage.")}</p><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled aria-label="Product images"><p class="zsd-muted">${tr("Kipengele cha kupakia kitasogezwa baada ya moderation backend kuwekwa ili bidhaa zisichapishwe kabla ya ukaguzi.","Image upload will be activated after the moderation backend is ready, preventing listings from going live before review.")}</p></section>`;
}
function renderPlaceholder(){
 const names=sections.find(s=>s[0]===state.section);
 return `<section class="zsd-card"><h2>${tr(names[2],names[3])}</h2><p class="zsd-muted">${tr("Sehemu hii imeongezwa kwenye muundo wa dashboard. Itaunganishwa na jedwali na ruhusa sahihi za Supabase kabla ya kuanza kutumia data halisi.","This section is included in the dashboard structure. It will be connected to the correct Supabase tables and permissions before handling live data.")}</p><div class="zsd-empty">${tr("Inaandaliwa — hakuna data ya majaribio iliyowekwa.","In preparation — no sample data has been inserted.")}</div></section>`;
}
function renderPanel(){
 const panel=document.getElementById("zsd-panel"); if(!panel)return;
 panel.innerHTML=state.section==="overview"?renderOverview():state.section==="products"?renderProducts():renderPlaceholder();
 panel.querySelectorAll("[data-zsd-section]").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.zsdSection;renderPanel();bindActiveNav();}));
 panel.querySelector("#zsd-verification-form")?.addEventListener("submit",submitVerification);
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
 const [profile,products,items,store,badge]=await Promise.all([
  supabase.from("profiles").select("id,full_name,is_verified,role").eq("id",user.id).maybeSingle(),
  supabase.from("products").select("id,title,price,stock_quantity,created_at").eq("vendor_id",user.id).order("created_at",{ascending:false}).limit(50),
  supabase.from("order_items").select("order_id,product_id,price,quantity,created_at").eq("seller_id",user.id).limit(100),
  supabase.from("stores").select("id,store_name,verification_status").eq("owner_id",user.id).maybeSingle(),
  supabase.from("verified_badge_requests").select("id,status,rejection_reason,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle()
 ]);
 state.profile=profile.data||null;state.products=products.data||[];state.store=store.data||null;state.badgeRequest=badge.data||null;
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
