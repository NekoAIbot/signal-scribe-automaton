import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('NEWSAPI_KEY');
    
    // If no API key, fail explicitly (no mock fallback)
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'NEWSAPI_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
    const url = `https://newsapi.org/v2/everything?q=forex OR currency OR central bank&from=${encodeURIComponent(from)}&sortBy=publishedAt&apiKey=${apiKey}&pageSize=20&language=en`;
    
    console.log("Fetching news from NewsAPI...");
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`NewsAPI error: ${response.status}`, errorBody);
      return new Response(JSON.stringify({ error: `News API error ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    
    if (!data.articles || data.articles.length === 0) {
      return new Response(JSON.stringify({ articles: [], source: 'newsapi' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Fetched ${data.articles.length} news articles`);
    return new Response(JSON.stringify({ articles: data.articles, source: 'newsapi' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
