import { supabase } from "./supabase.js";

const templates=["classic","editorial","hero","compact","boutique","catalog","stories","minimal","deals","showcase"];
const palettes={
 classic:{bg:"#f5f8f6",surface:"#ffffff",text:"#17251f",muted:"#718078",border:"#e2ebe5",radius:"16px",shadow:"0 8px 26px rgba(18,35,28,.07)",font:"Inter,Arial,sans-serif"},
 editorial:{bg:"#f7f4ef",surface:"#fffdf9",text:"#29251f",muted:"#82786d",border:"#e8e0d5",radius:"5px",shadow:"0 2px 10px rgba(41,37,31,.05)",font:"Georgia,serif"},
 hero:{bg:"#101d35",surface:"#192a49",text:"#f4f7ff",muted:"#bdc9df",border:"#314565",radius:"22px",shadow:"0 12px 32px rgba(0,0,0,.2)",font:"Inter,Arial,sans-serif"},
 compact:{bg:"#f2f5f7",surface:"#ffffff",text:"#1e2933",muted:"#71808c",border:"#e0e6eb",radius:"9px",shadow:"0 2px 8px rgba(20,35,45,.05)",font:"Inter,Arial,sans-serif"},
 boutique:{bg:"#f4eee8",surface:"#fffaf5",text:"#34251f",muted:"#8a766c",border:"#e8d9cf",radius:"4px",shadow:"0 5px 18px rgba(65,39,28,.08)",font:"Georgia,serif"},
 catalog:{bg:"#f1f5fa",surface:"#ffffff",text:"#1e2c40",muted:"#718198",border:"#dce5f0",radius:"10px",shadow:"0 3px 12px rgba(30,60,95,.07)",font:"Inter,Arial,sans-serif"},
 stories:{bg:"#f7f2fa",surface:"#ffffff",text:"#30233a",muted:"#85748e",border:"#eadff0",radius:"22px",shadow:"0 8px 24px rgba(75,42,91,.08)",font:"Inter,Arial,sans-serif"},
 minimal:{bg:"#ffffff",surface:"#ffffff",text:"#202020",muted:"#858585",border:"#ededed",radius:"0px",shadow:"none",font:"Inter,Arial,sans-serif"},
 deals:{bg:"#fff8ed",surface:"#ffffff",text:"#382817",muted:"#927b61",border:"#f1dfc5",radius:"12px",shadow:"0 5px 18px rgba(154,91,22,.09)",font:"Inter,Arial,sans-serif"},
 showcase:{bg:"#111820",surface:"#1b2732",text:"#f3f6f8",muted:"#b4c0c9",border:"#35434e",radius:"20px",shadow:"0 12px 30px rgba(0,0,0,.22)",font:"Inter,Arial,sans-serif"}
};
function addStyles(){
 if(document.getElementById("zune-customer-template-global"))return;
 const style=document.createElement("style");style.id="zune-customer-template-global";
 style.textContent=`
  :root[data-zune-template]{--z-page-bg:#f5f8f6;--z-page-surface:#fff;--z-page-text:#17251f;--z-page-muted:#718078;--z-page-border:#e2ebe5;--z-page-radius:16px;--z-page-shadow:0 8px 26px rgba(18,35,28,.07);--z-page-font:Inter,Arial,sans-serif}
  body[data-zune-template]{background:var(--z-page-bg);color:var(--z-page-text);font-family:var(--z-page-font)}
  body[data-zune-template] .profile-topbar,body[data-zune-template] .orders-topbar,body[data-zune-template] .settings-head,body[data-zune-template] .zc-topbar{background:var(--z-page-surface);color:var(--z-page-text);border-color:var(--z-page-border)}
  body[data-zune-template] .profile-topbar h1,body[data-zune-template] .profile-topbar p,body[data-zune-template] .profile-brand,body[data-zune-template] .profile-back,body[data-zune-template] .profile-home,body[data-zune-template] .orders-back,body[data-zune-template] .orders-brand,body[data-zune-template] .orders-top-label,body[data-zune-template] .zc-topbar a,body[data-zune-template] .zc-topbar span{color:var(--z-page-text)}
  body[data-zune-template] .profile-home{border-color:var(--z-page-border)}
  body[data-zune-template] .profile-identity,body[data-zune-template] .profile-card,body[data-zune-template] .profile-section,body[data-zune-template] .settings-profile,body[data-zune-template] .settings-card,body[data-zune-template] .settings-panel,body[data-zune-template] .order-card,body[data-zune-template] .orders-count,body[data-zune-template] .zc-card,body[data-zune-template] .zc-success,body[data-zune-template] .zc-empty,body[data-zune-template] .zc-error,body[data-zune-template] .zv-card{background:var(--z-page-surface);color:var(--z-page-text);border-color:var(--z-page-border);border-radius:var(--z-page-radius);box-shadow:var(--z-page-shadow)}
  body[data-zune-template] .profile-nav-row,body[data-zune-template] .profile-address,body[data-zune-template] .settings-row{color:var(--z-page-text);border-color:var(--z-page-border)}
  body[data-zune-template] .profile-nav-icon,body[data-zune-template] .settings-icon,body[data-zune-template] .order-timeline,body[data-zune-template] .zc-product,body[data-zune-template] .zc-total-row{background:var(--z-page-bg);color:var(--z-page-text);border-color:var(--z-page-border)}
  body[data-zune-template] .profile-field input,body[data-zune-template] .profile-field select,body[data-zune-template] .profile-field textarea,body[data-zune-template] .settings-field input,body[data-zune-template] .settings-field select,body[data-zune-template] .settings-field textarea,body[data-zune-template] .order-review-form select,body[data-zune-template] .order-review-form textarea,body[data-zune-template] .zc-field input,body[data-zune-template] .zc-field select,body[data-zune-template] .zc-field textarea,body[data-zune-template] .zv-form input{background:var(--z-page-bg);color:var(--z-page-text);border-color:var(--z-page-border)}
  body[data-zune-template] .profile-muted,body[data-zune-template] .profile-id-copy p,body[data-zune-template] .profile-eyebrow,body[data-zune-template] .settings-sub,body[data-zune-template] .settings-row-copy small,body[data-zune-template] .orders-heading p,body[data-zune-template] .orders-kicker,body[data-zune-template] .order-date,body[data-zune-template] .order-payment,body[data-zune-template] .order-detail small,body[data-zune-template] .zc-heading p,body[data-zune-template] .zc-hint,body[data-zune-template] .zc-payment-choice small{color:var(--z-page-muted)}
  body[data-zune-template] .profile-btn,body[data-zune-template] .settings-btn:not(.secondary),body[data-zune-template] .orders-filter.active,body[data-zune-template] .zc-primary,body[data-zune-template] .order-review-form button{background:var(--primary);color:#fff}
  body[data-zune-template] .profile-btn.secondary,body[data-zune-template] .settings-btn.secondary,body[data-zune-template] .settings-theme,body[data-zune-template] .orders-filter,body[data-zune-template] .zc-secondary{background:var(--z-page-bg);color:var(--z-page-text);border-color:var(--z-page-border)}
  body[data-zune-template] .order-product-info h3,body[data-zune-template] .profile-id-copy h2,body[data-zune-template] .settings-profile strong,body[data-zune-template] .settings-panel h2,body[data-zune-template] .orders-heading h1,body[data-zune-template] .zc-heading h1,body[data-zune-template] .zc-card h2{color:var(--z-page-text)}
  body[data-zune-template] .order-total strong,body[data-zune-template] .zc-grand strong{color:var(--primary)}
  body[data-zune-template="editorial"] .profile-topbar h1,body[data-zune-template="editorial"] .settings-head h1,body[data-zune-template="editorial"] .orders-heading h1,body[data-zune-template="editorial"] .zc-heading h1,body[data-zune-template="boutique"] .profile-topbar h1,body[data-zune-template="boutique"] .settings-head h1,body[data-zune-template="boutique"] .orders-heading h1{font-family:Georgia,serif}
  body[data-zune-template="compact"] .profile-identity,body[data-zune-template="compact"] .profile-card,body[data-zune-template="compact"] .profile-section,body[data-zune-template="compact"] .settings-profile,body[data-zune-template="compact"] .settings-card,body[data-zune-template="compact"] .order-card,body[data-zune-template="compact"] .zc-card{padding:12px}
  body[data-zune-template="minimal"] .profile-identity,body[data-zune-template="minimal"] .profile-card,body[data-zune-template="minimal"] .profile-section,body[data-zune-template="minimal"] .settings-card,body[data-zune-template="minimal"] .settings-panel,body[data-zune-template="minimal"] .order-card,body[data-zune-template="minimal"] .zc-card{box-shadow:none}
  body[data-zune-template="hero"] .profile-topbar,body[data-zune-template="hero"] .orders-topbar,body[data-zune-template="hero"] .settings-head,body[data-zune-template="hero"] .zc-topbar,body[data-zune-template="showcase"] .profile-topbar,body[data-zune-template="showcase"] .orders-topbar,body[data-zune-template="showcase"] .settings-head,body[data-zune-template="showcase"] .zc-topbar{background:var(--z-page-surface)}
  body[data-zune-template="deals"] .order-status,body[data-zune-template="deals"] .zc-grand{border-color:#f1dfc5}
 `;
 document.head.appendChild(style);
}
async function apply(){
 let template="classic";
 try{
  const {data:{user}}=await supabase.auth.getUser();
  if(user?.id)template=localStorage.getItem("zune_template_customer:"+user.id)||"classic";
 }catch(error){console.warn("ZUNE customer template:",error);}
 if(!templates.includes(template))template="classic";
 const p=palettes[template];
 addStyles();
 document.documentElement.setAttribute("data-zune-template",template);
 document.body?.setAttribute("data-zune-template",template);
 for(const [key,value] of Object.entries({bg:p.bg,surface:p.surface,text:p.text,muted:p.muted,border:p.border,radius:p.radius,shadow:p.shadow,font:p.font})){
  document.documentElement.style.setProperty("--z-page-"+key,value);
 }
 document.dispatchEvent(new CustomEvent("zune:template-applied",{detail:{template}}));
}
window.ZUNE_APPLY_CUSTOMER_TEMPLATE=apply;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
