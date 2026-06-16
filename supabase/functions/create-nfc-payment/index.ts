
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portfolioId, quantity = 1 } = await req.json();
    
    if (!portfolioId) {
      throw new Error("Portfolio ID is required");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Verify portfolio ownership
    const { data: portfolio, error: portfolioError } = await supabaseClient
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', user.id)
      .single();

    if (portfolioError || !portfolio) {
      throw new Error("Portfolio not found or access denied");
    }

    // Generate unique card UID
    const cardUid = `NFC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate total amount (30,000 FCFA per card)
    const totalAmount = quantity * 30000;

    // Create NFC card order
    const { data: order, error: orderError } = await supabaseClient
      .from('nfc_cards')
      .insert([{
        user_id: user.id,
        portfolio_id: portfolioId,
        card_uid: cardUid,
        is_active: false,
        ordered_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // For now, we'll simulate a payment success
    // In a real scenario, you would integrate with a payment provider like:
    // - Orange Money API
    // - MTN Mobile Money API
    // - Visa/Mastercard processing
    
    console.log(`NFC Card order created: ${order.id} for ${totalAmount} FCFA`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        cardUid: order.card_uid,
        amount: totalAmount,
        currency: "FCFA",
        message: `Commande de ${quantity} carte(s) NFC créée avec succès. Montant: ${totalAmount.toLocaleString()} FCFA`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error creating NFC payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Une erreur est survenue lors de la création de la commande" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
