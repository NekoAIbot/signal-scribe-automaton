import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/services/edgeFunctionService';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  allowed_brokers: string[];
  max_broker_accounts: number;
  max_signals_per_day: number;
  auto_execute: boolean;
}

// Static fallback for tier-gating utilities used elsewhere
export const SUBSCRIPTION_LIMITS: Record<string, { maxBrokerAccounts: number; hasAutoTrading: boolean; hasAI: boolean; hasMultiAsset: string[]; hasCustomStrategies: boolean; hasRiskEngine: boolean; signalsPerDay: number }> = {
  free:       { maxBrokerAccounts: 1,   hasAutoTrading: false, hasAI: false, hasMultiAsset: ['crypto','synthetics'],          hasCustomStrategies: false, hasRiskEngine: false, signalsPerDay: 5 },
  starter:    { maxBrokerAccounts: 1,   hasAutoTrading: true,  hasAI: false, hasMultiAsset: ['crypto','synthetics'],          hasCustomStrategies: false, hasRiskEngine: false, signalsPerDay: 25 },
  pro:        { maxBrokerAccounts: 3,   hasAutoTrading: true,  hasAI: true,  hasMultiAsset: ['crypto','synthetics','forex'], hasCustomStrategies: true,  hasRiskEngine: true,  signalsPerDay: 999 },
  enterprise: { maxBrokerAccounts: 999, hasAutoTrading: true,  hasAI: true,  hasMultiAsset: ['crypto','synthetics','forex','indices','commodities'], hasCustomStrategies: true, hasRiskEngine: true, signalsPerDay: 9999 },
};
export function getSubscriptionLimits(tier: string) {
  return SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.free;
}

export function SubscriptionPlans() {
  const { user } = useAuth();
  const currentTier = user?.subscriptionTier || 'free';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price, features, allowed_brokers, max_broker_accounts, max_signals_per_day, auto_execute')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (!error) setPlans((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const handleSubscribe = async (planId: string, price: number) => {
    if (planId === currentTier) return;
    if (price === 0) {
      // Free downgrade
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { toast.error('Login required'); return; }
        await supabase.from('profiles').update({ subscription_tier: 'free' as any }).eq('id', authUser.id);
        toast.success('Switched to Free plan');
        setTimeout(() => window.location.reload(), 1200);
      } catch { toast.error('Failed to switch plan'); }
      return;
    }
    setBusy(planId);
    try {
      const result = await invokeEdgeFunction<{ authorization_url?: string; error?: string; paystackResponse?: unknown }>(
        'paystack-create-subscription',
        { planId }
      );
      if (result.ok && result.data?.authorization_url) {
        window.location.href = result.data.authorization_url;
      } else {
        const msg = result.error || result.data?.error || 'Failed to start checkout';
        console.error('Subscription error:', msg, result.data?.paystackResponse);
        toast.error(msg);
      }
    } catch (e: any) {
      console.error('Subscription error:', e);
      toast.error(e?.message || 'Failed to start checkout');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <p className="text-muted-foreground">Bring your own free broker (Deriv / Binance / OANDA / Capital.com). Upgrade unlocks more brokers, signals, and auto-execute.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={`flex flex-col ${currentTier === plan.id ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.price === 0 ? 'Free' : `$${plan.price}/month`}</CardDescription>
                </div>
                {currentTier === plan.id && (
                  <div className="bg-primary/20 text-primary text-xs px-2 py-1 rounded">Current</div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-2">
                {(plan.features || []).map((f, i) => (
                  <li key={i} className="flex items-start text-sm gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-muted-foreground">
                Brokers: {plan.allowed_brokers?.join(', ') || '—'}<br />
                {plan.max_broker_accounts >= 999 ? 'Unlimited' : plan.max_broker_accounts} broker account(s) · {plan.max_signals_per_day >= 999 ? 'Unlimited' : plan.max_signals_per_day} signals/day · {plan.auto_execute ? 'Auto-execute' : 'Manual only'}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant={currentTier === plan.id ? "secondary" : "default"}
                className="w-full"
                onClick={() => handleSubscribe(plan.id, plan.price)}
                disabled={currentTier === plan.id || busy === plan.id}
              >
                {busy === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (currentTier === plan.id ? 'Current Plan' : (plan.price === 0 ? 'Switch to Free' : 'Subscribe with Paystack'))}
                {currentTier !== plan.id && busy !== plan.id && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
