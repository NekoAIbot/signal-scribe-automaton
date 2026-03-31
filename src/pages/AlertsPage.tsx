import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Bell, BellOff, Loader2 } from "lucide-react";
import { testAlertSystem } from "@/services/notificationService";
import { TechnicalAlertForm } from "@/components/alerts/TechnicalAlertForm";
import { NewsAlertForm } from "@/components/alerts/NewsAlertForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PriceAlert {
  id: string;
  symbol: string;
  condition: string;
  value: number;
  is_active: boolean;
  created_at: string;
  triggered_at: string | null;
}

const SYMBOLS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'BTC/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD',
  'XAU/USD', 'XAG/USD', 'US OIL',
  'SPX', 'NDX', 'DJI'
];

const CONDITIONS = ['Price Above', 'Price Below', 'Price Movement'];

const AlertsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('price');
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState({ symbol: 'EUR/USD', condition: 'Price Above', value: '' });

  useEffect(() => {
    if (!user) return;
    fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load alerts');
    } else {
      setAlerts((data || []) as PriceAlert[]);
    }
    setLoading(false);
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.value || !user) {
      toast.error('Please enter an alert value');
      return;
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: user.id,
        symbol: newAlert.symbol,
        condition: newAlert.condition,
        value: parseFloat(newAlert.value),
        is_active: true
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create alert');
    } else {
      setAlerts([data as PriceAlert, ...alerts]);
      setNewAlert({ ...newAlert, value: '' });
      toast.success(`Alert created for ${newAlert.symbol}`);
    }
  };

  const toggleAlertStatus = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    const { error } = await supabase
      .from('price_alerts')
      .update({ is_active: !alert.is_active })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update alert');
    } else {
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
      toast.success(`Alert ${alert.is_active ? 'disabled' : 'enabled'}`);
    }
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete alert');
    } else {
      setAlerts(alerts.filter(a => a.id !== id));
      toast.info('Alert deleted');
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Market Alerts</h1>
        <Button variant="outline" onClick={() => testAlertSystem()}>
          Test Alert System
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Manage your price and market alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="price">Price Alerts</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="news">News & Events</TabsTrigger>
                </TabsList>
                
                <TabsContent value="price" className="py-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : alerts.length > 0 ? (
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
                            <TableCell className="font-medium">{alert.symbol}</TableCell>
                            <TableCell>{alert.condition}</TableCell>
                            <TableCell>
                              {alert.condition === 'Price Movement' 
                                ? `${alert.value}%` 
                                : alert.value.toFixed(4)}
                            </TableCell>
                            <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button
                                variant={alert.is_active ? "default" : "secondary"}
                                size="sm"
                                onClick={() => toggleAlertStatus(alert.id)}
                              >
                                {alert.is_active ? (
                                  <><Bell className="mr-1 h-3 w-3" /> Active</>
                                ) : (
                                  <><BellOff className="mr-1 h-3 w-3" /> Inactive</>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => deleteAlert(alert.id)}>
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
              <CardDescription>Set up a new price alert</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAlert} className="space-y-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Select value={newAlert.symbol} onValueChange={(v) => setNewAlert({ ...newAlert, symbol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={newAlert.condition} onValueChange={(v) => setNewAlert({ ...newAlert, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{newAlert.condition === 'Price Movement' ? 'Percentage (%)' : 'Price Value'}</Label>
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
                  <Plus className="mr-2 h-4 w-4" /> Create Alert
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
