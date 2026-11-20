
import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2.119.0";

// ZUNE SUPABASE CONNECTION

const SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

// Create Supabase client

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);


// Native Android FCM bridge: syncs this installation token only for the
// currently authenticated Supabase user. RLS remains the authority.
if (typeof window !== "undefined" && window.AndroidZunePush) {
  window.zuneSyncNativePush = async function () {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !session?.access_token) return;
      const token = window.AndroidZunePush.getFcmToken();
      if (!token) return;
      window.AndroidZunePush.registerToken(session.user.id, session.access_token);
    } catch (error) {
      console.warn("ZUNE native push sync:", error);
    }
  };
  supabase.auth.onAuthStateChange(() => {
    setTimeout(() => window.zuneSyncNativePush?.(), 0);
  });
  setTimeout(() => window.zuneSyncNativePush?.(), 800);
}
