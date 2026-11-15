import { supabase } from "./supabase.js";

const root=document.getElementById("account-root");
let user=null,profile={},application=null,store=null;
let lang=localStorage.getItem("zune_language")==="en"?"en":"sw";
const words={
 sw:{backHome:"Sokoni",welcome:"KARIBU KWENYE AKAUNTI YAKO",account:"Akaunti yangu",customer:"MTEJA",seller:"MUUZAJI",verified:"Verified Account",storeVerified:"Verified Store",shopping:"UNUNUZI WANGU",orders:"Oda zangu",ordersD:"Angalia na fuatilia oda zako",saved:"Zilizohifadhiwa",savedD:"Bidhaa ulizoweka kwenye wishlist",cart:"Kikapu changu",cartD:"Bidhaa ulizochagua kununua",business:"BIASHARA YANGU",sellerReady:"Duka lako liko tayari",sellerReadyD:"Akaunti yako imeidhinishwa kuwa Seller.",openDashboard:"Fungua Seller Dashboard",applyTitle:"Fungua duka lako ZUNE",applyD:"Omba kuwa Seller na uanze kuuza bidhaa zako kwenye marketplace.",submitted:"Maombi yametumwa",pending:"Maombi yako yanasubiri kupitia Admin Mkuu.",approved:"Maombi yameidhinishwa",rejected:"Maombi yamekataliwa",more:"Tunahitaji maelezo zaidi",status:"Hali ya maombi",apply:"Tuma maombi ya Seller",owner:"Jina kamili la mmiliki",storeName:"Jina la duka",phone:"Namba ya simu",country:"Nchi",city:"Jiji",category:"Aina ya biashara",region:"Mkoa",district:"Wilaya",address:"Anwani ya biashara",tin:"TIN (si lazima)",submit:"Tuma maombi",sending:"Inatuma maombi...",sent:"Maombi yametumwa kikamilifu.",settings:"MIPANGILIO YA AKAUNTI",personal:"Taarifa binafsi",security:"Usalama na nenosiri",notifications:"Notifications",verification:"Uthibitishaji wa akaunti/duka",help:"Msaada na Support",templates:"Templates",templatesD:"Chagua muundo wa Marketplace au duka lako",logout:"Toka kwenye akaunti",loading:"Inapakia akaunti yako...",error:"Imeshindikana kupakia taarifa za akaunti.",login:"Ingia kwanza ili kuona akaunti yako.",note:"Sehemu ambazo bado hazijaunganishwa zitawezeshwa baada ya huduma zake kujengwa.",ordersSoon:"Sehemu ya oda itaunganishwa baada ya kujengwa."},
 en:{backHome:"Marketplace",welcome:"WELCOME TO YOUR ACCOUNT",account:"My account",customer:"CUSTOMER",seller:"SELLER",verified:"Verified Account",storeVerified:"Verified Store",shopping:"MY SHOPPING",orders:"My orders",ordersD:"View and track your orders",saved:"Saved items",savedD:"Products in your wishlist",cart:"My cart",cartD:"Products you selected",business:"MY BUSINESS",sellerReady:"Your store is ready",sellerReadyD:"Your account has been approved as a Seller.",openDashboard:"Open Seller Dashboard",applyTitle:"Open your ZUNE store",applyD:"Apply to become a Seller and start listing your products.",submitted:"Application submitted",pending:"Your application is awaiting Admin Mkuu review.",approved:"Application approved",rejected:"Application rejected",more:"More information required",status:"Application status",apply:"Apply to become a Seller",owner:"Owner's full name",storeName:"Store name",phone:"Phone number",country:"Country",city:"City",category:"Business category",region:"Region",district:"District",address:"Business address",tin:"TIN (optional)",submit:"Submit application",sending:"Submitting application...",sent:"Your application was submitted.",settings:"ACCOUNT SETTINGS",personal:"Personal information",security:"Security & password",notifications:"Notifications",verification:"Account/store verification",help:"Help & Support",templates:"Templates",templatesD:"Choose your Marketplace or Store design",logout:"Log out",loading:"Loading your account...",error:"Unable to load your account details.",login:"Please sign in to view your account.",note:"Features not yet connected will be enabled when their services are built.",ordersSoon:"The orders section will be connected when it is built."}
};
const t=k=>words[lang][k]||k;

