
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bot Settings</h1>
      
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-trading-bg border border-trading-border">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="trading">Trading Strategy</TabsTrigger>
          <TabsTrigger value="connection">Connections</TabsTrigger>
          <TabsTrigger value="ml">Machine Learning</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">General Settings</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bot-name">Bot Name</Label>
                    <Input 
                      id="bot-name"
                      defaultValue="Advanced Trading Bot"
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="default-pair">Default Trading Pair</Label>
                    <Select defaultValue="EURUSD">
                      <SelectTrigger 
                        id="default-pair"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select trading pair" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EURUSD">EUR/USD</SelectItem>
                        <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                        <SelectItem value="USDJPY">USD/JPY</SelectItem>
                        <SelectItem value="AUDUSD">AUD/USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeframe">Default Timeframe</Label>
                    <Select defaultValue="H1">
                      <SelectTrigger 
                        id="timeframe"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M5">5 Minutes</SelectItem>
                        <SelectItem value="M15">15 Minutes</SelectItem>
                        <SelectItem value="H1">1 Hour</SelectItem>
                        <SelectItem value="H4">4 Hours</SelectItem>
                        <SelectItem value="D1">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Automatic Trading</h4>
                      <p className="text-xs text-muted-foreground">
                        Enable automatic trade execution
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Telegram Notifications</h4>
                      <p className="text-xs text-muted-foreground">
                        Send signals to Telegram
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Run in Background</h4>
                      <p className="text-xs text-muted-foreground">
                        Keep bot running when browser is closed
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Dark Mode</h4>
                      <p className="text-xs text-muted-foreground">
                        Use dark theme for interface
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-end space-x-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trading">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Trading Strategy Settings</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="strategy-type">Strategy Type</Label>
                    <Select defaultValue="sma">
                      <SelectTrigger 
                        id="strategy-type"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sma">SMA Crossover</SelectItem>
                        <SelectItem value="rsi">RSI Strategy</SelectItem>
                        <SelectItem value="macd">MACD Strategy</SelectItem>
                        <SelectItem value="bollinger">Bollinger Bands</SelectItem>
                        <SelectItem value="ml">ML-Enhanced Strategy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fast SMA Period</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        defaultValue={[20]}
                        max={50}
                        min={5}
                        step={1}
                        className="flex-1"
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        20
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Slow SMA Period</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        defaultValue={[50]}
                        max={200}
                        min={20}
                        step={5}
                        className="flex-1"
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        50
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmation-indicator">Confirmation Indicator</Label>
                    <Select defaultValue="rsi">
                      <SelectTrigger 
                        id="confirmation-indicator"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select indicator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="rsi">RSI</SelectItem>
                        <SelectItem value="macd">MACD</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Risk per Trade (% of Balance)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        defaultValue={[2]}
                        max={10}
                        min={0.1}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        2%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Stop Loss (pips)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        defaultValue={[30]}
                        max={100}
                        min={5}
                        step={5}
                        className="flex-1"
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        30
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Take Profit (pips)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        defaultValue={[60]}
                        max={200}
                        min={10}
                        step={5}
                        className="flex-1"
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        60
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Enable Trailing Stop</h4>
                      <p className="text-xs text-muted-foreground">
                        Dynamically adjust stop loss as trade moves in profit
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-end space-x-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Strategy</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="connection">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Connection Settings</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mt5-server">MT5 Server</Label>
                    <Input 
                      id="mt5-server"
                      placeholder="broker-mt5-server.com:443"
                      defaultValue="demo.mt5broker.com:443"
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input 
                      id="account-number"
                      placeholder="12345678"
                      defaultValue="87654321"
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      defaultValue="password123"
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input 
                      id="api-key"
                      placeholder="YOUR_API_KEY"
                      defaultValue="api_5f3e98d2c7b81"
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telegram-token">Telegram Bot Token</Label>
                  <Input 
                    id="telegram-token"
                    placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                    defaultValue="5289121450:AAGf2RmXMh8yx1GQYt-abcdefghijklm"
                    className="bg-trading-bg border-trading-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chat-id">Telegram Chat ID</Label>
                  <Input 
                    id="chat-id"
                    placeholder="-1001234567890"
                    defaultValue="-1009876543210"
                    className="bg-trading-bg border-trading-border"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Test Mode</h4>
                    <p className="text-xs text-muted-foreground">
                      Run in test mode (no real trades)
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Secure Connection</h4>
                    <p className="text-xs text-muted-foreground">
                      Use encrypted connection to broker
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-between">
                <Button variant="outline" className="bg-info-DEFAULT/10 text-info-DEFAULT border-info-DEFAULT">
                  Test Connection
                </Button>
                <Button>Save Connections</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ml">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Machine Learning Settings</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ml-model">ML Model Type</Label>
                    <Select defaultValue="random-forest">
                      <SelectTrigger 
                        id="ml-model"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select ML model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random-forest">Random Forest</SelectItem>
                        <SelectItem value="neural-network">Neural Network</SelectItem>
                        <SelectItem value="xgboost">XGBoost</SelectItem>
                        <SelectItem value="lstm">LSTM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="training-period">Training Period</Label>
                    <Select defaultValue="6months">
                      <SelectTrigger 
                        id="training-period"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1month">1 Month</SelectItem>
                        <SelectItem value="3months">3 Months</SelectItem>
                        <SelectItem value="6months">6 Months</SelectItem>
                        <SelectItem value="1year">1 Year</SelectItem>
                        <SelectItem value="all">All Available Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Prediction Threshold (%)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        defaultValue={[75]}
                        max={95}
                        min={50}
                        step={5}
                        className="flex-1"
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        75%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">ML-Enhanced Trading</h4>
                      <p className="text-xs text-muted-foreground">
                        Use ML models to enhance trading decisions
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="retraining-frequency">Retraining Frequency</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger 
                        id="retraining-frequency"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="manual">Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="feature-importance">Feature Selection</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger 
                        id="feature-importance"
                        className="bg-trading-bg border-trading-border"
                      >
                        <SelectValue placeholder="Select approach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automatic</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Test/Train Split (%)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        defaultValue={[80]}
                        max={95}
                        min={50}
                        step={5}
                        className="flex-1"
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        80%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Automatic Retraining</h4>
                      <p className="text-xs text-muted-foreground">
                        Auto-retrain when accuracy drops
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border">
                <h4 className="text-sm font-medium mb-2">Technical Indicators for ML Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">SMA (Multiple)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">RSI</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">MACD</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Bollinger Bands</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Volume</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch />
                    <span className="text-sm">Stochastic</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">ATR</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch />
                    <span className="text-sm">Ichimoku</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-between">
                <Button variant="outline" className="bg-warning-DEFAULT/10 text-warning-DEFAULT border-warning-DEFAULT">
                  Force Retrain
                </Button>
                <Button>Save ML Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
