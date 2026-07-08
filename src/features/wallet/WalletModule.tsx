import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Copy,
  DatabaseZap,
  Gauge,
  LineChart,
  Loader2,
  PlugZap,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RpcMethod = 'eth_blockNumber' | 'eth_gasPrice' | 'net_version' | 'eth_getBalance' | 'eth_getCode';

type ChainConfig = {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  explorer: string;
  rpcUrls: string[];
  sampleAddress: string;
  sampleLabel: string;
};

type ChainSnapshot = {
  blockNumber: number;
  gasGwei: string;
  networkId: string;
  latencyMs: number;
  rpcUrl: string;
  updatedAt: string;
};

type AddressProfile = {
  address: string;
  balance: string;
  balanceSymbol: string;
  isContract: boolean;
  explorerUrl: string;
};

type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  circulating_supply?: number | null;
  total_supply?: number | null;
  max_supply?: number | null;
  ath?: number | null;
  ath_change_percentage?: number | null;
  last_updated?: string;
  sparkline_in_7d?: { price: number[] };
};

type EthereumProvider = {
  isMetaMask?: boolean;
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type WalletStatus = {
  installed: boolean;
  isMetaMask: boolean;
  address?: string;
  chainId?: string;
};

const MARKET_IDS = [
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'ripple',
  'dogecoin',
  'cardano',
  'chainlink',
  'avalanche-2',
  'the-open-network',
  'tron',
  'polkadot',
];

const CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    rpcUrls: ['https://ethereum-rpc.publicnode.com', 'https://rpc.ankr.com/eth'],
    sampleAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    sampleLabel: 'Vitalik 公开地址',
  },
  {
    id: 8453,
    name: 'Base Mainnet',
    shortName: 'Base',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
    rpcUrls: ['https://base-rpc.publicnode.com', 'https://mainnet.base.org'],
    sampleAddress: '0x0000000000000000000000000000000000000000',
    sampleLabel: '零地址',
  },
  {
    id: 137,
    name: 'Polygon PoS',
    shortName: 'Polygon',
    symbol: 'POL',
    explorer: 'https://polygonscan.com',
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com', 'https://polygon-rpc.com'],
    sampleAddress: '0x0000000000000000000000000000000000001010',
    sampleLabel: 'Polygon 原生币合约',
  },
  {
    id: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    symbol: 'SepoliaETH',
    explorer: 'https://sepolia.etherscan.io',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
    sampleAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    sampleLabel: 'Beacon Deposit Contract',
  },
];

const DEFAULT_ADDRESS = CHAINS[0].sampleAddress;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CARD = 'border border-slate-200/70 bg-white/95 shadow-[0_14px_48px_rgba(15,23,42,0.08)] backdrop-blur';
const SOFT_CARD = 'rounded-2xl border border-slate-200/70 bg-slate-50/85';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function hexToBigInt(hex?: string) {
  if (!hex || hex === '0x') return 0n;
  return BigInt(hex);
}

function formatUnits(value: bigint, decimals = 18, fractionDigits = 4) {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionText = fraction.toString().padStart(decimals, '0').slice(0, fractionDigits);
  const trimmed = fractionText.replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

function formatGwei(hex: string) {
  const wei = hexToBigInt(hex);
  const gwei = Number(wei) / 1e9;
  if (!Number.isFinite(gwei)) return '-';
  if (gwei < 1) return gwei.toFixed(3);
  if (gwei < 100) return gwei.toFixed(2);
  return Math.round(gwei).toString();
}

function formatCurrency(value?: number | null, fractionDigits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: fractionDigits }).format(value);
}

