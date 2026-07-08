import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Coins,
  Copy,
  DatabaseZap,
  Gauge,
  Globe2,
  Landmark,
  LineChart,
  Loader2,
  PlugZap,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wifi,
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
  gradient: string;
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
  price_change_percentage_7d_in_currency?: number | null;
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
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
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
    gradient: 'from-sky-600 via-blue-600 to-blue-800',
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
    gradient: 'from-fuchsia-600 via-purple-600 to-indigo-600',
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
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
    sampleAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    sampleLabel: 'Beacon Deposit Contract',
  },
];

const DEFAULT_ADDRESS = CHAINS[0].sampleAddress;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CARD = 'rounded-[28px] border border-slate-200/70 bg-white/92 shadow-[0_18px_58px_rgba(15,23,42,0.08)] backdrop-blur';
const MUTED_CARD = 'rounded-2xl border border-slate-200/70 bg-slate-50/80';

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

function formatPercent(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function shortAddress(address?: string) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getEthereumProvider() {
  if (typeof window === 'undefined') return undefined;
  return window.ethereum;
}

async function fetchMarkets(): Promise<CoinMarket[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids: MARKET_IDS.join(','),
    order: 'market_cap_desc',
    per_page: '12',
    page: '1',
    sparkline: 'true',
    price_change_percentage: '7d',
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

function ChangeBadge({ value, compact = false }: { value?: number | null; compact?: boolean }) {
  const positive = typeof value === 'number' && value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold',
        compact ? 'text-[11px]' : 'text-xs',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      )}
    >
      <Icon className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {formatPercent(value)}
    </span>
  );
}

