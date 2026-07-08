import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  Copy,
  DatabaseZap,
  Gauge,
  Globe2,
  Landmark,
  Loader2,
  PlugZap,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wifi,
} from 'lucide-react';
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
  accent: string;
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

const CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    accent: 'text-blue-600',
    rpcUrls: ['https://ethereum-rpc.publicnode.com', 'https://rpc.ankr.com/eth'],
    sampleAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    sampleLabel: 'Vitalik 公开地址',
  },
  {
    id: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    symbol: 'SepoliaETH',
    explorer: 'https://sepolia.etherscan.io',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    accent: 'text-emerald-600',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
    sampleAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    sampleLabel: 'Beacon Deposit Contract',
  },
  {
    id: 8453,
    name: 'Base Mainnet',
    shortName: 'Base',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
    gradient: 'from-sky-600 via-blue-600 to-blue-800',
    accent: 'text-sky-600',
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
    accent: 'text-fuchsia-600',
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com', 'https://polygon-rpc.com'],
    sampleAddress: '0x0000000000000000000000000000000000001010',
    sampleLabel: 'Polygon 原生币合约',
  },
];

const DEFAULT_ADDRESS = CHAINS[0].sampleAddress;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CARD = 'rounded-3xl border border-slate-200/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur';
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

function shortAddress(address?: string) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getEthereumProvider() {
  if (typeof window === 'undefined') return undefined;
  return window.ethereum;
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

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Activity; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Live</span>
      </div>
      <div className="mt-4 text-sm text-slate-500">{label}</div>
      <div className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
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
        'group relative overflow-hidden rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5',
        active ? 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-950/20' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300',
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', chain.gradient)} />
      <div className="flex items-center gap-2">
        <span className={cn('grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white', chain.gradient)}>
          <Globe2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{chain.shortName}</div>
          <div className={cn('text-xs', active ? 'text-white/60' : 'text-slate-400')}>Chain ID {chain.id}</div>
        </div>
      </div>
    </button>
  );
}

