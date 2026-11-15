import { supabase } from "./supabase.js";

const sections = [
  ["overview","⌂","Muhtasari","Overview","DASHBOARD"],
  ["products","▣","Bidhaa","Products","BIASHARA"],
  ["add-product","＋","Ongeza Bidhaa","Add Product","BIASHARA"],
  ["orders","▤","Oda","Orders","BIASHARA"],
  ["inventory","▦","Stock","Inventory / Stock","BIASHARA"],
  ["customers","♙","Wateja","Customers","BIASHARA"],
  ["finance","◈","Mapato na Wallet","Earnings & Wallet","FEDHA"],
  ["transactions","⇄","Miamala","Transactions","FEDHA"],
  ["withdrawals","↗","Utoaji wa Fedha","Withdrawals","FEDHA"],
  ["analytics","▥","Uchambuzi wa Mauzo","Sales Analytics","UCHAMBUZI"],
  ["product-performance","↗","Utendaji wa Bidhaa","Product Performance","UCHAMBUZI"],
  ["marketing","✦","Ads & Marketing","Ads & Marketing","MASOKO"],
  ["promotions","％","Punguzo na Matangazo","Promotions & Discounts","MASOKO"],
  ["messages","✉","Ujumbe","Messages","MAWASILIANO"],
  ["reviews","☆","Maoni na Ratings","Reviews & Ratings","MAWASILIANO"],
  ["notifications","♢","Notifications","Notifications","MAWASILIANO"],
  ["store","▧","Wasifu wa Duka","Store Profile","DUKA"],
  ["verification","✓","Uthibitisho wa Duka","Store Verification","DUKA"],
  ["support","?","Msaada wa Seller","Seller Support","MSAADA NA MIPANGILIO"],
  ["settings","⚙","Mipangilio","Settings","MSAADA NA MIPANGILIO"]
];

