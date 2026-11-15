import { supabase } from "./supabase.js";

const app=document.getElementById("orders-app");
let currentFilter="all",orders=[],checkouts=[],deliveries=[],items=[],reviews=[],currentUserId=null;
const lang=localStorage.getItem("zune_language")==="en"?"en":"sw";
const sw={
 title:"Oda zangu",subtitle:"Orodha ya manunuzi yako na hali ya kila oda.",all:"Zote",pending:"Inasubiri",confirmed:"Imethibitishwa",completed:"Imekamilika",cancelled:"Imeghairiwa",empty:"Bado huna oda",emptyText:"Bidhaa utakazonunua zitaonekana hapa pamoja na taarifa za ufuatiliaji.",shop:"Endelea kununua",loading:"Inapakia oda zako...",error:"Imeshindikana kupakia oda zako.",retry:"Jaribu tena",order:"Oda",placed:"Tarehe ya oda",qty:"Idadi",total:"Jumla ya oda",payment:"Malipo",paymentStatus:"Hali ya malipo",delivery:"Usafirishaji",address:"Anwani ya kufikishiwa",recipient:"Mpokeaji",phone:"Simu",method:"Njia ya malipo",tracking:"Hali ya usafirishaji",details:"Taarifa zaidi",hide:"Ficha taarifa",noPayment:"Haijawekwa",notAvailable:"Bado hakuna taarifa",paid:"Imelipwa",failed:"Imeshindikana",shipped:"Imesafirishwa",delivered:"Imefikishwa",inTransit:"Inaendelea",notFound:"Hakuna oda katika kundi hili.",reviewTitle:"Tathmini bidhaa",rating:"Ukadiriaji",reviewText:"Maoni yako",reviewPlaceholder:"Eleza uzoefu wako na bidhaa hii...",submitReview:"Tuma tathmini",reviewPending:"Tathmini yako inasubiri ukaguzi wa Admin.",reviewApproved:"Tathmini imechapishwa",reviewRejected:"Tathmini haikuidhinishwa"
};
const en={title:"My orders",subtitle:"Your purchases and the latest status of each order.",all:"All",pending:"Pending",confirmed:"Confirmed",completed:"Completed",cancelled:"Cancelled",empty:"No orders yet",emptyText:"Products you purchase will appear here with their order and delivery details.",shop:"Continue shopping",loading:"Loading your orders...",error:"Unable to load your orders.",retry:"Try again",order:"Order",placed:"Order date",qty:"Quantity",total:"Order total",payment:"Payment",paymentStatus:"Payment status",delivery:"Delivery",address:"Delivery address",recipient:"Recipient",phone:"Phone",method:"Payment method",tracking:"Delivery status",details:"More details",hide:"Hide details",noPayment:"Not specified",notAvailable:"Not available yet",paid:"Paid",failed:"Failed",shipped:"Shipped",delivered:"Delivered",inTransit:"In progress",notFound:"No orders in this group.",reviewTitle:"Review this product",rating:"Rating",reviewText:"Your review",reviewPlaceholder:"Share your experience with this product...",submitReview:"Submit review",reviewPending:"Your review is awaiting Admin moderation.",reviewApproved:"Your review is published",reviewRejected:"Your review was not approved"};
const t=k=>(lang==="en"?en:sw)[k]||k;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=v=>new Intl.NumberFormat(lang==="en"?"en-TZ":"sw-TZ").format(Number(v||0))+" TSh";
const date=v=>v?new Intl.DateTimeFormat(lang==="en"?"en-TZ":"sw-TZ",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";
function statusKey(s){const v=String(s||"pending").toLowerCase();return ["pending","confirmed","completed","cancelled"].includes(v)?v:"pending";}
function statusLabel(s){const v=statusKey(s);return t(v);}
function render(){
 const visible=orders.filter(o=>currentFilter==="all"||statusKey(o.status)===currentFilter);
 const filters=["all","pending","confirmed","completed","cancelled"];
 app.setAttribute("aria-busy","false");
 app.innerHTML='<div class="orders-heading"><div><span class="orders-kicker">ⓏⓊⓃⒺ MARKETPLACE</span><h1>'+t("title")+'</h1><p>'+t("subtitle")+'</p></div><span class="orders-count">'+orders.length+' '+(lang==="en"?"orders":"oda")+'</span></div><nav class="orders-filters" aria-label="Chuja oda">'+filters.map(k=>'<button type="button" class="orders-filter '+(currentFilter===k?"active":"")+'" data-filter="'+k+'">'+t(k)+'</button>').join("")+'</nav><section class="orders-list">'+(visible.length?visible.map(orderCard).join(""):'<div class="orders-empty"><div class="orders-empty-icon">🛍️</div><h2>'+ (orders.length?t("notFound"):t("empty"))+'</h2><p>'+(!orders.length?t("emptyText"):"")+'</p><a class="orders-primary" href="./index.html">'+t("shop")+'</a></div>')+'</section>';
 app.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.filter;render();}));
 app.querySelectorAll("[data-order-toggle]").forEach(b=>b.addEventListener("click",()=>{const panel=document.getElementById("details-"+b.dataset.orderToggle);const opening=panel.hidden;panel.hidden=!opening;b.textContent=opening?t("hide"):t("details");}));
 app.querySelectorAll("[data-review-form]").forEach(form=>form.addEventListener("submit",submitProductReview));
}
function orderCard(o){
 const checkout=checkouts.find(c=>c.id===o.checkout_id)||{};
 const delivery=deliveries.find(d=>d.checkout_id===o.checkout_id)||{};
 const itemRows=items.filter(i=>i.order_id===o.id);
 const item=itemRows[0]||{};
 const product=o.products||{};
 const name=item.product_name||product.title||"ZUNE Product";
 const image=product.image_url||"";
 const quantity=Number(item.quantity||o.quantity||1);
 const unitPrice=Number(item.price||((Number(o.total_price)||0)/Math.max(1,Number(o.quantity)||1)));
 const status=statusKey(o.status),payment=String(o.payment_status||"pending").toLowerCase();
 const address=[checkout.delivery_address||o.delivery_address,checkout.ward,checkout.district||o.delivery_district,checkout.region||o.delivery_region,checkout.country].filter(Boolean).join(", ");
 const recipient=checkout.recipient_name||o.recipient_name||"—";
 const phone=checkout.recipient_phone||o.recipient_phone||"—";
 const deliveryStatus=String(delivery.status||"").toLowerCase();
 const review=reviews.find(r=>r.order_id===o.id&&r.product_id===o.product_id);
 const reviewPanel=status==="completed"?(review?'<div class="order-review-state"><strong>★'+Number(review.rating)+'/5</strong><p>'+(review.moderation_status==="approved"?t("reviewApproved"):review.moderation_status==="rejected"?t("reviewRejected"):t("reviewPending"))+'</p></div>':'<form class="order-review-form" data-review-form data-order-id="'+esc(o.id)+'" data-product-id="'+esc(o.product_id)+'"><h3>'+t("reviewTitle")+'</h3><label>'+t("rating")+'<select name="rating" required><option value="">—</option><option value="5">5 ★★★★★</option><option value="4">4 ★★★★☆</option><option value="3">3 ★★★☆☆</option><option value="2">2 ★★☆☆☆</option><option value="1">1 ★☆☆☆☆</option></select></label><label>'+t("reviewText")+'<textarea name="review_text" maxlength="1200" required placeholder="'+t("reviewPlaceholder")+'"></textarea></label><button type="submit">'+t("submitReview")+'</button></form>'):"";
 const deliveryText=deliveryStatus==="delivered"?t("delivered"):["shipped","dispatched"].includes(deliveryStatus)?t("shipped"):deliveryStatus?t("inTransit"):t("notAvailable");
 return '<article class="order-card"><header class="order-card-head"><div><div class="order-reference">'+t("order")+' #'+esc(o.id.slice(0,8).toUpperCase())+'</div><div class="order-date">'+date(o.created_at)+'</div></div><span class="order-status '+status+'">'+statusLabel(status)+'</span></header><div class="order-product">'+(image?'<img class="order-product-image" src="'+esc(image)+'" alt="" loading="lazy">':'<div class="order-product-image order-product-placeholder">📦</div>')+'<div class="order-product-info"><h3>'+esc(name)+'</h3><p>'+t("qty")+': '+quantity+' × '+money(unitPrice)+'</p></div><div class="order-total"><small>'+t("total")+'</small><strong>'+money(o.total_price)+'</strong></div></div><footer class="order-card-foot"><span class="order-payment">'+t("payment")+': '+esc(o.payment_method||checkout.payment_method||t("noPayment"))+'</span><button class="order-details-toggle" type="button" data-order-toggle="'+esc(o.id)+'">'+t("details")+' ↓</button></footer><section class="order-details" id="details-'+esc(o.id)+'" hidden><div class="order-detail-grid"><div class="order-detail"><small>'+t("recipient")+'</small><strong>'+esc(recipient)+'</strong></div><div class="order-detail"><small>'+t("phone")+'</small><strong>'+esc(phone)+'</strong></div><div class="order-detail"><small>'+t("address")+'</small><strong>'+esc(address||"—")+'</strong></div><div class="order-detail"><small>'+t("paymentStatus")+'</small><strong>'+esc(payment==="paid"?t("paid"):payment==="failed"?t("failed"):payment)+'</strong></div><div class="order-detail"><small>'+t("tracking")+'</small><strong>'+esc(deliveryText)+'</strong></div><div class="order-detail"><small>'+t("method")+'</small><strong>'+esc(o.delivery_method||checkout.payment_method||"—")+'</strong></div></div><div class="order-timeline">'+t("placed")+': '+date(o.created_at)+' · '+t("tracking")+': '+esc(deliveryText)+'</div>'+reviewPanel+'</section></article>';
}