function navigateWithZuneWave(url){
 if(window.__zuneAccountNavigating)return;
 window.__zuneAccountNavigating=true;
 const overlay=document.createElement("div");
 overlay.className="zune-account-wave";
 overlay.innerHTML='<div class="zune-account-wave-wordmark"><span>Ⓩ</span><span>Ⓤ</span><span>Ⓝ</span><span>Ⓔ</span></div><small>ZUNE MARKETPLACE</small>';
 document.body.appendChild(overlay);
 requestAnimationFrame(()=>overlay.classList.add("active"));
 window.setTimeout(()=>location.assign(url),window.matchMedia("(prefers-reduced-motion: reduce)").matches?160:820);
}
function bindAccountWaveLinks(){
 document.querySelectorAll("#account-root a[href],.account-topbar a[href]").forEach(link=>{
  if(link.dataset.comingSoon==="true"||link.dataset.waveBound==="true")return;
  link.dataset.waveBound="true";
  link.addEventListener("click",event=>{
   if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
   const url=link.getAttribute("href");
   if(!url||url==="#"||url.startsWith("mailto:")||url.startsWith("tel:"))return;
   event.preventDefault();navigateWithZuneWave(url);
  });
 });
}
(function addAccountWaveStyles(){
 const style=document.createElement("style");
 style.textContent='.zune-account-wave{position:fixed;inset:0;z-index:99999;background:var(--background,#fff);color:var(--primary,#087a55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;opacity:0;visibility:hidden;transition:opacity .18s ease,visibility .18s ease}.zune-account-wave.active{opacity:1;visibility:visible}.zune-account-wave-wordmark{display:flex;gap:5px;font-size:clamp(48px,14vw,76px);font-weight:950;letter-spacing:-3px}.zune-account-wave-wordmark span{display:inline-block;animation:zuneAccountLetterWave .62s cubic-bezier(.2,.75,.25,1) both}.zune-account-wave-wordmark span:nth-child(2){animation-delay:.09s}.zune-account-wave-wordmark span:nth-child(3){animation-delay:.18s}.zune-account-wave-wordmark span:nth-child(4){animation-delay:.27s}.zune-account-wave small{font-size:10px;font-weight:900;letter-spacing:3px;color:var(--text-muted,#71817a)}@keyframes zuneAccountLetterWave{0%{transform:translateY(28px) rotate(8deg);opacity:0}45%{transform:translateY(-13px) rotate(-5deg);opacity:1}72%{transform:translateY(5px) rotate(2deg)}100%{transform:translateY(0) rotate(0);opacity:1}}@media(prefers-reduced-motion:reduce){.zune-account-wave-wordmark span{animation:none}}';
 document.head.appendChild(style);
})();

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const badge=()=>'<svg viewBox="-30 -30 60 60" role="img" aria-label="Verified"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function card(icon,title,desc,href,disabled=false){return '<a class="account-card" href="'+href+'" '+(disabled?'aria-disabled="true" data-coming-soon="true"':'')+'><span class="account-card-icon">'+icon+'</span><span class="account-card-copy"><strong>'+title+'</strong><small>'+desc+'</small></span><span class="account-card-arrow">›</span></a>';}
function render(){
 const name=profile.full_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"ZUNE Customer";
 const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"Z";
 const role=profile.role||"buyer",isSeller=role==="vendor";
 let business="";
 if(isSeller){
  business='<section class="account-section"><div class="account-panel"><span class="account-eyebrow">'+t("business")+'</span><h2>'+t("sellerReady")+'</h2><p>'+t("sellerReadyD")+'</p><div class="account-actions"><a class="account-button" href="./seller-dashboard.html">'+t("openDashboard")+' →</a></div></div></section>';
 }else if(application){
  const status=String(application.status||"pending").toLowerCase();
  const title=status==="approved"?t("approved"):status==="rejected"?t("rejected"):["more_info_required","needs_information","more_information"].includes(status)?t("more"):t("submitted");
  const desc=status==="rejected"?(application.admin_note||""):status==="approved"?t("pending"):status==="pending"?t("pending"):(application.admin_note||"");
  const cls=status==="approved"?"approved":status==="rejected"?"rejected":"pending";
  business='<section class="account-section"><div class="account-panel"><span class="account-eyebrow">'+t("business")+'</span><h2>'+title+'</h2><p>'+esc(desc)+'</p><div class="account-status '+cls+'">'+t("status")+': '+esc(status.replace(/_/g," "))+'</div></div></section>';
 }else{
  business='<section class="account-section"><div class="account-panel"><span class="account-eyebrow">'+t("business")+'</span><h2>'+t("applyTitle")+'</h2><p>'+t("applyD")+'</p><form class="account-form" id="seller-application"><label class="account-field"><span>'+t("storeName")+' *</span><input name="store_name" required maxlength="120"></label><label class="account-field"><span>'+t("owner")+' *</span><input name="owner_name" required maxlength="120"></label><label class="account-field"><span>'+t("phone")+' *</span><input name="phone" required type="tel" maxlength="30"></label><label class="account-field"><span>'+t("country")+' *</span><input name="country" required value="Tanzania"></label><label class="account-field"><span>'+t("city")+' *</span><input name="city" required maxlength="100"></label><label class="account-field"><span>'+t("category")+'</span><input name="category" maxlength="100"></label><label class="account-field"><span>'+t("region")+'</span><input name="region" maxlength="100"></label><label class="account-field"><span>'+t("district")+'</span><input name="district" maxlength="100"></label><label class="account-field full"><span>'+t("address")+'</span><textarea name="address" maxlength="500"></textarea></label><label class="account-field"><span>'+t("tin")+'</span><input name="tin_number" maxlength="80"></label><div class="account-field full"><button class="account-button full" id="seller-submit" type="submit">'+t("submit")+'</button><p class="account-message" id="seller-message" aria-live="polite"></p></div></form></div></section>';
 }
 root.innerHTML='<section class="account-hero">'+(profile.avatar_display_url?'<img class="account-avatar" src="'+esc(profile.avatar_display_url)+'" alt="Profile photo">':'<div class="account-avatar">'+esc(initials)+'</div>')+'<div class="account-identity"><span class="account-eyebrow">'+t("welcome")+'</span><h1>'+esc(name)+'</h1><p>'+esc(user.email||"")+'</p><div class="account-badges"><span class="account-role '+(isSeller?"vendor":"")+'">'+(isSeller?t("seller"):t("customer"))+'</span>'+(profile.is_verified?'<span class="account-verified">'+badge()+t("verified")+'</span>':'')+((store?.verification_status==="verified"||store?.verification_status==="approved")?'<span class="account-store-verified">✓ '+t("storeVerified")+'</span>':'')+'</div></div></section>'+
 '<section class="account-section"><div class="account-section-head"><div><span class="account-eyebrow">'+t("shopping")+'</span><h2>'+t("account")+'</h2></div></div><div class="account-grid account-shopping-grid">'+card("▤",t("orders"),t("ordersD"),"./orders.html")+card("♡",t("saved"),t("savedD"),"./index.html?tab=saved")+card("🛒",t("cart"),t("cartD"),"./cart.html")+'</div><p class="account-note">'+t("note")+'</p></section>'+
 business+
 '<section class="account-section"><div class="account-section-head"><div><span class="account-eyebrow">'+t("settings")+'</span><h2>'+t("settings")+'</h2></div></div><div class="account-grid account-settings-grid">'+card("👤",t("personal"),"", "./profile.html#personal")+card("🔐",t("security"),"","./settings.html?section=security")+card("🔔",t("notifications"),"","./settings.html?section=notifications")+card("🛡",t("verification"),"",isSeller?"./seller-dashboard.html":"./verification.html")+card("📍","Anuani zangu","","./profile.html#addresses")+card("❔",t("help"),"","./settings.html?section=contact")+card("🎨",t("templates"),t("templatesD"),"./templates.html")+card("ⓘ","Kuhusu ZUNE","","./about-zune.html")+'</div></section>'+
 '<div class="account-logout-wrap"><button class="account-button danger full" id="account-logout">'+t("logout")+'</button></div>';

 const profileHero=root.querySelector(".account-hero");
 profileHero.classList.add("account-hero-link");profileHero.setAttribute("role","link");profileHero.setAttribute("tabindex","0");profileHero.setAttribute("aria-label","Fungua wasifu wangu");
 profileHero.addEventListener("click",()=>navigateWithZuneWave("./profile.html"));
 profileHero.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();navigateWithZuneWave("./profile.html");}});
 bindAccountWaveLinks();
 document.getElementById("account-logout").addEventListener("click",async()=>{if(!confirm(lang==="sw"?"Una uhakika unataka kutoka?":"Are you sure you want to log out?"))return;const {error}=await supabase.auth.signOut();if(error){alert(error.message);return;}location.assign("./index.html");});
 const form=document.getElementById("seller-application");
 if(form)form.addEventListener("submit",submitApplication);
}
async function submitApplication(event){
 event.preventDefault();
 const form=event.currentTarget,button=document.getElementById("seller-submit"),message=document.getElementById("seller-message"),data=new FormData(form);
 const storeName=String(data.get("store_name")||"").trim();
 const payload={user_id:user.id,store_name:storeName,business_name:storeName,owner_name:String(data.get("owner_name")||"").trim(),phone:String(data.get("phone")||"").trim(),country:String(data.get("country")||"").trim(),city:String(data.get("city")||"").trim(),email:user.email||null,category:String(data.get("category")||"").trim()||null,region:String(data.get("region")||"").trim()||null,district:String(data.get("district")||"").trim()||null,address:String(data.get("address")||"").trim()||null,tin_number:String(data.get("tin_number")||"").trim()||null,status:"pending"};
 button.disabled=true;button.textContent=t("sending");message.textContent="";
 try{const {data:created,error}=await supabase.from("seller_applications").insert(payload).select("id,store_name,status,admin_note,created_at").single();if(error)throw error;application=created;render();const m=root.querySelector(".account-note");if(m)m.textContent=t("sent");}
 catch(error){console.error("Seller application:",error);message.textContent=error.message||t("error");button.disabled=false;button.textContent=t("submit");}
}
async function init(){
 const {data:{session},error:sessionError}=await supabase.auth.getSession();
 if(sessionError)throw sessionError;
 if(!session?.user){root.innerHTML='<div class="account-error">'+t("login")+' <a href="./index.html">Login</a></div>';return;}
 user=session.user;
 const [p,a,s]=await Promise.all([
  supabase.from("profiles").select("id,full_name,role,is_verified,avatar_path,created_at").eq("id",user.id).maybeSingle(),
  supabase.from("seller_applications").select("id,store_name,status,admin_note,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  supabase.from("stores").select("id,store_name,verification_status").eq("owner_id",user.id).limit(1).maybeSingle()
 ]);
 if(p.error)throw p.error;if(a.error)throw a.error;
 profile=p.data||{};application=a.data||null;store=s.data||null;
 if(profile.avatar_path){
  const {data:avatarBlob,error:avatarError}=await supabase.storage.from("zune-avatars").download(profile.avatar_path);
  if(!avatarError&&avatarBlob)profile.avatar_display_url=URL.createObjectURL(avatarBlob);
  else if(avatarError)console.warn("ZUNE account avatar unavailable:",avatarError.message);
 }
 render();
}
document.getElementById("account-language").addEventListener("click",()=>{lang=lang==="sw"?"en":"sw";localStorage.setItem("zune_language",lang);localStorage.setItem("zune-language",lang);document.getElementById("account-language").textContent=lang==="sw"?"EN":"SW";document.documentElement.lang=lang;render();});
document.getElementById("account-language").textContent=lang==="sw"?"EN":"SW";
const selectedTheme=localStorage.getItem("zune_theme")||"emerald";document.documentElement.setAttribute("data-theme",selectedTheme);
init().catch(error=>{console.error("ZUNE account init:",error);root.innerHTML='<div class="account-error">'+t("error")+'</div>';});
