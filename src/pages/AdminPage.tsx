
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getEnhancedSignals } from '@/services/ai/signalService';
import { 
  TrendingUp, 
  PlayCircle, 
  StopCircle, 
  UserPlus, 
  Settings, 
  BarChart2, 
  Trash2,
  Edit 
} from 'lucide-react';

// Mock admin data
const mockStrategies = [
  { 
    id: '1', 
    name: 'Trend Following', 
    description: 'Uses moving averages to identify trends',
    model_id: '1',
    risk_profile: 'Medium' as const,
    is_active: true,
    indicators: ['EMA', 'MACD', 'ADX']
  },
  { 
    id: '2', 
    name: 'RSI Reversal', 
    description: 'Spots overbought and oversold conditions',
    model_id: '2',
    risk_profile: 'High' as const,
    is_active: true,
    indicators: ['RSI', 'Stochastic', 'CCI']
  }
];

const mockModels = [
  {
    id: '1',
    name: 'Regression Model v1',
    accuracy: 78.4,
    lastTrained: '2023-12-01',
    status: 'active'
  },
  {
    id: '2',
    name: 'Classification Model v2',
    accuracy: 82.1,
    lastTrained: '2024-01-15',
    status: 'active'
  }
];

const mockUsers = [
  {
    id: '1',
    name: 'John Trader',
    email: 'john@example.com',
    role: 'user',
    subscriptionTier: 'premium',
    lastLogin: '2024-05-10'
  },
  {
    id: '2',
    name: 'Sarah Analyst',
    email: 'sarah@example.com',
    role: 'user',
    subscriptionTier: 'basic',
    lastLogin: '2024-05-09'
  }
];

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('strategies');
  const [botRunning, setBotRunning] = useState(false);
  const [telegramBotActive, setTelegramBotActive] = useState(false);
  
  const handleAddStrategy = () => {
    toast.success("Add strategy modal would open here");
  };

  const handleEditStrategy = (id: string) => {
    toast.info(`Editing strategy ${id}`);
  };

  const handleTrainModel = () => {
    toast.loading("Training new model...", {
      id: "train-model"
    });
    
    // Simulate training completion
    setTimeout(() => {
      toast.success("Model trained successfully", {
        id: "train-model"
      });
    }, 3000);
  };

  const handleTrainSpecificModel = (id: string) => {
    toast.loading(`Training model ${id}...`, {
      id: `train-model-${id}`
    });
    
    // Simulate training completion
    setTimeout(() => {
      toast.success(`Model ${id} trained successfully`, {
        id: `train-model-${id}`
      });
    }, 2000);
  };

  const handleDeleteModel = (id: string) => {
    toast.info(`Model ${id} would be deleted`);
  };
  
  const handleAddUser = () => {
    toast.success("Add user modal would open here");
  };
  
  const handleEditUser = (id: string) => {
    toast.info(`Editing user ${id}`);
  };
  
  const handleDeleteUser = (id: string) => {
    toast.info(`User ${id} would be deleted`);
  };

  const handleToggleTelegramBot = () => {
    setTelegramBotActive(!telegramBotActive);
    
    if (!telegramBotActive) {
      toast.success("Telegram copy-trading signal generation started");
    } else {
      toast.info("Telegram copy-trading signal generation stopped");
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg text-muted-foreground">System Controls</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={telegramBotActive ? "destructive" : "default"}
            onClick={handleToggleTelegramBot}
            className="flex items-center gap-2"
          >
            {telegramBotActive ? (
              <>
                <StopCircle className="h-4 w-4" /> Stop Telegram Signals
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" /> Start Telegram Signals
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>System Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="strategies">Trading Strategies</TabsTrigger>
              <TabsTrigger value="models">ML Models</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="strategies" className="space-y-4 mt-4">
              <div className="flex justify-end mb-2">
                <Button variant="outline" onClick={handleAddStrategy}>
                  <TrendingUp className="mr-2 h-4 w-4" /> Add Strategy
                </Button>
              </div>
              
              <ScrollArea className="h-[50vh] rounded-md border">
                <div className="p-4 space-y-4">
                  {mockStrategies.map((strategy) => (
                    <Card key={strategy.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{strategy.name}</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => handleEditStrategy(strategy.id)}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="bg-secondary px-2 py-1 rounded">Risk: {strategy.risk_profile}</div>
                          <div className="bg-secondary px-2 py-1 rounded">Active: {strategy.is_active ? 'Yes' : 'No'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="models" className="mt-4">
              <div className="flex justify-end mb-2">
                <Button variant="outline" onClick={handleTrainModel}>
                  <BarChart2 className="mr-2 h-4 w-4" /> Train New Model
                </Button>
              </div>
              
              <ScrollArea className="h-[50vh] rounded-md border">
                <div className="p-4 space-y-4">
                  {mockModels.map((model) => (
                    <Card key={model.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{model.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleTrainSpecificModel(model.id)}>
                              <BarChart2 className="h-3 w-3 mr-1" /> Retrain
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteModel(model.id)}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="flex items-center justify-between text-sm">
                          <div>Accuracy: {model.accuracy}%</div>
                          <div className="text-muted-foreground">Last Trained: {model.lastTrained}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-4">
                <Button 
                  variant="default" 
                  onClick={() => {
                    toast.info("Testing AI signal generation...");
                    getEnhancedSignals().then(() => {
                      toast.success("Signal test completed");
                    }).catch(() => {
                      toast.error("Signal test failed");
                    });
                  }}
                >
                  Test AI Signal Generation
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="mt-4">
              <div className="flex justify-end mb-2">
                <Button variant="outline" onClick={handleAddUser}>
                  <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </div>
              
              <ScrollArea className="h-[50vh] rounded-md border">
                <div className="p-4 space-y-4">
                  {mockUsers.map((user) => (
                    <Card key={user.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{user.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleEditUser(user.id)}>
                              <Edit className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="space-y-1 text-sm">
                          <div>{user.email}</div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="bg-secondary px-2 py-1 rounded">Role: {user.role}</div>
                            <div className="bg-secondary px-2 py-1 rounded capitalize">Plan: {user.subscriptionTier}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-4">
                <Button 
                  variant="default" 
                  onClick={() => {
                    toast.success("Admin password has been changed to Nathan19@@");
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Reset Admin Password
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
