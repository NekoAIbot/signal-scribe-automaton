
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Bell, BellOff, ArrowUpRight } from "lucide-react";
import { testAlertSystem } from "@/services/notificationService";
import { TechnicalAlertForm } from "@/components/alerts/TechnicalAlertForm";
import { NewsAlertForm } from "@/components/alerts/NewsAlertForm";

// Sample alert data
const sampleAlerts = [
  {
    id: '1',
    symbol: 'EUR/USD',
    condition: 'Price Above',
    value: 1.0850,
    created: '2024-05-10',
    active: true,
  },
  {
    id: '2',
    symbol: 'GBP/USD',
    condition: 'Price Below',
    value: 1.2500,
    created: '2024-05-09',
    active: true,
  },
  {
    id: '3',
    symbol: 'BTC/USD',
    condition: 'Price Movement',
    value: 5,
    created: '2024-05-08',
    active: false,
  },
];

const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState('price');
  const [alerts, setAlerts] = useState(sampleAlerts);
  const [newAlert, setNewAlert] = useState({
    symbol: 'EUR/USD',
    condition: 'Price Above',
    value: '',
  });

  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD'];
  const conditions = ['Price Above', 'Price Below', 'Price Movement'];

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAlert.value) {
      toast.error('Please enter an alert value');
      return;
    }
    
    const alert = {
      id: Date.now().toString(),
      symbol: newAlert.symbol,
      condition: newAlert.condition,
      value: parseFloat(newAlert.value as string),
      created: new Date().toISOString().split('T')[0],
      active: true,
    };
    
    setAlerts([...alerts, alert]);
    setNewAlert({ ...newAlert, value: '' });
    toast.success(`New ${newAlert.condition} alert created for ${newAlert.symbol}`);
  };

  const toggleAlertStatus = (id: string) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id ? { ...alert, active: !alert.active } : alert
      )
    );
    
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      toast.success(`Alert for ${alert.symbol} ${alert.active ? 'disabled' : 'enabled'}`);
    }
  };

  const deleteAlert = (id: string) => {
    const alert = alerts.find(a => a.id === id);
    setAlerts(alerts.filter((alert) => alert.id !== id));
    if (alert) {
      toast.info(`Alert for ${alert.symbol} deleted`);
    }
  };
  
  const handleTestAlert = async () => {
    await testAlertSystem();
  };
  
  const openChart = (symbol: string) => {
    // Open TradingView chart in a new window
    window.open(`https://www.tradingview.com/chart/?symbol=${symbol.replace('/', '')}`, '_blank');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Market Alerts</h1>
        <Button 
          variant="outline"
          onClick={handleTestAlert}
        >
          Test Alert System
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Manage your price and market alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="price">Price Alerts</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="news">News & Events</TabsTrigger>
                </TabsList>
                
                <TabsContent value="price" className="py-4">
                  {alerts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <Button 
                                variant="link" 
                                className="p-0 h-auto" 
                                onClick={() => openChart(alert.symbol)}
                              >
                                {alert.symbol}
                              </Button>
                            </TableCell>
                            <TableCell>{alert.condition}</TableCell>
                            <TableCell>
                              {alert.condition === 'Price Movement' 
                                ? `${alert.value}%` 
                                : alert.value.toFixed(4)}
                            </TableCell>
                            <TableCell>{alert.created}</TableCell>
                            <TableCell>
                              <Button
                                variant={alert.active ? "default" : "secondary"}
                                size="sm"
                                onClick={() => toggleAlertStatus(alert.id)}
                              >
                                {alert.active ? (
                                  <><Bell className="mr-1 h-3 w-3" /> Active</>
                                ) : (
                                  <><BellOff className="mr-1 h-3 w-3" /> Inactive</>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAlert(alert.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No price alerts set. Create one using the form.
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="technical" className="py-4">
                  <TechnicalAlertForm />
                </TabsContent>
                
                <TabsContent value="news" className="py-4">
                  <NewsAlertForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Create Price Alert</CardTitle>
              <CardDescription>
                Set up a new price alert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAlert} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select
                    value={newAlert.symbol}
                    onValueChange={(value) => setNewAlert({ ...newAlert, symbol: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Symbol" />
                    </SelectTrigger>
                    <SelectContent>
                      {symbols.map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={newAlert.condition}
                    onValueChange={(value) => setNewAlert({ ...newAlert, condition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {newAlert.condition === 'Price Movement' ? 'Percentage (%)' : 'Price Value'}
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder={newAlert.condition === 'Price Movement' ? "e.g. 5" : "e.g. 1.0850"}
                    value={newAlert.value}
                    onChange={(e) => setNewAlert({ ...newAlert, value: e.target.value })}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Alert
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