async function submitProductReview(event){
 event.preventDefault();const form=event.currentTarget,fd=new FormData(form),button=form.querySelector('button[type="submit"]');
 const rating=Number(fd.get("rating")),reviewText=String(fd.get("review_text")||"").trim();
 if(!currentUserId||!form.dataset.orderId||!form.dataset.productId||!Number.isInteger(rating)||rating<1||rating>5||!reviewText)return;
 button.disabled=true;
 try{const {data,error}=await supabase.from("product_reviews").insert({buyer_id:currentUserId,order_id:form.dataset.orderId,product_id:form.dataset.productId,rating,review_text:reviewText,moderation_status:"pending",is_visible:false}).select("id,order_id,product_id,rating,review_text,moderation_status").single();if(error)throw error;reviews.push(data);render();}
 catch(error){alert(error.message||t("error"));button.disabled=false;}
}

async function load(){
 app.innerHTML='<div class="orders-loading"><span class="orders-spinner"></span><p>'+t("loading")+'</p></div>';
 const {data:{session},error:authError}=await supabase.auth.getSession();
 if(authError)throw authError;
 if(!session?.user){app.innerHTML='<div class="orders-empty"><h2>'+ (lang==="en"?"Sign in required":"Ingia kwanza")+'</h2><p>'+t("emptyText")+'</p><a class="orders-primary" href="./index.html">'+(lang==="en"?"Go to marketplace":"Rudi sokoni")+'</a></div>';return;}
 const uid=session.user.id;currentUserId=uid;
 const {data:rows,error}=await supabase.from("orders").select("id,buyer_id,product_id,quantity,total_price,status,created_at,recipient_name,recipient_phone,delivery_address,delivery_region,delivery_district,payment_method,payment_status,payment_reference,delivery_method,delivery_time,checkout_id,products!orders_product_id_fkey(title,image_url)").eq("buyer_id",uid).order("created_at",{ascending:false});
 if(error)throw error;
 orders=rows||[];
 const checkoutIds=[...new Set(orders.map(o=>o.checkout_id).filter(Boolean))];
 const orderIds=orders.map(o=>o.id);
 const [checkoutResult,deliveryResult,itemResult,reviewResult]=await Promise.all([
  checkoutIds.length?supabase.from("order_checkouts").select("id,recipient_name,recipient_phone,recipient_email,country,region,district,ward,delivery_address,grand_total,payment_method,status,created_at").in("id",checkoutIds):Promise.resolve({data:[],error:null}),
  checkoutIds.length?supabase.from("order_deliveries").select("id,checkout_id,vendor_id,delivery_fee,currency,status,created_at").in("checkout_id",checkoutIds):Promise.resolve({data:[],error:null}),
  orderIds.length?supabase.from("order_items").select("id,order_id,product_name,price,quantity,seller_id").in("order_id",orderIds):Promise.resolve({data:[],error:null}),
  orderIds.length?supabase.from("product_reviews").select("id,order_id,product_id,rating,review_text,moderation_status").eq("buyer_id",uid).in("order_id",orderIds):Promise.resolve({data:[],error:null})
 ]);
 if(checkoutResult.error)throw checkoutResult.error;
 if(deliveryResult.error)throw deliveryResult.error;
 if(itemResult.error)throw itemResult.error;
 if(reviewResult.error)throw reviewResult.error;
 checkouts=checkoutResult.data||[];deliveries=deliveryResult.data||[];items=itemResult.data||[];reviews=reviewResult.data||[];
 render();
}
load().catch(error=>{console.error("ZUNE orders:",error);app.setAttribute("aria-busy","false");app.innerHTML='<div class="orders-error"><h2>'+t("error")+'</h2><p>'+esc(error.message||"")+'</p><button type="button" class="orders-primary" id="orders-retry">'+t("retry")+'</button></div>';document.getElementById("orders-retry")?.addEventListener("click",()=>load().catch(()=>{}));});
