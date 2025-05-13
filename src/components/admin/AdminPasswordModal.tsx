
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ADMIN_PASSWORD, verifyAdminPassword } from '@/services/adminService';

interface AdminPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
}

export function AdminPasswordModal({
  open,
  onOpenChange,
  onAuthenticated
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Please enter the admin password');
      return;
    }
    
    if (verifyAdminPassword(password)) {
      setPassword('');
      setError('');
      onAuthenticated();
      onOpenChange(false);
      toast.success('Admin authenticated successfully');
    } else {
      setError('Incorrect password');
      toast.error('Authentication failed');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-trading-card border-trading-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Admin Authentication Required</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Admin Password</Label>
            <Input 
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter admin password"
              className={`bg-trading-bg border-trading-border ${error ? 'border-red-500' : ''}`}
              autoComplete="off"
            />
            
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="submit">Authenticate</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
