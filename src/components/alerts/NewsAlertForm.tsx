
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createNewsAlert, NewsAlertParams } from "@/services/notificationService";

export function NewsAlertForm() {
  const [alertParams, setAlertParams] = useState<NewsAlertParams>({
    keywords: [],
    importance: 'medium',
    sources: []
  });
  
  const [keywordInput, setKeywordInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const newsSources = [
    'Bloomberg', 'Reuters', 'Financial Times', 'Wall Street Journal',
    'CNBC', 'MarketWatch', 'The Economist', 'Forex Factory'
  ];
  
  const handleImportanceChange = (value: string) => {
    setAlertParams({
      ...alertParams,
      importance: value as 'low' | 'medium' | 'high'
    });
  };
  
  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    if (alertParams.keywords.includes(keywordInput.trim())) {
      toast.error("Keyword already added");
      return;
    }
    
    setAlertParams({
      ...alertParams,
      keywords: [...alertParams.keywords, keywordInput.trim()]
    });
    setKeywordInput('');
  };
  
  const removeKeyword = (keyword: string) => {
    setAlertParams({
      ...alertParams,
      keywords: alertParams.keywords.filter(k => k !== keyword)
    });
  };
  
  const addSource = (source: string) => {
    if (alertParams.sources?.includes(source)) {
      // Remove source if already selected
      setAlertParams({
        ...alertParams,
        sources: alertParams.sources.filter(s => s !== source)
      });
    } else {
      // Add source if not already selected
      setAlertParams({
        ...alertParams,
        sources: [...(alertParams.sources || []), source]
      });
    }
  };
  
  const handleAddCustomSource = () => {
    if (!sourceInput.trim()) return;
    if (alertParams.sources?.includes(sourceInput.trim())) {
      toast.error("Source already added");
      return;
    }
    
    setAlertParams({
      ...alertParams,
      sources: [...(alertParams.sources || []), sourceInput.trim()]
    });
    setSourceInput('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (alertParams.keywords.length === 0) {
      toast.error("Please add at least one keyword");
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await createNewsAlert(alertParams);
      
      if (success) {
        toast.success(`News alert created for keywords: ${alertParams.keywords.join(', ')}`);
        // Reset form
        setAlertParams({
          keywords: [],
          importance: 'medium',
          sources: []
        });
      }
    } catch (error) {
      toast.error("Failed to create alert");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create News Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Keywords</Label>
            <div className="flex space-x-2">
              <Input 
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add keyword or phrase"
              />
              <Button type="button" onClick={addKeyword}>Add</Button>
            </div>
            
            {alertParams.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {alertParams.keywords.map(keyword => (
                  <Badge 
                    key={keyword} 
                    variant="secondary"
                    className="flex items-center gap-1 py-1"
                  >
                    {keyword}
                    <button 
                      type="button" 
                      onClick={() => removeKeyword(keyword)}
                      className="text-red-500 hover:text-red-700 font-bold ml-1"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {alertParams.keywords.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add keywords like "Fed Rate", "NFP", "GDP" to get alerts
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="importance">Alert Importance</Label>
            <Select
              value={alertParams.importance}
              onValueChange={handleImportanceChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>News Sources</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {newsSources.map(source => (
                <Button
                  key={source}
                  type="button"
                  variant={alertParams.sources?.includes(source) ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => addSource(source)}
                >
                  {source}
                </Button>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Input 
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                placeholder="Add custom source"
              />
              <Button type="button" onClick={handleAddCustomSource}>Add</Button>
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Alert...' : 'Create News Alert'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
