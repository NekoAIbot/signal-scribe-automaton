
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, XOctagon, Activity, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RiskMetrics {
  severity: 'ok' | 'warning' | 'critical' | 'paused';
  shouldPause: boolean;
  warnings: string[];
  metrics: {
    dailyPnL: number;
    dailyDrawdownPct: number;
    totalDrawdownPct: number;
    openPositions: number;
    totalLotSize: number;
    currentBalance: number;
    peakBalance: number;
  };
  limits: {
    maxDailyDrawdownPct: number;
    maxTotalDrawdownPct: number;
    maxOpenPositions: number;
    maxTotalLotSize: number;
  };
  tradestoday: number;
}

const SEVERITY_CONFIG = {
  ok: { icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Safe', badgeVariant: 'default' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Warning', badgeVariant: 'secondary' as const },
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical', badgeVariant: 'destructive' as const },
  paused: { icon: XOctagon, color: 'text-red-500', bg: 'bg-red-500/15', border: 'border-red-500/40', label: 'PAUSED', badgeVariant: 'destructive' as const },
};

export function PropRiskWidget() {
  const { user } = useAuth();
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null);
  const [propAccounts, setPropAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchPropAccounts = async () => {
      const { data } = await supabase
        .from('broker_credentials')
        .select('id, account_name, account_type')
        .eq('is_active', true)
        .eq('account_type', 'prop');
      setPropAccounts(data || []);
      if (data?.length) fetchRisk(data[0].id);
      else setLoading(false);
    };

    const fetchRisk = async (accountId: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('prop-risk-monitor', {
          body: { accountId, accountBalance: 100000 }
        });
        if (!error && data) setRiskData(data);
      } catch (e) {
        console.error('Risk fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPropAccounts();
    const interval = setInterval(() => {
      if (propAccounts.length) fetchRisk(propAccounts[0].id);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <Card className="bg-trading-card border-trading-border">
        <CardContent className="p-4 flex items-center justify-center h-32">
          <Activity className="h-5 w-5 animate-pulse text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!propAccounts.length) {
    return (
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Prop Risk Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">No prop accounts linked. Add one in Prop Accounts.</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = riskData?.metrics || { dailyPnL: 0, dailyDrawdownPct: 0, totalDrawdownPct: 0, openPositions: 0, totalLotSize: 0, currentBalance: 100000, peakBalance: 100000 };
  const limits = riskData?.limits || { maxDailyDrawdownPct: 4, maxTotalDrawdownPct: 10, maxOpenPositions: 5, maxTotalLotSize: 1 };
  const severity = riskData?.severity || 'ok';
  const config = SEVERITY_CONFIG[severity];
  const SeverityIcon = config.icon;

  const dailyUsed = (metrics.dailyDrawdownPct / limits.maxDailyDrawdownPct) * 100;
  const totalUsed = (metrics.totalDrawdownPct / limits.maxTotalDrawdownPct) * 100;
  const posUsed = (metrics.openPositions / limits.maxOpenPositions) * 100;

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <Card className={`bg-trading-card border ${config.border}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <SeverityIcon className={`h-4 w-4 ${config.color}`} />
            Prop Risk Monitor
          </CardTitle>
          <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Daily Drawdown */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Daily DD
            </span>
            <span className={metrics.dailyDrawdownPct >= limits.maxDailyDrawdownPct * 0.75 ? 'text-amber-400 font-medium' : ''}>
              {metrics.dailyDrawdownPct.toFixed(2)}% / {limits.maxDailyDrawdownPct}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${getBarColor(dailyUsed)}`} style={{ width: `${Math.min(dailyUsed, 100)}%` }} />
          </div>
        </div>

        {/* Total Drawdown */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Total DD
            </span>
            <span className={metrics.totalDrawdownPct >= limits.maxTotalDrawdownPct * 0.75 ? 'text-amber-400 font-medium' : ''}>
              {metrics.totalDrawdownPct.toFixed(2)}% / {limits.maxTotalDrawdownPct}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${getBarColor(totalUsed)}`} style={{ width: `${Math.min(totalUsed, 100)}%` }} />
          </div>
        </div>

        {/* Positions */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Open Positions</span>
            <span>{metrics.openPositions} / {limits.maxOpenPositions}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${getBarColor(posUsed)}`} style={{ width: `${Math.min(posUsed, 100)}%` }} />
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Daily P&L</p>
            <p className={`text-xs font-mono font-medium ${metrics.dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${metrics.dailyPnL.toFixed(0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Lot Size</p>
            <p className="text-xs font-mono">{metrics.totalLotSize.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Trades</p>
            <p className="text-xs font-mono">{riskData?.tradestoday || 0}</p>
          </div>
        </div>

        {/* Warnings */}
        {riskData?.warnings?.length ? (
          <div className={`rounded p-2 text-[10px] space-y-0.5 ${config.bg}`}>
            {riskData.warnings.map((w, i) => (
              <p key={i} className={config.color}>{w}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
