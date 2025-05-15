
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionPlans } from "@/components/settings/SubscriptionPlans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("subscription");
  const { user, logout } = useAuth();

  // User preferences
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    notifications: {
      email: true,
      telegram: false,
      push: true,
      signals: true,
      news: false,
      systemAlerts: true,
    },
    trading: {
      defaultLotSize: 0.01,
      defaultRisk: 1,
      confirmTradeExecution: true,
      autocloseEnabled: false,
      autocloseProfit: 50,
      autocloseLoss: 25,
    },
    display: {
      chartTimeframe: '1h',
      defaultAssetClass: 'forex',
      dashboardLayout: 'default',
    }
  });

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (e) {
        console.error('Failed to parse saved preferences:', e);
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = () => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    toast.success('Preferences saved successfully');
  };

  // Helper to handle nested state updates
  const updatePreference = (category: string, setting: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category as keyof typeof prev] as object),  // Fixed spread operator with explicit casting
        [setting]: value
      }
    }));
  };
  
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscription">
          <SubscriptionPlans />
        </TabsContent>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm">{user?.email}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm">{user?.name}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Account Type</p>
                <p className="text-sm capitalize">{user?.role || 'user'}</p>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to log out?')) {
                      logout();
                      toast.success('You have been logged out');
                    }
                  }}
                >
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>
                Customize how the application appears
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select 
                      value={preferences.theme} 
                      onValueChange={(value) => setPreferences({...preferences, theme: value})}
                    >
                      <SelectTrigger id="theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chartTimeframe">Default Chart Timeframe</Label>
                    <Select 
                      value={preferences.display.chartTimeframe} 
                      onValueChange={(value) => updatePreference('display', 'chartTimeframe', value)}
                    >
                      <SelectTrigger id="chartTimeframe">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1 Minute</SelectItem>
                        <SelectItem value="5m">5 Minutes</SelectItem>
                        <SelectItem value="15m">15 Minutes</SelectItem>
                        <SelectItem value="30m">30 Minutes</SelectItem>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="4h">4 Hours</SelectItem>
                        <SelectItem value="1d">Daily</SelectItem>
                        <SelectItem value="1w">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultAssetClass">Default Asset Class</Label>
                  <Select 
                    value={preferences.display.defaultAssetClass} 
                    onValueChange={(value) => updatePreference('display', 'defaultAssetClass', value)}
                  >
                    <SelectTrigger id="defaultAssetClass">
                      <SelectValue placeholder="Select asset class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forex">Forex</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="commodities">Commodities</SelectItem>
                      <SelectItem value="indices">Indices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dashboardLayout">Dashboard Layout</Label>
                  <Select 
                    value={preferences.display.dashboardLayout} 
                    onValueChange={(value) => updatePreference('display', 'dashboardLayout', value)}
                  >
                    <SelectTrigger id="dashboardLayout">
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="expanded">Expanded</SelectItem>
                      <SelectItem value="trading-focused">Trading Focused</SelectItem>
                      <SelectItem value="analysis-focused">Analysis Focused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage how you receive alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive important alerts via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={preferences.notifications.email}
                    onCheckedChange={(checked) => updatePreference('notifications', 'email', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="telegram-notifications">Telegram Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts via Telegram</p>
                  </div>
                  <Switch
                    id="telegram-notifications"
                    checked={preferences.notifications.telegram}
                    onCheckedChange={(checked) => updatePreference('notifications', 'telegram', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive in-browser push notifications</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={preferences.notifications.push}
                    onCheckedChange={(checked) => updatePreference('notifications', 'push', checked)}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-2">Notification Types</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signal-notifications">Trading Signals</Label>
                      <Switch
                        id="signal-notifications"
                        checked={preferences.notifications.signals}
                        onCheckedChange={(checked) => updatePreference('notifications', 'signals', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="news-notifications">Market News</Label>
                      <Switch
                        id="news-notifications"
                        checked={preferences.notifications.news}
                        onCheckedChange={(checked) => updatePreference('notifications', 'news', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="system-notifications">System Alerts</Label>
                      <Switch
                        id="system-notifications"
                        checked={preferences.notifications.systemAlerts}
                        onCheckedChange={(checked) => updatePreference('notifications', 'systemAlerts', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Trading Preferences</CardTitle>
              <CardDescription>
                Configure your default trading parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="default-lot-size">Default Lot Size: {preferences.trading.defaultLotSize}</Label>
                    <span className="text-sm text-muted-foreground">{preferences.trading.defaultLotSize}</span>
                  </div>
                  <Slider
                    id="default-lot-size"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={[preferences.trading.defaultLotSize]}
                    onValueChange={(value) => updatePreference('trading', 'defaultLotSize', value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="default-risk">Default Risk: {preferences.trading.defaultRisk}%</Label>
                    <span className="text-sm text-muted-foreground">{preferences.trading.defaultRisk}%</span>
                  </div>
                  <Slider
                    id="default-risk"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={[preferences.trading.defaultRisk]}
                    onValueChange={(value) => updatePreference('trading', 'defaultRisk', value[0])}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="confirm-execution">Confirm Trade Execution</Label>
                    <p className="text-sm text-muted-foreground">Show confirmation dialog before executing trades</p>
                  </div>
                  <Switch
                    id="confirm-execution"
                    checked={preferences.trading.confirmTradeExecution}
                    onCheckedChange={(checked) => updatePreference('trading', 'confirmTradeExecution', checked)}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoclose">Autoclose Trades</Label>
                      <p className="text-sm text-muted-foreground">Automatically close trades based on profit/loss thresholds</p>
                    </div>
                    <Switch
                      id="autoclose"
                      checked={preferences.trading.autocloseEnabled}
                      onCheckedChange={(checked) => updatePreference('trading', 'autocloseEnabled', checked)}
                    />
                  </div>
                  
                  {preferences.trading.autocloseEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="autoclose-profit">Take Profit at {preferences.trading.autocloseProfit}%</Label>
                        <Slider
                          id="autoclose-profit"
                          min={1}
                          max={100}
                          step={1}
                          value={[preferences.trading.autocloseProfit]}
                          onValueChange={(value) => updatePreference('trading', 'autocloseProfit', value[0])}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="autoclose-loss">Stop Loss at {preferences.trading.autocloseLoss}%</Label>
                        <Slider
                          id="autoclose-loss"
                          min={1}
                          max={50}
                          step={1}
                          value={[preferences.trading.autocloseLoss]}
                          onValueChange={(value) => updatePreference('trading', 'autocloseLoss', value[0])}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button
              onClick={savePreferences}
            >
              Save Preferences
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