function formatCompactCurrency(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatUpdatedAt(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function shortAddress(address?: string) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getEthereumProvider() {
  if (typeof window === 'undefined') return undefined;
  return window.ethereum;
}

function getPriceRangePercent(coin: CoinMarket) {
  const range = coin.high_24h - coin.low_24h;
  if (!Number.isFinite(range) || range <= 0) return 50;
  const value = ((coin.current_price - coin.low_24h) / range) * 100;
  return Math.min(100, Math.max(0, value));
}

async function fetchMarkets(): Promise<CoinMarket[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids: MARKET_IDS.join(','),
    order: 'market_cap_desc',
    per_page: '12',
    page: '1',
    sparkline: 'true',
    price_change_percentage: '1h,7d',
    locale: 'zh',
  });
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`);
  if (!response.ok) throw new Error(`行情接口暂时不可用：HTTP ${response.status}`);
  return (await response.json()) as CoinMarket[];
}

async function rpcCall<T>(chain: ChainConfig, method: RpcMethod, params: unknown[] = []): Promise<{ value: T; rpcUrl: string; latencyMs: number }> {
  let lastError: unknown;

  for (const rpcUrl of chain.rpcUrls) {
    const startedAt = performance.now();
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      });
      if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
      const payload = (await response.json()) as { result?: T; error?: { message?: string } };
      if (payload.error) throw new Error(payload.error.message || 'RPC 调用失败');
      if (typeof payload.result === 'undefined') throw new Error('RPC 未返回结果');
      return { value: payload.result, rpcUrl, latencyMs: Math.round(performance.now() - startedAt) };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('公共 RPC 暂时不可用');
}

async function fetchSnapshot(chain: ChainConfig): Promise<ChainSnapshot> {
  const block = await rpcCall<string>(chain, 'eth_blockNumber');
  const [gas, network] = await Promise.all([
    rpcCall<string>(chain, 'eth_gasPrice'),
    rpcCall<string>(chain, 'net_version'),
  ]);

  return {
    blockNumber: Number(hexToBigInt(block.value)),
    gasGwei: formatGwei(gas.value),
    networkId: network.value,
    latencyMs: block.latencyMs,
    rpcUrl: block.rpcUrl,
    updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

async function fetchAddressProfile(chain: ChainConfig, address: string): Promise<AddressProfile> {
  const [balance, code] = await Promise.all([
    rpcCall<string>(chain, 'eth_getBalance', [address, 'latest']),
    rpcCall<string>(chain, 'eth_getCode', [address, 'latest']),
  ]);

  return {
    address,
    balance: formatUnits(hexToBigInt(balance.value)),
    balanceSymbol: chain.symbol,
    isContract: Boolean(code.value && code.value !== '0x'),
    explorerUrl: `${chain.explorer}/address/${address}`,
  };
}

async function detectWallet(): Promise<WalletStatus> {
  const provider = getEthereumProvider();
  if (!provider?.request) return { installed: false, isMetaMask: false };

  try {
    const [accounts, chainId] = await Promise.all([
      provider.request({ method: 'eth_accounts' }) as Promise<string[]>,
      provider.request({ method: 'eth_chainId' }) as Promise<string>,
    ]);
    return { installed: true, isMetaMask: Boolean(provider.isMetaMask), address: accounts?.[0], chainId };
  } catch {
    return { installed: true, isMetaMask: Boolean(provider.isMetaMask) };
  }
}

function ChangeBadge({ value, label, compact = false }: { value?: number | null; label?: string; compact?: boolean }) {
  const positive = typeof value === 'number' && value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      )}
    >
      <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {label ? `${label} ` : ''}{formatPercent(value)}
    </span>
  );
}

function Sparkline({ prices, change }: { prices?: number[]; change?: number | null }) {
  const points = useMemo(() => {
    if (!prices || prices.length < 2) return '';
    const width = 220;
    const height = 64;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    return prices
      .map((price, index) => {
        const x = (index / (prices.length - 1)) * width;
        const y = height - ((price - min) / range) * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [prices]);

  return (
    <svg viewBox="0 0 220 64" className="h-16 w-full overflow-visible" role="img" aria-label="7日趋势">
      <polyline
        points={points}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={typeof change === 'number' && change < 0 ? 'stroke-rose-500' : 'stroke-emerald-500'}
      />
    </svg>
  );
}

function MetricTile({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-3 shadow-sm backdrop-blur md:p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-950 text-white"><Icon className="h-4 w-4" /></span>
        {label}
      </div>
      <div className="mt-3 truncate text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{value}</div>
      <div className="mt-1 truncate text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function CoinMarketRow({ coin, expanded, onToggle }: { coin: CoinMarket; expanded: boolean; onToggle: () => void }) {
  const rangePercent = getPriceRangePercent(coin);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-slate-200">
      <button type="button" onClick={onToggle} className="w-full px-3 py-3 text-left md:px-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,1.25fr)_0.85fr_0.7fr_0.7fr_0.78fr_0.78fr_auto]">
          <div className="flex min-w-0 items-center gap-3">
            <img src={coin.image} alt="" className="h-9 w-9 rounded-full" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950 md:text-base">{coin.name}</div>
              <div className="text-xs uppercase text-slate-400">#{coin.market_cap_rank} · {coin.symbol}</div>
            </div>
          </div>
          <div className="text-right md:text-left">
            <div className="text-sm font-semibold text-slate-950 md:text-base">{formatCurrency(coin.current_price, coin.current_price > 100 ? 0 : 2)}</div>
            <div className="mt-1 text-[11px] text-slate-400 md:hidden">量 {formatCompactCurrency(coin.total_volume)}</div>
          </div>
          <div className="hidden md:block"><ChangeBadge value={coin.price_change_percentage_24h} compact /></div>
          <div className="hidden md:block"><ChangeBadge value={coin.price_change_percentage_7d_in_currency} compact /></div>
          <div className="hidden text-sm font-medium text-slate-700 md:block">{formatCompactCurrency(coin.total_volume)}</div>
          <div className="hidden text-sm font-medium text-slate-700 md:block">{formatCompactCurrency(coin.market_cap)}</div>
          <ChevronDown className={cn('hidden h-4 w-4 justify-self-end text-slate-400 transition-transform md:block', expanded && 'rotate-180')} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 md:hidden">
          <div><ChangeBadge value={coin.price_change_percentage_24h} label="24h" compact /></div>
          <div><ChangeBadge value={coin.price_change_percentage_7d_in_currency} label="7d" compact /></div>
          <div className="text-right text-xs font-medium text-slate-500">市值 {formatCompactCurrency(coin.market_cap)}</div>
        </div>
      </button>

      <div className={cn('grid overflow-hidden border-t border-slate-100 transition-[grid-template-rows]', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-3 p-3 md:grid-cols-[0.72fr_1.28fr] md:p-4">
            <div className="rounded-2xl bg-slate-950 p-3 text-white md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-white/50">7日趋势</div>
                  <div className="mt-1 text-lg font-semibold">{coin.symbol.toUpperCase()}</div>
                </div>
                <ChangeBadge value={coin.price_change_percentage_7d_in_currency} compact />
              </div>
              <div className="mt-3 rounded-2xl bg-white/8 px-2 py-2">
                <Sparkline prices={coin.sparkline_in_7d?.price} change={coin.price_change_percentage_7d_in_currency} />
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-white/45">
                  <span>24h 低 {formatCurrency(coin.low_24h, 2)}</span>
                  <span>高 {formatCurrency(coin.high_24h, 2)}</span>
                </div>
                <div className="h-2 rounded-full bg-white/12">
                  <div className="h-2 rounded-full bg-white" style={{ width: `${rangePercent}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/45">当前价格位于 24h 区间约 {rangePercent.toFixed(0)}%</div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                <DetailItem label="1h" value={formatPercent(coin.price_change_percentage_1h_in_currency)} />
                <DetailItem label="24h" value={formatPercent(coin.price_change_percentage_24h)} />
                <DetailItem label="7d" value={formatPercent(coin.price_change_percentage_7d_in_currency)} />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <DetailItem label="市值排名" value={`#${coin.market_cap_rank}`} />
                <DetailItem label="市值" value={formatCompactCurrency(coin.market_cap)} />
                <DetailItem label="24h 成交量" value={formatCompactCurrency(coin.total_volume)} />
                <DetailItem label="当前价格" value={formatCurrency(coin.current_price, coin.current_price > 100 ? 0 : 2)} />
                <DetailItem label="24h 最高" value={formatCurrency(coin.high_24h, 2)} />
                <DetailItem label="24h 最低" value={formatCurrency(coin.low_24h, 2)} />
                <DetailItem label="流通供应" value={formatNumber(coin.circulating_supply)} />
                <DetailItem label="总供应" value={formatNumber(coin.total_supply)} />
                <DetailItem label="最大供应" value={formatNumber(coin.max_supply)} />
                <DetailItem label="ATH" value={formatCurrency(coin.ath, 2)} />
                <DetailItem label="距 ATH" value={formatPercent(coin.ath_change_percentage)} />
                <DetailItem label="更新时间" value={formatUpdatedAt(coin.last_updated)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChainPill({ chain, active, onClick }: { chain: ChainConfig; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-3 py-2 text-left text-sm transition-all',
        active ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
      )}
    >
      <div className="font-semibold">{chain.shortName}</div>
      <div className={cn('mt-0.5 text-xs', active ? 'text-white/55' : 'text-slate-400')}>Chain {chain.id}</div>
    </button>
  );
}