const state = { section:"overview", sidebarCollapsed:false, sidebarOpen:false, salesPeriod:"7d", publishing:false, language:localStorage.getItem("zune_language")==="en"?"en":"sw", products:[], photos:[], orders:[], orderItems:[], orderDeliveries:[], wallet:null, ledger:[], store:null, badgeRequest:null, profile:null, adsPackages:[], adsCampaigns:[], adsWallet:null, adsTransactions:[], adsEvents:[], conversations:[], activeConversationId:null, chatMessages:[], notifications:[], customers:[], customersLoading:false, customersLoadedFor:null, supportTickets:[], sellerLocations:[], locationsLoadedFor:null, editingLocationId:null, withdrawalRequests:[], withdrawalsLoadedFor:null, withdrawalsLoading:false, messagesLoadedFor:null, notificationsLoadedFor:null, supportLoadedFor:null, messagesLoading:false, notificationsLoading:false, supportLoading:false, reviews:[], reviewsLoading:false, reviewsLoadedFor:null, loading:false, busy:false, error:"" };
const tr = (sw,en) => state.language==="sw"?sw:en;
const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat("sw-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(Number(value)||0);

function styles(){
 let link=document.getElementById("zune-seller-dashboard-styles");
 if(link)return;
 link=document.createElement("link");
 link.id="zune-seller-dashboard-styles";
 link.rel="stylesheet";
 link.href="./seller-dashboard.css?v=20261115-store-profile-v1";
 document.head.appendChild(link);
}

function verifiedAccountMark(){
 return `<span class="zsd-verified-mark" title="Verified Account"><svg viewBox="-30 -30 60 60" role="img" aria-label="Verified Account"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Verified Account</span></span>`;
}
function renderNav(){
 const groups=[...new Set(sections.map(item=>item[4]))];
 const groupTitle=group=>({DASHBOARD:tr("MUHTASARI","OVERVIEW"),BIASHARA:tr("USIMAMIZI WA BIASHARA","BUSINESS MANAGEMENT"),FEDHA:tr("FEDHA NA MALIPO","FINANCE & PAYMENTS"),UCHAMBUZI:tr("TAKWIMU NA UCHAMBUZI","INSIGHTS & ANALYTICS"),MASOKO:tr("MASOKO NA MATANGAZO","MARKETING"),MAWASILIANO:tr("MAWASILIANO","COMMUNICATION"),DUKA:tr("USIMAMIZI WA DUKA","STORE MANAGEMENT"),"MSAADA NA MIPANGILIO":tr("MSAADA NA MIPANGILIO","SUPPORT & SETTINGS")}[group]||group);
 return groups.map(group=>{
  const links=sections.filter(item=>item[4]===group).map(([id,icon,sw,en])=>`<button type="button" data-zsd-section="${id}" class="${state.section===id?"active":""}"><span class="zsd-nav-icon">${icon}</span><span class="zsd-nav-label">${tr(sw,en)}</span></button>`).join("");
  return `<div class="zsd-nav-group"><small>${groupTitle(group)}</small>${links}</div>`;
 }).join("");
}
function shell(){
 const name=state.profile?.full_name||window.__zuneSellerUser?.email||tr("Muuzaji","Seller");
 const storeName=state.store?.store_name||tr("Duka lako","Your store");
 const initial=String(name).trim().charAt(0).toUpperCase()||"Z";
 const storeVerified=["verified","approved"].includes(String(state.store?.verification_status||"").toLowerCase());
 const verified=storeVerified?'<span class="zsd-store-mark"><i class="zsd-store-dot"></i> Verified Store</span>':`<span class="zsd-pill blue">${tr("Duka halijathibitishwa","Store not verified")}</span>`;
 return `<div class="zsd ${state.sidebarCollapsed?"is-collapsed":""} ${state.sidebarOpen?"sidebar-open":""}"><div class="zsd-wrap">
 <header class="zsd-top">
  <div class="zsd-brand-side"><button class="zsd-icon-btn" id="zsd-menu" type="button" aria-label="Toggle sidebar" aria-expanded="${state.sidebarOpen||!state.sidebarCollapsed}">☰</button><div class="zsd-brand">ⓏⓊⓃⒺ <span>SELLER CENTER</span></div></div>
  <div class="zsd-top-actions">
   <label class="zsd-search"><span>⌕</span><input id="zsd-nav-search" type="search" placeholder="${tr("Tafuta sehemu...","Find a section...")}" aria-label="${tr("Tafuta sehemu","Find a section")}"></label>
   <button class="zsd-icon-btn" type="button" data-zsd-section="notifications" aria-label="Notifications">♢<i class="zsd-notification-dot"></i></button>
   <button class="zsd-icon-btn" type="button" data-zsd-section="messages" aria-label="Messages">✉</button>
   <button class="zsd-icon-btn zsd-profile-button" type="button" data-zsd-section="settings" aria-label="Seller profile"><span class="zsd-user-avatar">${esc(initial)}</span></button>
   <button class="zsd-btn" id="zsd-language">${state.language==="sw"?"SW / EN":"EN / SW"}</button>
   <button class="zsd-btn" id="zsd-back">← ${tr("Soko","Marketplace")}</button>
  </div>
 </header>
 <div class="zsd-store-strip"><div><span class="zsd-section-kicker">${tr("DUKA LINALOSIMAMIWA","MANAGING STORE")}</span><strong>${esc(storeName)}</strong><span class="zsd-store-subtitle">${esc(name)}</span></div><div>${verified}</div></div>
 <div class="zsd-head"><div><div class="zsd-section-kicker">${tr("KITUO CHA BIASHARA","BUSINESS CENTER")}</div><h1 id="zsd-page-title">${state.section==="overview"?tr("Muhtasari wa Biashara","Business Overview"):esc((sections.find(x=>x[0]===state.section)||[])[state.language==="sw"?2:3]||"Seller Center")}</h1><p>${tr("Simamia duka, bidhaa na biashara yako sehemu moja.","Manage your store, products and business in one place.")}</p></div></div>
 <div class="zsd-layout"><aside class="zsd-nav" id="zsd-sidebar"><div class="zsd-nav-brand"><b>Ⓩ ZUNE</b><small>SELLER MENU</small><button type="button" id="zsd-sidebar-close" aria-label="Close menu">×</button></div><div class="zsd-nav-links">${renderNav()}</div><div class="zsd-nav-footer"><span class="zsd-user-avatar">${esc(initial)}</span><span><b>${esc(name)}</b><small>${tr("Akaunti ya Seller","Seller account")}</small></span></div></aside><button type="button" class="zsd-sidebar-backdrop" id="zsd-sidebar-backdrop" aria-label="Close menu"></button><main class="zsd-content"><div id="zsd-panel"></div></main></div>
 </div></div>`;
}
function sellerSalesForPeriod(period){
 const now=new Date(),days=period==="today"?1:period==="30d"?30:period==="12m"?365:7;
 const start=new Date(now);start.setDate(start.getDate()-days+1);start.setHours(0,0,0,0);
 const buckets=period==="12m"?12:period==="today"?24:days;
 const labels=[],values=Array(buckets).fill(0);
 for(let i=0;i<buckets;i++){
  const d=new Date(start);
  if(period==="12m")d.setMonth(d.getMonth()+i);
  else if(period==="today")d.setHours(d.getHours()+i);
  else d.setDate(d.getDate()+i);
  labels.push(period==="12m"?d.toLocaleDateString("sw-TZ",{month:"short"}):period==="today"?d.toLocaleTimeString("sw-TZ",{hour:"2-digit"}):d.toLocaleDateString("sw-TZ",{day:"numeric",month:"short"}));
 }
 state.orderItems.forEach(item=>{
  if(!item.created_at)return;
  const d=new Date(item.created_at);if(d<start||d>now)return;
  const index=period==="12m"?Math.min(buckets-1,Math.max(0,(d.getFullYear()-start.getFullYear())*12+d.getMonth()-start.getMonth())):period==="today"?Math.min(23,d.getHours()):Math.floor((d-start)/86400000);
  if(index>=0&&index<buckets)values[index]+=(Number(item.price)||0)*(Number(item.quantity)||0);
 });
 return {labels,values};
}
function renderOverview(){
 const sales=state.orderItems.reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.quantity)||0),0);
 const pending=state.orders.filter(o=>["pending","new","processing"].includes(String(o.status||"").toLowerCase())).length;
 const active=state.products.filter(p=>Number(p.stock_quantity)>0&&!["rejected","draft","archived"].includes(String(p.moderation_status||"").toLowerCase())).length;
 const earned=state.ledger.filter(x=>/credit|earning|sale|payout/i.test(String(x.entry_type||""))&&Number(x.amount)>0).reduce((sum,x)=>sum+Number(x.amount),0);
 const metrics=[
  ["Total Sales",money(sales),"↗","Jumla ya mauzo ya bidhaa zako"],
  ["Total Orders",state.orders.length,"▤","Oda zenye bidhaa za duka lako"],
  ["Pending Orders",pending,"◷","Oda zinazohitaji hatua"],
  ["Active Products",active,"▣","Bidhaa zilizo hai na zenye stock"],
  ["Total Earnings",money(earned),"◈","Mapato yaliyorekodiwa kwenye wallet"],
  ["Available Balance",money(state.wallet?.balance),"₮","Salio la sasa la wallet"]
 ];
 const period=sellerSalesForPeriod(state.salesPeriod),max=Math.max(1,...period.values);
 const chart=period.values.map((value,i)=>`<div class="zsd-chart-col" title="${esc(period.labels[i])}: ${money(value)}"><span style="height:${Math.max(3,Math.round(value/max*100))}%"></span><small>${i===0||i===period.labels.length-1||i%Math.max(1,Math.floor(period.labels.length/5))===0?esc(period.labels[i]):""}</small></div>`).join("");
 const latest=[...state.orders].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,5);
 const best=state.products.map(p=>{const lines=state.orderItems.filter(x=>String(x.product_id)===String(p.id));return {...p,units:lines.reduce((n,x)=>n+(Number(x.quantity)||0),0),revenue:lines.reduce((n,x)=>n+(Number(x.quantity)||0)*(Number(x.price)||0),0)};}).filter(p=>p.units>0).sort((a,b)=>b.units-a.units).slice(0,5);
 const low=state.products.filter(p=>Number(p.stock_quantity)<=5).sort((a,b)=>Number(a.stock_quantity)-Number(b.stock_quantity)).slice(0,5);
 const quick=[["add-product","＋","Ongeza Bidhaa"],["orders","▤","Simamia Oda"],["finance","◈","Angalia Mapato"],["marketing","✦","Tengeneza Tangazo"]];
 return `<section class="zsd-stats zsd-stats-six" aria-label="${tr("Takwimu za biashara","Business metrics")}">${metrics.map(([label,value,icon,desc])=>`<article class="zsd-stat"><span class="zsd-stat-icon">${icon}</span><small>${label}</small><strong>${value}</strong><span class="zsd-stat-desc">${desc}</span></article>`).join("")}</section>
 <section class="zsd-card zsd-analytics-card"><div class="zsd-row"><div><div class="zsd-section-kicker">PERFORMANCE</div><h2>${tr("Sales Analytics","Sales Analytics")}</h2><p class="zsd-muted">${tr("Mwenendo wa mauzo kulingana na oda za duka lako.","Sales performance based on your store orders.")}</p></div><div class="zsd-periods">${[["today","Leo"],["7d","Siku 7"],["30d","Siku 30"],["12m","Miezi 12"]].map(([id,label])=>`<button type="button" data-zsd-period="${id}" class="${state.salesPeriod===id?"active":""}">${label}</button>`).join("")}</div></div><div class="zsd-chart-summary"><strong>${money(period.values.reduce((a,b)=>a+b,0))}</strong><small>${tr("Mauzo katika kipindi kilichochaguliwa","Sales in selected period")}</small></div><div class="zsd-chart">${chart}</div></section>
 <section class="zsd-quick-actions">${quick.map(([id,icon,label])=>`<button type="button" data-zsd-section="${id}"><span>${icon}</span>${label}<b>→</b></button>`).join("")}</section>
 <div class="zsd-overview-grid"><section class="zsd-card"><div class="zsd-row"><div><h2>${tr("Recent Orders","Recent Orders")}</h2><p class="zsd-muted">${tr("Oda za hivi karibuni za duka lako.","Latest orders for your store.")}</p></div><button class="zsd-text-btn" type="button" data-zsd-section="orders">${tr("Ona zote","View all")} →</button></div>${latest.length?`<div class="zsd-table-wrap"><table class="zsd-table"><thead><tr><th>Order ID</th><th>${tr("Tarehe","Date")}</th><th>Status</th><th>${tr("Kiasi","Amount")}</th></tr></thead><tbody>${latest.map(o=>`<tr><td>#${esc(String(o.id).slice(0,8))}</td><td>${o.created_at?new Date(o.created_at).toLocaleDateString():"—"}</td><td><span class="zsd-status ${esc(String(o.status||"").toLowerCase())}">${esc(String(o.status||"—").replaceAll("_"," "))}</span></td><td>${money(sellerOrderTotal(o.id))}</td></tr>`).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hakuna oda za duka lako.","No orders for your store yet.")}</div>`}</section>
 <section class="zsd-card"><div class="zsd-row"><div><h2>${tr("Low Stock Alerts","Low Stock Alerts")}</h2><p class="zsd-muted">${tr("Bidhaa zenye stock ya vipande 5 au chini.","Products with 5 or fewer units in stock.")}</p></div><span class="zsd-pill orange">${low.length}</span></div>${low.length?low.map(p=>`<div class="zsd-low-stock"><span><b>${esc(p.title)}</b><small>${tr("Stock iliyobaki","Remaining stock")}</small></span><strong>${Number(p.stock_quantity)||0}</strong></div>`).join(""):`<div class="zsd-empty">${tr("Hakuna bidhaa zenye stock ndogo kwa sasa.","No low-stock products right now.")}</div>`}</section>
 <section class="zsd-card"><div class="zsd-row"><div><h2>${tr("Best Selling Products","Best Selling Products")}</h2><p class="zsd-muted">${tr("Bidhaa zinazoongoza kwa idadi ya mauzo.","Products ranked by units sold.")}</p></div><button class="zsd-text-btn" type="button" data-zsd-section="product-performance">${tr("Ona zaidi","View more")} →</button></div>${best.length?best.map((p,i)=>`<div class="zsd-best-product"><span class="zsd-best-rank">${i+1}</span><span class="zsd-best-copy"><b>${esc(p.title)}</b><small>${p.units} ${tr("zilizouzwa","sold")} · ${money(p.revenue)}</small></span><span class="zsd-best-stock">${tr("Stock","Stock")}: ${Number(p.stock_quantity)||0}</span></div>`).join(""):`<div class="zsd-empty">${tr("Takwimu za bidhaa zitajitokeza baada ya mauzo kuanza.","Product rankings will appear after sales begin.")}</div>`}</section>
 <section class="zsd-card"><div class="zsd-row"><div><h2>${tr("Recent Activity","Recent Activity")}</h2><p class="zsd-muted">${tr("Shughuli za hivi karibuni kwenye duka.","Latest store activity.")}</p></div></div>${[...state.orders.map(o=>({date:o.created_at,label:tr("Oda mpya","New order")+" #"+String(o.id).slice(0,8)})),...state.products.slice(0,5).map(p=>({date:p.created_at,label:tr("Bidhaa: ","Product: ")+p.title}))].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,5).map(x=>`<div class="zsd-activity"><i></i><span>${esc(x.label)}<small>${x.date?new Date(x.date).toLocaleString():""}</small></span></div>`).join("")||`<div class="zsd-empty">${tr("Shughuli zitaonekana hapa.","Activity will appear here.")}</div>`}</section></div>
 ${renderVerification()}`;
}
function renderInventory(){
 const rows=state.products.slice().sort((a,b)=>(Number(a.stock_quantity)||0)-(Number(b.stock_quantity)||0));
 return `<section class="zsd-card"><div class="zsd-row"><div><h2>${tr("Inventory / Stock","Inventory / Stock")}</h2><p class="zsd-muted">${tr("Fuatilia stock ya bidhaa zako na tambua zinazohitaji kuongezwa.","Track product stock and identify items that need replenishment.")}</p></div><span class="zsd-pill">${rows.length} ${tr("bidhaa","products")}</span></div>${rows.length?`<div class="zsd-table-wrap"><table class="zsd-table"><thead><tr><th>${tr("Bidhaa","Product")}</th><th>${tr("Stock iliyobaki","Stock remaining")}</th><th>${tr("Bei","Price")}</th><th>${tr("Tahadhari","Alert")}</th></tr></thead><tbody>${rows.map(p=>{const stock=Number(p.stock_quantity)||0;return `<tr><td>${esc(p.title)}</td><td>${stock}</td><td>${money(p.price)}</td><td><span class="zsd-status ${stock===0?"cancelled":stock<=5?"pending":"completed"}">${stock===0?tr("Imeisha","Out of stock"):stock<=5?tr("Stock ndogo","Low stock"):tr("Inapatikana","In stock")}</span></td></tr>`;}).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hakuna bidhaa za kuonyesha.","No products to display yet.")}</div>`}</section>`;
}
function renderAnalyticsPage(){
 const data=sellerSalesForPeriod(state.salesPeriod),max=Math.max(1,...data.values);
 return `<section class="zsd-card"><div class="zsd-row"><div><h2>${tr("Sales Analytics","Sales Analytics")}</h2><p class="zsd-muted">${tr("Mauzo yanayotokana na bidhaa za duka lako.","Sales generated by products in your store.")}</p></div><div class="zsd-periods">${[["today","Leo"],["7d","Siku 7"],["30d","Siku 30"],["12m","Miezi 12"]].map(([id,label])=>`<button type="button" data-zsd-period="${id}" class="${state.salesPeriod===id?"active":""}">${label}</button>`).join("")}</div></div><div class="zsd-chart-summary"><strong>${money(data.values.reduce((a,b)=>a+b,0))}</strong><small>${tr("Jumla ya mauzo katika kipindi hiki","Total sales for this period")}</small></div><div class="zsd-chart zsd-chart-large">${data.values.map((value,i)=>`<div class="zsd-chart-col" title="${esc(data.labels[i])}: ${money(value)}"><span style="height:${Math.max(3,Math.round(value/max*100))}%"></span><small>${i===0||i===data.labels.length-1||i%Math.max(1,Math.floor(data.labels.length/6))===0?esc(data.labels[i]):""}</small></div>`).join("")}</div><p class="zsd-muted">${tr("Grafu inategemea tarehe za bidhaa zilizouzwa zilizopo kwenye rekodi za oda.","The chart uses timestamps recorded on your order items.")}</p></section>`;
}
function renderProductPerformance(){
 const rows=state.products.map(p=>{const lines=state.orderItems.filter(x=>String(x.product_id)===String(p.id));return {...p,units:lines.reduce((n,x)=>n+(Number(x.quantity)||0),0),revenue:lines.reduce((n,x)=>n+(Number(x.quantity)||0)*(Number(x.price)||0),0)};}).sort((a,b)=>b.units-a.units);
 return `<section class="zsd-card"><h2>${tr("Product Performance","Product Performance")}</h2><p class="zsd-muted">${tr("Bidhaa zimepangwa kulingana na idadi ya vipande vilivyouzwa.","Products ranked by units sold.")}</p>${rows.length?`<div class="zsd-table-wrap"><table class="zsd-table"><thead><tr><th>${tr("Bidhaa","Product")}</th><th>${tr("Vilivyouzwa","Units sold")}</th><th>${tr("Mapato","Revenue")}</th><th>${tr("Stock","Stock")}</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.title)}</td><td>${p.units}</td><td>${money(p.revenue)}</td><td>${Number(p.stock_quantity)||0}</td></tr>`).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Hakuna bidhaa zilizopatikana.","No products found.")}</div>`}</section>`;
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
 const deliveries=new Map((state.orderDeliveries||[]).map(x=>[x.checkout_id,x]));
 return `<section class="zsd-card"><h2>${tr("Oda za wateja","Customer orders")}</h2><p class="zsd-muted">${tr("Oda zinazoonyesha bidhaa zilizouzwa na duka lako pamoja na taarifa za usafirishaji zinazopatikana.","Orders containing items sold by your store, with available delivery updates.")}</p>
 ${state.orders.length?`<div class="zsd-table-wrap"><table class="zsd-table"><thead><tr><th>${tr("Oda","Order")}</th><th>${tr("Tarehe","Date")}</th><th>${tr("Hali ya oda","Order status")}</th><th>${tr("Usafirishaji","Delivery")}</th><th>${tr("Eneo la mteja","Destination")}</th><th>${tr("Jumla ya bidhaa zako","Your item subtotal")}</th></tr></thead><tbody>${state.orders.map(o=>{const d=deliveries.get(o.checkout_id);const destination=[o.delivery_district,o.delivery_region].filter(Boolean).join(", ");return `<tr><td>${esc(String(o.id).slice(0,8).toUpperCase())}</td><td>${o.created_at?new Date(o.created_at).toLocaleDateString(state.language==="sw"?"sw-TZ":"en-TZ"):"—"}</td><td>${esc(o.status||"—")}</td><td><strong>${esc(d?.status||tr("Bado hakuna taarifa","No update yet"))}</strong><small>${d?.delivery_fee!=null?money(d.delivery_fee):""}</small></td><td>${esc(destination||"—")}</td><td>${money(sellerOrderTotal(o.id))}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hakuna oda za duka lako.","There are no orders for your store yet.")}</div>`}
 <p class="zsd-muted">${tr("Hali ya usafirishaji inaonyeshwa kwa taarifa zinazotumwa na Admin / mfumo wa delivery. Mabadiliko ya hali hayafanywi hapa.","Delivery status reflects updates from Admin / the delivery system. Status changes are not made here.")}</p></section>`;
}
function renderFinance(){
 const balance=Number(state.wallet?.balance)||0;
 return `<section class="zsd-stats"><div class="zsd-stat"><small>${tr("Salio la wallet","Wallet balance")}</small><strong style="font-size:17px">${money(balance)}</strong></div><div class="zsd-stat"><small>${tr("Miamala","Ledger entries")}</small><strong>${state.ledger.length}</strong></div></section>
 <section class="zsd-card"><h2>${tr("Historia ya miamala","Transaction history")}</h2>${state.ledger.length?`<div style="overflow:auto"><table class="zsd-table"><thead><tr><th>${tr("Tarehe","Date")}</th><th>${tr("Maelezo","Description")}</th><th>${tr("Kiasi","Amount")}</th></tr></thead><tbody>${state.ledger.map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${esc(x.reason||x.entry_type||"—")}</td><td>${money(x.amount)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="zsd-empty">${tr("Bado hakuna miamala ya wallet.","No wallet transactions yet.")}</div>`}</section>
 <p class="zsd-muted">${tr("Ada za ZUNE, fedha zinazosubiri na utoaji wa fedha vitaonyeshwa baada ya sera za malipo na withdrawal kuunganishwa.","ZUNE fees, pending payouts and withdrawals will appear once payment and withdrawal workflows are connected.")}</p>`;
}
function renderStore(){
 const s=state.store, rows=state.sellerLocations||[], editing=rows.find(x=>x.id===state.editingLocationId)||null;
 const logo=s?.logo_url||"";
 const initials=String(s?.store_name||"ZUNE").trim().split(/\\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
 const field=(name,label,value="",required=false,type="text")=>`<label>${label}<input class="zsd-input" name="${name}" type="${type}" value="${esc(value)}" ${required?"required":""} maxlength="180"></label>`;
 return `<section class="zsd-card zsd-store-profile-card">
 <div class="zsd-store-profile-head"><div><div class="zsd-section-kicker">${tr("TAARIFA ZA BIASHARA","BUSINESS IDENTITY")}</div><h2>${tr("Wasifu wa Duka","Store Profile")}</h2><p class="zsd-muted">${tr("Dhibiti jina, picha na mawasiliano yanayoonekana kwa wateja sokoni.","Manage the name, image and contact details customers see on the marketplace.")}</p></div><span class="zsd-pill">${tr("Wasifu wa duka","Store profile")}</span></div>
 ${s?`<form id="zsd-store-profile-form" class="zsd-form zsd-store-form" enctype="multipart/form-data">
 <div class="zsd-store-photo-field"><div class="zsd-store-logo-preview" id="zsd-store-logo-preview">${logo?`<img src="${esc(logo)}" alt="Store logo">`:esc(initials||"Z")}</div><div class="zsd-store-photo-copy"><strong>${tr("Picha / Nembo ya duka","Store image / logo")}</strong><small>${tr("Chagua picha kutoka kwenye simu yako. JPG, PNG au WEBP; hadi MB 8.","Choose an image from your phone. JPG, PNG or WEBP; up to 8 MB.")}</small><label class="zsd-btn" for="zsd-store-logo">${tr("Chagua picha","Choose image")}</label><input id="zsd-store-logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" hidden><small id="zsd-store-logo-name">${logo?tr("Picha ya sasa ya duka","Current store image"):tr("Hakuna picha iliyochaguliwa","No image selected")}</small></div></div>
 ${field("store_name",tr("Jina la duka","Store name"),s.store_name,true)}
 <label class="zsd-full">${tr("Maelezo ya duka","Store description")}<textarea class="zsd-input" name="description" rows="4" maxlength="1200" placeholder="${tr("Eleza bidhaa na huduma za duka lako...","Describe your store and what you offer...")}">${esc(s.description||"")}</textarea></label>
 ${field("phone",tr("Namba ya simu ya biashara","Business phone"),s.phone||"")}
 ${field("email",tr("Barua pepe ya biashara","Business email"),s.email||"",false,"email")}
 ${field("website",tr("Tovuti / kiungo cha duka","Website / store link"),s.website||"")}
 ${field("region",tr("Mkoa","Region"),s.region||"")}
 ${field("district",tr("Wilaya","District"),s.district||"")}
 ${field("address",tr("Anwani / eneo la duka","Store address / area"),s.address||"")}
 <div class="zsd-full"><div class="zsd-store-save-row"><span class="zsd-muted">${tr("Hali ya uthibitisho:","Verification status:")} <b>${esc(s.verification_status||"pending")}</b>. ${tr("Mabadiliko ya wasifu hayabadili hali ya uthibitisho.","Profile edits do not change verification status.")}</span><button class="zsd-btn primary" type="submit">${tr("Hifadhi taarifa za duka","Save store details")}</button></div><p id="zsd-store-profile-message" class="zsd-alert" role="status"></p></div>
 </form>`:`<div class="zsd-empty">${tr("Taarifa za duka hazijapatikana. Wasiliana na msaada wa ZUNE.","Store profile was not found. Contact ZUNE support.")}</div>`}
 </section>
 <section class="zsd-card"><div class="zsd-chat-heading"><div><h2>${tr("Maeneo ya duka na usafirishaji","Store locations & delivery")}</h2><p class="zsd-muted">${tr("Ongeza au hariri maeneo ambayo duka lako linaweza kuhudumia. Haya ni maeneo ya duka, si mabadiliko ya anwani ya mteja.","Add or edit the areas your store can serve. These are store service locations, not customer delivery addresses.")}</p></div><button class="zsd-btn" id="zsd-refresh-locations" type="button">${tr("Onyesha upya","Refresh")}</button></div>
 <form id="zsd-location-form" class="zsd-form">${field("country",tr("Nchi","Country"),editing?.country||"Tanzania",true)}${field("region",tr("Mkoa","Region"),editing?.region||"",true)}${field("district",tr("Wilaya","District"),editing?.district||"",true)}${field("ward",tr("Kata","Ward"),editing?.ward||"")}${field("address",tr("Anwani / eneo","Address / area"),editing?.address||"",true)}${field("maximum_distance_km",tr("Umbali wa juu wa huduma (km)","Maximum service distance (km)"),editing?.maximum_distance_km??"",false)}<label class="zsd-location-active"><input type="checkbox" name="is_active" ${editing?.is_active===false?"":"checked"}> ${tr("Eneo hili linatumika","This location is active")}</label><div class="zsd-full"><p id="zsd-location-message" class="zsd-muted" role="status"></p><button class="zsd-btn primary" type="submit">${editing?tr("Hifadhi mabadiliko","Save changes"):tr("Ongeza eneo","Add location")}</button> ${editing?'<button class="zsd-btn" type="button" id="zsd-cancel-location">Cancel</button>':""}</div></form>
 <div class="zsd-location-list">${rows.map(x=>`<article class="zsd-location-item"><div><strong>${esc([x.address,x.ward,x.district,x.region,x.country].filter(Boolean).join(", "))}</strong><small>${x.maximum_distance_km?esc(x.maximum_distance_km)+" km · ":""}${x.is_active?tr("Linafanya kazi","Active"):tr("Limesitishwa","Inactive")}</small></div><div><button class="zsd-btn" type="button" data-edit-location="${esc(x.id)}">${tr("Hariri","Edit")}</button> <button class="zsd-btn" type="button" data-delete-location="${esc(x.id)}">${tr("Futa","Delete")}</button></div></article>`).join("")||`<div class="zsd-empty">${tr("Bado hujaongeza eneo la duka.","You have not added a store location yet.")}</div>`}</div></section>`;
}
async function saveStoreProfile(event){
 event.preventDefault();
 const form=event.currentTarget,msg=form.querySelector("#zsd-store-profile-message"),button=form.querySelector('button[type="submit"]'),user=window.__zuneSellerUser,s=state.store;
 if(!s?.id||!user?.id||state.busy)return;
 const fd=new FormData(form),file=fd.get("logo");
 const name=String(fd.get("store_name")||"").trim();
 if(!name){msg.textContent=tr("Jina la duka linahitajika.","Store name is required.");return;}
 if(file instanceof File&&file.size&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)){msg.textContent=tr("Chagua JPG, PNG au WEBP isiyozidi MB 8.","Choose JPG, PNG or WEBP up to 8 MB.");return;}
 state.busy=true;button.disabled=true;msg.textContent=tr("Inahifadhi taarifa...","Saving store profile...");
 let uploadedPath=null,oldPath=null;
 try{
  let logoUrl=s.logo_url||null;
  if(file instanceof File&&file.size){
   const ext=file.type==="image/jpeg"?"jpg":file.type.split("/")[1];
   uploadedPath=user.id+"/store-"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+ext;
   const up=await supabase.storage.from("zune-store-assets").upload(uploadedPath,file,{contentType:file.type,upsert:false});
   if(up.error)throw up.error;
   logoUrl=supabase.storage.from("zune-store-assets").getPublicUrl(uploadedPath).data.publicUrl;
   oldPath=s.logo_url?.includes("/storage/v1/object/public/zune-store-assets/")?decodeURIComponent(s.logo_url.split("/storage/v1/object/public/zune-store-assets/")[1].split("?")[0]):null;
  }
  const payload={store_name:name,logo_url:logoUrl,description:String(fd.get("description")||"").trim()||null,phone:String(fd.get("phone")||"").trim()||null,email:String(fd.get("email")||"").trim()||null,website:String(fd.get("website")||"").trim()||null,region:String(fd.get("region")||"").trim()||null,district:String(fd.get("district")||"").trim()||null,address:String(fd.get("address")||"").trim()||null};
  const {data,error}=await supabase.from("stores").update(payload).eq("id",s.id).eq("owner_id",user.id).select("id,owner_id,store_name,verification_status,logo_url,description,phone,email,website,region,district,address").single();
  if(error)throw error;
  state.store=data;msg.textContent=tr("Taarifa za duka zimehifadhiwa kikamilifu.","Store details saved successfully.");
  const stripName=document.querySelector(".zsd-store-strip strong");if(stripName)stripName.textContent=data.store_name;
  const preview=form.querySelector("#zsd-store-logo-preview");if(preview&&data.logo_url)preview.innerHTML=`<img src="${esc(data.logo_url)}" alt="Store logo">`;
  if(oldPath)await supabase.storage.from("zune-store-assets").remove([oldPath]);
 }catch(error){
  if(uploadedPath)await supabase.storage.from("zune-store-assets").remove([uploadedPath]);
  msg.textContent=error.message||tr("Imeshindikana kuhifadhi taarifa za duka.","Could not save store profile.");
 }finally{state.busy=false;button.disabled=false;}
}

async function loadSellerLocations(force=false){
 const user=window.__zuneSellerUser;if(!user?.id)return;
 if(!force&&state.locationsLoadedFor===user.id)return;
 const {data,error}=await supabase.from("seller_locations").select("id,country,region,district,ward,address,maximum_distance_km,is_active,created_at").eq("vendor_id",user.id).order("created_at",{ascending:false});
 if(error){console.error("ZUNE seller locations:",error);state.error=error.message||"Locations could not be loaded.";return;}
 state.sellerLocations=data||[];state.locationsLoadedFor=user.id;
 if(state.section==="store")renderPanel();
}
async function saveSellerLocation(event){
 event.preventDefault();const form=event.currentTarget,values=new FormData(form),message=form.querySelector("#zsd-location-message"),button=form.querySelector('button[type="submit"]'),user=window.__zuneSellerUser;
 const payload={vendor_id:user.id,country:String(values.get("country")||"").trim(),region:String(values.get("region")||"").trim(),district:String(values.get("district")||"").trim(),ward:String(values.get("ward")||"").trim()||null,address:String(values.get("address")||"").trim(),maximum_distance_km:values.get("maximum_distance_km")?Number(values.get("maximum_distance_km")):null,is_active:values.get("is_active")==="on"};
 if(!payload.country||!payload.region||!payload.district||!payload.address){message.textContent=tr("Jaza nchi, mkoa, wilaya na anwani.","Country, region, district and address are required.");return;}
 if(payload.maximum_distance_km!==null&&(!Number.isFinite(payload.maximum_distance_km)||payload.maximum_distance_km<=0)){message.textContent=tr("Weka umbali sahihi ulio zaidi ya sifuri.","Enter a valid distance greater than zero.");return;}
 if(state.busy)return;state.busy=true;button.disabled=true;message.textContent=tr("Inahifadhi...","Saving...");
 try{let result;if(state.editingLocationId)result=await supabase.from("seller_locations").update(payload).eq("id",state.editingLocationId).eq("vendor_id",user.id);else result=await supabase.from("seller_locations").insert(payload);if(result.error)throw result.error;state.editingLocationId=null;await loadSellerLocations(true);}
 catch(error){message.textContent=error.message||tr("Imeshindikana kuhifadhi eneo.","Could not save location.");}
 finally{state.busy=false;button.disabled=false;}
}
async function deleteSellerLocation(id){
 if(!window.confirm(tr("Una uhakika unataka kufuta eneo hili?","Are you sure you want to delete this location?")))return;
 const {error}=await supabase.from("seller_locations").delete().eq("id",id).eq("vendor_id",window.__zuneSellerUser.id);
 if(error){alert(error.message);return;}if(state.editingLocationId===id)state.editingLocationId=null;await loadSellerLocations(true);
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
 const packageOptions=packages.map(p=>'<option value="'+esc(p.id)+'" data-campaign-type="'+esc(p.campaign_type)+'">'+esc(p.name)+' · '+money(p.price_tzs)+' · '+esc(p.duration_days)+' '+tr("siku","days")+'</option>').join("");
 const products=state.products.filter(p=>p.moderation_status==="approved");
 return `
 <section class="zsd-stats"><div class="zsd-stat"><small>Impressions</small><strong>${state.adsEvents.filter(x=>x.event_type==="impression").length}</strong></div><div class="zsd-stat"><small>Clicks</small><strong>${state.adsEvents.filter(x=>x.event_type==="click").length}</strong></div><div class="zsd-stat"><small>Store Visits</small><strong>${state.adsEvents.filter(x=>x.event_type==="store_visit").length}</strong></div><div class="zsd-stat"><small>Ads Available</small><strong>${money(wallet.available_tzs||0)}</strong></div><div class="zsd-stat"><small>Pending</small><strong>${money(wallet.pending_tzs||0)}</strong></div><div class="zsd-stat"><small>Reserved</small><strong>${money(wallet.reserved_tzs||0)}</strong></div></section>
 <section class="zsd-card"><div class="zsd-section-kicker">ZUNE ADS</div><h2>${tr("Omba tangazo jipya","Create an ad campaign")}</h2><p class="zsd-muted">${tr("Chagua package inayopatikana. Kampeni itapitiwa na Admin Mkuu kabla haijaonekana sokoni. Bajeti itahifadhiwa kutoka Ads Wallet baada ya kuidhinishwa.","Choose an available package. Admin Mkuu reviews every campaign before it appears on the marketplace. The campaign budget is reserved from your Ads Wallet only after approval.")}</p>
 ${packages.length?`<form id="zsd-ad-campaign-form" class="zsd-form">
 <label>${tr("Aina ya tangazo","Campaign type")}<select class="zsd-input" name="campaign_type" id="zsd-ad-type" required><option value="sponsored_store">Sponsored Store</option><option value="sponsored_product">Sponsored Product</option><option value="combo">Combo</option></select></label>
 <label>${tr("Package","Package")}<select class="zsd-input" name="package_id" id="zsd-ad-package" required>${packageOptions}</select></label>
 <label class="zsd-full" id="zsd-ad-product-field">${tr("Bidhaa ya kutangaza (inahitajika kwa Product na Combo)","Product to promote (required for Product and Combo)")}<select class="zsd-input" name="product_id"><option value="">${tr("Chagua bidhaa","Select a product")}</option>${products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+'</option>').join("")}</select></label>
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

function renderCustomers(){
 const rows=state.customers||[];
 const total=rows.reduce((sum,x)=>sum+Number(x.orders_count||0),0);
 return `<section class="zsd-card"><div class="zsd-chat-heading"><div><h2>${tr("Wateja wa duka","Store customers")}</h2><p class="zsd-muted">${tr("Wateja waliowahi kuagiza bidhaa zako.","Customers who have ordered your products.")}</p></div><button class="zsd-btn" type="button" id="zsd-refresh-customers">${tr("Onyesha upya","Refresh")}</button></div><div class="zsd-customer-stats"><article><small>${tr("Wateja","Customers")}</small><strong>${rows.length}</strong></article><article><small>${tr("Oda zilizowekwa","Orders placed")}</small><strong>${total}</strong></article></div><div class="zsd-table-wrap"><table class="zsd-table"><thead><tr><th>${tr("Mteja","Customer")}</th><th>${tr("Oda","Orders")}</th><th>${tr("Mara ya mwisho","Last order")}</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.name||tr("Mteja wa ZUNE","ZUNE Customer"))}</strong><small>${esc(x.phone||"")}</small></td><td>${Number(x.orders_count)||0}</td><td>${x.last_order?new Date(x.last_order).toLocaleDateString(state.language==="sw"?"sw-TZ":"en-TZ"):"—"}</td></tr>`).join("")||`<tr><td colspan="3"><div class="zsd-empty">${tr("Bado hakuna wateja wenye oda.","No customers with orders yet.")}</div></td></tr>`}</tbody></table></div></section>`;
}
async function loadSellerCustomers(){
 const user=window.__zuneSellerUser;if(!user?.id||state.customersLoading)return;
 state.customersLoading=true;
 try{
  const {data,error}=await supabase.from("order_items").select("order_id").eq("seller_id",user.id).limit(2000);
  if(error)throw error;
  const ids=[...new Set((data||[]).map(x=>x.order_id).filter(Boolean))];
  if(!ids.length){state.customers=[];state.customersLoadedFor=user.id;return;}
  const ordersResult=await supabase.from("orders").select("id,buyer_id,created_at").in("id",ids);
  if(ordersResult.error)throw ordersResult.error;
  const byBuyer=new Map();
  for(const order of ordersResult.data||[]){
   if(!order.buyer_id)continue;
   const item=byBuyer.get(order.buyer_id)||{id:order.buyer_id,orders_count:0,last_order:null};
   item.orders_count++;
   if(!item.last_order||new Date(order.created_at)>new Date(item.last_order))item.last_order=order.created_at;
   byBuyer.set(order.buyer_id,item);
  }
  const buyers=[...byBuyer.values()];
  if(!buyers.length){state.customers=[];state.customersLoadedFor=user.id;return;}
  const profiles=await supabase.from("profiles").select("id,full_name,phone_number").in("id",buyers.map(x=>x.id));
  if(profiles.error)throw profiles.error;
  const lookup=new Map((profiles.data||[]).map(x=>[x.id,x]));
  state.customers=buyers.map(x=>({...x,name:lookup.get(x.id)?.full_name||tr("Mteja wa ZUNE","ZUNE Customer"),phone:lookup.get(x.id)?.phone_number||""})).sort((a,b)=>new Date(b.last_order)-new Date(a.last_order));
  state.customersLoadedFor=user.id;
 }catch(error){console.error("ZUNE seller customers:",error);state.error=error.message||"Customers could not be loaded.";}
 finally{state.customersLoading=false;if(state.section==="customers")renderPanel();}
}
function renderMessages(){
 const active=state.conversations.find(x=>x.id===state.activeConversationId)||null;
 const conversations=state.conversations.map(item=>{
  const buyer=state.chatBuyers?.[item.buyer_id]||tr("Mteja wa ZUNE","ZUNE Customer");
  const product=state.chatProducts?.[item.product_id]||tr("Bidhaa ya ZUNE","ZUNE Product");
  const unread=Number(item.unread_count||0);
  return `<button type="button" class="zsd-chat-thread ${active?.id===item.id?"active":""}" data-open-chat="${esc(item.id)}"><strong>${esc(buyer)}</strong><small>${esc(product)}</small><span>${esc(item.last_message||tr("Fungua mazungumzo","Open conversation"))}</span>${unread?'<i class="zsd-pill blue">'+unread+'</i>':""}</button>`;
 }).join("");
 const messageList=state.chatMessages.map(message=>`<div class="zsd-chat-message ${message.sender_id===window.__zuneSellerUser?.id?"mine":"theirs"}"><p>${esc(message.message)}</p><small>${new Date(message.created_at).toLocaleString(state.language==="sw"?"sw-TZ":"en-TZ")}</small></div>`).join("");
 return `<section class="zsd-card zsd-chat-layout"><div class="zsd-chat-list"><div class="zsd-chat-heading"><h2>${tr("Ujumbe wa wateja","Customer messages")}</h2><button class="zsd-btn" type="button" id="zsd-refresh-messages">${tr("Onyesha upya","Refresh")}</button></div>${state.messagesLoading?'<div class="zsd-empty">'+tr("Inapakia ujumbe...","Loading messages...")+'</div>':conversations||'<div class="zsd-empty">'+tr("Bado hakuna mazungumzo na wateja.","No customer conversations yet.")+'</div>'}</div><div class="zsd-chat-view">${active?`<header><strong>${esc(state.chatBuyers?.[active.buyer_id]||tr("Mteja wa ZUNE","ZUNE Customer"))}</strong><small>${esc(state.chatProducts?.[active.product_id]||"")}</small></header><div class="zsd-chat-history" id="zsd-chat-history">${messageList||'<div class="zsd-empty">'+tr("Anza mazungumzo kwa kujibu mteja.","Reply to start the conversation.")+'</div>'}</div><form id="zsd-chat-form" class="zsd-chat-compose"><textarea name="message" maxlength="4000" required placeholder="${tr("Andika ujumbe...","Write a message...")}"></textarea><button class="zsd-btn primary" type="submit">${tr("Tuma","Send")} →</button></form>`:'<div class="zsd-empty">'+tr("Chagua mazungumzo upande wa kushoto.","Select a conversation on the left.")+'</div>'}</div></section>`;
}
async function loadSellerMessages(force=false){
 const user=window.__zuneSellerUser;if(!user?.id||state.messagesLoading)return;
 if(!force&&state.messagesLoadedFor===user.id)return;
 state.messagesLoading=true;
 try{
  const {data,error}=await supabase.from("chat_conversations").select("id,buyer_id,seller_id,product_id,created_at,updated_at").eq("seller_id",user.id).order("updated_at",{ascending:false}).limit(50);
  if(error)throw error;
  state.conversations=data||[];
  const buyerIds=[...new Set(state.conversations.map(x=>x.buyer_id).filter(Boolean))];
  const productIds=[...new Set(state.conversations.map(x=>x.product_id).filter(Boolean))];
  state.chatBuyers={};state.chatProducts={};
  if(buyerIds.length){const result=await supabase.from("profiles").select("id,full_name").in("id",buyerIds);if(!result.error)(result.data||[]).forEach(x=>state.chatBuyers[x.id]=x.full_name||tr("Mteja wa ZUNE","ZUNE Customer"));}
  if(productIds.length){const result=await supabase.from("products").select("id,title").in("id",productIds);if(!result.error)(result.data||[]).forEach(x=>state.chatProducts[x.id]=x.title||tr("Bidhaa ya ZUNE","ZUNE Product"));}
  if(!state.conversations.some(x=>x.id===state.activeConversationId))state.activeConversationId=state.conversations[0]?.id||null;
  if(state.activeConversationId){
   const result=await supabase.from("chat_messages").select("id,conversation_id,sender_id,message,is_read,created_at").eq("conversation_id",state.activeConversationId).order("created_at",{ascending:true}).limit(100);
   if(result.error)throw result.error;
   state.chatMessages=result.data||[];
   await supabase.from("chat_messages").update({is_read:true}).eq("conversation_id",state.activeConversationId).neq("sender_id",user.id).eq("is_read",false);
  }else state.chatMessages=[];
  state.messagesLoadedFor=user.id;
 }catch(error){console.error("ZUNE seller messages:",error);state.error=error.message||"Messages could not be loaded.";}
 finally{state.messagesLoading=false;if(state.section==="messages")renderPanel();}
}
async function sendSellerMessage(event){
 event.preventDefault();const form=event.currentTarget;const message=String(new FormData(form).get("message")||"").trim();
 if(!message||!state.activeConversationId||state.busy)return;
 state.busy=true;const button=form.querySelector("button[type=submit]");if(button)button.disabled=true;
 try{
  const {error}=await supabase.from("chat_messages").insert({conversation_id:state.activeConversationId,sender_id:window.__zuneSellerUser.id,message});
  if(error)throw error;
  form.reset();await loadSellerMessages(true);
 }catch(error){console.error("ZUNE send message:",error);alert(error.message||tr("Ujumbe haukutumwa. Jaribu tena.","Message was not sent. Please try again."));}
 finally{state.busy=false;if(button)button.disabled=false;}
}
function renderSupport(){
 const rows=state.supportTickets.map(ticket=>`<article class="zsd-notification"><div><strong>${esc(ticket.category||tr("Msaada wa Seller","Seller support"))}</strong><p>${esc(ticket.message||"")}</p><small>${new Date(ticket.created_at).toLocaleString(state.language==="sw"?"sw-TZ":"en-TZ")} · ${esc(ticket.status||"open")}</small>${ticket.admin_reply?`<p><strong>${tr("Jibu la Admin","Admin reply")}:</strong> ${esc(ticket.admin_reply)}</p>`:""}</div><span class="zsd-pill blue">${esc(ticket.status||"open")}</span></article>`).join("");
 return `<section class="zsd-card"><h2>${tr("Msaada wa Seller","Seller Support")}</h2><p class="zsd-muted">${tr("Tuma ombi kwa timu ya ZUNE na fuatilia majibu hapa.","Contact the ZUNE team and follow replies here.")}</p><form id="zsd-support-form" class="zsd-form"><label>${tr("Aina ya tatizo","Issue category")}<select name="category" required><option value="">${tr("Chagua aina","Choose a category")}</option><option value="account">${tr("Akaunti","Account")}</option><option value="products">${tr("Bidhaa na stock","Products and inventory")}</option><option value="orders">${tr("Oda na usafirishaji","Orders and delivery")}</option><option value="ads">${tr("Ads na matangazo","Ads and promotions")}</option><option value="wallet">${tr("Wallet na fedha","Wallet and finance")}</option><option value="other">${tr("Nyingine","Other")}</option></select></label><label class="zsd-full">${tr("Eleza changamoto yako","Describe your issue")}<textarea name="message" rows="4" maxlength="4000" required placeholder="${tr("Andika maelezo...","Write details...")}"></textarea></label><div class="zsd-full"><p id="zsd-support-message" class="zsd-muted" role="status"></p><button type="submit" class="zsd-btn primary">${tr("Tuma ombi la msaada","Submit support request")}</button></div></form><div class="zsd-chat-heading"><h3>${tr("Maombi yangu ya msaada","My support requests")}</h3><button class="zsd-btn" id="zsd-refresh-support" type="button">${tr("Onyesha upya","Refresh")}</button></div>${state.supportLoading?'<div class="zsd-empty">'+tr("Inapakia maombi...","Loading requests...")+'</div>':rows||'<div class="zsd-empty">'+tr("Bado hujatuma ombi la msaada.","You have not submitted a support request yet.")+'</div>'}</section>`;
}
async function loadSellerSupport(force=false){
 const user=window.__zuneSellerUser;if(!user?.id||state.supportLoading)return;
 if(!force&&state.supportLoadedFor===user.id)return;
 state.supportLoading=true;
 try{const {data,error}=await supabase.from("support_tickets").select("id,category,message,status,admin_reply,created_at,updated_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);if(error)throw error;state.supportTickets=data||[];state.supportLoadedFor=user.id;}
 catch(error){console.error("ZUNE seller support:",error);state.error=error.message||"Support requests could not be loaded.";}
 finally{state.supportLoading=false;if(state.section==="support")renderPanel();}
}
async function submitSellerSupport(event){
 event.preventDefault();const form=event.currentTarget,values=new FormData(form),category=String(values.get("category")||"").trim(),message=String(values.get("message")||"").trim(),status=form.querySelector("#zsd-support-message"),button=form.querySelector("button[type=submit]");
 if(!category||!message||state.busy)return;
 state.busy=true;button.disabled=true;status.textContent=tr("Inatuma ombi...","Submitting request...");
 try{const {error}=await supabase.from("support_tickets").insert({user_id:window.__zuneSellerUser.id,customer_name:state.profile?.full_name||window.__zuneSellerUser.email||"Seller",category,message});if(error)throw error;form.reset();await loadSellerSupport(true);}
 catch(error){console.error("ZUNE support ticket:",error);status.textContent=error.message||tr("Imeshindikana kutuma ombi.","Could not submit request.");}
 finally{state.busy=false;button.disabled=false;}
}
function renderNotifications(){
 const rows=state.notifications.map(item=>{
  const title=state.language==="sw"?(item.title_sw||item.title_en):(item.title_en||item.title_sw);
  const body=state.language==="sw"?(item.body_sw||item.body_en):(item.body_en||item.body_sw);
  return `<article class="zsd-notification ${item.is_read?"read":"unread"}"><div><strong>${esc(title||tr("Taarifa ya ZUNE","ZUNE notification"))}</strong><p>${esc(body||"")}</p><small>${new Date(item.created_at).toLocaleString(state.language==="sw"?"sw-TZ":"en-TZ")}</small></div>${item.is_read?"":'<button class="zsd-btn" type="button" data-read-notification="'+esc(item.id)+'">'+tr("Soma","Mark read")+'</button>'}</article>`;
 }).join("");
 return `<section class="zsd-card"><div class="zsd-chat-heading"><div><h2>${tr("Notifications","Notifications")}</h2><p class="zsd-muted">${tr("Taarifa za akaunti na biashara yako.","Updates about your account and business.")}</p></div><button class="zsd-btn" type="button" id="zsd-read-all-notifications">${tr("Soma zote","Mark all read")}</button></div>${state.notificationsLoading?'<div class="zsd-empty">'+tr("Inapakia taarifa...","Loading notifications...")+'</div>':rows||'<div class="zsd-empty">'+tr("Bado huna taarifa mpya.","You have no notifications yet.")+'</div>'}</section>`;
}
async function loadSellerNotifications(force=false){
 const user=window.__zuneSellerUser;if(!user?.id||state.notificationsLoading)return;
 if(!force&&state.notificationsLoadedFor===user.id)return;
 state.notificationsLoading=true;
 try{
  const {data,error}=await supabase.from("notifications").select("id,type,title_sw,title_en,body_sw,body_en,action_url,is_read,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);
  if(error)throw error;state.notifications=data||[];state.notificationsLoadedFor=user.id;
 }catch(error){console.error("ZUNE seller notifications:",error);state.error=error.message||"Notifications could not be loaded.";}
 finally{state.notificationsLoading=false;if(state.section==="notifications")renderPanel();}
}
async function markSellerNotification(id=null){
 const user=window.__zuneSellerUser;if(!user?.id)return;
 let query=supabase.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("user_id",user.id).eq("is_read",false);
 if(id)query=query.eq("id",id);
 const {error}=await query;if(error){alert(error.message);return;}
 await loadSellerNotifications(true);
}
function renderSettings(){
 const themes=[["emerald","Emerald Green","#087A55"],["luxury","Luxury","#C69B36"],["ocean","Ocean","#1676C5"],["royal","Royal","#7546B8"],["nature","Nature","#426B3D"],["blossom","Blossom","#D94F83"],["sunset","Sunset","#D65B3C"],["minimal","Minimal","#424B57"]];
 const current=localStorage.getItem("zune_theme")||"emerald",user=window.__zuneSellerUser;
 return `<section class="zsd-card"><h2>${tr("Mapendeleo ya Seller Center","Seller Center preferences")}</h2><p class="zsd-muted">${tr("Badilisha rangi ya dashboard na lugha. Theme hii inatumika pia kwenye Marketplace ili mwonekano ubaki thabiti kwenye akaunti yako.","Change the dashboard color theme and language. The selected theme is shared with the Marketplace so your account has a consistent appearance.")}</p><div class="zsd-setting-row"><div><strong>${tr("Lugha","Language")}</strong><small>${tr("Chagua lugha ya dashboard","Choose dashboard language")}</small></div><button class="zsd-btn" id="zsd-settings-language" type="button">${state.language==="sw"?"Kiswahili / English":"English / Kiswahili"}</button></div><div class="zsd-setting-row"><div><strong>${tr("Muonekano / Theme","Appearance / Theme")}</strong><small>${tr("Chagua rangi unayopendelea","Choose your preferred color theme")}</small></div></div><div class="zsd-theme-grid">${themes.map(([id,name,color])=>`<button class="zsd-theme-option ${current===id?"active":""}" type="button" data-seller-theme="${id}" aria-pressed="${current===id}"><i style="background:${color}"></i><span>${name}</span>${current===id?"✓":""}</button>`).join("")}</div><p id="zsd-settings-message" class="zsd-muted" role="status"></p></section><section class="zsd-card"><h2>${tr("Taarifa za akaunti","Account information")}</h2><p><strong>${esc(state.profile?.full_name||user?.email||"Seller")}</strong></p><p class="zsd-muted">${esc(user?.email||"")} · ${tr("Wasifu na nenosiri hubadilishwa kwenye Mipangilio ya Akaunti.","Profile and password are managed in Account Settings.")}</p><a class="zsd-btn" href="./settings.html">${tr("Fungua Mipangilio ya Akaunti","Open Account Settings")}</a></section>`;
}
async function loadSellerReviews(force=false){
 const user=window.__zuneSellerUser;
 if(!user?.id||state.reviewsLoading||(!force&&state.reviewsLoadedFor===user.id))return;
 state.reviewsLoading=true;
 try{
  const {data,error}=await supabase.from("product_reviews").select("id,product_id,buyer_id,order_id,rating,review_text,moderation_status,is_visible,created_at,products!inner(id,title,vendor_id)").eq("products.vendor_id",user.id).order("created_at",{ascending:false}).limit(100);
  if(error)throw error;
  state.reviews=data||[];state.reviewsLoadedFor=user.id;
 }catch(error){console.error("ZUNE seller reviews:",error);state.error=error.message||tr("Imeshindikana kupakia maoni.","Could not load reviews.");}
 finally{state.reviewsLoading=false;if(state.section==="reviews")renderPanel();}
}
function renderReviews(){
 const rows=state.reviews||[],visible=rows.filter(r=>r.moderation_status==="approved"&&r.is_visible);
 const average=visible.length?visible.reduce((sum,r)=>sum+Number(r.rating||0),0)/visible.length:0;
 const productName=r=>{const p=Array.isArray(r.products)?r.products[0]:r.products;return p?.title||tr("Bidhaa ya duka lako","Your store product");};
 const items=rows.map(r=>{
  const rating=Math.max(0,Math.min(5,Number(r.rating)||0));
  const product=esc(productName(r)),comment=esc(r.review_text||tr("Hakuna maelezo yaliyoandikwa.","No written comment."));
  const status=esc(String(r.moderation_status||"pending").replaceAll("_"," "));
  const date=r.created_at?new Date(r.created_at).toLocaleDateString(state.language==="sw"?"sw-TZ":"en-TZ"):"—";
  return '<article class="zsd-review-item"><div class="zsd-review-head"><strong>'+product+'</strong><span class="zsd-review-rating" aria-label="'+rating+' out of 5">'+"★".repeat(rating)+'<span>'+"☆".repeat(5-rating)+'</span></span></div><p>'+comment+'</p><div class="zsd-review-meta"><span>'+date+'</span><span class="zsd-pill '+(r.moderation_status==="approved"&&r.is_visible?"green":r.moderation_status==="rejected"?"orange":"blue")+'">'+status+'</span></div></article>';
 }).join("");
 return '<section class="zsd-stats zsd-review-stats"><article class="zsd-stat"><small>'+tr("Wastani wa alama","Average rating")+'</small><strong>'+(visible.length?average.toFixed(1)+" / 5":"—")+'</strong><span class="zsd-stat-desc">'+tr("Maoni yaliyoidhinishwa","Approved reviews")+'</span></article><article class="zsd-stat"><small>'+tr("Maoni yote","All reviews")+'</small><strong>'+rows.length+'</strong><span class="zsd-stat-desc">'+tr("Yaliyopo kwenye bidhaa zako","Across your products")+'</span></article><article class="zsd-stat"><small>'+tr("Yanasubiri","Pending moderation")+'</small><strong>'+rows.filter(r=>r.moderation_status==="pending").length+'</strong><span class="zsd-stat-desc">'+tr("Yanasubiri ukaguzi wa Admin","Awaiting Admin review")+'</span></article></section>'+
 '<section class="zsd-card"><div class="zsd-row"><div><h2>'+tr("Maoni ya wateja","Customer reviews")+'</h2><p class="zsd-muted">'+tr("Maoni ya bidhaa zako. Ni maoni yaliyoidhinishwa tu yanayoonekana kwa umma.","Reviews for your products. Only approved reviews are public.")+'</p></div><button class="zsd-btn" id="zsd-refresh-reviews" type="button">'+tr("Onyesha upya","Refresh")+'</button></div>'+
 (state.reviewsLoading?'<div class="zsd-empty">'+tr("Inapakia maoni...","Loading reviews...")+'</div>':items||'<div class="zsd-empty">'+tr("Bado hakuna maoni ya bidhaa zako.","There are no reviews for your products yet.")+'</div>')+'</section>';
}
function renderPromotions(){
 const campaigns=state.adsCampaigns||[];
 const active=campaigns.filter(x=>x.status==="active"||x.status==="approved");
 const pending=campaigns.filter(x=>x.status==="pending_review");
 const items=campaigns.map(x=>'<div class="zsd-review-item"><div class="zsd-review-head"><strong>'+esc(x.title||tr("Kampeni bila jina","Untitled campaign"))+'</strong><span class="zsd-pill blue">'+esc(String(x.status||"pending").replaceAll("_"," "))+'</span></div><p>'+esc(x.placement||"—")+' · '+money(x.budget_tzs||0)+'</p><div class="zsd-review-meta"><span>'+(x.starts_at?new Date(x.starts_at).toLocaleDateString():"—")+'</span><span>'+(x.ends_at?new Date(x.ends_at).toLocaleDateString():"—")+'</span></div></div>').join("");
 return '<section class="zsd-stats"><article class="zsd-stat"><small>'+tr("Kampeni zote","All campaigns")+'</small><strong>'+campaigns.length+'</strong></article><article class="zsd-stat"><small>'+tr("Zinazoendelea","Running")+'</small><strong>'+active.length+'</strong></article><article class="zsd-stat"><small>'+tr("Zinasubiri review","Pending review")+'</small><strong>'+pending.length+'</strong></article></section>'+
 '<section class="zsd-card"><div class="zsd-section-kicker">ZUNE PROMOTIONS</div><h2>'+tr("Punguzo na Matangazo","Promotions & Discounts")+'</h2><p class="zsd-muted">'+tr("Simamia kampeni zako za matangazo hapa. Kwa sasa matangazo yanatengenezwa kupitia Ads & Marketing; coupon codes na punguzo la bei bado vinahitaji backend ya promotions kabla ya kuhifadhiwa kwa usalama.","Manage your advertising campaigns here. Campaigns are currently created in Ads & Marketing; coupon codes and price discounts need a dedicated promotions backend before they can be safely saved.")+'</p><div class="zsd-promo-actions"><button class="zsd-btn primary" type="button" data-zsd-section="marketing">'+tr("Tengeneza kampeni","Create campaign")+' →</button><button class="zsd-btn" type="button" data-zsd-section="products">'+tr("Chagua bidhaa","Choose products")+'</button></div></section>'+
 '<section class="zsd-card"><h2>'+tr("Historia ya kampeni","Campaign history")+'</h2>'+(items||'<div class="zsd-empty">'+tr("Bado hujatengeneza kampeni.","You have not created a campaign yet.")+'</div>')+'</section>';
}

function renderPlaceholder(){
 const names=sections.find(s=>s[0]===state.section);
 return `<section class="zsd-card"><h2>${tr(names[2],names[3])}</h2><p class="zsd-muted">${tr("Sehemu hii imeongezwa kwenye muundo wa dashboard. Itaunganishwa na jedwali na ruhusa sahihi za Supabase kabla ya kuanza kutumia data halisi.","This section is included in the dashboard structure. It will be connected to the correct Supabase tables and permissions before handling live data.")}</p><div class="zsd-empty">${tr("Inaandaliwa — hakuna data ya majaribio iliyowekwa.","In preparation — no sample data has been inserted.")}</div></section>`;
}
function renderPanel(){
 const panel=document.getElementById("zsd-panel"); if(!panel)return;
 panel.innerHTML=state.section==="overview"?renderOverview():state.section==="products"||state.section==="add-product"?renderProducts():state.section==="orders"?renderOrders():state.section==="inventory"?renderInventory():state.section==="analytics"?renderAnalyticsPage():state.section==="product-performance"?renderProductPerformance():state.section==="finance"||state.section==="transactions"?renderFinance():state.section==="withdrawals"?renderWithdrawals():state.section==="store"?renderStore():state.section==="verification"?renderVerification():state.section==="marketing"?renderMarketing():state.section==="customers"?renderCustomers():state.section==="messages"?renderMessages():state.section==="notifications"?renderNotifications():state.section==="reviews"?renderReviews():state.section==="promotions"?renderPromotions():state.section==="support"?renderSupport():state.section==="settings"?renderSettings():renderPlaceholder();
 const pageTitle=document.getElementById("zsd-page-title");if(pageTitle){const item=sections.find(x=>x[0]===state.section);pageTitle.textContent=item?tr(item[2],item[3]):tr("Muhtasari wa Biashara","Business Overview");}
 panel.querySelectorAll("[data-zsd-section]").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.zsdSection;state.sidebarOpen=false;renderPanel();bindActiveNav();}));
 panel.querySelectorAll("[data-zsd-period]").forEach(b=>b.addEventListener("click",()=>{state.salesPeriod=b.dataset.zsdPeriod;renderPanel();bindActiveNav();}));
 panel.querySelector("#zsd-verification-form")?.addEventListener("submit",submitVerification);
 panel.querySelector("#zsd-chat-form")?.addEventListener("submit",sendSellerMessage);
 panel.querySelector("#zsd-refresh-customers")?.addEventListener("click",()=>loadSellerCustomers());
 panel.querySelector("#zsd-refresh-reviews")?.addEventListener("click",()=>loadSellerReviews(true));
 if(state.section==="reviews"&&state.reviewsLoadedFor!==window.__zuneSellerUser?.id&&!state.reviewsLoading)loadSellerReviews();
 if(state.section==="promotions"&&!state.adsCampaigns.length)loadAdsData();
 if(state.section==="customers"&&!state.customersLoadedFor&&!state.customersLoading)loadSellerCustomers();
 panel.querySelector("#zsd-support-form")?.addEventListener("submit",submitSellerSupport);
 panel.querySelector("#zsd-refresh-support")?.addEventListener("click",()=>loadSellerSupport(true));
 panel.querySelector("#zsd-location-form")?.addEventListener("submit",saveSellerLocation);
 panel.querySelector("#zsd-store-profile-form")?.addEventListener("submit",saveStoreProfile);
 panel.querySelector("#zsd-store-logo")?.addEventListener("change",event=>{const file=event.target.files?.[0],preview=panel.querySelector("#zsd-store-logo-preview"),label=panel.querySelector("#zsd-store-logo-name");if(!file)return;if(preview){const url=URL.createObjectURL(file);preview.innerHTML=`<img src="${url}" alt="Store image preview">`;}if(label)label.textContent=file.name;});
 panel.querySelector("#zsd-refresh-locations")?.addEventListener("click",()=>loadSellerLocations(true));
 panel.querySelector("#zsd-withdrawal-form")?.addEventListener("submit",submitSellerWithdrawal);
 panel.querySelector("#zsd-refresh-withdrawals")?.addEventListener("click",()=>loadSellerWithdrawals(true));
 panel.querySelector("#zsd-settings-language")?.addEventListener("click",()=>{state.language=state.language==="sw"?"en":"sw";localStorage.setItem("zune_language",state.language);const app=document.getElementById("app");if(app)renderSellerDashboard({app,user:window.__zuneSellerUser,onBack:window.__zuneSellerBack});});
 panel.querySelectorAll("[data-seller-theme]").forEach(button=>button.addEventListener("click",()=>{const theme=button.dataset.sellerTheme;const allowed=["emerald","luxury","ocean","royal","nature","blossom","sunset","minimal"];if(!allowed.includes(theme))return;localStorage.setItem("zune_theme",theme);document.documentElement.setAttribute("data-theme",theme);renderPanel();}));
 if(state.section==="withdrawals"&&state.withdrawalsLoadedFor!==window.__zuneSellerUser?.id&&!state.withdrawalsLoading)loadSellerWithdrawals();
 panel.querySelector("#zsd-cancel-location")?.addEventListener("click",()=>{state.editingLocationId=null;renderPanel();});
 panel.querySelectorAll("[data-edit-location]").forEach(button=>button.addEventListener("click",()=>{state.editingLocationId=button.dataset.editLocation;renderPanel();}));
 panel.querySelectorAll("[data-delete-location]").forEach(button=>button.addEventListener("click",()=>deleteSellerLocation(button.dataset.deleteLocation)));
 if(state.section==="store"&&state.locationsLoadedFor!==window.__zuneSellerUser?.id)loadSellerLocations();
 if(state.section==="support"&&state.supportLoadedFor!==window.__zuneSellerUser?.id&&!state.supportLoading)loadSellerSupport();
 panel.querySelectorAll("[data-open-chat]").forEach(button=>button.addEventListener("click",async()=>{state.activeConversationId=button.dataset.openChat;state.chatMessages=[];await loadSellerMessages(true);}));
 panel.querySelector("#zsd-refresh-messages")?.addEventListener("click",()=>loadSellerMessages(true));
 panel.querySelector("#zsd-read-all-notifications")?.addEventListener("click",()=>markSellerNotification());
 panel.querySelectorAll("[data-read-notification]").forEach(button=>button.addEventListener("click",()=>markSellerNotification(button.dataset.readNotification)));
 if(state.section==="messages"&&state.messagesLoadedFor!==window.__zuneSellerUser?.id&&!state.messagesLoading)loadSellerMessages();
 if(state.section==="notifications"&&state.notificationsLoadedFor!==window.__zuneSellerUser?.id&&!state.notificationsLoading)loadSellerNotifications();
 panel.querySelector("#zsd-gallery-input")?.addEventListener("change",event=>{if(event.target.files?.length)addSellerPhotos(event.target.files);event.target.value="";});
 panel.querySelector("#zsd-camera-input")?.addEventListener("change",event=>{if(event.target.files?.length)addSellerPhotos(event.target.files);event.target.value="";});
 if(state.section==="products"){renderPhotoSelection();panel.querySelector("#zsd-product-form")?.addEventListener("submit",publishSellerProduct);} if(state.section==="marketing"){
  panel.querySelector("#zsd-ad-campaign-form")?.addEventListener("submit",submitAdCampaign);
  panel.querySelector("#zsd-ads-deposit-form")?.addEventListener("submit",submitAdsDeposit);
  const type=panel.querySelector("#zsd-ad-type"),pkg=panel.querySelector("#zsd-ad-package"),product=panel.querySelector("#zsd-ad-product-field select"),productField=panel.querySelector("#zsd-ad-product-field");
  const syncAdForm=()=>{const selected=type?.value||"sponsored_store";if(product){product.required=selected!=="sponsored_store";}if(productField)productField.hidden=selected==="sponsored_store";if(pkg){let first=null;Array.from(pkg.options).forEach(option=>{const allowed=option.dataset.campaignType===selected;option.hidden=!allowed;option.disabled=!allowed;if(allowed&&!first)first=option;});if(!pkg.selectedOptions[0]||pkg.selectedOptions[0].disabled){if(first)pkg.value=first.value;}}};
  type?.addEventListener("change",syncAdForm);syncAdForm();
 }
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
  supabase.from("order_items").select("order_id,product_id,product_name,price,quantity,created_at").eq("seller_id",user.id).limit(1000),
  supabase.from("stores").select("id,owner_id,store_name,verification_status,logo_url,description,phone,email,website,region,district,address").eq("owner_id",user.id).maybeSingle(),
  supabase.from("verified_badge_requests").select("id,status,rejection_reason,document_path,created_at").eq("user_id",user.id).eq("verification_type","seller").order("created_at",{ascending:false}).limit(1).maybeSingle(),
  supabase.from("wallets").select("user_id,balance,updated_at").eq("user_id",user.id).maybeSingle(),
  supabase.from("wallet_ledger").select("id,amount,entry_type,reason,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100)
 ]);
 state.profile=profile.data||null;state.products=products.data||[];state.orderItems=items.data||[];state.store=store.data||null;state.badgeRequest=badge.data||null;state.wallet=wallet.data||null;state.ledger=ledger.data||[];
 const orderIds=[...new Set((items.data||[]).map(x=>x.order_id).filter(Boolean))];
 if(orderIds.length){
  const {data,error}=await supabase.from("orders").select("id,status,total_price,created_at,checkout_id,recipient_name,delivery_region,delivery_district,delivery_method,payment_status").in("id",orderIds);
  if(error)throw error;state.orders=data||[];
  const checkoutIds=[...new Set(state.orders.map(x=>x.checkout_id).filter(Boolean))];
  if(checkoutIds.length){const deliveries=await supabase.from("order_deliveries").select("checkout_id,status,delivery_fee,currency,created_at").eq("vendor_id",user.id).in("checkout_id",checkoutIds);if(deliveries.error)throw deliveries.error;state.orderDeliveries=deliveries.data||[];}else state.orderDeliveries=[];
 }else{state.orders=[];state.orderDeliveries=[];}
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
 const root=document.querySelector(".zsd");
 const toggle=()=>{if(window.matchMedia("(max-width:760px)").matches)state.sidebarOpen=!state.sidebarOpen;else state.sidebarCollapsed=!state.sidebarCollapsed;root?.classList.toggle("sidebar-open",state.sidebarOpen);root?.classList.toggle("is-collapsed",state.sidebarCollapsed);};
 document.getElementById("zsd-menu")?.addEventListener("click",toggle);
 document.getElementById("zsd-sidebar-close")?.addEventListener("click",()=>{state.sidebarOpen=false;root?.classList.remove("sidebar-open");});
 document.getElementById("zsd-sidebar-backdrop")?.addEventListener("click",()=>{state.sidebarOpen=false;root?.classList.remove("sidebar-open");});
 document.querySelectorAll("[data-zsd-section]").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.zsdSection;state.sidebarOpen=false;root?.classList.remove("sidebar-open");renderPanel();bindActiveNav();}));
 document.getElementById("zsd-nav-search")?.addEventListener("input",event=>{
  const query=event.target.value.trim().toLocaleLowerCase();
  document.querySelectorAll(".zsd-nav [data-zsd-section]").forEach(button=>{button.hidden=query&&!button.textContent.toLocaleLowerCase().includes(query);});
  document.querySelectorAll(".zsd-nav-group").forEach(group=>{group.hidden=!Array.from(group.querySelectorAll("[data-zsd-section]")).some(button=>!button.hidden);});
 });
}
