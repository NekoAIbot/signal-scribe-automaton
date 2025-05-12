
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscriptionTier: 'free' | 'basic' | 'premium' | 'enterprise' | null;
  lastLogin?: string;
}

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser?: User;
  onSave: (user: User) => void;
}

export function UserFormModal({
  open,
  onOpenChange,
  initialUser,
  onSave
}: UserFormModalProps) {
  const [user, setUser] = useState<User>(initialUser || {
    id: `user-${Date.now()}`,
    name: '',
    email: '',
    role: 'user',
    subscriptionTier: 'free',
    lastLogin: new Date().toISOString().split('T')[0]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser({
      ...user,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setUser({
      ...user,
      [name]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user.name || !user.email) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (!user.email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    onSave(user);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-trading-card border-trading-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name"
              name="name"
              value={user.name}
              onChange={handleChange}
              placeholder="Enter user's name"
              className="bg-trading-bg border-trading-border"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              name="email"
              type="email"
              value={user.email}
              onChange={handleChange}
              placeholder="Enter user's email"
              className="bg-trading-bg border-trading-border"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={user.role} 
              onValueChange={(value) => handleSelectChange('role', value as 'user' | 'admin')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subscriptionTier">Subscription Plan</Label>
            <Select 
              value={user.subscriptionTier || 'free'} 
              onValueChange={(value) => handleSelectChange('subscriptionTier', value as 'free' | 'basic' | 'premium' | 'enterprise' | null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subscription plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="submit">Save User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
