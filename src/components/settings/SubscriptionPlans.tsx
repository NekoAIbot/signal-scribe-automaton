
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Define the subscription tiers with full feature details
const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    maxBrokerAccounts: 1,
    features: [
      'Market data access (forex only)',
      'Basic chart analysis',
      'Limited signal access (5/day)',
      'Community support',
      '1 broker account',
    ],
    limitations: [
      'No automated trading',
      'No AI assistant',
      'No risk engine',
      'No Telegram alerts',
      'No multi-asset support',
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29.99,
    maxBrokerAccounts: 3,
    features: [
      'All Free features',
      'Full signal access (unlimited)',
      'Risk engine access',
      'Basic automated trading',
      'Multi-asset: Forex + Crypto',
      'Up to 3 broker accounts',
      'Email + Telegram alerts',
      'Email support',
    ],
    limitations: [
      'Limited AI assistance',
      'No custom strategies',
      'Standard execution speed',
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99.99,
    maxBrokerAccounts: 10,
    features: [
      'All Basic features',
      'Advanced AI assistant',
      'Custom trading strategies',
      'Priority execution',
      'Performance analytics',
      'Multi-asset: All classes',
      'Up to 10 broker accounts',
      'ML model training',
      'Priority support',
    ],
    limitations: []
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299.99,
    maxBrokerAccounts: 999,
    features: [
      'All Premium features',
      'Dedicated account manager',
      'Custom ML model training',
      'API access',
      'Multi-user access',
      'Unlimited broker accounts',
      'White-label options',
      'SLA guarantee',
    ],
    limitations: []
  }
];

// Subscription feature limits lookup
export const SUBSCRIPTION_LIMITS: Record<string, { maxBrokerAccounts: number; hasAutoTrading: boolean; hasAI: boolean; hasMultiAsset: string[]; hasCustomStrategies: boolean; hasRiskEngine: boolean; signalsPerDay: number }> = {
  free: { maxBrokerAccounts: 1, hasAutoTrading: false, hasAI: false, hasMultiAsset: ['forex'], hasCustomStrategies: false, hasRiskEngine: false, signalsPerDay: 5 },
  basic: { maxBrokerAccounts: 3, hasAutoTrading: true, hasAI: false, hasMultiAsset: ['forex', 'crypto'], hasCustomStrategies: false, hasRiskEngine: true, signalsPerDay: 999 },
  premium: { maxBrokerAccounts: 10, hasAutoTrading: true, hasAI: true, hasMultiAsset: ['forex', 'crypto', 'indices', 'commodities'], hasCustomStrategies: true, hasRiskEngine: true, signalsPerDay: 999 },
  enterprise: { maxBrokerAccounts: 999, hasAutoTrading: true, hasAI: true, hasMultiAsset: ['forex', 'crypto', 'indices', 'commodities'], hasCustomStrategies: true, hasRiskEngine: true, signalsPerDay: 999 },
};

export function getSubscriptionLimits(tier: string) {
  return SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.free;
}

export function SubscriptionPlans() {
  const { user } = useAuth();
  const currentTier = user?.subscriptionTier || 'free';
  
  const handleSubscribe = async (planId: string) => {
    if (planId === currentTier) {
      toast.info(`You are already subscribed to the ${planId} plan`);
      return;
    }
    
    try {
      // Update subscription in database
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast.error("Please log in to change your subscription");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: planId as 'free' | 'basic' | 'premium' | 'enterprise' })
        .eq('id', authUser.id);

      if (error) throw error;

      // Update user_subscriptions table
      await supabase.from('user_subscriptions').insert({
        user_id: authUser.id,
        plan_id: planId,
        status: 'active',
        starts_at: new Date().toISOString(),
      });

      toast.success(`Subscribed to ${planId} plan! Refreshing...`);
      
      // Refresh to apply new subscription
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to update subscription');
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <p className="text-muted-foreground">Choose the plan that fits your trading needs</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {subscriptionPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`flex flex-col ${currentTier === plan.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
                  </CardDescription>
                </div>
                {currentTier === plan.id && (
                  <div className="bg-primary/20 text-primary text-xs px-2 py-1 rounded">
                    Current Plan
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Features</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {plan.limitations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Limitations</h4>
                    <ul className="space-y-1">
                      {plan.limitations.map((limitation, i) => (
                        <li key={i} className="flex items-start text-xs text-muted-foreground gap-2">
                          <X className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant={currentTier === plan.id ? "secondary" : "default"}
                className="w-full"
                onClick={() => handleSubscribe(plan.id)}
                disabled={currentTier === plan.id}
              >
                {currentTier === plan.id ? 'Current Plan' : 'Subscribe'}
                {currentTier !== plan.id && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
