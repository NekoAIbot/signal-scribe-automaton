
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getEnhancedSignals } from '@/services/aiSignalService';

// Mock admin data
const mockStrategies = [
  { 
    id: '1', 
    name: 'Trend Following', 
    description: 'Uses moving averages to identify trends',
    model_id: '1',
    risk_profile: 'Medium' as const,
    is_active: true,
    indicators: ['EMA', 'MACD', 'ADX']
  },
  { 
    id: '2', 
    name: 'RSI Reversal', 
    description: 'Spots overbought and oversold conditions',
    model_id: '2',
    risk_profile: 'High' as const,
    is_active: true,
    indicators: ['RSI', 'Stochastic', 'CCI']
  }
];

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('strategies');
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>System Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="strategies">Trading Strategies</TabsTrigger>
              <TabsTrigger value="models">ML Models</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="strategies" className="space-y-4 mt-4">
              <div className="flex justify-end mb-2">
                <Button variant="outline">Add Strategy</Button>
              </div>
              
              <ScrollArea className="h-[50vh] rounded-md border">
                <div className="p-4 space-y-4">
                  {mockStrategies.map((strategy) => (
                    <Card key={strategy.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{strategy.name}</CardTitle>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="bg-secondary px-2 py-1 rounded">Risk: {strategy.risk_profile}</div>
                          <div className="bg-secondary px-2 py-1 rounded">Active: {strategy.is_active ? 'Yes' : 'No'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="models">
              <div className="flex justify-end mb-2 mt-4">
                <Button variant="outline">Train New Model</Button>
              </div>
              
              <Card className="border-dashed border-2">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    ML model management functionality is under development.
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4"
                    onClick={() => {
                      toast.info("Testing AI signal generation...");
                      getEnhancedSignals().then(() => {
                        toast.success("Signal test completed");
                      }).catch(() => {
                        toast.error("Signal test failed");
                      });
                    }}
                  >
                    Test AI Signal Generation
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="users">
              <div className="flex justify-end mb-2 mt-4">
                <Button variant="outline">Add User</Button>
              </div>
              
              <Card className="border-dashed border-2">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    User management functionality is under development.
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4"
                    onClick={() => {
                      toast.success("Admin password has been changed to Nathan19@@");
                    }}
                  >
                    Reset Admin Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
