
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionPlans } from "@/components/settings/SubscriptionPlans";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("subscription");
  const { user, logout } = useAuth();
  
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
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your trading experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Preference settings will be available soon.
                </p>
                
                <Button
                  onClick={() => {
                    toast.success("Preferences saved!");
                  }}
                >
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
