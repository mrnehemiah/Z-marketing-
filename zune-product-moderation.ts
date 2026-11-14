import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function decodeImage(dataUrl: string, mimeType: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match || match[1] !== mimeType) throw new Error("Picha ina format isiyoruhusiwa.");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 16 || bytes.length > 5 * 1024 * 1024) throw new Error("Kila picha lazima iwe chini ya 5 MB.");
  const isJpeg = mimeType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = mimeType === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = mimeType === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!(isJpeg || isPng || isWebp)) throw new Error("Aina halisi ya faili la picha haijathibitishwa.");
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Ingia kwenye akaunti yako kwanza." }, 401);

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = secretKeys.default;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !secretKey) return json({ error: "Supabase server configuration haijakamilika." }, 503);
    if (!openAiKey) return json({ error: "Moderation haijawashwa bado. OPENAI_API_KEY haijawekwa; hakuna picha iliyopakiwa wala bidhaa iliyochapishwa." }, 503);

    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Session imeisha. Ingia tena." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, account_status, removed_at")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.role !== "vendor" || profile.account_status !== "active" || profile.removed_at) {
      return json({ error: "Akaunti hii haina ruhusa ya kuchapisha bidhaa." }, 403);
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "Vingine").trim().slice(0, 120);
    const price = Number(body.price);
    const stock = Number(body.stock_quantity);
    const photos = Array.isArray(body.images) ? body.images : [];

    if (title.length < 3 || title.length > 160) return json({ error: "Jina la bidhaa liwe na herufi 3 hadi 160." }, 400);
    if (!description || description.length > 5000) return json({ error: "Jaza maelezo ya bidhaa (hadi herufi 5,000)." }, 400);
    if (!Number.isFinite(price) || price <= 0) return json({ error: "Weka bei sahihi ya bidhaa." }, 400);
    if (!Number.isInteger(stock) || stock < 0 || stock > 10000000) return json({ error: "Weka idadi sahihi ya stock." }, 400);
    if (photos.length < 1 || photos.length > 20) return json({ error: "Chagua picha 1 hadi 20 za bidhaa." }, 400);

    const decoded = photos.map((photo: any) => ({
      name: String(photo.name || "product.webp").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100),
      mimeType: String(photo.mimeType || ""),
      bytes: decodeImage(String(photo.dataUrl || ""), String(photo.mimeType || ""))
    }));
    const totalBytes = decoded.reduce((sum: number, photo: any) => sum + photo.bytes.length, 0);
    if (totalBytes > 18 * 1024 * 1024) return json({ error: "Jumla ya picha imezidi 18 MB. Punguza ukubwa wa picha." }, 413);

    const moderationInput: any[] = [{
      type: "text",
      text: "Marketplace product listing. Review the product title, description and category for sexual or sexually explicit content, sexual services, exploitation, and other unsafe marketplace content. Product title: " + title + "\nDescription: " + description + "\nCategory: " + category
    }];
    for (const photo of decoded) {
      let binary = "";
      for (let i = 0; i < photo.bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...photo.bytes.subarray(i, Math.min(i + 0x8000, photo.bytes.length)));
      }
      moderationInput.push({
        type: "image_url",
        image_url: { url: "data:" + photo.mimeType + ";base64," + btoa(binary) }
      });
    }

    const moderationResponse = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Authorization": "Bearer " + openAiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: moderationInput })
    });
    if (!moderationResponse.ok) {
      const detail = await moderationResponse.text();
      console.error("Moderation provider error", moderationResponse.status, detail.slice(0, 500));
      return json({ error: "Ukaguzi wa usalama haukukamilika. Jaribu tena baadaye; bidhaa haijapakiwa wala kuchapishwa." }, 503);
    }

    const moderationPayload = await moderationResponse.json();
    const result = moderationPayload?.results?.[0];
    if (!result || !result.categories || !result.category_scores) {
      return json({ error: "Majibu ya moderation hayajakamilika. Bidhaa haijachapishwa." }, 503);
    }

    const categories = result.categories;
    const scores = result.category_scores;
    const sexualScore = Number(scores.sexual || 0);
    const minorSexual = categories["sexual/minors"] === true;
    const explicitSexual = categories.sexual === true || sexualScore >= 0.70;
    const requiresReview = result.flagged === true || sexualScore >= 0.25;
    const status = minorSexual || explicitSexual ? "blocked" : requiresReview ? "review" : "approved";
    const reason = minorSexual ? "sexual_minors" : explicitSexual ? "sexual_content" : requiresReview ? "manual_review_required" : null;

    const { data: review, error: reviewError } = await admin
      .from("product_moderation_reviews")
      .insert({
        user_id: user.id,
        title,
        status,
        reason,
        model: moderationPayload.model || "omni-moderation-latest",
        categories: { flagged: result.flagged === true, categories, category_scores: scores }
      })
      .select("id")
      .single();
    if (reviewError) throw reviewError;

    if (status === "blocked") {
      return json({ status, review_id: review.id, error: "Bidhaa imezuiwa kwa sababu ya maudhui ya kingono au yaliyokatazwa. Hakuna picha iliyopakiwa." }, 422);
    }
    if (status === "review") {
      return json({ status, review_id: review.id, message: "Bidhaa imesimamishwa kwa ukaguzi wa ziada. Haijawekwa Storage wala kuchapishwa." }, 202);
    }

    const productId = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    const imageUrls: string[] = [];
    try {
      for (let i = 0; i < decoded.length; i++) {
        const photo = decoded[i];
        const extension = photo.mimeType === "image/jpeg" ? "jpg" : photo.mimeType === "image/png" ? "png" : "webp";
        const path = user.id + "/" + productId + "/" + String(i + 1).padStart(2, "0") + "." + extension;
        const { error: uploadError } = await admin.storage.from("product-images").upload(path, photo.bytes, {
          contentType: photo.mimeType,
          cacheControl: "31536000",
          upsert: false
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        imageUrls.push(admin.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      }

      const { data: product, error: productError } = await admin
        .from("products")
        .insert({
          id: productId,
          vendor_id: user.id,
          title,
          description,
          price,
          stock_quantity: stock,
          category,
          image_url: imageUrls[0],
          image_urls: imageUrls,
          moderation_status: "approved",
          moderated_at: new Date().toISOString(),
          published_at: new Date().toISOString()
        })
        .select("id,title,price,image_url,image_urls,created_at")
        .single();
      if (productError) throw productError;

      await admin.from("product_moderation_reviews").update({ product_id: product.id }).eq("id", review.id);
      return json({ status: "published", product, message: "Moderation imekamilika na bidhaa imechapishwa." }, 201);
    } catch (publishError) {
      if (uploadedPaths.length) await admin.storage.from("product-images").remove(uploadedPaths);
      await admin.from("product_moderation_reviews").update({ status: "error", reason: "storage_or_database_publish_failed" }).eq("id", review.id);
      console.error("ZUNE publish failed", publishError);
      return json({ error: "Moderation imepita lakini upakiaji au uchapishaji umeshindikana. Hakuna bidhaa iliyowekwa hewani." }, 500);
    }
  } catch (error) {
    console.error("ZUNE product moderation error", error);
    return json({ error: error instanceof Error ? error.message : "Hitilafu ya moderation." }, 500);
  }
});
