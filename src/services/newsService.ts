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

const fetchNews = async (): Promise<NewsItem[]> => {
  try {
    console.log("Fetching news via edge function...");
    
    const { data, error } = await supabase.functions.invoke('fetch-news');
    
    if (error) {
      throw new Error(error.message || 'Failed to fetch news');
    }
    
    if (data?.articles && Array.isArray(data.articles) && data.articles.length > 0) {
      console.log(`Fetched ${data.articles.length} news articles from ${data.source}`);
      return data.articles;
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching news:", error);
    toast.error(`Failed to fetch news: ${(error as Error).message}`);
    return [];
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