function Sparkline({ prices, change }: { prices?: number[]; change?: number | null }) {
  const points = useMemo(() => {
    if (!prices || prices.length < 2) return '';
    const width = 180;
    const height = 54;
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
    <svg viewBox="0 0 180 54" className="h-12 w-full overflow-visible" role="img" aria-label="7日趋势">
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

function MarketMetric({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-3.5 shadow-sm backdrop-blur md:p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-950 text-white">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </div>
      <div className="mt-3 truncate text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{value}</div>
      <div className="mt-1 truncate text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function FocusCoinCard({ coin }: { coin: CoinMarket }) {
  return (
    <div className="min-w-[240px] rounded-[26px] border border-white/70 bg-white/90 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)] md:min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={coin.image} alt="" className="h-11 w-11 rounded-full" />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-950">{coin.name}</div>
            <div className="mt-0.5 text-xs uppercase text-slate-400">#{coin.market_cap_rank} · {coin.symbol}</div>
          </div>
        </div>
        <ChangeBadge value={coin.price_change_percentage_24h} compact />
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(coin.current_price, coin.current_price > 100 ? 0 : 2)}</div>
          <div className="mt-1 text-xs text-slate-500">24h 高 {formatCurrency(coin.high_24h, 2)} · 低 {formatCurrency(coin.low_24h, 2)}</div>
        </div>
      </div>
      <div className="mt-3">
        <Sparkline prices={coin.sparkline_in_7d?.price} change={coin.price_change_percentage_7d_in_currency} />
      </div>
    </div>
  );
}

function CoinRow({ coin }: { coin: CoinMarket }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_auto] gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm md:grid-cols-[minmax(0,1.3fr)_0.85fr_0.75fr_0.75fr] md:items-center md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <img src={coin.image} alt="" className="h-9 w-9 rounded-full" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950 md:text-base">{coin.name}</div>
          <div className="text-xs uppercase text-slate-400">#{coin.market_cap_rank} · {coin.symbol}</div>
        </div>
      </div>
      <div className="text-right md:text-left">
        <div className="text-sm font-semibold text-slate-950 md:text-base">{formatCurrency(coin.current_price, coin.current_price > 100 ? 0 : 2)}</div>
        <div className="mt-1 md:hidden"><ChangeBadge value={coin.price_change_percentage_24h} compact /></div>
      </div>
      <div className="hidden md:block"><ChangeBadge value={coin.price_change_percentage_24h} /></div>
      <div className="hidden text-sm text-slate-600 md:block">{formatCompactCurrency(coin.market_cap)}</div>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('h-5 animate-pulse rounded-full bg-slate-200', className)} />;
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
    <div className={cn(CARD, 'p-4 md:p-5')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <PlugZap className="h-4 w-4" /> 钱包环境
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{walletStatus.installed ? '检测到浏览器钱包' : '未安装钱包'}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">未安装钱包也能看行情；安装后可连接账户展示地址。</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', walletStatus.installed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
          {walletStatus.installed ? '可连接' : '只读模式'}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className={cn(MUTED_CARD, 'flex items-center justify-between px-3 py-2')}><span className="text-slate-500">Provider</span><strong>{walletStatus.installed ? (walletStatus.isMetaMask ? 'MetaMask' : 'Injected') : '-'}</strong></div>
        <div className={cn(MUTED_CARD, 'flex items-center justify-between px-3 py-2')}><span className="text-slate-500">账户</span><strong>{shortAddress(walletStatus.address)}</strong></div>
        <div className={cn(MUTED_CARD, 'flex items-center justify-between px-3 py-2')}><span className="text-slate-500">网络</span><strong>{walletStatus.chainId || '-'}</strong></div>
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
    <div className={cn(CARD, 'p-4 md:p-5')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><DatabaseZap className="h-4 w-4" /> 链上状态</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{activeChain.name}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">辅助信息：区块高度、Gas 与 RPC 延迟。</p>
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
        <div className={cn(MUTED_CARD, 'p-3')}><div className="text-slate-500">区块</div><strong className="mt-1 block text-slate-950">{snapshot ? snapshot.blockNumber.toLocaleString() : '-'}</strong></div>
        <div className={cn(MUTED_CARD, 'p-3')}><div className="text-slate-500">Gas</div><strong className="mt-1 block text-slate-950">{snapshot ? `${snapshot.gasGwei} Gwei` : '-'}</strong></div>
        <div className={cn(MUTED_CARD, 'p-3')}><div className="text-slate-500">延迟</div><strong className="mt-1 block text-slate-950">{snapshot ? `${snapshot.latencyMs} ms` : '-'}</strong></div>
        <div className={cn(MUTED_CARD, 'p-3')}><div className="text-slate-500">更新</div><strong className="mt-1 block text-slate-950">{snapshot?.updatedAt || '-'}</strong></div>
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
    <div className={cn(CARD, 'p-4 md:p-5')}>
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
            <div className={cn(MUTED_CARD, 'p-3')}><div className="text-slate-500">余额</div><strong className="mt-1 block text-slate-950">{addressProfile.balance} {addressProfile.balanceSymbol}</strong></div>
            <div className={cn(MUTED_CARD, 'p-3')}><div className="text-slate-500">类型</div><strong className="mt-1 block text-slate-950">{addressProfile.isContract ? '合约' : '账户'}</strong></div>
          </div>
          <a href={addressProfile.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            打开 {activeChain.shortName} Explorer <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
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
  const [addressInput, setAddressInput] = useState(DEFAULT_ADDRESS);
  const [addressProfile, setAddressProfile] = useState<AddressProfile | null>(null);
  const [addressError, setAddressError] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({ installed: false, isMetaMask: false });
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeChain = useMemo(() => CHAINS.find((item) => item.id === activeChainId) || CHAINS[0], [activeChainId]);
  const focusCoins = marketCoins.slice(0, 3);
  const btc = marketCoins.find((coin) => coin.id === 'bitcoin');
  const eth = marketCoins.find((coin) => coin.id === 'ethereum');
  const totalTrackedMarketCap = useMemo(() => marketCoins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0), [marketCoins]);
  const risingCount = useMemo(() => marketCoins.filter((coin) => (coin.price_change_percentage_24h || 0) >= 0).length, [marketCoins]);
  const marketMood = marketCoins.length ? `${risingCount}/${marketCoins.length} 上涨` : '-';

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError('');
    try {
      const coins = await fetchMarkets();
      setMarketCoins(coins);
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
    async (nextAddress = addressInput) => {
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
    [activeChain, addressInput],
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
    <section className="h-full min-h-0 overflow-auto bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] px-3 py-4 pb-[calc(90px+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-slate-950 p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] md:p-7">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900" />
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl" />
          <div className="absolute -bottom-20 left-12 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs backdrop-blur md:text-sm">
                <Sparkles className="h-4 w-4" /> 加密货币行情 · 无需 Key · 实时读取
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">钱包行情</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72 md:text-base">
                第一屏集中展示币价、涨跌幅、市值和成交量；链上地址查询与钱包连接放在下方作为辅助能力。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/15 bg-white/10 p-3 backdrop-blur-md md:grid-cols-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white/12 p-3">
                <div className="text-xs text-white/55">BTC</div>
                <div className="mt-1 text-lg font-semibold">{btc ? formatCurrency(btc.current_price, 0) : '-'}</div>
                <div className="mt-1"><ChangeBadge value={btc?.price_change_percentage_24h} compact /></div>
              </div>
              <div className="rounded-2xl bg-white/12 p-3">
                <div className="text-xs text-white/55">ETH</div>
                <div className="mt-1 text-lg font-semibold">{eth ? formatCurrency(eth.current_price, 0) : '-'}</div>
                <div className="mt-1"><ChangeBadge value={eth?.price_change_percentage_24h} compact /></div>
              </div>
              <div className="rounded-2xl bg-white/12 p-3">
                <div className="text-xs text-white/55">观察市值</div>
                <div className="mt-1 text-lg font-semibold">{formatCompactCurrency(totalTrackedMarketCap)}</div>
                <div className="mt-1 text-xs text-white/50">Top {marketCoins.length || 12}</div>
              </div>
              <div className="rounded-2xl bg-white/12 p-3">
                <div className="text-xs text-white/55">市场情绪</div>
                <div className="mt-1 text-lg font-semibold">{marketMood}</div>
                <div className="mt-1 text-xs text-white/50">24h 涨跌统计</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MarketMetric icon={CircleDollarSign} label="BTC 价格" value={btc ? formatCurrency(btc.current_price, 0) : '-'} hint="Bitcoin / USD" />
          <MarketMetric icon={LineChart} label="ETH 价格" value={eth ? formatCurrency(eth.current_price, 0) : '-'} hint="Ethereum / USD" />
          <MarketMetric icon={BarChart3} label="观察市值" value={formatCompactCurrency(totalTrackedMarketCap)} hint="当前列表合计" />
          <MarketMetric icon={Activity} label="市场情绪" value={marketMood} hint={`更新 ${marketUpdatedAt || '-'}`} />
        </div>

        <div className={cn(CARD, 'overflow-hidden')}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 md:p-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><Coins className="h-4 w-4" /> 行情列表</div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">主流币价格与涨跌幅</h2>
            </div>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={loadMarket} disabled={marketLoading}>
              {marketLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              刷新行情
            </Button>
          </div>

          {marketError && <div className="mx-4 mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-700 md:mx-5">{marketError}</div>}

          <div className="border-b border-slate-100 p-4 md:p-5">
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
              {marketLoading && focusCoins.length === 0
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="min-w-[240px] rounded-[26px] border border-slate-100 bg-white p-4 md:min-w-0">
                      <SkeletonLine className="h-10 w-32" />
                      <SkeletonLine className="mt-6 h-8 w-36" />
                      <SkeletonLine className="mt-4 h-12 w-full" />
                    </div>
                  ))
                : focusCoins.map((coin) => <FocusCoinCard key={coin.id} coin={coin} />)}
            </div>
          </div>

          <div className="grid gap-2 p-4 md:p-5">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_0.85fr_0.75fr_0.75fr] px-4 text-xs font-medium text-slate-400 md:grid">
              <span>币种</span><span>价格</span><span>24h</span><span>市值</span>
            </div>
            {marketLoading && marketCoins.length === 0
              ? Array.from({ length: 8 }).map((_, index) => <SkeletonLine key={index} className="h-16 w-full rounded-2xl" />)
              : marketCoins.map((coin) => <CoinRow key={coin.id} coin={coin} />)}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-4">
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

          <div className="grid gap-4">
            <AddressQueryCard
              activeChain={activeChain}
              addressInput={addressInput}
              setAddressInput={setAddressInput}
              addressProfile={addressProfile}
              loading={addressLoading}
              error={addressError}
              copied={copied}
              onCopy={copyAddress}
              onQuery={() => queryAddress()}
              onUseSample={() => {
                setAddressInput(activeChain.sampleAddress);
                void queryAddress(activeChain.sampleAddress);
              }}
            />

            <div className={cn(CARD, 'p-4 md:p-5')}>
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
