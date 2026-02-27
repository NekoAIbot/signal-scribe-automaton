
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, AlertCircle, ChevronDown, ChevronUp, Newspaper } from "lucide-react";
import { useNews, NewsItem } from "@/services/newsService";

const ForexNewsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  const { data: newsItems = [], isLoading, error } = useNews();

  const filteredNews = newsItems.filter(item => {
    if (searchTerm === '') return true;
    return (
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Group news by date
  const groupByDate = (items: NewsItem[]) => {
    const groups: Record<string, NewsItem[]> = {};
    items.forEach(item => {
      const date = new Date(item.publishedAt);
      const key = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const grouped = groupByDate(filteredNews);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Forex News</h1>
        </div>
        <Badge variant="outline">{filteredNews.length} articles</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search news articles..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading news...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">Failed to load news</p>
          </CardContent>
        </Card>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No news found matching your search.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {dateLabel}
                </h2>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="space-y-3">
                {items.map((item, index) => {
                  const globalIndex = filteredNews.indexOf(item);
                  const isExpanded = expandedArticle === globalIndex;

                  return (
                    <Card
                      key={globalIndex}
                      className="cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setExpandedArticle(isExpanded ? null : globalIndex)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs shrink-0">
                                {item.source.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(item.publishedAt)} · {getRelativeTime(item.publishedAt)}
                              </span>
                            </div>
                            <h3 className="font-medium text-sm leading-tight mb-1">
                              {item.title}
                            </h3>
                            {!isExpanded && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border">
                            {item.urlToImage && !item.urlToImage.includes('placeholder') && (
                              <img
                                src={item.urlToImage}
                                alt={item.title}
                                className="w-full h-48 object-cover rounded-md mb-3"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                              {item.description}
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Source: {item.source.name}
                              </span>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                  Read full article →
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ForexNewsPage;
