
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Calendar, ExternalLink, AlertCircle } from "lucide-react";
import { useNews } from "@/services/newsService";

const ForexNewsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Query for news data
  const { data: newsItems = [], isLoading, error } = useNews();

  // Filter news based on search term and filters
  const filteredNews = newsItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Since we've changed data source, adapt the filtering
    const matchesImpact = true; // No impact field in newsService data
    const matchesCategory = true; // No category field in newsService data
    
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
              filteredNews.map((item, index) => (
                <Card key={index} className="bg-trading-card border-trading-border hover:border-trading-border-hover transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 flex-grow">
                        <CardTitle className="text-base mt-1">{item.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-muted-foreground">{formatDate(item.publishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.source.name}</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
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
