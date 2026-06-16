
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  portfolioOwnerEmail: string;
  portfolioOwnerName: string;
  visitorEmail: string;
  visitorName: string;
  portfolioTitle: string;
  portfolioSlug: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      portfolioOwnerEmail, 
      portfolioOwnerName, 
      visitorEmail, 
      visitorName, 
      portfolioTitle, 
      portfolioSlug 
    }: ContactEmailRequest = await req.json();

    // Email au propriétaire du portfolio
    const ownerEmailResponse = await resend.emails.send({
      from: "V-Card NFC <diankaseydou52@gmail.com>",
      to: [portfolioOwnerEmail],
      subject: `Nouveau contact sauvegardé pour votre portfolio ${portfolioTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28A745;">Nouveau contact sauvegardé ! 🎉</h2>
          <p>Bonjour ${portfolioOwnerName},</p>
          <p>Une nouvelle personne a sauvegardé vos informations de contact depuis votre portfolio <strong>${portfolioTitle}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Informations du contact :</h3>
            <p><strong>Nom :</strong> ${visitorName}</p>
            <p><strong>Email :</strong> ${visitorEmail}</p>
            <p><strong>Portfolio consulté :</strong> ${portfolioTitle}</p>
            <p><strong>URL :</strong> https://v-card-nfc.lovable.app/portfolio/${portfolioSlug}</p>
          </div>

          <p>Vous pouvez maintenant contacter cette personne directement à l'adresse : <a href="mailto:${visitorEmail}">${visitorEmail}</a></p>
          
          <p>Cordialement,<br>L'équipe V-Card NFC</p>
        </div>
      `,
    });

    // Email de confirmation au visiteur
    const visitorEmailResponse = await resend.emails.send({
      from: "V-Card NFC <diankaseydou52@gmail.com>",
      to: [visitorEmail],
      subject: `Contact sauvegardé - ${portfolioTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28A745;">Contact sauvegardé avec succès ! ✅</h2>
          <p>Bonjour ${visitorName},</p>
          <p>Vous avez sauvegardé les informations de contact de <strong>${portfolioOwnerName}</strong> depuis son portfolio <strong>${portfolioTitle}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Informations sauvegardées :</h3>
            <p><strong>Nom :</strong> ${portfolioOwnerName}</p>
            <p><strong>Email :</strong> ${portfolioOwnerEmail}</p>
            <p><strong>Portfolio :</strong> <a href="https://v-card-nfc.lovable.app/portfolio/${portfolioSlug}">${portfolioTitle}</a></p>
          </div>

          <p>${portfolioOwnerName} a été notifié(e) que vous avez sauvegardé ses informations de contact.</p>
          
          <p>Merci d'utiliser V-Card NFC !<br>L'équipe V-Card NFC</p>
        </div>
      `,
    });

    console.log("Emails envoyés avec succès:", { ownerEmailResponse, visitorEmailResponse });

    return new Response(JSON.stringify({ 
      success: true, 
      ownerEmailId: ownerEmailResponse.data?.id,
      visitorEmailId: visitorEmailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi des emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
