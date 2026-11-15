import { supabase } from "./supabase.js?v=20261114-3";
import { renderSellerDashboard } from "./seller-dashboard.js?v=20261115-store-profile-v1";

const app = document.getElementById("app");

function renderAccessError(title, message){
  if(!app)return;
  app.innerHTML = `<section class="zsd-access-state"><div class="zsd-access-brand">ⓏⓊⓃⒺ</div><div class="zsd-access-card"><span class="zsd-access-icon">!</span><h1>${title}</h1><p>${message}</p><a href="./index.html">Rudi ZUNE</a></div></section>`;
}

async function startSellerDashboard(){
  const { data:{user}, error } = await supabase.auth.getUser();
  if(error || !user){
    window.location.replace("./index.html");
    return;
  }

  const { data:profile, error:profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id",user.id)
    .maybeSingle();

  if(profileError || profile?.role !== "vendor"){
    renderAccessError("Seller access required", "Akaunti hii haijaidhinishwa kuwa Seller.");
    return;
  }

  renderSellerDashboard({
    app,
    user,
    onBack:()=>window.location.assign("./index.html")
  });
}

startSellerDashboard().catch(error=>{
  console.error("ZUNE Seller Dashboard:",error);
  renderAccessError("Imeshindikana kufungua dashboard", "Tafadhali jaribu tena. Hakikisha una intaneti kisha fungua ukurasa upya.");
});
