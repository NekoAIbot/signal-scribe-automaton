import React, { useState, useEffect } from 'react';
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
  BarChart2, 
  Trash2,
  Edit,
  LogOut,
  Key,
  Brain,
  Sparkles
} from 'lucide-react';

import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import { StrategyFormModal } from "@/components/admin/StrategyFormModal";
import { ModelFormModal } from "@/components/admin/ModelFormModal";
import { ModelTrainingModal } from "@/components/admin/ModelTrainingModal";
import { AIStrategySelector } from "@/components/admin/AIStrategySelector";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { useTelegramBot } from '@/hooks/useTelegramBot';
import { 
  getStrategies, 
  getModels, 
  getUsers, 
  addStrategy, 
  updateStrategy, 
  deleteStrategy, 
  updateModel, 
  deleteModel, 
  trainModel, 
  updateUser, 
  deleteUser
} from '@/services/adminService';
import { UserFormModal } from "@/components/admin/UserFormModal";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('strategies');
  const [strategies, setStrategies] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { isActive: telegramBotActive, toggle: handleToggleTelegramBot } = useTelegramBot();
  
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  
  // Form modals state
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelTrainingModalOpen, setModelTrainingModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  
  // Selected items for editing
  const [selectedStrategy, setSelectedStrategy] = useState<any | null>(null);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);
  
  const loadAllData = async () => {
    try {
      const [strategiesData, modelsData, usersData] = await Promise.all([
        getStrategies(),
        getModels(),
        getUsers()
      ]);
      
      setStrategies(strategiesData);
      setModels(modelsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load administrative data');
    }
  };
  
  // Strategy management
  const handleAddStrategy = () => {
    setSelectedStrategy(null);
    setStrategyModalOpen(true);
  };

  const handleEditStrategy = (id: string) => {
    const strategy = strategies.find(s => s.id === id);
    setSelectedStrategy(strategy);
    setStrategyModalOpen(true);
  };
  
  const handleSaveStrategy = async (strategy: any) => {
    try {
      if (selectedStrategy) {
        const updated = await updateStrategy(strategy);
        setStrategies(strategies.map(s => s.id === updated.id ? updated : s));
      } else {
        const added = await addStrategy(strategy);
        setStrategies([...strategies, added]);
      }
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Failed to save strategy');
    }
  };
  
  const handleDeleteStrategy = async (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      try {
        await deleteStrategy(id);
        setStrategies(strategies.filter(s => s.id !== id));
      } catch (error) {
        console.error('Error deleting strategy:', error);
        toast.error('Failed to delete strategy');
      }
    }
  };
  
  // Model management
  const handleEditModel = (id: string) => {
    const model = models.find(m => m.id === id);
    setSelectedModel(model);
    setModelModalOpen(true);
  };
  
  const handleSaveModel = async (model: any) => {
    try {
      if (selectedModel) {
        const updated = await updateModel(model);
        setModels(models.map(m => m.id === updated.id ? updated : m));
      }
    } catch (error) {
      console.error('Error saving model:', error);
      toast.error('Failed to save model');
    }
  };
  
  const handleTrainNewModel = () => {
    setModelTrainingModalOpen(true);
  };
  
  const handleTrainingComplete = (newModel: any) => {
    setModels([newModel, ...models]);
    loadAllData();
  };
  
  const handleTrainSpecificModel = async (id: string) => {
    try {
      toast.info(`Retraining model...`);
      const trainedModel = await trainModel(id);
      setModels(models.map(m => m.id === trainedModel.id ? trainedModel : m));
      toast.success(`Model retrained successfully`);
    } catch (error) {
      console.error('Error training model:', error);
      toast.error('Failed to train model');
    }
  };
  
  const handleDeleteModel = async (id: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      try {
        await deleteModel(id);
        setModels(models.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting model:', error);
        toast.error('Failed to delete model');
      }
    }
  };
  
  // User management
  const handleAddUser = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };
  
  const handleEditUser = (id: string) => {
    const user = users.find(u => u.id === id);
    setSelectedUser(user);
    setUserModalOpen(true);
  };
  
  const handleSaveUser = async (user: any) => {
    try {
      if (selectedUser) {
        const updated = await updateUser(user);
        setUsers(users.map(u => u.id === updated.id ? updated : u));
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    }
  };
  
  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleOpenResetPassword = () => {
    setResetPasswordModalOpen(true);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Apply AI recommendations
  const handleApplyAIRecommendations = async (strategyIds: string[], modelIds: string[]) => {
    try {
      const uniqueStrategyIds = Array.from(new Set(strategyIds));
      const uniqueModelIds = Array.from(new Set(modelIds));

      if (uniqueStrategyIds.length === 0 && uniqueModelIds.length === 0) {
        toast.error('No strategies or models were returned by the AI analysis');
        return;
      }

      await Promise.all(
        strategies
          .filter(strategy => uniqueStrategyIds.includes(strategy.id))
          .map(strategy =>
            updateStrategy({
              ...strategy,
              is_active: true,
              model_ids: uniqueModelIds.length > 0
                ? Array.from(new Set([
                    ...(strategy.model_ids || (strategy.model_id ? [strategy.model_id] : [])),
                    ...uniqueModelIds,
                  ]))
                : strategy.model_ids || [],
            })
          )
      );

      await loadAllData();
      toast.success('AI selections applied and your existing manual choices were preserved.');
    } catch (error) {
      console.error('Error applying AI recommendations:', error);
      toast.error('Failed to apply recommendations');
    }
  };

  const testAISignalGeneration = async () => {
    try {
      toast.info("Testing AI signal generation...");
      const signals = await getEnhancedSignals(5);
      
      if (signals && signals.length > 0) {
        signals.slice(0, 3).forEach((signal) => {
          toast.success(`AI Signal: ${signal.type} ${signal.symbol} at ${signal.price.toFixed(5)}`, {
            description: `Strategy: ${signal.strategy_name || 'AI Model'}, Confidence: ${signal.confidence_score ? (signal.confidence_score * 100).toFixed(1) + '%' : 'N/A'}`
          });
        });
        toast.success(`Generated ${signals.length} AI signals successfully`);
      } else {
        toast.info("No signals generated at this time");
      }
    } catch (error) {
      console.error("Error testing AI signal generation:", error);
      toast.error("Failed to test AI signal generation");
    }
  };
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg text-muted-foreground">System Controls</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant={telegramBotActive ? "destructive" : "default"}
            onClick={handleToggleTelegramBot}
            className="flex items-center gap-2 text-sm"
            size="sm"
          >
            {telegramBotActive ? (
              <><StopCircle className="h-4 w-4" /> Stop Telegram</>
            ) : (
              <><PlayCircle className="h-4 w-4" /> Start Telegram</>
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
              {/* AI Strategy Selector */}
              <AIStrategySelector 
                strategies={strategies}
                models={models}
                onApplyRecommendations={handleApplyAIRecommendations}
              />

              <div className="flex justify-end mb-2">
                <Button variant="outline" onClick={handleAddStrategy}>
                  <TrendingUp className="mr-2 h-4 w-4" /> Add Strategy
                </Button>
              </div>
              
              <ScrollArea className="h-[40vh] rounded-md border">
                <div className="p-4 space-y-4">
                  {strategies.length > 0 ? (
                    strategies.map((strategy) => (
                      <Card key={strategy.id} className="mb-4">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{strategy.name}</CardTitle>
                              {strategy.ai_auto_select && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI Auto
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditStrategy(strategy.id)}
                              >
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteStrategy(strategy.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant={strategy.is_active ? "default" : "secondary"}>
                              {strategy.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">Risk: {strategy.risk_profile}</Badge>
                            {strategy.model_ids?.length > 0 && (
                              <Badge variant="outline">
                                <Brain className="h-3 w-3 mr-1" />
                                {strategy.model_ids.length} Models
                              </Badge>
                            )}
                            {strategy.indicators && strategy.indicators.length > 0 && (
                              <span className="text-muted-foreground">
                                Indicators: {strategy.indicators.slice(0, 3).join(', ')}
                                {strategy.indicators.length > 3 && ` +${strategy.indicators.length - 3}`}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No strategies found. Add a strategy to get started.
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <StrategyFormModal 
                open={strategyModalOpen} 
                onOpenChange={setStrategyModalOpen}
                initialStrategy={selectedStrategy}
                onSave={handleSaveStrategy}
                models={models}
              />
            </TabsContent>
            
            <TabsContent value="models" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  {models.length} model(s) available
                </div>
                <Button onClick={handleTrainNewModel}>
                  <BarChart2 className="mr-2 h-4 w-4" /> Train New Model
                </Button>
              </div>
              
              <ScrollArea className="h-[50vh] rounded-md border">
                <div className="p-4 space-y-4">
                  {models.length > 0 ? (
                    models.map((model) => (
                      <Card key={model.id} className="mb-4">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{model.name}</CardTitle>
                              <Badge variant="outline">{model.type}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => handleTrainSpecificModel(model.id)}
                              >
                                <BarChart2 className="h-3 w-3 mr-1" /> Retrain
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditModel(model.id)}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteModel(model.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <span>
                                Accuracy: <strong className="text-green-500">{typeof model.accuracy === 'number' ? (model.accuracy * 100).toFixed(1) : model.accuracy}%</strong>
                              </span>
                              <Badge variant={model.is_active ? "default" : "secondary"}>
                                {model.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">
                              Last Trained: {model.lastTrained || 'Never'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No ML models found.</p>
                      <p className="text-sm">Train a model to get started with AI-powered trading.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={testAISignalGeneration}
                >
                  Test AI Signal Generation
                </Button>
              </div>
              
              <ModelFormModal 
                open={modelModalOpen} 
                onOpenChange={setModelModalOpen}
                initialModel={selectedModel}
                onSave={handleSaveModel}
              />
              
              <ModelTrainingModal
                open={modelTrainingModalOpen}
                onOpenChange={setModelTrainingModalOpen}
                onTrainingComplete={handleTrainingComplete}
              />
            </TabsContent>
            
            <TabsContent value="users" className="mt-4">
              <div className="flex justify-end mb-2">
                <Button variant="outline" onClick={handleAddUser}>
                  <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </div>
              
              <ScrollArea className="h-[50vh] rounded-md border">
                <div className="p-4 space-y-4">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <Card key={user.id} className="mb-4">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{user.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => handleEditUser(user.id)}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <div className="space-y-1 text-sm">
                            <div>{user.email}</div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {user.subscriptionTier || 'Free'}
                              </Badge>
                              {user.lastLogin && (
                                <span className="text-muted-foreground">Last Login: {user.lastLogin}</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No users found.
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="default" 
                  onClick={handleOpenResetPassword}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Admin Password
                </Button>
              </div>
              
              <UserFormModal 
                open={userModalOpen} 
                onOpenChange={setUserModalOpen}
                initialUser={selectedUser}
                onSave={handleSaveUser}
              />
              
              <ResetPasswordModal
                open={resetPasswordModalOpen}
                onOpenChange={setResetPasswordModalOpen}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
