// Universal Broker SDK — pre-trade validation engine.
// Runs locally against broker symbol rules and account state BEFORE any order
// is sent, so invalid orders never reach the provider.

import type { AccountInfo, BrokerCapabilities, OrderRequest, SymbolRules } from './types.ts';
import { BrokerError } from './errors.ts';

export interface ValidationContext {
  broker: string;
  capabilities: BrokerCapabilities;
  rules: SymbolRules | null;
  account: AccountInfo | null;
}

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  normalizedOrder: OrderRequest;
}

function roundToStep(value: number, step: number | null | undefined): number {
  if (!step || step <= 0) return value;
  const decimals = (String(step).split('.')[1] || '').length;
  return Number((Math.floor(value / step) * step).toFixed(decimals));
}

export function validateOrder(order: OrderRequest, ctx: ValidationContext): ValidationResult {
  const issues: ValidationIssue[] = [];
  const normalized: OrderRequest = { ...order };

  if (!order.symbol) {
    issues.push({ field: 'symbol', code: 'INVALID_SYMBOL', message: 'Symbol is required.' });
  }
  if (!['BUY', 'SELL'].includes(order.side)) {
    issues.push({ field: 'side', code: 'ORDER_REJECTED', message: 'Side must be BUY or SELL.' });
  }

  const orderType = order.orderType || 'MARKET';
  normalized.orderType = orderType;
  if (orderType === 'MARKET' && !ctx.capabilities.marketOrders) {
    issues.push({ field: 'orderType', code: 'NOT_SUPPORTED', message: `${ctx.broker} does not support market orders.` });
  }
  if (orderType === 'LIMIT' && !ctx.capabilities.limitOrders) {
    issues.push({ field: 'orderType', code: 'NOT_SUPPORTED', message: `${ctx.broker} does not support limit orders.` });
  }
  if (orderType === 'LIMIT' && !order.price) {
    issues.push({ field: 'price', code: 'ORDER_REJECTED', message: 'Limit orders require a price.' });
  }

  if (order.stopLoss && !ctx.capabilities.stopLoss) {
    issues.push({ field: 'stopLoss', code: 'NOT_SUPPORTED', message: `${ctx.broker} cannot attach a stop loss to this order; it will be managed by the platform instead.` });
    normalized.stopLoss = null;
  }
  if (order.takeProfit && !ctx.capabilities.takeProfit) {
    issues.push({ field: 'takeProfit', code: 'NOT_SUPPORTED', message: `${ctx.broker} cannot attach a take profit to this order; it will be managed by the platform instead.` });
    normalized.takeProfit = null;
  }

  let quantity = Number(order.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    issues.push({ field: 'quantity', code: 'INVALID_QUANTITY', message: 'Quantity must be greater than zero.' });
  } else if (ctx.rules) {
    const { minQuantity, maxQuantity, quantityStep } = ctx.rules;
    if (quantityStep) quantity = roundToStep(quantity, quantityStep) || quantity;
    if (minQuantity && quantity < minQuantity) quantity = minQuantity;
    if (maxQuantity && quantity > maxQuantity) {
      issues.push({ field: 'quantity', code: 'INVALID_QUANTITY', message: `Quantity ${quantity} exceeds the maximum ${maxQuantity} for ${ctx.rules.displaySymbol}.` });
    }
    normalized.quantity = quantity;
  }

  if (ctx.rules?.supportedOrderTypes?.length && !ctx.rules.supportedOrderTypes.includes(orderType)) {
    issues.push({ field: 'orderType', code: 'NOT_SUPPORTED', message: `${ctx.rules.displaySymbol} only supports: ${ctx.rules.supportedOrderTypes.join(', ')}.` });
  }

  if (ctx.account && ctx.account.tradingPermitted === false) {
    issues.push({ field: 'account', code: 'PERMISSION_DENIED', message: 'This broker account is not permitted to trade.' });
  }

  const blocking = issues.filter(i => i.code !== 'NOT_SUPPORTED' || i.field === 'orderType');
  return { valid: blocking.length === 0, issues, normalizedOrder: normalized };
}

export function assertValid(result: ValidationResult, broker: string) {
  if (result.valid) return;
  const first = result.issues[0];
  throw new BrokerError({
    broker,
    code: (first?.code as any) || 'ORDER_REJECTED',
    message: result.issues.map(i => i.message).join(' '),
  });
}
