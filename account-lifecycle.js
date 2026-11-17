import { supabase } from "./supabase.js";
const root=document.getElementById("life-root");
const params=new URLSearchParams(location.search);
const mode=params.get("mode");
const en=localStorage.getItem("zune_language")==="en";
const text=(sw,english)=>en?english:sw;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function renderChoice(){
 document.getElementById("life-title").textContent=text("Usimamizi wa akaunti","Account management");
 document.getElementById("life-subtitle").textContent=text("Chagua hatua unayotaka kuchukua","Choose what you want to do");
 root.innerHTML='<a class="life-card" href="./account-lifecycle.html?mode=temporary"><strong>'+text("Sitisha akaunti kwa muda","Temporarily deactivate account")+'</strong><p>'+text("Omba akaunti isimamishwe kwa muda. Taarifa zako na historia ya oda hazitafutwa.","Request a temporary pause. Your profile data and order history will not be erased.")+'</p><span>'+text("Endelea →","Continue →")+'</span></a><a class="life-card danger" href="./account-lifecycle.html?mode=permanent"><strong>'+text("Omba kufuta akaunti kabisa","Request permanent account deletion")+'</strong><p>'+text("Tuma ombi la kufutwa kwa akaunti. Timu ya ZUNE itakagua ombi na wajibu wa kuhifadhi rekodi za oda au miamala kabla ya hatua ya mwisho.","Submit a deletion request. ZUNE will review it and any obligations to retain order or transaction records before final action.")+'</p><span>'+text("Endelea →","Continue →")+'</span></a><p class="life-copy">'+text("Unaweza kurudi kwenye Akaunti bila kufanya mabadiliko.","You can return to Account without making changes.")+'</p>';
}
async function init(){
 const {data:{user},error}=await supabase.auth.getUser();
 if(error)throw error;
 if(!user){location.replace("./index.html");return;}
 if(!["temporary","permanent"].includes(mode)){renderChoice();return;}
 const temporary=mode==="temporary";
 const title=temporary?text("Ombi la kusitisha akaunti kwa muda","Temporary deactivation request"):text("Ombi la kufuta akaunti kabisa","Permanent account deletion request");
 document.getElementById("life-title").textContent=title;
 document.getElementById("life-subtitle").textContent=text("Ukurasa wa usimamizi wa akaunti yako","Manage your account");
 root.innerHTML='<section class="life-panel"><h2>'+title+'</h2><p class="life-copy">'+(temporary?text("Akaunti haitazimwa moja kwa moja hapa. Ombi litatumwa kwa timu ya ZUNE ili lithibitishwe na kushughulikiwa kwa usalama. Unaweza kuomba kurejesha akaunti kupitia Support.","This page does not deactivate your account immediately. Your request will be sent to ZUNE for review and safe handling. You can contact Support to request reactivation."):text("Kutuma ombi hakufuti akaunti papo hapo. ZUNE itakagua utambulisho na rekodi zinazopaswa kuhifadhiwa kisheria au kwa ajili ya oda na miamala. Usitume ombi hili kama unataka tu kupumzika kwa muda.","Submitting this request does not instantly erase your account. ZUNE must review identity and records that may need to be retained for orders, transactions or legal obligations. Choose temporary deactivation if you only need a break."))+'</p><div class="life-warning">'+(temporary?text("Bidhaa, oda na historia hazitafutwa kwa kutuma ombi hili.","Submitting this request will not erase products, orders or history."):text("Historia ya oda na miamala haitafutwa kiholela. Ombi linaweza kuhitaji hatua za ziada za uthibitishaji.","Order and transaction history will not be indiscriminately deleted. Additional verification may be required."))+'</div><form id="life-form"><label class="life-field">'+text("Sababu (si lazima)","Reason (optional)")+'<textarea name="reason" maxlength="1500" placeholder="'+text("Andika sababu yako...","Tell us why...")+'"></textarea></label><button class="life-btn '+(temporary?"":"danger")+'" type="submit">'+text("Tuma ombi","Submit request")+'</button><p class="life-message" id="life-message" role="status"></p></form><p class="life-copy"><a href="./account-lifecycle.html">'+text("← Rudi kwenye chaguo za akaunti","← Back to account options")+'</a></p></section>';
 document.getElementById("life-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const button=e.currentTarget.querySelector("button"),message=document.getElementById("life-message");
  const reason=new FormData(e.currentTarget).get("reason")||"";
  button.disabled=true;button.textContent=text("Inatuma...","Sending...");
  try{
   const category=temporary?"account_deactivation":"account_deletion";
   const body=(temporary?"TEMPORARY ACCOUNT DEACTIVATION REQUEST":"PERMANENT ACCOUNT DELETION REQUEST")+"\nUser ID: "+user.id+"\nEmail: "+(user.email||"not provided")+"\nReason: "+String(reason).trim();
   const {error}=await supabase.from("support_tickets").insert({user_id:user.id,customer_name:user.user_metadata?.full_name||user.email||"ZUNE User",category,message:body,status:"open"});
   if(error)throw error;
   message.style.color="var(--primary)";
   message.textContent=text("Ombi lako limetumwa kwa Support ya ZUNE. Akaunti yako haijafutwa au kusitishwa bado; subiri maelekezo ya timu.","Your request was sent to ZUNE Support. Your account has not yet been deactivated or deleted; wait for the team's instructions.");
   button.textContent=text("Ombi limetumwa","Request submitted");
  }catch(err){message.style.color="var(--danger)";message.textContent=err.message||text("Imeshindikana kutuma ombi.","Could not submit the request.");button.disabled=false;button.textContent=text("Jaribu tena","Try again");}
 });
}
init().catch(e=>{console.error(e);root.innerHTML='<p class="life-copy">'+esc(e.message||"Unable to load account options.")+'</p>';});