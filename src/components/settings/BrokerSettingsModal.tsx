
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { MT5AccountDetails } from '@/services/signalGenerationService';
import { executeMT5Trade } from '@/services/signalGenerationService';

export interface BrokerSettings {
  mt4Accounts: MT5AccountDetails[];
  mt5Accounts: MT5AccountDetails[];
  ctraderAccounts: MT5AccountDetails[];
  defaultAccountId?: string;
}

interface BrokerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings?: BrokerSettings;
  onSave: (settings: BrokerSettings) => void;
}

const defaultAccount: MT5AccountDetails = {
  login: '',
  password: '',
  server: '',
  platform: 'MT5',
  accountType: 'demo',
  lotSize: 0.01,
  maxRisk: 1.0,
};

export function BrokerSettingsModal({
  open,
  onOpenChange,
  initialSettings,
  onSave,
}: BrokerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>('mt5');
  const [mt4Accounts, setMt4Accounts] = useState<MT5AccountDetails[]>(
    initialSettings?.mt4Accounts || []
  );
  const [mt5Accounts, setMt5Accounts] = useState<MT5AccountDetails[]>(
    initialSettings?.mt5Accounts || []
  );
  const [ctraderAccounts, setCtraderAccounts] = useState<MT5AccountDetails[]>(
    initialSettings?.ctraderAccounts || []
  );
  const [newAccount, setNewAccount] = useState<MT5AccountDetails>({ ...defaultAccount });
  const [defaultAccountId, setDefaultAccountId] = useState<string>(
    initialSettings?.defaultAccountId || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Get all accounts
  const allAccounts = [...mt4Accounts, ...mt5Accounts, ...ctraderAccounts];

  // Reset new account form
  const resetNewAccountForm = () => {
    setNewAccount({ ...defaultAccount, platform: activeTab.toUpperCase() as 'MT4' | 'MT5' | 'cTrader' });
  };

  // Add new account
  const handleAddAccount = () => {
    if (!newAccount.login || !newAccount.password || !newAccount.server) {
      toast.error('Please fill in all required fields');
      return;
    }

    const accountId = `${newAccount.platform.toLowerCase()}-${Date.now()}`;
    const accountWithId = { ...newAccount, id: accountId };

    if (activeTab === 'mt4') {
      setMt4Accounts([...mt4Accounts, accountWithId]);
    } else if (activeTab === 'mt5') {
      setMt5Accounts([...mt5Accounts, accountWithId]);
    } else if (activeTab === 'ctrader') {
      setCtraderAccounts([...ctraderAccounts, accountWithId]);
    }

    // If it's the first account, set it as default
    if (allAccounts.length === 0) {
      setDefaultAccountId(accountId);
    }

    resetNewAccountForm();
    toast.success(`${newAccount.platform} account added successfully`);
  };

  // Save settings
  const handleSave = () => {
    setIsSubmitting(true);

    try {
      const settings: BrokerSettings = {
        mt4Accounts,
        mt5Accounts,
        ctraderAccounts,
        defaultAccountId,
      };

      onSave(settings);
      onOpenChange(false);
    } catch (error) {
      toast.error(`Error saving settings: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete account
  const handleDeleteAccount = (accountId: string) => {
    const platform = accountId.split('-')[0];

    if (platform === 'mt4') {
      setMt4Accounts(mt4Accounts.filter(account => account.id !== accountId));
    } else if (platform === 'mt5') {
      setMt5Accounts(mt5Accounts.filter(account => account.id !== accountId));
    } else if (platform === 'ctrader') {
      setCtraderAccounts(ctraderAccounts.filter(account => account.id !== accountId));
    }

    if (defaultAccountId === accountId) {
      setDefaultAccountId('');
    }

    toast.success(`Account removed successfully`);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!newAccount.login || !newAccount.password || !newAccount.server) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsTestingConnection(true);
    try {
      // Create a test signal
      const testSignal = {
        id: 9999,
        symbol: 'EURUSD',
        type: 'BUY' as any,
        price: 1.1000,
        time: new Date().toISOString(),
        status: 'new' as any,
        strategy: 'Connection Test',
        stopLoss: 1.0950,
        takeProfit1: 1.1050,
        lotSize: 0.01
      };

      // Test connection using signal
      toast.info(`Testing connection to ${newAccount.platform}...`);
      const success = await executeMT5Trade(testSignal, newAccount);

      if (success) {
        toast.success(`Successfully connected to ${newAccount.platform}`);
      } else {
        toast.error(`Failed to connect to ${newAccount.platform}`);
      }
    } catch (error) {
      toast.error(`Connection test failed: ${(error as Error).message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setNewAccount({ 
      ...newAccount, 
      platform: tab.toUpperCase() as 'MT4' | 'MT5' | 'cTrader'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Broker Settings</DialogTitle>
          <DialogDescription>
            Configure your trading accounts for automatic trade execution
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="mt5">MetaTrader 5</TabsTrigger>
            <TabsTrigger value="mt4">MetaTrader 4</TabsTrigger>
            <TabsTrigger value="ctrader">cTrader</TabsTrigger>
          </TabsList>

          <TabsContent value="mt5" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">MT5 Accounts</h3>
              {mt5Accounts.length > 0 ? (
                <div className="space-y-2">
                  {mt5Accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-2 border rounded">
                      <RadioGroup value={defaultAccountId} onValueChange={setDefaultAccountId} className="flex items-center">
                        <RadioGroupItem value={account.id || ''} id={`default-${account.id}`} />
                        <div className="ml-2">
                          <div className="font-medium">{account.login}</div>
                          <div className="text-xs text-muted-foreground">{account.server} ({account.accountType})</div>
                        </div>
                      </RadioGroup>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteAccount(account.id || '')}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No MT5 accounts configured</p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Add MT5 Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mt5-login">Login</Label>
                  <Input
                    id="mt5-login"
                    value={newAccount.login}
                    onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
                    placeholder="MT5 Login ID"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-password">Password</Label>
                  <Input
                    id="mt5-password"
                    type="password"
                    value={newAccount.password}
                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                    placeholder="MT5 Password"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-server">Server</Label>
                  <Input
                    id="mt5-server"
                    value={newAccount.server}
                    onChange={(e) => setNewAccount({ ...newAccount, server: e.target.value })}
                    placeholder="MT5 Server Name"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-account-type">Account Type</Label>
                  <Select 
                    value={newAccount.accountType} 
                    onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value as 'demo' | 'real' })}
                  >
                    <SelectTrigger id="mt5-account-type">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="real">Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mt5-lot-size">Default Lot Size</Label>
                  <Input
                    id="mt5-lot-size"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newAccount.lotSize}
                    onChange={(e) => setNewAccount({ ...newAccount, lotSize: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-max-risk">Max Risk (%)</Label>
                  <Input
                    id="mt5-max-risk"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={newAccount.maxRisk}
                    onChange={(e) => setNewAccount({ ...newAccount, maxRisk: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? "Testing..." : "Test Connection"}
                </Button>
                <Button onClick={handleAddAccount}>Add Account</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mt4" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">MT4 Accounts</h3>
              {mt4Accounts.length > 0 ? (
                <div className="space-y-2">
                  {mt4Accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-2 border rounded">
                      <RadioGroup value={defaultAccountId} onValueChange={setDefaultAccountId} className="flex items-center">
                        <RadioGroupItem value={account.id || ''} id={`default-${account.id}`} />
                        <div className="ml-2">
                          <div className="font-medium">{account.login}</div>
                          <div className="text-xs text-muted-foreground">{account.server} ({account.accountType})</div>
                        </div>
                      </RadioGroup>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteAccount(account.id || '')}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No MT4 accounts configured</p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Add MT4 Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mt4-login">Login</Label>
                  <Input
                    id="mt4-login"
                    value={newAccount.login}
                    onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
                    placeholder="MT4 Login ID"
                  />
                </div>
                <div>
                  <Label htmlFor="mt4-password">Password</Label>
                  <Input
                    id="mt4-password"
                    type="password"
                    value={newAccount.password}
                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                    placeholder="MT4 Password"
                  />
                </div>
                <div>
                  <Label htmlFor="mt4-server">Server</Label>
                  <Input
                    id="mt4-server"
                    value={newAccount.server}
                    onChange={(e) => setNewAccount({ ...newAccount, server: e.target.value })}
                    placeholder="MT4 Server Name"
                  />
                </div>
                <div>
                  <Label htmlFor="mt4-account-type">Account Type</Label>
                  <Select 
                    value={newAccount.accountType} 
                    onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value as 'demo' | 'real' })}
                  >
                    <SelectTrigger id="mt4-account-type">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="real">Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mt4-lot-size">Default Lot Size</Label>
                  <Input
                    id="mt4-lot-size"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newAccount.lotSize}
                    onChange={(e) => setNewAccount({ ...newAccount, lotSize: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="mt4-max-risk">Max Risk (%)</Label>
                  <Input
                    id="mt4-max-risk"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={newAccount.maxRisk}
                    onChange={(e) => setNewAccount({ ...newAccount, maxRisk: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? "Testing..." : "Test Connection"}
                </Button>
                <Button onClick={handleAddAccount}>Add Account</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ctrader" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">cTrader Accounts</h3>
              {ctraderAccounts.length > 0 ? (
                <div className="space-y-2">
                  {ctraderAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-2 border rounded">
                      <RadioGroup value={defaultAccountId} onValueChange={setDefaultAccountId} className="flex items-center">
                        <RadioGroupItem value={account.id || ''} id={`default-${account.id}`} />
                        <div className="ml-2">
                          <div className="font-medium">{account.login}</div>
                          <div className="text-xs text-muted-foreground">{account.server} ({account.accountType})</div>
                        </div>
                      </RadioGroup>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteAccount(account.id || '')}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cTrader accounts configured</p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Add cTrader Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ctrader-login">Login</Label>
                  <Input
                    id="ctrader-login"
                    value={newAccount.login}
                    onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
                    placeholder="cTrader Login ID"
                  />
                </div>
                <div>
                  <Label htmlFor="ctrader-password">Password</Label>
                  <Input
                    id="ctrader-password"
                    type="password"
                    value={newAccount.password}
                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                    placeholder="cTrader Password"
                  />
                </div>
                <div>
                  <Label htmlFor="ctrader-server">Server</Label>
                  <Input
                    id="ctrader-server"
                    value={newAccount.server}
                    onChange={(e) => setNewAccount({ ...newAccount, server: e.target.value })}
                    placeholder="cTrader Server Name"
                  />
                </div>
                <div>
                  <Label htmlFor="ctrader-account-type">Account Type</Label>
                  <Select 
                    value={newAccount.accountType} 
                    onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value as 'demo' | 'real' })}
                  >
                    <SelectTrigger id="ctrader-account-type">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="real">Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ctrader-lot-size">Default Lot Size</Label>
                  <Input
                    id="ctrader-lot-size"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newAccount.lotSize}
                    onChange={(e) => setNewAccount({ ...newAccount, lotSize: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="ctrader-max-risk">Max Risk (%)</Label>
                  <Input
                    id="ctrader-max-risk"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={newAccount.maxRisk}
                    onChange={(e) => setNewAccount({ ...newAccount, maxRisk: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? "Testing..." : "Test Connection"}
                </Button>
                <Button onClick={handleAddAccount}>Add Account</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
