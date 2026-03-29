
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ASSET_MAP: Record<string, { tvSymbol: string; label: string; category: string }> = {
  'EUR/USD': { tvSymbol: 'FX:EURUSD', label: 'EUR/USD', category: 'forex' },
  'GBP/USD': { tvSymbol: 'FX:GBPUSD', label: 'GBP/USD', category: 'forex' },
  'USD/JPY': { tvSymbol: 'FX:USDJPY', label: 'USD/JPY', category: 'forex' },
  'AUD/USD': { tvSymbol: 'FX:AUDUSD', label: 'AUD/USD', category: 'forex' },
  'USD/CAD': { tvSymbol: 'FX:USDCAD', label: 'USD/CAD', category: 'forex' },
  'NZD/USD': { tvSymbol: 'FX:NZDUSD', label: 'NZD/USD', category: 'forex' },
  'USD/CHF': { tvSymbol: 'FX:USDCHF', label: 'USD/CHF', category: 'forex' },
  'BTC/USD': { tvSymbol: 'BINANCE:BTCUSDT', label: 'BTC/USD', category: 'crypto' },
  'ETH/USD': { tvSymbol: 'BINANCE:ETHUSDT', label: 'ETH/USD', category: 'crypto' },
  'XRP/USD': { tvSymbol: 'BINANCE:XRPUSDT', label: 'XRP/USD', category: 'crypto' },
  'SOL/USD': { tvSymbol: 'BINANCE:SOLUSDT', label: 'SOL/USD', category: 'crypto' },
  'XAU/USD': { tvSymbol: 'TVC:GOLD', label: 'XAU/USD', category: 'commodities' },
  'XAG/USD': { tvSymbol: 'TVC:SILVER', label: 'XAG/USD', category: 'commodities' },
  'USOIL': { tvSymbol: 'TVC:USOIL', label: 'US Oil', category: 'commodities' },
  'US500': { tvSymbol: 'FOREXCOM:SPXUSD', label: 'S&P 500', category: 'indices' },
  'US30': { tvSymbol: 'FOREXCOM:DJI', label: 'Dow Jones', category: 'indices' },
  'NAS100': { tvSymbol: 'FOREXCOM:NSXUSD', label: 'Nasdaq 100', category: 'indices' },
};

const INTERVALS: Record<string, string> = {
  '1': '1m', '5': '5m', '15': '15m', '60': '1H', '240': '4H', 'D': '1D', 'W': '1W',
};

export function TradingViewChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [interval, setInterval] = useState('60');

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const asset = ASSET_MAP[selectedAsset] || ASSET_MAP['EUR/USD'];

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (containerRef.current && (window as any).TradingView) {
        new (window as any).TradingView.widget({
          container_id: containerRef.current.id,
          autosize: true,
          symbol: asset.tvSymbol,
          interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0a0a0a',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: true,
          studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'BB@tv-basicstudies'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [selectedAsset, interval]);

  const categories = ['forex', 'crypto', 'indices', 'commodities'];

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Live Chart</CardTitle>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <React.Fragment key={cat}>
                  <SelectItem value={`__header_${cat}`} disabled className="text-xs font-bold uppercase text-muted-foreground">
                    {cat}
                  </SelectItem>
                  {Object.entries(ASSET_MAP)
                    .filter(([, v]) => v.category === cat)
                    .map(([key, v]) => (
                      <SelectItem key={key} value={key}>{v.label}</SelectItem>
                    ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={interval} onValueChange={setInterval}>
            <TabsList className="bg-trading-bg border border-trading-border h-8">
              {Object.entries(INTERVALS).map(([val, label]) => (
                <TabsTrigger key={val} value={val} className="text-xs px-2 h-6">{label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[450px]">
        <div id="tradingview-chart" ref={containerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}
