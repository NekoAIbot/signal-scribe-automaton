
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Define the subscription tiers
const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Market data access',
      'Basic chart analysis',
      'Limited signal access',
      'Community support'
    ],
    limitations: [
      'No automated trading',
      'Limited signal history',
      'No risk engine',
      'No AI assistance'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29.99,
    features: [
      'All Free features',
      'Full signal access',
      'Risk engine access',
      'Basic automated trading',
      'Email support'
    ],
    limitations: [
      'Limited AI assistance',
      'No custom strategies',
      'Standard execution speed'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99.99,
    features: [
      'All Basic features',
      'Advanced AI assistance',
      'Custom trading strategies',
      'Priority execution',
      'Performance analytics',
      'Priority support'
    ],
    limitations: []
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299.99,
    features: [
      'All Premium features',
      'Dedicated account manager',
      'Custom ML model training',
      'API access',
      'Multi-user access',
      'White-label options'
    ],
    limitations: []
  }
];

export function SubscriptionPlans() {
  const { user } = useAuth();
  const currentTier = user?.subscriptionTier || 'free';
  
  const handleSubscribe = (planId: string) => {
    // In a real app, this would redirect to a payment page
    if (planId === currentTier) {
      toast.info(`You are already subscribed to the ${planId} plan`);
      return;
    }
    
    toast.success(`Mock subscription to ${planId} plan successful!`);
    // This is where we would redirect to payment processing
    
    // Just for demo purposes - update subscription in localStorage
    if (user) {
      const updatedUser = {
        ...user,
        subscriptionTier: planId
      };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      
      // Reload the page to reflect changes
      window.location.reload();
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
            className={`flex flex-col ${currentTier === plan.id ? 'border-primary' : ''}`}
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
                      <li key={i} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-primary mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {plan.limitations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Limitations</h4>
                    <ul className="space-y-1">
                      {plan.limitations.map((limitation, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          {limitation}
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
