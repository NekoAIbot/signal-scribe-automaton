import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Target, 
  AlertTriangle,
  BarChart3,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceStatsProps {
  totalPnL: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
}

const PerformanceStats: React.FC<PerformanceStatsProps> = ({
  totalPnL,
  openTrades,
  closedTrades,
  winRate,
  avgWin,
  avgLoss,
  largestWin,
  largestLoss,
  profitFactor
}) => {
  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    valueClassName,
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    valueClassName?: string;
    subtitle?: string;
  }) => (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold mt-1", valueClassName)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        title="Total P&L"
        value={`${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`}
        icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
        valueClassName={totalPnL >= 0 ? "text-green-400" : "text-red-400"}
      />
      
      <StatCard
        title="Active Trades"
        value={openTrades}
        icon={Activity}
        subtitle={`${closedTrades} closed`}
      />
      
      <StatCard
        title="Win Rate"
        value={`${winRate.toFixed(1)}%`}
        icon={Target}
        valueClassName={winRate >= 50 ? "text-green-400" : "text-yellow-400"}
      />
      
      <StatCard
        title="Profit Factor"
        value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
        icon={BarChart3}
        valueClassName={profitFactor >= 1.5 ? "text-green-400" : profitFactor >= 1 ? "text-yellow-400" : "text-red-400"}
      />
      
      <StatCard
        title="Average Win"
        value={`+$${avgWin.toFixed(2)}`}
        icon={DollarSign}
        valueClassName="text-green-400"
      />
      
      <StatCard
        title="Average Loss"
        value={`-$${Math.abs(avgLoss).toFixed(2)}`}
        icon={AlertTriangle}
        valueClassName="text-red-400"
      />
      
      <StatCard
        title="Largest Win"
        value={`+$${largestWin.toFixed(2)}`}
        icon={TrendingUp}
        valueClassName="text-green-400"
      />
      
      <StatCard
        title="Largest Loss"
        value={`-$${Math.abs(largestLoss).toFixed(2)}`}
        icon={TrendingDown}
        valueClassName="text-red-400"
      />
    </div>
  );
};

export default PerformanceStats;
