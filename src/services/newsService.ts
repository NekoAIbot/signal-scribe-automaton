
import { useQuery } from "@tanstack/react-query";
import { API_KEYS } from "@/config/apiConfig";
import { toast } from "sonner";

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
    const apiKey = API_KEYS.NEWSAPI_KEY;
    
    // If no API key is available, return mock data
    if (!apiKey || apiKey === 'YOUR_NEWS_API_KEY') {
      console.log("No NewsAPI key found, using mock data");
      return mockNews;
    }
    
    const url = `https://newsapi.org/v2/everything?q=forex+trading+finance&apiKey=${apiKey}&pageSize=10&language=en`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if articles array exists
    if (!data.articles || !Array.isArray(data.articles) || data.articles.length === 0) {
      console.warn("No articles found in API response, using mock data");
      return mockNews;
    }
    
    return data.articles;
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
