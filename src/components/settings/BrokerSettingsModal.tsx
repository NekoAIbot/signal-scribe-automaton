
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface BrokerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings?: BrokerSettings;
  onSave: (settings: BrokerSettings) => void;
}

export interface BrokerSettings {
  login: string;
  password: string;
  server: string;
  accountType: 'demo' | 'real';
  platform: 'MT4' | 'MT5' | 'cTrader';
  lotSize: number;
  maxRiskPerTrade: number;
}

export function BrokerSettingsModal({ 
  open,
  onOpenChange,
  initialSettings,
  onSave
}: BrokerSettingsModalProps) {
  const [settings, setSettings] = useState<BrokerSettings>(initialSettings || {
    login: '',
    password: '',
    server: '',
    accountType: 'demo',
    platform: 'MT5',
    lotSize: 0.01,
    maxRiskPerTrade: 1
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: name === 'lotSize' || name === 'maxRiskPerTrade' ? parseFloat(value) : value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings({
      ...settings,
      [name]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!settings.login || !settings.password || !settings.server) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    onSave(settings);
    toast.success("Broker settings saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-trading-card border-trading-border">
        <DialogHeader>
          <DialogTitle>Broker Connection Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Trading Platform</Label>
            <Select 
              value={settings.platform} 
              onValueChange={(value) => handleSelectChange('platform', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MT4">MetaTrader 4</SelectItem>
                <SelectItem value="MT5">MetaTrader 5</SelectItem>
                <SelectItem value="cTrader">cTrader</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Select 
              value={settings.accountType} 
              onValueChange={(value) => handleSelectChange('accountType', value as 'demo' | 'real')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo Account</SelectItem>
                <SelectItem value="real">Real Account</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="login">Account Login/ID</Label>
            <Input 
              id="login"
              name="login"
              value={settings.login}
              onChange={handleChange}
              placeholder="Enter your account login ID"
              className="bg-trading-bg border-trading-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password"
              name="password"
              type="password"
              value={settings.password}
              onChange={handleChange}
              placeholder="Enter your account password"
              className="bg-trading-bg border-trading-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="server">Server</Label>
            <Input 
              id="server"
              name="server"
              value={settings.server}
              onChange={handleChange}
              placeholder="Enter broker server (e.g. ICMarketsSC-Demo)"
              className="bg-trading-bg border-trading-border"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lotSize">Default Lot Size</Label>
              <Input 
                id="lotSize"
                name="lotSize"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={settings.lotSize}
                onChange={handleChange}
                className="bg-trading-bg border-trading-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxRiskPerTrade">Max Risk %</Label>
              <Input 
                id="maxRiskPerTrade"
                name="maxRiskPerTrade"
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={settings.maxRiskPerTrade}
                onChange={handleChange}
                className="bg-trading-bg border-trading-border"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" className="w-full">Save Settings</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
