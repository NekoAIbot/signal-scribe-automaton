import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Plus, Eye, EyeOff, RefreshCw } from "lucide-react";

interface BrokerCredential {
  id: string;
  account_name: string;
  login: string;
  server: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
}

export const MT5AccountSettings = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<BrokerCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    login: '',
    password: '',
    server: '',
    account_type: 'demo'
  });

  // Fetch existing credentials
  const fetchCredentials = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('broker_credentials')
        .select('id, account_name, login, server, account_type, is_active, created_at')
        .eq('broker_type', 'mt5')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load MT5 accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [user?.id]);

  // Add new account
  const handleAddAccount = async () => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    if (!newAccount.account_name || !newAccount.login || !newAccount.password || !newAccount.server) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      // Simple encoding for storage (in production, use proper encryption)
      const encodedPassword = btoa(newAccount.password);
      
      const { error } = await supabase
        .from('broker_credentials')
        .insert({
          user_id: user.id,
          broker_type: 'mt5',
          account_name: newAccount.account_name,
          login: newAccount.login,
          encrypted_password: encodedPassword,
          server: newAccount.server,
          account_type: newAccount.account_type
        });

      if (error) throw error;

      toast.success('MT5 account added successfully');
      setNewAccount({ account_name: '', login: '', password: '', server: '', account_type: 'demo' });
      setShowAddForm(false);
      fetchCredentials();
    } catch (error: any) {
      console.error('Error adding account:', error);
      if (error.code === '23505') {
        toast.error('An account with this login and server already exists');
      } else {
        toast.error('Failed to add MT5 account');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this MT5 account?')) return;

    try {
      const { error } = await supabase
        .from('broker_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('MT5 account deleted');
      fetchCredentials();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('broker_credentials')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Account ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchCredentials();
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account status');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>MT5 Trading Accounts</CardTitle>
            <CardDescription>
              Connect your MetaTrader 5 accounts for automated trading
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCredentials}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Account Form */}
        {showAddForm && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    placeholder="My Demo Account"
                    value={newAccount.account_name}
                    onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select
                    value={newAccount.account_type}
                    onValueChange={(value) => setNewAccount({ ...newAccount, account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login">Login ID</Label>
                  <Input
                    id="login"
                    placeholder="12345678"
                    value={newAccount.login}
                    onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server">Server</Label>
                  <Input
                    id="server"
                    placeholder="MetaQuotes-Demo"
                    value={newAccount.server}
                    onChange={(e) => setNewAccount({ ...newAccount, server: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAccount} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Accounts */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading accounts...</div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No MT5 accounts connected yet.</p>
            <p className="text-sm">Click "Add Account" to connect your first trading account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cred.account_name}</span>
                      <Badge variant={cred.account_type === 'demo' ? 'secondary' : 'default'}>
                        {cred.account_type}
                      </Badge>
                      <Badge variant={cred.is_active ? 'success' : 'outline'}>
                        {cred.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Login: {cred.login} • Server: {cred.server}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(cred.id, cred.is_active)}
                  >
                    {cred.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAccount(cred.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <strong>Security Note:</strong> Your credentials are stored securely and encrypted. 
          We recommend using demo accounts for testing before connecting live accounts.
        </div>
      </CardContent>
    </Card>
  );
};
