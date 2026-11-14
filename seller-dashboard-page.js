import { supabase } from "./supabase.js?v=20261114-3";
import { renderSellerDashboard } from "./seller-dashboard.js?v=20261114-3";

const app = document.getElementById("app");

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
    app.innerHTML = '<section class="page"><div class="panel"><h1>Seller access required</h1><p>Akaunti hii haijaidhinishwa kuwa Seller.</p><a href="./index.html">Rudi ZUNE</a></div></section>';
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
  app.innerHTML='<section class="page"><div class="panel"><h1>Imeshindikana kufungua dashboard</h1><p>Tafadhali jaribu tena.</p><a href="./index.html">Rudi ZUNE</a></div></section>';
});
