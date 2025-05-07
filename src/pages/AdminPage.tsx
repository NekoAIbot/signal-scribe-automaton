
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CONFIG_FLAGS, API_KEYS } from '@/config/apiConfig';
import { MLModel, TradingStrategy } from '@/services/aiSignalService';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("models");
  const [isTraining, setIsTraining] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [useMockData, setUseMockData] = useState(CONFIG_FLAGS.USE_MOCK_MT5);
  
  // API keys state (in a real app, these would be stored securely)
  const [apiKeys, setApiKeys] = useState({
    FOREX_API_KEY: API_KEYS.FOREX_API_KEY,
    TELEGRAM_BOT_TOKEN: API_KEYS.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: API_KEYS.TELEGRAM_CHAT_ID,
    TWELVEDATA_API_KEY: API_KEYS.TWELVEDATA_API_KEY,
    ALPHAVANTAGE_API_KEY: API_KEYS.ALPHAVANTAGE_API_KEY
  });
  
  // ML models state (mock data for UI)
  const [models, setModels] = useState<MLModel[]>([
    { id: '1', name: 'Forex Price Predictor', type: 'LSTM', version: '1.0.0', is_active: true },
    { id: '2', name: 'Market Sentiment Analyzer', type: 'Transformer', version: '2.1.0', is_active: true },
    { id: '3', name: 'Volatility Forecaster', type: 'DQN', version: '0.8.5', is_active: false }
  ]);
  
  // Training parameters
  const [trainingParams, setTrainingParams] = useState({
    modelType: 'LSTM',
    epochs: 100,
    learningRate: 0.001,
    batchSize: 64,
    dataWindow: 60,
    datasetSize: 10000
  });
  
  // Strategies state
  const [strategies, setStrategies] = useState<TradingStrategy[]>([
    { 
      id: '1', 
      name: 'Trend Following', 
      description: 'Uses moving averages to identify trends',
      model_id: '1',
      risk_profile: 'Medium',
      is_active: true
    },
    { 
      id: '2', 
      name: 'RSI Reversal', 
      description: 'Spots overbought and oversold conditions',
      model_id: '2',
      risk_profile: 'High',
      is_active: true 
    }
  ]);
  
  // Function to handle model activation toggle
  const toggleModelActive = (id: string) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, is_active: !model.is_active } : model
    ));
    
    toast.success(`Model status updated`);
  };
  
  // Function to handle strategy activation toggle
  const toggleStrategyActive = (id: string) => {
    setStrategies(strategies.map(strategy => 
      strategy.id === id ? { ...strategy, is_active: !strategy.is_active } : strategy
    ));
    
    toast.success(`Strategy status updated`);
  };
  
  // Function to handle API key updates
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiKeys({
      ...apiKeys,
      [name]: value
    });
  };
  
  // Function to save API keys
  const saveApiKeys = () => {
    // In a real app, this would send the API keys to a secure backend
    toast.success("API keys updated successfully");
  };
  
  // Function to handle mock data toggle
  const handleMockDataToggle = (checked: boolean) => {
    setUseMockData(checked);
    toast.success(`${checked ? 'Using mock data' : 'Using real data'} for trading operations`);
  };
  
  // Function to handle training parameter changes
  const handleTrainingParamChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTrainingParams({
      ...trainingParams,
      [name]: name === 'modelType' ? value : parseFloat(value)
    });
  };
  
  // Function to start model training
  const startTraining = () => {
    setIsTraining(true);
    toast.info(`Started training ${trainingParams.modelType} model with ${trainingParams.epochs} epochs`);
    
    // Simulate training process
    setTimeout(() => {
      setIsTraining(false);
      toast.success("Model training completed successfully");
      
      // Add new model to the list
      const newModel = {
        id: (models.length + 1).toString(),
        name: `${trainingParams.modelType} ${new Date().toLocaleDateString()}`,
        type: trainingParams.modelType as 'LSTM' | 'DQN' | 'PPO' | 'Transformer',
        version: `1.0.${models.length}`,
        is_active: false
      };
      
      setModels([...models, newModel]);
    }, 5000);
  };
  
  // Function to start backtesting
  const startBacktesting = () => {
    setIsBacktesting(true);
    toast.info("Started backtesting selected strategies");
    
    // Simulate backtesting process
    setTimeout(() => {
      setIsBacktesting(false);
      toast.success("Backtesting completed. Results available in the performance tab.");
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Use Mock Data</span>
          <Switch 
            checked={useMockData}
            onCheckedChange={handleMockDataToggle}
          />
        </div>
      </div>
      
      <div className="bg-card rounded-lg p-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="strategies">Trading Strategies</TabsTrigger>
            <TabsTrigger value="apis">API Settings</TabsTrigger>
            <TabsTrigger value="telegram">Telegram Bot</TabsTrigger>
          </TabsList>
          
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Machine Learning Models</CardTitle>
                <CardDescription>
                  Manage AI models used for market predictions and signal generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models.map(model => (
                    <div key={model.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h3 className="font-medium">{model.name}</h3>
                        <div className="text-sm text-muted-foreground">
                          {model.type} • Version {model.version}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={model.is_active}
                          onCheckedChange={() => toggleModelActive(model.id)}
                        />
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Model Training</CardTitle>
                <CardDescription>
                  Train new AI models on historical market data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="modelType">Model Type</Label>
                      <Select 
                        value={trainingParams.modelType}
                        onValueChange={(value) => setTrainingParams({...trainingParams, modelType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LSTM">LSTM</SelectItem>
                          <SelectItem value="Transformer">Transformer</SelectItem>
                          <SelectItem value="DQN">DQN</SelectItem>
                          <SelectItem value="PPO">PPO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="epochs">Training Epochs</Label>
                      <Input 
                        id="epochs"
                        name="epochs"
                        type="number"
                        value={trainingParams.epochs}
                        onChange={handleTrainingParamChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="learningRate">Learning Rate</Label>
                      <Input 
                        id="learningRate"
                        name="learningRate"
                        type="number"
                        step="0.0001"
                        value={trainingParams.learningRate}
                        onChange={handleTrainingParamChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="batchSize">Batch Size</Label>
                      <Input 
                        id="batchSize"
                        name="batchSize"
                        type="number"
                        value={trainingParams.batchSize}
                        onChange={handleTrainingParamChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dataWindow">Data Window</Label>
                      <Input 
                        id="dataWindow"
                        name="dataWindow"
                        type="number"
                        value={trainingParams.dataWindow}
                        onChange={handleTrainingParamChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="datasetSize">Dataset Size</Label>
                      <Input 
                        id="datasetSize"
                        name="datasetSize"
                        type="number"
                        value={trainingParams.datasetSize}
                        onChange={handleTrainingParamChange}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={startTraining}
                    disabled={isTraining}
                  >
                    {isTraining ? "Training in progress..." : "Start Training"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="strategies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trading Strategies</CardTitle>
                <CardDescription>
                  Manage and configure automated trading strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategies.map(strategy => (
                    <div key={strategy.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h3 className="font-medium">{strategy.name}</h3>
                        <div className="text-sm text-muted-foreground">
                          {strategy.description} • Risk: {strategy.risk_profile}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={strategy.is_active}
                          onCheckedChange={() => toggleStrategyActive(strategy.id)}
                        />
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <Button variant="outline" className="w-full">
                    Create New Strategy
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Backtest Strategies</CardTitle>
                <CardDescription>
                  Run performance tests on historical data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Last 7 days</SelectItem>
                          <SelectItem value="30">Last 30 days</SelectItem>
                          <SelectItem value="90">Last 90 days</SelectItem>
                          <SelectItem value="180">Last 6 months</SelectItem>
                          <SelectItem value="365">Last year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Symbols</Label>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Select symbols" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All pairs</SelectItem>
                          <SelectItem value="major">Major pairs</SelectItem>
                          <SelectItem value="minor">Minor pairs</SelectItem>
                          <SelectItem value="exotic">Exotic pairs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={startBacktesting}
                    disabled={isBacktesting}
                  >
                    {isBacktesting ? "Running backtest..." : "Start Backtest"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="apis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Configure external API connections for market data and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="FOREX_API_KEY">Forex API Key</Label>
                    <Input 
                      id="FOREX_API_KEY"
                      name="FOREX_API_KEY"
                      value={apiKeys.FOREX_API_KEY}
                      onChange={handleApiKeyChange}
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="TWELVEDATA_API_KEY">Twelve Data API Key</Label>
                    <Input 
                      id="TWELVEDATA_API_KEY"
                      name="TWELVEDATA_API_KEY"
                      value={apiKeys.TWELVEDATA_API_KEY}
                      onChange={handleApiKeyChange}
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ALPHAVANTAGE_API_KEY">Alpha Vantage API Key</Label>
                    <Input 
                      id="ALPHAVANTAGE_API_KEY"
                      name="ALPHAVANTAGE_API_KEY"
                      value={apiKeys.ALPHAVANTAGE_API_KEY}
                      onChange={handleApiKeyChange}
                      type="password"
                    />
                  </div>
                  
                  <Button className="w-full" onClick={saveApiKeys}>
                    Save API Keys
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="telegram" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Telegram Bot Configuration</CardTitle>
                <CardDescription>
                  Set up Telegram notifications and trading bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="TELEGRAM_BOT_TOKEN">Bot Token</Label>
                    <Input 
                      id="TELEGRAM_BOT_TOKEN"
                      name="TELEGRAM_BOT_TOKEN"
                      value={apiKeys.TELEGRAM_BOT_TOKEN}
                      onChange={handleApiKeyChange}
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="TELEGRAM_CHAT_ID">Chat ID</Label>
                    <Input 
                      id="TELEGRAM_CHAT_ID"
                      name="TELEGRAM_CHAT_ID"
                      value={apiKeys.TELEGRAM_CHAT_ID}
                      onChange={handleApiKeyChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Bot Status</Label>
                    <div className="flex items-center justify-between">
                      <span>Enable Telegram notifications</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Signal Format</Label>
                    <Textarea 
                      defaultValue={`
📊 TRADING SIGNAL
{type}: {symbol}
💰 Price: {price}
📈 Strategy: {strategy}
🕒 Time: {time}
`}
                      rows={6}
                    />
                  </div>
                  
                  <Button className="w-full" onClick={saveApiKeys}>
                    Save Telegram Settings
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
