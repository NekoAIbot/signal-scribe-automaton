import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Building2, Plus, Trash2, PlayCircle, StopCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';

interface PropAccount {
  id: string;
  account_name: string;
  login: string;
  server: string;
  account_type: string;
  broker_type: string;
  is_active: boolean;
  created_at: string;
}

const PropAccountsPage = () => {
  useScrollToTop();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PropAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    login: '',
    password: '',
    server: '',
    broker_type: 'mt5',
    firm: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const propFirms = ['FTMO', 'MyForexFunds', 'The5ers', 'TrueForexFunds', 'FundedNext', 'E8 Funding', 'SurgeTrader', 'Other'];

  useEffect(() => {
    fetchAccounts();
  }, [user?.id]);

  const fetchAccounts = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('broker_credentials')
        .select('*')
        .eq('account_type', 'prop')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching prop accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.login || !newAccount.password || !newAccount.server || !newAccount.account_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('broker_credentials').insert({
        user_id: user.id,
        account_name: `${newAccount.firm || 'Prop'} - ${newAccount.account_name}`,
        login: newAccount.login,
        encrypted_password: newAccount.password,
        server: newAccount.server,
        broker_type: newAccount.broker_type,
        account_type: 'prop',
        is_active: true,
      });

      if (error) throw error;
      toast.success('Prop account added successfully');
      setAddModalOpen(false);
      setNewAccount({ account_name: '', login: '', password: '', server: '', broker_type: 'mt5', firm: '' });
      fetchAccounts();
    } catch (error) {
      toast.error(`Failed to add account: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAccount = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('broker_credentials')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      setAccounts(accounts.map(a => a.id === id ? { ...a, is_active: !currentState } : a));
      toast.success(`Account ${!currentState ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update account');
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Remove this prop account?')) return;
    try {
      const { error } = await supabase.from('broker_credentials').delete().eq('id', id);
      if (error) throw error;
      setAccounts(accounts.filter(a => a.id !== id));
      toast.success('Account removed');
    } catch (error) {
      toast.error('Failed to remove account');
    }
  };

  const startPropTrading = async () => {
    const activeProps = accounts.filter(a => a.is_active);
    if (activeProps.length === 0) {
      toast.error('No active prop accounts. Activate at least one account.');
      return;
    }

    toast.info('Starting prop-firm optimized trading...');
    
    try {
      // Use the prop-firm specialized model for trading
      const { data, error } = await supabase.functions.invoke('ml-predictions', {
        body: { 
          mode: 'prop-firm',
          accounts: activeProps.map(a => a.id),
          riskProfile: 'conservative', // Prop firms need conservative risk
          maxDrawdown: 5, // typical prop firm max daily drawdown %
          maxDailyLoss: 4,
          profitTarget: 10,
        }
      });

      if (error) throw error;
      toast.success(`Prop trading active on ${activeProps.length} account(s) with conservative risk settings`);
    } catch (error) {
      toast.error(`Failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Prop Firm Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage prop-firm trading accounts with specialized AI models
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={startPropTrading} variant="default">
            <PlayCircle className="h-4 w-4 mr-2" /> Start Prop Trading
          </Button>
          <Button onClick={() => setAddModalOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Add Account
          </Button>
        </div>
      </div>

      {/* Risk guidelines */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-500">Prop Firm Risk Guidelines</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Max daily drawdown: 4-5% (varies by firm)</li>
                <li>• Max total drawdown: 8-12%</li>
                <li>• AI model uses conservative lot sizing and tight stop losses</li>
                <li>• Trading is automatically paused if daily loss limit approaches</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-muted-foreground col-span-full text-center py-8">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No prop firm accounts registered yet.</p>
              <Button className="mt-4" onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Your First Prop Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          accounts.map(account => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{account.account_name}</CardTitle>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Login: {account.login}</p>
                  <p>Server: {account.server}</p>
                  <p>Platform: {account.broker_type.toUpperCase()}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAccount(account.id, account.is_active)}
                  >
                    {account.is_active ? (
                      <><StopCircle className="h-3 w-3 mr-1" /> Deactivate</>
                    ) : (
                      <><PlayCircle className="h-3 w-3 mr-1" /> Activate</>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteAccount(account.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Account Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prop Firm Account</DialogTitle>
            <DialogDescription>Connect your prop firm trading account for AI-managed trading</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prop Firm</Label>
              <Select value={newAccount.firm} onValueChange={v => setNewAccount({ ...newAccount, firm: v })}>
                <SelectTrigger><SelectValue placeholder="Select firm" /></SelectTrigger>
                <SelectContent>
                  {propFirms.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account Name</Label>
              <Input value={newAccount.account_name} onChange={e => setNewAccount({ ...newAccount, account_name: e.target.value })} placeholder="e.g. FTMO Challenge Phase 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Login ID</Label>
                <Input value={newAccount.login} onChange={e => setNewAccount({ ...newAccount, login: e.target.value })} />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={newAccount.password} onChange={e => setNewAccount({ ...newAccount, password: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Server</Label>
                <Input value={newAccount.server} onChange={e => setNewAccount({ ...newAccount, server: e.target.value })} />
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={newAccount.broker_type} onValueChange={v => setNewAccount({ ...newAccount, broker_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mt5">MetaTrader 5</SelectItem>
                    <SelectItem value="mt4">MetaTrader 4</SelectItem>
                    <SelectItem value="ctrader">cTrader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAccount} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropAccountsPage;
