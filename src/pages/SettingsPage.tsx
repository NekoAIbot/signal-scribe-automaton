import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { sendTelegramNotification } from '@/services/notificationService';
import { API_KEYS } from '@/config/apiConfig';

const SettingsPage = () => {
  const [botName, setBotName] = useState("Advanced Trading Bot");
  const [defaultPair, setDefaultPair] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("H1");
  const [automaticTrading, setAutomaticTrading] = useState(true);
  const [telegramNotifications, setTelegramNotifications] = useState(true);
  const [runInBackground, setRunInBackground] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  
  const [strategyType, setStrategyType] = useState("sma");
  const [fastSMA, setFastSMA] = useState(20);
  const [slowSMA, setSlowSMA] = useState(50);
  const [confirmationIndicator, setConfirmationIndicator] = useState("rsi");
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [stopLoss, setStopLoss] = useState(30);
  const [takeProfit, setTakeProfit] = useState(60);
  const [trailingStop, setTrailingStop] = useState(true);
  
  const [mt5Server, setMt5Server] = useState(API_KEYS.MT5_SERVER);
  const [accountNumber, setAccountNumber] = useState(API_KEYS.MT5_LOGIN);
  const [password, setPassword] = useState(API_KEYS.MT5_PASSWORD);
  const [apiKey, setApiKey] = useState("api_5f3e98d2c7b81");
  const [telegramToken, setTelegramToken] = useState(API_KEYS.TELEGRAM_BOT_TOKEN);
  const [chatId, setChatId] = useState(API_KEYS.TELEGRAM_CHAT_ID);
  const [testMode, setTestMode] = useState(true);
  const [secureConnection, setSecureConnection] = useState(true);
  
  const [mlModel, setMlModel] = useState("random-forest");
  const [trainingPeriod, setTrainingPeriod] = useState("6months");
  const [predictionThreshold, setPredictionThreshold] = useState(75);
  const [mlEnhanced, setMlEnhanced] = useState(true);
  const [retrainingFrequency, setRetrainingFrequency] = useState("daily");
  const [featureSelection, setFeatureSelection] = useState("auto");
  const [testTrainSplit, setTestTrainSplit] = useState(80);
  const [autoRetrain, setAutoRetrain] = useState(true);
  
  const [mlFeatures, setMlFeatures] = useState({
    sma: true,
    rsi: true,
    macd: true,
    bollinger: true,
    volume: true,
    stochastic: false,
    atr: true,
    ichimoku: false
  });
  
  const handleResetGeneralDefaults = () => {
    setBotName("Advanced Trading Bot");
    setDefaultPair("EURUSD");
    setTimeframe("H1");
    setAutomaticTrading(true);
    setTelegramNotifications(true);
    setRunInBackground(true);
    setDarkMode(true);
    toast.success("General settings reset to defaults");
  };
  
  const handleSaveGeneralChanges = () => {
    toast.success("General settings saved successfully");
  };
  
  const handleResetStrategyDefaults = () => {
    setStrategyType("sma");
    setFastSMA(20);
    setSlowSMA(50);
    setConfirmationIndicator("rsi");
    setRiskPerTrade(2);
    setStopLoss(30);
    setTakeProfit(60);
    setTrailingStop(true);
    toast.success("Strategy settings reset to defaults");
  };
  
  const handleSaveStrategy = () => {
    toast.success("Strategy settings saved successfully");
  };
  
  const handleTestConnection = async () => {
    toast.loading("Testing connection...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.2;
    
    if (success) {
      toast.success("Connection successful!");
    } else {
      toast.error("Connection failed. Please check your credentials.");
    }
  };
  
  const handleSaveConnections = async () => {
    toast.loading("Saving connection settings...");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Connection settings saved successfully");
    
    if (telegramNotifications) {
      try {
        await sendTelegramNotification("✅ Trading Bot connection settings updated successfully!");
      } catch (error) {
        console.error("Failed to send Telegram notification", error);
      }
    }
  };
  
  const handleForceRetrain = () => {
    toast.loading("Starting model retraining...");
    
    setTimeout(() => {
      toast.success("Model retraining completed successfully");
    }, 3000);
  };
  
  const handleSaveMlSettings = () => {
    toast.success("Machine learning settings saved successfully");
  };
  
  const toggleMlFeature = (feature: keyof typeof mlFeatures) => {
    setMlFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

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
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="default-pair">Default Trading Pair</Label>
                    <Select value={defaultPair} onValueChange={setDefaultPair}>
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
                    <Select value={timeframe} onValueChange={setTimeframe}>
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
                    <Switch checked={automaticTrading} onCheckedChange={setAutomaticTrading} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Telegram Notifications</h4>
                      <p className="text-xs text-muted-foreground">
                        Send signals to Telegram
                      </p>
                    </div>
                    <Switch checked={telegramNotifications} onCheckedChange={setTelegramNotifications} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Run in Background</h4>
                      <p className="text-xs text-muted-foreground">
                        Keep bot running when browser is closed
                      </p>
                    </div>
                    <Switch checked={runInBackground} onCheckedChange={setRunInBackground} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Dark Mode</h4>
                      <p className="text-xs text-muted-foreground">
                        Use dark theme for interface
                      </p>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-end space-x-2">
                <Button variant="outline" onClick={handleResetGeneralDefaults}>Reset to Defaults</Button>
                <Button onClick={handleSaveGeneralChanges}>Save Changes</Button>
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
                    <Select value={strategyType} onValueChange={setStrategyType}>
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
                        value={[fastSMA]}
                        max={50}
                        min={5}
                        step={1}
                        className="flex-1"
                        onValueChange={(value) => setFastSMA(value[0])}
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        {fastSMA}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Slow SMA Period</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        value={[slowSMA]}
                        max={200}
                        min={20}
                        step={5}
                        className="flex-1"
                        onValueChange={(value) => setSlowSMA(value[0])}
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        {slowSMA}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmation-indicator">Confirmation Indicator</Label>
                    <Select value={confirmationIndicator} onValueChange={setConfirmationIndicator}>
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
                        value={[riskPerTrade]}
                        max={10}
                        min={0.1}
                        step={0.1}
                        className="flex-1"
                        onValueChange={(value) => setRiskPerTrade(value[0])}
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        {riskPerTrade}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Stop Loss (pips)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        value={[stopLoss]}
                        max={100}
                        min={5}
                        step={5}
                        className="flex-1"
                        onValueChange={(value) => setStopLoss(value[0])}
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        {stopLoss}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Take Profit (pips)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        value={[takeProfit]}
                        max={200}
                        min={10}
                        step={5}
                        className="flex-1"
                        onValueChange={(value) => setTakeProfit(value[0])}
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        {takeProfit}
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
                    <Switch checked={trailingStop} onCheckedChange={setTrailingStop} />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-end space-x-2">
                <Button variant="outline" onClick={handleResetStrategyDefaults}>Reset to Defaults</Button>
                <Button onClick={handleSaveStrategy}>Save Strategy</Button>
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
                      value={mt5Server}
                      onChange={(e) => setMt5Server(e.target.value)}
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input 
                      id="account-number"
                      placeholder="12345678"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input 
                      id="api-key"
                      placeholder="YOUR_API_KEY"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="bg-trading-bg border-trading-border"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telegram-token">Telegram Bot Token</Label>
                  <Input 
                    id="telegram-token"
                    placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="bg-trading-bg border-trading-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chat-id">Telegram Chat ID</Label>
                  <Input 
                    id="chat-id"
                    placeholder="-1001234567890"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
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
                  <Switch checked={testMode} onCheckedChange={setTestMode} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Secure Connection</h4>
                    <p className="text-xs text-muted-foreground">
                      Use encrypted connection to broker
                    </p>
                  </div>
                  <Switch checked={secureConnection} onCheckedChange={setSecureConnection} />
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-between">
                <Button 
                  variant="outline" 
                  className="bg-info-DEFAULT/10 text-info-DEFAULT border-info-DEFAULT"
                  onClick={handleTestConnection}
                >
                  Test Connection
                </Button>
                <Button onClick={handleSaveConnections}>Save Connections</Button>
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
                    <Select value={mlModel} onValueChange={setMlModel}>
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
                    <Select value={trainingPeriod} onValueChange={setTrainingPeriod}>
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
                        value={[predictionThreshold]}
                        max={95}
                        min={50}
                        step={5}
                        className="flex-1"
                        onValueChange={(value) => setPredictionThreshold(value[0])}
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        {predictionThreshold}%
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
                    <Switch checked={mlEnhanced} onCheckedChange={setMlEnhanced} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="retraining-frequency">Retraining Frequency</Label>
                    <Select value={retrainingFrequency} onValueChange={setRetrainingFrequency}>
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
                    <Select value={featureSelection} onValueChange={setFeatureSelection}>
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
                        value={[testTrainSplit]}
                        max={95}
                        min={50}
                        step={5}
                        className="flex-1"
                        onValueChange={(value) => setTestTrainSplit(value[0])}
                      />
                      <span className="bg-trading-bg border border-trading-border px-2 py-0.5 rounded w-12 text-center">
                        {testTrainSplit}%
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
                    <Switch checked={autoRetrain} onCheckedChange={setAutoRetrain} />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border">
                <h4 className="text-sm font-medium mb-2">Technical Indicators for ML Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.sma} 
                      onCheckedChange={() => toggleMlFeature('sma')} 
                    />
                    <span className="text-sm">SMA (Multiple)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.rsi} 
                      onCheckedChange={() => toggleMlFeature('rsi')} 
                    />
                    <span className="text-sm">RSI</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.macd} 
                      onCheckedChange={() => toggleMlFeature('macd')} 
                    />
                    <span className="text-sm">MACD</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.bollinger} 
                      onCheckedChange={() => toggleMlFeature('bollinger')} 
                    />
                    <span className="text-sm">Bollinger Bands</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.volume} 
                      onCheckedChange={() => toggleMlFeature('volume')} 
                    />
                    <span className="text-sm">Volume</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.stochastic} 
                      onCheckedChange={() => toggleMlFeature('stochastic')} 
                    />
                    <span className="text-sm">Stochastic</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.atr} 
                      onCheckedChange={() => toggleMlFeature('atr')} 
                    />
                    <span className="text-sm">ATR</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={mlFeatures.ichimoku} 
                      onCheckedChange={() => toggleMlFeature('ichimoku')} 
                    />
                    <span className="text-sm">Ichimoku</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-trading-border flex justify-between">
                <Button 
                  variant="outline" 
                  className="bg-warning-DEFAULT/10 text-warning-DEFAULT border-warning-DEFAULT"
                  onClick={handleForceRetrain}
                >
                  Force Retrain
                </Button>
                <Button onClick={handleSaveMlSettings}>Save ML Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
