
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Search, X } from 'lucide-react';

interface Alert {
  id: number;
  symbol: string;
  condition: string;
  value: number;
  active: boolean;
  createdAt: string;
}

const mockAlerts: Alert[] = [
  {
    id: 1,
    symbol: 'EUR/USD',
    condition: 'Price Above',
    value: 1.05500,
    active: true,
    createdAt: '2023-04-20T14:30:00',
  },
  {
    id: 2,
    symbol: 'GBP/USD',
    condition: 'Price Below',
    value: 1.24000,
    active: true,
    createdAt: '2023-04-19T09:15:00',
  },
  {
    id: 3,
    symbol: 'USD/JPY',
    condition: 'RSI Above',
    value: 70,
    active: false,
    createdAt: '2023-04-18T11:45:00',
  },
  {
    id: 4,
    symbol: 'AUD/USD',
    condition: 'MA Crossover',
    value: 0,
    active: true,
    createdAt: '2023-04-17T16:20:00',
  },
];

interface Notification {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    message: 'EUR/USD price alert triggered (Above 1.05500)',
    type: 'info',
    time: '2023-04-21T09:45:00',
    read: false,
  },
  {
    id: 2,
    message: 'Bot successfully executed BUY order for GBP/USD',
    type: 'success',
    time: '2023-04-21T09:30:00',
    read: false,
  },
  {
    id: 3,
    message: 'Trading strategy retraining completed (+2.1% accuracy)',
    type: 'success',
    time: '2023-04-21T07:15:00',
    read: true,
  },
  {
    id: 4,
    message: 'Warning: API rate limit at 80% utilization',
    type: 'warning',
    time: '2023-04-20T14:30:00',
    read: true,
  },
  {
    id: 5,
    message: 'Error: Failed to execute SELL order for USD/JPY',
    type: 'error',
    time: '2023-04-20T11:45:00',
    read: true,
  },
];

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timeString: string) => {
  const date = new Date(timeString);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${formatTime(timeString)}`;
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${formatTime(timeString)}`;
    } else {
      return date.toLocaleDateString() + ' ' + formatTime(timeString);
    }
  }
};

const AlertsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-trading-card border-trading-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Price Alerts</CardTitle>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search alerts..."
                  className="pl-8 bg-trading-bg border-trading-border w-[180px]"
                />
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Alert
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-trading-border bg-trading-bg">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Symbol</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Condition</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Value</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAlerts.map((alert) => (
                    <tr 
                      key={alert.id} 
                      className="border-b border-trading-border hover:bg-trading-bg/50"
                    >
                      <td className="px-4 py-3 font-medium">{alert.symbol}</td>
                      <td className="px-4 py-3 text-muted-foreground">{alert.condition}</td>
                      <td className="px-4 py-3">
                        {alert.condition.includes('Price') 
                          ? alert.value.toFixed(5) 
                          : alert.condition === 'MA Crossover' 
                          ? 'SMA 50/200' 
                          : alert.value}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch 
                          checked={alert.active} 
                          className="data-[state=checked]:bg-success-DEFAULT" 
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-trading-card border-trading-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Recent Notifications</CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">Mark All Read</Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {mockNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`
                    p-3 rounded-md border
                    ${notification.read ? 'bg-trading-bg/50' : 'bg-trading-bg'}
                    ${notification.type === 'info' ? 'border-info-DEFAULT' : 
                      notification.type === 'success' ? 'border-success-DEFAULT' : 
                      notification.type === 'warning' ? 'border-warning-DEFAULT' : 
                      'border-danger-DEFAULT'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notification.time)}
                      </p>
                    </div>
                    
                    {!notification.read && (
                      <Badge className="ml-2 bg-primary/20 text-primary border-primary">New</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <Button variant="link" size="sm" className="text-muted-foreground">
                View All Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Notification Settings</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Trading Signals</h4>
                    <p className="text-xs text-muted-foreground">Get notified when new signals are generated</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Trade Execution</h4>
                    <p className="text-xs text-muted-foreground">Get notified when trades are executed</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Price Alerts</h4>
                    <p className="text-xs text-muted-foreground">Get notified when price alerts are triggered</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">System Status</h4>
                    <p className="text-xs text-muted-foreground">Get notified about bot status changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">ML Model Updates</h4>
                    <p className="text-xs text-muted-foreground">Get notified when ML models are retrained</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Error Notifications</h4>
                    <p className="text-xs text-muted-foreground">Get notified about errors and warnings</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-trading-border">
              <h4 className="text-sm font-medium mb-2">Notification Channels</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <span className="text-sm">In-App Notifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <span className="text-sm">Telegram Messages</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch />
                  <span className="text-sm">Email Notifications</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPage;