function WalletEnvironmentCard({ walletStatus, onConnect, connecting }: { walletStatus: WalletStatus; onConnect: () => void; connecting: boolean }) {
  return (
    <div className={cn(CARD, 'rounded-[24px] p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><PlugZap className="h-4 w-4" /> 钱包环境</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{walletStatus.installed ? '检测到浏览器钱包' : '未安装钱包'}</h3>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', walletStatus.installed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
          {walletStatus.installed ? '可连接' : '只读'}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className={cn(SOFT_CARD, 'flex items-center justify-between px-3 py-2')}><span className="text-slate-500">Provider</span><strong>{walletStatus.installed ? (walletStatus.isMetaMask ? 'MetaMask' : 'Injected') : '-'}</strong></div>
        <div className={cn(SOFT_CARD, 'flex items-center justify-between px-3 py-2')}><span className="text-slate-500">账户</span><strong>{shortAddress(walletStatus.address)}</strong></div>
        <div className={cn(SOFT_CARD, 'flex items-center justify-between px-3 py-2')}><span className="text-slate-500">网络</span><strong>{walletStatus.chainId || '-'}</strong></div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onConnect} disabled={!walletStatus.installed || connecting} className="rounded-2xl">
          {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
          {walletStatus.address ? '刷新钱包' : '连接钱包'}
        </Button>
        {!walletStatus.installed && (
          <a className="text-sm font-medium text-blue-600 hover:text-blue-700" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
            安装钱包 <ArrowUpRight className="inline h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ChainSnapshotCard({
  activeChain,
  snapshot,
  loading,
  error,
  onRefresh,
  onChainChange,
}: {
  activeChain: ChainConfig;
  snapshot: ChainSnapshot | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onChainChange: (id: number) => void;
}) {
  return (
    <div className={cn(CARD, 'rounded-[24px] p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><DatabaseZap className="h-4 w-4" /> 链上状态</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{activeChain.name}</h3>
        </div>
        <Button type="button" size="icon" variant="outline" className="rounded-2xl" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {CHAINS.map((chain) => <ChainPill key={chain.id} chain={chain} active={chain.id === activeChain.id} onClick={() => onChainChange(chain.id)} />)}
      </div>

      {error ? <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</div> : null}

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <DetailItem label="区块" value={snapshot ? snapshot.blockNumber.toLocaleString() : '-'} />
        <DetailItem label="Gas" value={snapshot ? `${snapshot.gasGwei} Gwei` : '-'} />
        <DetailItem label="延迟" value={snapshot ? `${snapshot.latencyMs} ms` : '-'} />
        <DetailItem label="更新" value={snapshot?.updatedAt || '-'} />
      </div>
    </div>
  );
}

function AddressQueryCard({
  activeChain,
  addressInput,
  setAddressInput,
  addressProfile,
  loading,
  error,
  copied,
  onCopy,
  onQuery,
  onUseSample,
}: {
  activeChain: ChainConfig;
  addressInput: string;
  setAddressInput: (value: string) => void;
  addressProfile: AddressProfile | null;
  loading: boolean;
  error: string;
  copied: boolean;
  onCopy: () => void;
  onQuery: () => void;
  onUseSample: () => void;
}) {
  return (
    <div className={cn(CARD, 'rounded-[24px] p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><Search className="h-4 w-4" /> 地址查询</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">余额 / 合约状态</h3>
        </div>
        <button type="button" onClick={onUseSample} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">示例</button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={addressInput}
          onChange={(event) => setAddressInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onQuery()}
          placeholder="0x..."
          className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 font-mono text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
        />
        <Button type="button" size="icon" className="h-11 w-11 rounded-2xl" onClick={onQuery} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}

      {addressProfile ? (
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-3 py-3 text-white">
            <span className="min-w-0 truncate font-mono">{shortAddress(addressProfile.address)}</span>
            <button type="button" onClick={onCopy} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/15" aria-label="复制地址">
              {copied ? <BadgeCheck className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DetailItem label="余额" value={`${addressProfile.balance} ${addressProfile.balanceSymbol}`} />
            <DetailItem label="类型" value={addressProfile.isContract ? '合约' : '账户'} />
          </div>
          <a href={addressProfile.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            打开 {activeChain.shortName} Explorer <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('h-5 animate-pulse rounded-full bg-slate-200', className)} />;
}

export function WalletModule() {
  const [activeChainId, setActiveChainId] = useState(CHAINS[0].id);
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [marketCoins, setMarketCoins] = useState<CoinMarket[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [marketUpdatedAt, setMarketUpdatedAt] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('bitcoin');
  const [addressInput, setAddressInput] = useState(DEFAULT_ADDRESS);
  const [addressProfile, setAddressProfile] = useState<AddressProfile | null>(null);
  const [addressError, setAddressError] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({ installed: false, isMetaMask: false });
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeChain = useMemo(() => CHAINS.find((item) => item.id === activeChainId) || CHAINS[0], [activeChainId]);
  const btc = marketCoins.find((coin) => coin.id === 'bitcoin');
  const eth = marketCoins.find((coin) => coin.id === 'ethereum');
  const totalVolume24h = useMemo(() => marketCoins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0), [marketCoins]);
  const totalMarketCap = useMemo(() => marketCoins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0), [marketCoins]);
  const risingCount = useMemo(() => marketCoins.filter((coin) => (coin.price_change_percentage_24h || 0) >= 0).length, [marketCoins]);
  const marketMood = marketCoins.length ? `${risingCount}/${marketCoins.length} 上涨` : '-';

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError('');
    try {
      const coins = await fetchMarkets();
      setMarketCoins(coins);
      setExpandedRowId((prev) => {
        if (prev === null) return null;
        return coins.some((coin) => coin.id === prev) ? prev : coins[0]?.id || null;
      });
      setMarketUpdatedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      setMarketError((error as Error).message || '行情读取失败');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    setSnapshotError('');
    try {
      setSnapshot(await fetchSnapshot(activeChain));
    } catch (error) {
      setSnapshot(null);
      setSnapshotError((error as Error).message || '链状态读取失败');
    } finally {
      setSnapshotLoading(false);
    }
  }, [activeChain]);

  const queryAddress = useCallback(
    async (nextAddress: string) => {
      const normalized = nextAddress.trim();
      if (!ADDRESS_RE.test(normalized)) {
        setAddressError('请输入合法的 EVM 地址');
        setAddressProfile(null);
        return;
      }

      setAddressLoading(true);
      setAddressError('');
      try {
        setAddressProfile(await fetchAddressProfile(activeChain, normalized));
      } catch (error) {
        setAddressProfile(null);
        setAddressError((error as Error).message || '地址查询失败');
      } finally {
        setAddressLoading(false);
      }
    },
    [activeChain],
  );

  const loadWalletStatus = useCallback(async () => {
    setWalletStatus(await detectWallet());
  }, []);

  const connectWallet = useCallback(async () => {
    const provider = getEthereumProvider();
    if (!provider?.request) return;
    setWalletConnecting(true);
    try {
      await provider.request({ method: 'eth_requestAccounts' });
      await loadWalletStatus();
    } finally {
      setWalletConnecting(false);
    }
  }, [loadWalletStatus]);

  useEffect(() => {
    void loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    setAddressInput(activeChain.sampleAddress);
    void queryAddress(activeChain.sampleAddress);
  }, [activeChain, queryAddress]);

  useEffect(() => {
    void loadWalletStatus();
  }, [loadWalletStatus]);

  const copyAddress = useCallback(async () => {
    if (!addressProfile) return;
    await navigator.clipboard?.writeText(addressProfile.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [addressProfile]);

  return (
    <section className="h-full min-h-0 overflow-auto bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] px-0 py-0 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
      <div className="flex w-full flex-col gap-3 md:gap-4">
        <div className="bg-slate-950 px-3 py-3 text-white shadow-[0_18px_56px_rgba(15,23,42,0.22)] md:px-5 md:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs text-white/50">钱包 · 主流币行情</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">集中行情列表</h1>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:w-[640px]">
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <div className="text-xs text-white/50">BTC</div>
                <div className="mt-0.5 text-base font-semibold">{btc ? formatCurrency(btc.current_price, 0) : '-'}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <div className="text-xs text-white/50">ETH</div>
                <div className="mt-0.5 text-base font-semibold">{eth ? formatCurrency(eth.current_price, 0) : '-'}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <div className="text-xs text-white/50">24h 成交量</div>
                <div className="mt-0.5 text-base font-semibold">{formatCompactCurrency(totalVolume24h)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <div className="text-xs text-white/50">市场情绪</div>
                <div className="mt-0.5 text-base font-semibold">{marketMood}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn(CARD, 'mx-0 overflow-hidden rounded-none border-x-0 md:mx-4 md:rounded-[28px] md:border-x xl:mx-5')}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 md:px-5 md:py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><BarChart3 className="h-4 w-4" /> 行情列表</div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">价格 / 涨跌幅 / 成交量 / 市值</h2>
            </div>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={loadMarket} disabled={marketLoading}>
              {marketLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              刷新
            </Button>
          </div>

          {marketError ? (
            <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:mx-5">
              <AlertTriangle className="h-4 w-4" /> {marketError}
            </div>
          ) : null}

          <div className="grid gap-2 px-3 py-3 md:px-5 md:py-4">
            <div className="hidden grid-cols-[minmax(0,1.25fr)_0.85fr_0.7fr_0.7fr_0.78fr_0.78fr_auto] px-4 text-xs font-medium text-slate-400 md:grid">
              <span>币种</span><span>价格</span><span>24h</span><span>7d</span><span>成交量</span><span>市值</span><span />
            </div>
            {marketLoading && marketCoins.length === 0
              ? Array.from({ length: 10 }).map((_, index) => <SkeletonLine key={index} className="h-[76px] w-full rounded-2xl" />)
              : marketCoins.map((coin) => (
                  <CoinMarketRow
                    key={coin.id}
                    coin={coin}
                    expanded={expandedRowId === coin.id}
                    onToggle={() => setExpandedRowId((prev) => (prev === coin.id ? null : coin.id))}
                  />
                ))}
          </div>
        </div>

        <div className="grid gap-2 px-3 md:grid-cols-4 md:px-4 xl:px-5">
          <MetricTile icon={CircleDollarSign} label="BTC 价格" value={btc ? formatCurrency(btc.current_price, 0) : '-'} hint="Bitcoin / USD" />
          <MetricTile icon={LineChart} label="ETH 价格" value={eth ? formatCurrency(eth.current_price, 0) : '-'} hint="Ethereum / USD" />
          <MetricTile icon={BarChart3} label="观察总市值" value={formatCompactCurrency(totalMarketCap)} hint="主流币合计" />
          <MetricTile icon={Activity} label="24h 成交量" value={formatCompactCurrency(totalVolume24h)} hint={`更新 ${marketUpdatedAt || '-'}`} />
        </div>

        <div className="grid gap-3 px-3 md:grid-cols-2 md:px-4 xl:grid-cols-[0.8fr_1.2fr] xl:px-5">
          <div className="grid gap-3">
            <WalletEnvironmentCard walletStatus={walletStatus} onConnect={connectWallet} connecting={walletConnecting} />
            <ChainSnapshotCard
              activeChain={activeChain}
              snapshot={snapshot}
              loading={snapshotLoading}
              error={snapshotError}
              onRefresh={loadSnapshot}
              onChainChange={setActiveChainId}
            />
          </div>

          <div className="grid gap-3">
            <AddressQueryCard
              activeChain={activeChain}
              addressInput={addressInput}
              setAddressInput={setAddressInput}
              addressProfile={addressProfile}
              loading={addressLoading}
              error={addressError}
              copied={copied}
              onCopy={copyAddress}
              onQuery={() => queryAddress(addressInput)}
              onUseSample={() => {
                setAddressInput(activeChain.sampleAddress);
                void queryAddress(activeChain.sampleAddress);
              }}
            />

            <div className={cn(CARD, 'rounded-[24px] p-4')}>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><ShieldCheck className="h-4 w-4" /> 安全边界</div>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">行情与查询均为只读</h3>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                {['不需要私钥或助记词', '不发起转账或授权', '不自动请求签名', '行情接口与公共 RPC 均免 Key'].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
