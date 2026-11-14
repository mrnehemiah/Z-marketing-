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
  const jpeg = mimeType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = mimeType === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = mimeType === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!(jpeg || png || webp)) throw new Error("Aina halisi ya faili la picha haijathibitishwa.");
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 30 * 1024 * 1024) return json({ error: "Ombi la picha limezidi ukubwa unaoruhusiwa." }, 413);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Ingia kwenye akaunti yako kwanza." }, 401);

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = secretKeys.default;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl || !secretKey) return json({ error: "Supabase server configuration haijakamilika." }, 503);
    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Session imeisha. Ingia tena." }, 401);

    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("id, role, account_status, removed_at").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.role !== "vendor" || profile.account_status !== "active" || profile.removed_at) {
      return json({ error: "Akaunti hii haina ruhusa ya kuchapisha bidhaa. Fungua Seller Dashboard kwanza." }, 403);
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
      mimeType: String(photo.mimeType || ""),
      bytes: decodeImage(String(photo.dataUrl || ""), String(photo.mimeType || ""))
    }));
    const totalBytes = decoded.reduce((sum: number, photo: any) => sum + photo.bytes.length, 0);
    if (totalBytes > 18 * 1024 * 1024) return json({ error: "Jumla ya picha imezidi 18 MB. Punguza ukubwa wa picha." }, 413);

    const productId = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    const imageUrls: string[] = [];
    try {
      for (let i = 0; i < decoded.length; i++) {
        const photo = decoded[i];
        const extension = photo.mimeType === "image/jpeg" ? "jpg" : photo.mimeType === "image/png" ? "png" : "webp";
        const path = user.id + "/" + productId + "/" + String(i + 1).padStart(2, "0") + "." + extension;
        const { error: uploadError } = await admin.storage.from("product-images").upload(path, photo.bytes, {
          contentType: photo.mimeType, cacheControl: "31536000", upsert: false
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        imageUrls.push(admin.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      }
      const now = new Date().toISOString();
      const { data: product, error: productError } = await admin.from("products").insert({
        id: productId, vendor_id: user.id, title, description, price, stock_quantity: stock,
        category, image_url: imageUrls[0], image_urls: imageUrls,
        moderation_status: "approved", moderated_at: now, published_at: now
      }).select("id,title,price,image_url,image_urls,created_at").single();
      if (productError) throw productError;
      return json({ status: "published", product, message: "Bidhaa imechapishwa sokoni." }, 201);
    } catch (publishError) {
      if (uploadedPaths.length) await admin.storage.from("product-images").remove(uploadedPaths);
      console.error("ZUNE product publish failed", publishError);
      return json({ error: "Upakiaji au uchapishaji umeshindikana. Jaribu tena." }, 500);
    }
  } catch (error) {
    console.error("ZUNE product publish error", error);
    return json({ error: error instanceof Error ? error.message : "Hitilafu ya uchapishaji." }, 500);
  }
});
