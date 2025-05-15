
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_CONFIG = {
  SMTP_SERVER: 'smtp.gmail.com',
  EMAIL_FROM: 'ahow0166@gmail.com',
  SMTP_PORT: 587
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { email, verificationCode, template = 'verification' } = await req.json();
    
    if (!email || !verificationCode) {
      throw new Error('Email and verification code are required');
    }
    
    console.log(`Sending ${template} email to ${email}`);
    
    // Create email content based on template
    let subject, htmlContent;
    
    if (template === 'verification') {
      subject = 'Your Trading Platform Verification Code';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Welcome to Trading Platform!</h2>
          <p>Thank you for registering. To complete your registration, please use the verification code below:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 3px;">
            <strong>${verificationCode}</strong>
          </div>
          <p>This code will expire in 30 minutes. If you did not request this code, please ignore this email.</p>
          <p>Best regards,<br>The Trading Platform Team</p>
        </div>
      `;
    } else if (template === 'login') {
      subject = 'Your Trading Platform Login Code';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Login Verification</h2>
          <p>To complete your login, please use the verification code below:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 3px;">
            <strong>${verificationCode}</strong>
          </div>
          <p>This code will expire in 30 minutes. If you did not request this code, please ignore this email.</p>
          <p>Best regards,<br>The Trading Platform Team</p>
        </div>
      `;
    } else {
      throw new Error('Invalid email template');
    }
    
    // Construct email parameters
    const emailParams = new URLSearchParams({
      to: email,
      subject: subject,
      html: htmlContent,
      from: EMAIL_CONFIG.EMAIL_FROM
    });
    
    // Use an email service - this is using ElasticEmail as an example
    // In production, you should use a proper email service like SendGrid, Mailgun, etc.
    const emailApiKey = Deno.env.get('EMAIL_API_KEY');
    if (!emailApiKey) {
      throw new Error('EMAIL_API_KEY is not configured');
    }
    
    // Send email using ElasticEmail API
    const emailResponse = await fetch('https://api.elasticemail.com/v2/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: emailParams.toString() + `&apikey=${emailApiKey}`
    });
    
    const emailResult = await emailResponse.json();
    
    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.error}`);
    }
    
    console.log(`Email sent successfully to ${email}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Verification email sent to ${email}`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      },
    );
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