function WalletEnvironmentCard({ walletStatus, onConnect, connecting }: { walletStatus: WalletStatus; onConnect: () => void; connecting: boolean }) {
  return (
    <div className={cn(CARD, 'p-5')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <PlugZap className="h-4 w-4" /> 钱包环境
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">浏览器钱包检测</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">没有钱包也能读链上公开数据；安装钱包后可连接账户展示你的地址和网络。</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', walletStatus.installed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
          {walletStatus.installed ? '已检测到钱包' : '未安装钱包'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className={MUTED_CARD + ' p-3'}>
          <div className="text-xs text-slate-500">Provider</div>
          <div className="mt-1 font-semibold text-slate-950">{walletStatus.installed ? (walletStatus.isMetaMask ? 'MetaMask' : 'Injected Wallet') : '未检测到'}</div>
        </div>
        <div className={MUTED_CARD + ' p-3'}>
          <div className="text-xs text-slate-500">账户</div>
          <div className="mt-1 font-semibold text-slate-950">{shortAddress(walletStatus.address)}</div>
        </div>
        <div className={MUTED_CARD + ' p-3'}>
          <div className="text-xs text-slate-500">钱包网络</div>
          <div className="mt-1 font-semibold text-slate-950">{walletStatus.chainId || '-'}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onConnect} disabled={!walletStatus.installed || connecting} className="rounded-2xl">
          {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
          {walletStatus.address ? '刷新钱包状态' : '连接钱包'}
        </Button>
        {!walletStatus.installed && (
          <a className="text-sm font-medium text-blue-600 hover:text-blue-700" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
            安装 MetaMask <ArrowUpRight className="inline h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function WalletModule() {
  const [activeChainId, setActiveChainId] = useState(CHAINS[0].id);
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [addressInput, setAddressInput] = useState(DEFAULT_ADDRESS);
  const [addressProfile, setAddressProfile] = useState<AddressProfile | null>(null);
  const [addressError, setAddressError] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({ installed: false, isMetaMask: false });
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeChain = useMemo(() => CHAINS.find((item) => item.id === activeChainId) || CHAINS[0], [activeChainId]);

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
        setAddressError('请输入合法的 EVM 地址，格式为 0x 开头的 40 位十六进制字符');
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
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    void queryAddress(activeChain.sampleAddress);
    setAddressInput(activeChain.sampleAddress);
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
    <section className="h-full min-h-0 overflow-auto bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] px-4 py-5 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] md:p-7">
          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-80', activeChain.gradient)} />
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-40 w-96 -translate-x-1/2 rounded-full bg-black/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-sm backdrop-blur">
                <Sparkles className="h-4 w-4" /> Web3 只读看板 · 无需 Key · 无需钱包
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">钱包</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/76 md:text-base">
                使用公共 RPC 读取真实链上数据。你现在没有钱包也可以查看区块、Gas、RPC 延迟，并查询任意公开地址余额。
              </p>
            </div>
            <div className="grid gap-3 rounded-3xl border border-white/15 bg-white/12 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>当前网络</span>
                <span className="rounded-full bg-white/15 px-2 py-1 text-xs">Chain ID {activeChain.id}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-950">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{activeChain.name}</div>
                  <div className="text-sm text-white/60">{activeChain.symbol} · Public RPC</div>
                </div>
              </div>
              <Button type="button" variant="secondary" className="rounded-2xl bg-white text-slate-950 hover:bg-white/90" onClick={loadSnapshot} disabled={snapshotLoading}>
                {snapshotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                刷新链状态
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CHAINS.map((chain) => <ChainPill key={chain.id} chain={chain} active={chain.id === activeChain.id} onClick={() => setActiveChainId(chain.id)} />)}
        </div>

        {snapshotError && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" /> {snapshotError}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-4">
          {snapshotLoading && !snapshot ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <SkeletonLine className="w-20" />
                <SkeletonLine className="mt-6 h-8 w-32" />
                <SkeletonLine className="mt-3 w-24" />
              </div>
            ))
          ) : (
            <>
              <StatCard icon={DatabaseZap} label="区块高度" value={snapshot ? snapshot.blockNumber.toLocaleString() : '-'} hint="eth_blockNumber · latest" />
              <StatCard icon={Gauge} label="Gas 价格" value={snapshot ? `${snapshot.gasGwei} Gwei` : '-'} hint="eth_gasPrice" />
              <StatCard icon={Wifi} label="RPC 延迟" value={snapshot ? `${snapshot.latencyMs} ms` : '-'} hint={snapshot?.rpcUrl.replace('https://', '') || 'public rpc'} />
              <StatCard icon={Clock3} label="更新时间" value={snapshot?.updatedAt || '-'} hint={`network id ${snapshot?.networkId || '-'}`} />
            </>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={cn(CARD, 'overflow-hidden')}>
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Search className="h-4 w-4" /> 地址查询
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">查询任意公开地址</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">读取余额和合约状态，不需要钱包授权，也不会发起任何交易。</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddressInput(activeChain.sampleAddress);
                    void queryAddress(activeChain.sampleAddress);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  示例：{activeChain.sampleLabel}
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <input
                  value={addressInput}
                  onChange={(event) => setAddressInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void queryAddress()}
                  placeholder="0x..."
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                />
                <Button type="button" className="h-12 rounded-2xl px-5" onClick={() => queryAddress()} disabled={addressLoading}>
                  {addressLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  查询
                </Button>
              </div>
              {addressError && <div className="mt-3 text-sm text-rose-600">{addressError}</div>}
            </div>

            <div className="p-5">
              {addressLoading && !addressProfile ? (
                <div className="grid gap-3">
                  <SkeletonLine className="h-6 w-40" />
                  <SkeletonLine className="h-12 w-full" />
                  <SkeletonLine className="h-20 w-full" />
                </div>
              ) : addressProfile ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-white">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/50">Address</div>
                      <div className="mt-1 break-all font-mono text-sm md:text-base">{addressProfile.address}</div>
                    </div>
                    <button type="button" onClick={copyAddress} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/15" aria-label="复制地址">
                      {copied ? <BadgeCheck className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className={MUTED_CARD + ' p-4'}>
                      <div className="flex items-center gap-2 text-sm text-slate-500"><CircleDollarSign className="h-4 w-4" /> 余额</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">{addressProfile.balance}</div>
                      <div className="mt-1 text-sm text-slate-500">{addressProfile.balanceSymbol}</div>
                    </div>
                    <div className={MUTED_CARD + ' p-4'}>
                      <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4" /> 地址类型</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">{addressProfile.isContract ? '合约' : '账户'}</div>
                      <div className="mt-1 text-sm text-slate-500">eth_getCode</div>
                    </div>
                    <a href={addressProfile.explorerUrl} target="_blank" rel="noreferrer" className={cn(MUTED_CARD, 'group p-4 transition hover:border-slate-300 hover:bg-white')}>
                      <div className="flex items-center gap-2 text-sm text-slate-500"><ArrowUpRight className="h-4 w-4" /> 浏览器</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">打开</div>
                      <div className="mt-1 text-sm text-slate-500 group-hover:text-blue-600">{activeChain.shortName} Explorer</div>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">输入地址后可以读取真实余额和合约状态。</div>
              )}
            </div>
          </div>

          <div className="grid gap-5">
            <WalletEnvironmentCard walletStatus={walletStatus} onConnect={connectWallet} connecting={walletConnecting} />

            <div className={cn(CARD, 'p-5')}>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <ShieldCheck className="h-4 w-4" /> 安全边界
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">第一版只读，不触碰资产</h3>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {['不需要私钥或助记词', '不发起转账或授权', '不自动请求签名', '公共 RPC 只读取公开链上数据'].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> {item}
                  </div>
                ))}
              </div>
            </div>

            <div className={cn(CARD, 'overflow-hidden p-5')}>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Activity className="h-4 w-4" /> 技术栈预留
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {['Public RPC', 'JSON-RPC', 'Wallet Provider', 'shadcn 风格', '后续 wagmi', '后续 viem'].map((item) => (
                  <span key={item} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-slate-600">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
