import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mockNews = [
  {
    title: "Dollar rises after strong retail sales data",
    description: "The dollar rose on Wednesday after data showed U.S. retail sales increased more than expected in May.",
    url: "#",
    urlToImage: "https://via.placeholder.com/300x200",
    publishedAt: new Date().toISOString(),
    source: { name: "Financial Times" }
  },
  {
    title: "Euro falls as ECB signals rate cut",
    description: "The euro fell against major currencies after the European Central Bank signaled it could cut interest rates.",
    url: "#",
    urlToImage: "https://via.placeholder.com/300x200",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    source: { name: "Reuters" }
  },
  {
    title: "Forex market volatility at 3-month high",
    description: "Foreign exchange market volatility has reached a three-month high amid geopolitical tensions.",
    url: "#",
    urlToImage: "https://via.placeholder.com/300x200",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    source: { name: "Bloomberg" }
  }
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('NEWSAPI_KEY');
    
    // If no API key, return mock data
    if (!apiKey) {
      console.log("No NEWSAPI_KEY configured, returning mock data");
      return new Response(JSON.stringify({ articles: mockNews, source: 'mock' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://newsapi.org/v2/everything?q=forex+trading+finance&apiKey=${apiKey}&pageSize=10&language=en`;
    
    console.log("Fetching news from NewsAPI...");
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`NewsAPI error: ${response.status}`);
      return new Response(JSON.stringify({ articles: mockNews, source: 'mock', error: 'API error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    
    if (!data.articles || data.articles.length === 0) {
      console.warn("No articles from NewsAPI, returning mock data");
      return new Response(JSON.stringify({ articles: mockNews, source: 'mock' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Fetched ${data.articles.length} news articles`);
    return new Response(JSON.stringify({ articles: data.articles, source: 'newsapi' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return new Response(JSON.stringify({ articles: mockNews, source: 'mock', error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
