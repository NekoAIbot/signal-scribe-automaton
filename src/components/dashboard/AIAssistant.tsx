
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Bot, User, RefreshCcw } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI trading assistant. Ask me about signals, market conditions, or trading decisions.",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // In a production app, this would call an AI service
    // For this demo, we'll simulate an AI response
    setTimeout(() => {
      const botResponses: { [key: string]: string } = {
        'signal': "The latest signal for EUR/USD is a BUY with 72% confidence. This is based on the recent bullish momentum and positive sentiment from central bank announcements.",
        'market': "Current market conditions show moderate volatility across forex pairs. The EUR/USD has broken a key resistance level with strong volume, suggesting potential for continued upward movement.",
        'risk': "Based on your risk profile, I recommend limiting position sizes to 2% of your account. Current market volatility suggests using wider stop losses than usual.",
        'why': "The recent trade failed because the stop loss was hit during an unexpected news announcement that caused a temporary spike in volatility. The technical factors were actually sound.",
        'strategy': "Your current strategy is performing well with a 68% win rate over the past month. The ML model is adapting to recent market conditions successfully."
      };
      
      // Determine which response to use based on keywords in the user's message
      let responseContent = "I don't have enough information to answer that question yet. As you use the trading platform more, I'll learn and provide more personalized assistance.";
      
      const lowercaseInput = input.toLowerCase();
      for (const [keyword, response] of Object.entries(botResponses)) {
        if (lowercaseInput.includes(keyword)) {
          responseContent = response;
          break;
        }
      }
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  // Handle pressing Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-trading-border">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-medium">AI Trading Assistant</CardTitle>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
          <Sparkles className="h-3 w-3 mr-1" /> Beta
        </Badge>
      </CardHeader>
      
      <CardContent className="p-0 flex-grow flex flex-col overflow-hidden">
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 border border-primary/10">
                    {message.sender === 'bot' ? (
                      <>
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-muted">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  
                  <div 
                    className={`rounded-lg px-3 py-2 text-sm ${
                      message.sender === 'bot' 
                        ? 'bg-trading-bg border border-trading-border' 
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t border-trading-border">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about signals, market analysis, or trades..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-grow bg-trading-bg border-trading-border"
            />
            <Button 
              size="icon" 
              disabled={!input.trim() || isLoading}
              onClick={handleSendMessage}
            >
              {isLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
