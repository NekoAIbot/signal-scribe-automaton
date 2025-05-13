
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Calendar, ExternalLink, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  relatedCurrencies: string[];
}

const ForexNewsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Mock news data fetch
  const fetchForexNews = async (): Promise<NewsItem[]> => {
    // In a real app, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        id: '1',
        title: 'Federal Reserve Holds Interest Rates Steady',
        summary: 'The Federal Reserve has decided to maintain interest rates at their current level citing steady economic growth and controlled inflation.',
        source: 'Financial Times',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        url: '#',
        impact: 'high',
        category: 'central-bank',
        relatedCurrencies: ['USD', 'EUR']
      },
      {
        id: '2',
        title: 'ECB Signals Potential Rate Cut in Upcoming Meeting',
        summary: 'European Central Bank officials have hinted at a possible interest rate reduction in their next policy meeting as economic indicators show slowing growth.',
        source: 'Bloomberg',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        url: '#',
        impact: 'high',
        category: 'central-bank',
        relatedCurrencies: ['EUR', 'GBP']
      },
      {
        id: '3',
        title: 'UK Inflation Falls to 2.4%, Below Expectations',
        summary: 'The latest inflation data from the UK shows a decrease to 2.4%, coming in below the expected 2.6% and bringing it closer to the Bank of England\'s target.',
        source: 'Reuters',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        url: '#',
        impact: 'medium',
        category: 'economic-data',
        relatedCurrencies: ['GBP', 'USD']
      },
      {
        id: '4',
        title: 'Japan Trade Deficit Widens as Export Growth Slows',
        summary: 'Japan\'s trade deficit expanded in the latest month as export growth slowed amid global economic uncertainties and supply chain disruptions.',
        source: 'Nikkei Asia',
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        url: '#',
        impact: 'medium',
        category: 'economic-data',
        relatedCurrencies: ['JPY', 'USD']
      },
      {
        id: '5',
        title: 'Australian Unemployment Rate Drops to 3.8%',
        summary: 'Australia\'s labor market showed unexpected strength with unemployment falling to 3.8%, beating analyst forecasts of 4.0%.',
        source: 'ABC News',
        publishedAt: new Date(Date.now() - 259200000).toISOString(),
        url: '#',
        impact: 'medium',
        category: 'economic-data',
        relatedCurrencies: ['AUD', 'USD']
      },
      {
        id: '6',
        title: 'OPEC+ Announces Production Cuts, Oil Prices Surge',
        summary: 'OPEC and its allies have agreed to reduce oil production by 1 million barrels per day, leading to a significant increase in global oil prices.',
        source: 'CNBC',
        publishedAt: new Date(Date.now() - 345600000).toISOString(),
        url: '#',
        impact: 'high',
        category: 'commodities',
        relatedCurrencies: ['USD', 'CAD', 'NOK']
      },
      {
        id: '7',
        title: 'IMF Revises Global Growth Forecast Downward',
        summary: 'The International Monetary Fund has lowered its global economic growth forecast for the year, citing persistent inflation and tighter monetary policy.',
        source: 'Wall Street Journal',
        publishedAt: new Date(Date.now() - 432000000).toISOString(),
        url: '#',
        impact: 'medium',
        category: 'global-economy',
        relatedCurrencies: ['USD', 'EUR', 'JPY', 'GBP']
      },
      {
        id: '8',
        title: 'New Trade Agreement Between US and EU in Final Stages',
        summary: 'Negotiators from the United States and European Union report they are in the final stages of reaching a new trade agreement that would reduce tariffs on certain goods.',
        source: 'Politico',
        publishedAt: new Date(Date.now() - 518400000).toISOString(),
        url: '#',
        impact: 'medium',
        category: 'geopolitics',
        relatedCurrencies: ['EUR', 'USD']
      },
      {
        id: '9',
        title: 'COVID-19 Resurgence in Asia Threatens Supply Chains',
        summary: 'A new wave of COVID-19 cases in parts of Asia is raising concerns about potential disruptions to global supply chains and manufacturing.',
        source: 'South China Morning Post',
        publishedAt: new Date(Date.now() - 604800000).toISOString(),
        url: '#',
        impact: 'high',
        category: 'health',
        relatedCurrencies: ['CNY', 'JPY', 'KRW']
      },
      {
        id: '10',
        title: 'Gold Prices Hit Six-Month High Amid Global Uncertainty',
        summary: 'Gold prices have surged to their highest level in six months as investors seek safe-haven assets amid economic and geopolitical uncertainties.',
        source: 'Market Watch',
        publishedAt: new Date(Date.now() - 691200000).toISOString(),
        url: '#',
        impact: 'low',
        category: 'commodities',
        relatedCurrencies: ['USD', 'AUD']
      }
    ];
  };

  // Query for news data
  const { data: newsItems = [], isLoading, error } = useQuery({
    queryKey: ['forexNews'],
    queryFn: fetchForexNews,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter news based on search term and filters
  const filteredNews = newsItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.relatedCurrencies.some(currency => currency.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesImpact = impactFilter === 'all' || item.impact === impactFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesImpact && matchesCategory;
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Get impact badge color
  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return "bg-danger-DEFAULT text-white";
      case 'medium': return "bg-warning-DEFAULT text-white";
      case 'low': return "bg-success-DEFAULT text-white";
      default: return "bg-secondary";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Forex News</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search news..."
            className="pl-8 bg-trading-bg border-trading-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={impactFilter} onValueChange={setImpactFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-trading-bg border-trading-border">
              <SelectValue placeholder="Impact" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Impact</SelectItem>
              <SelectItem value="high">High Impact</SelectItem>
              <SelectItem value="medium">Medium Impact</SelectItem>
              <SelectItem value="low">Low Impact</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-trading-bg border-trading-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="central-bank">Central Bank</SelectItem>
              <SelectItem value="economic-data">Economic Data</SelectItem>
              <SelectItem value="geopolitics">Geopolitics</SelectItem>
              <SelectItem value="commodities">Commodities</SelectItem>
              <SelectItem value="global-economy">Global Economy</SelectItem>
              <SelectItem value="health">Health</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading news...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 mr-2 text-danger-DEFAULT" />
            <p className="text-danger-DEFAULT">Failed to load news</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNews.length > 0 ? (
              filteredNews.map((item) => (
                <Card key={item.id} className="bg-trading-card border-trading-border hover:border-trading-border-hover transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 flex-grow">
                        <Badge className={getImpactBadge(item.impact)}>
                          {item.impact.charAt(0).toUpperCase() + item.impact.slice(1)} Impact
                        </Badge>
                        <CardTitle className="text-base mt-1">{item.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-muted-foreground">{formatDate(item.publishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.source}</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.relatedCurrencies.map((currency) => (
                        <Badge key={currency} variant="outline" className="bg-trading-bg text-xs">
                          {currency}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="md:col-span-2">
                <CardContent className="p-6 flex items-center justify-center">
                  <p className="text-muted-foreground">No news found matching your criteria.</p>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="text-center text-sm text-muted-foreground pt-4 pb-8">
            Showing {filteredNews.length} of {newsItems.length} news items
          </div>
        </>
      )}
    </div>
  );
};

export default ForexNewsPage;
