
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
  Settings, 
  BarChart2, 
  Trash2,
  Edit,
  LogOut,
  Key
} from 'lucide-react';
import { AdminPasswordModal } from "@/components/admin/AdminPasswordModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import { StrategyFormModal } from "@/components/admin/StrategyFormModal";
import { ModelFormModal } from "@/components/admin/ModelFormModal";
import { UserFormModal } from "@/components/admin/UserFormModal";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getStrategies, 
  getModels, 
  getUsers, 
  addStrategy, 
  updateStrategy, 
  deleteStrategy, 
  addModel, 
  updateModel, 
  deleteModel, 
  trainModel, 
  addUser, 
  updateUser, 
  deleteUser, 
  toggleTelegramBot, 
  resetAdminPassword 
} from '@/services/adminService';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('strategies');
  const [strategies, setStrategies] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [telegramBotActive, setTelegramBotActive] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(true);
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
  
  // Load data
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);
  
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
  
  // Authentication
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
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
        // Update existing strategy
        const updated = await updateStrategy(strategy);
        setStrategies(strategies.map(s => s.id === updated.id ? updated : s));
      } else {
        // Add new strategy
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
  const handleAddModel = () => {
    setSelectedModel(null);
    setModelModalOpen(true);
  };
  
  const handleEditModel = (id: string) => {
    const model = models.find(m => m.id === id);
    setSelectedModel(model);
    setModelModalOpen(true);
  };
  
  const handleSaveModel = async (model: any) => {
    try {
      if (selectedModel) {
        // Update existing model
        const updated = await updateModel(model);
        setModels(models.map(m => m.id === updated.id ? updated : m));
      } else {
        // Add new model
        const added = await addModel(model);
        setModels([...models, added]);
      }
    } catch (error) {
      console.error('Error saving model:', error);
      toast.error('Failed to save model');
    }
  };
  
  const handleTrainModel = () => {
    setSelectedModel(null);
    setModelTrainingModalOpen(true);
  };
  
  const handleTrainSpecificModel = async (id: string) => {
    try {
      toast.info(`Training model ${id}...`);
      const trainedModel = await trainModel(id);
      
      // Update models list
      setModels(models.map(m => m.id === trainedModel.id ? trainedModel : m));
      
      toast.success(`Model ${trainedModel.name} trained successfully`);
    } catch (error) {
      console.error('Error training model:', error);
      toast.error('Failed to train model');
    }
  };
  
  const handleSaveTraining = async (modelData: any) => {
    try {
      const modelId = selectedModel ? selectedModel.id : `model-${Date.now()}`;
      const trained = await trainModel(modelId);
      
      // Update models list if this was retraining
      if (selectedModel) {
        setModels(models.map(m => m.id === trained.id ? trained : m));
      } else {
        // Add new model if it was training a new one
        setModels([...models, trained]);
      }
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
        // Update existing user
        const updated = await updateUser(user);
        setUsers(users.map(u => u.id === updated.id ? updated : u));
      } else {
        // Add new user
        const added = await addUser(user);
        setUsers([...users, added]);
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

  const handleToggleTelegramBot = async () => {
    try {
      const isActive = !telegramBotActive;
      await toggleTelegramBot(isActive);
      setTelegramBotActive(isActive);
    } catch (error) {
      console.error('Error toggling Telegram bot:', error);
      toast.error('Failed to toggle Telegram bot');
    }
  };

  const handleOpenResetPassword = () => {
    setResetPasswordModalOpen(true);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Test real AI signal generation
  const testAISignalGeneration = async () => {
    try {
      toast.info("Testing AI signal generation...");
      
      // Get enhanced signals
      const signals = await getEnhancedSignals(5);
      
      if (signals && signals.length > 0) {
        // Display samples of the generated signals
        signals.forEach((signal, index) => {
          if (index < 3) { // Only show max 3 sample signals in notifications
            toast.success(`AI Signal: ${signal.type} ${signal.symbol} at ${signal.price.toFixed(5)}`, {
              description: `Strategy: ${signal.strategy_name || 'AI Model'}, Confidence: ${signal.confidence_score ? (signal.confidence_score * 100).toFixed(1) + '%' : 'N/A'}`
            });
          }
        });
        
        toast.success(`Generated ${signals.length} AI signals successfully`);
      } else {
        toast.info("No signals generated at this time");
      }
      
      return signals;
    } catch (error) {
      console.error("Error testing AI signal generation:", error);
      toast.error("Failed to test AI signal generation");
      throw error;
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setPasswordModalOpen(true)}
              className="mt-4"
            >
              Enter Admin Password
            </Button>
            <AdminPasswordModal 
              open={passwordModalOpen} 
              onOpenChange={setPasswordModalOpen} 
              onAuthenticated={handleAuthenticated}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
      
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
                  {strategies.length > 0 ? (
                    strategies.map((strategy) => (
                      <Card key={strategy.id} className="mb-4">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{strategy.name}</CardTitle>
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
                          <div className="flex items-center gap-2 text-xs">
                            <div className="bg-secondary px-2 py-1 rounded">Risk: {strategy.risk_profile}</div>
                            <div className="bg-secondary px-2 py-1 rounded">Active: {strategy.is_active ? 'Yes' : 'No'}</div>
                            {strategy.indicators && strategy.indicators.length > 0 && (
                              <div className="bg-secondary px-2 py-1 rounded">
                                Indicators: {strategy.indicators.join(', ')}
                              </div>
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
              <div className="flex justify-end mb-2">
                <Button variant="outline" onClick={handleTrainModel}>
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
                            <CardTitle className="text-base">{model.name}</CardTitle>
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
                            <div>Type: {model.type}</div>
                            <div>Accuracy: {model.accuracy}%</div>
                            <div className="text-muted-foreground">Last Trained: {model.lastTrained}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No ML models found. Train a model to get started.
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="mt-4">
                <Button 
                  variant="default" 
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
              
              <ModelFormModal 
                open={modelTrainingModalOpen} 
                onOpenChange={setModelTrainingModalOpen}
                initialModel={selectedModel}
                onSave={handleSaveTraining}
                isTraining={true}
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
                              <div className="bg-secondary px-2 py-1 rounded">Role: {user.role}</div>
                              <div className="bg-secondary px-2 py-1 rounded capitalize">
                                Plan: {user.subscriptionTier || 'None'}
                              </div>
                              {user.lastLogin && (
                                <div className="text-muted-foreground">Last Login: {user.lastLogin}</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No users found. Add a user to get started.
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
