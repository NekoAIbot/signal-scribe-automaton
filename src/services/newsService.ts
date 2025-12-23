import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

const mockNews: NewsItem[] = [
  {
    title: "Dollar rises after strong retail sales data",
    description: "The dollar rose on Wednesday after data showed U.S. retail sales increased more than expected in May, suggesting the economy remained on solid footing despite higher interest rates.",
    url: "#",
    urlToImage: "https://via.placeholder.com/300x200",
    publishedAt: new Date().toISOString(),
    source: { name: "Financial Times" }
  },
  {
    title: "Euro falls as ECB signals rate cut",
    description: "The euro fell against major currencies after the European Central Bank signaled it could cut interest rates in the coming months.",
    url: "#",
    urlToImage: "https://via.placeholder.com/300x200",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    source: { name: "Reuters" }
  },
  {
    title: "Forex market volatility at 3-month high",
    description: "Foreign exchange market volatility has reached a three-month high amid geopolitical tensions and diverging monetary policy paths.",
    url: "#",
    urlToImage: "https://via.placeholder.com/300x200",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    source: { name: "Bloomberg" }
  }
];

const fetchNews = async (): Promise<NewsItem[]> => {
  try {
    console.log("Fetching news via edge function...");
    
    const { data, error } = await supabase.functions.invoke('fetch-news');
    
    if (error) {
      console.error("Edge function error:", error);
      return mockNews;
    }
    
    if (data?.articles && Array.isArray(data.articles) && data.articles.length > 0) {
      console.log(`Fetched ${data.articles.length} news articles from ${data.source}`);
      return data.articles;
    }
    
    console.warn("No articles found, using mock data");
    return mockNews;
  } catch (error) {
    console.error("Error fetching news:", error);
    toast.error("Failed to fetch news. Using fallback data.");
    return mockNews;
  }
};

export const useNews = () => {
  return useQuery({
    queryKey: ['news'],
    queryFn: fetchNews,
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false
  });
};
