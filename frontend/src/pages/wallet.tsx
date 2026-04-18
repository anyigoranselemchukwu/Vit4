import { useState } from "react";
import {
  useGetWallet, useListTransactions, useInitiateDeposit, useWithdraw, useConvertCurrency,
} from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, Landmark, ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const CURRENCIES = ["NGN", "USD", "USDT", "PI", "VITCoin"];
const SYM: Record<string, string> = { NGN: "₦", USD: "$", USDT: "₮", PI: "π", VITCoin: "VIT " };

function BalanceCard({ label, value, symbol, highlight }: { label: string; value: number; symbol: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 space-y-1 ${highlight ? "border-secondary/40 bg-secondary/5" : "border-border bg-card/30"}`}>
      <div className="text-xs font-mono text-muted-foreground uppercase">{label}</div>
      <div className={`text-xl font-bold font-mono ${highlight ? "text-secondary" : ""}`}>
        {symbol}{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { data: wallet, isLoading: loadingWallet } = useGetWallet();
  const { data: txData, isLoading: loadingTx } = useListTransactions({ limit: 50 });

  const initiateDeposit = useInitiateDeposit();
  const withdraw = useWithdraw();
  const convert = useConvertCurrency();

  const [depositCurrency, setDepositCurrency] = useState("NGN");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("paystack");

  const [withdrawCurrency, setWithdrawCurrency] = useState("NGN");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("");
  const [withdrawDestType, setWithdrawDestType] = useState("bank_account");

  const [convertFrom, setConvertFrom] = useState("NGN");
  const [convertTo, setConvertTo] = useState("VITCoin");
  const [convertAmount, setConvertAmount] = useState("");

  if (loadingWallet || loadingTx) {
    return <div className="h-full flex items-center justify-center font-mono text-muted-foreground">SYNCING_BLOCKCHAIN...</div>;
  }

  if (!wallet) return null;

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const result = await initiateDeposit.mutateAsync({
        currency: depositCurrency,
        amount: parseFloat(depositAmount),
        method: depositMethod,
      });
      if (result.payment_link && !result.payment_link.includes("paystack.com/pay/vit-sports")) {
        window.open(result.payment_link, "_blank");
        toast.success(`Payment window opened — ref: ${result.reference}`);
      } else {
        toast.success(
          `Deposit queued — ref: ${result.reference}. Complete payment via your gateway.`,
          { duration: 6000 }
        );
      }
      setDepositAmount("");
    } catch (e: any) {
      toast.error(e.message || "Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdraw.mutateAsync({
        currency: withdrawCurrency,
        amount: parseFloat(withdrawAmount),
        destination: withdrawDest,
        destination_type: withdrawDestType,
      });
      toast.success("Withdrawal request submitted");
    } catch (e: any) {
      toast.error(e.message || "Withdrawal failed");
    }
  };

  const handleConvert = async () => {
    try {
      await convert.mutateAsync({
        from_currency: convertFrom,
        to_currency: convertTo,
        amount: parseFloat(convertAmount),
      });
      toast.success("Conversion successful");
    } catch (e: any) {
      toast.error(e.message || "Conversion failed");
    }
  };

  const transactions = txData?.transactions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Treasury</h1>
        <p className="text-muted-foreground font-mono text-sm">Multi-currency asset management</p>
      </div>

      {wallet.is_frozen && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive font-mono text-sm">
          <AlertTriangle className="w-4 h-4" />
          WALLET_FROZEN — Contact support to unfreeze
        </div>
      )}

      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <ShieldCheck className={`w-4 h-4 ${wallet.kyc_verified ? "text-primary" : "text-muted-foreground"}`} />
        KYC: {wallet.kyc_verified ? "VERIFIED" : "PENDING"}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <BalanceCard label="NGN" value={wallet.ngn_balance} symbol="₦" />
        <BalanceCard label="USD" value={wallet.usd_balance} symbol="$" />
        <BalanceCard label="USDT" value={wallet.usdt_balance} symbol="₮" />
        <BalanceCard label="PI Network" value={wallet.pi_balance} symbol="π" />
        <BalanceCard label="VITCoin" value={wallet.vitcoin_balance} symbol="VIT " highlight />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">
              <ArrowUpRight className="w-4 h-4 mr-2" /> Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="font-mono">
            <DialogHeader><DialogTitle className="font-mono uppercase">Deposit Funds</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Currency</label>
                <Select value={depositCurrency} onValueChange={setDepositCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Amount</label>
                <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Method</label>
                <Select value={depositMethod} onValueChange={setDepositMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paystack">Paystack (NGN)</SelectItem>
                    <SelectItem value="stripe">Stripe (USD)</SelectItem>
                    <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                    <SelectItem value="pi">Pi Network</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleDeposit} disabled={initiateDeposit.isPending || !depositAmount}>
                {initiateDeposit.isPending ? "PROCESSING..." : "INITIATE_DEPOSIT"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              <ArrowDownLeft className="w-4 h-4 mr-2" /> Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent className="font-mono">
            <DialogHeader><DialogTitle className="font-mono uppercase">Withdraw Funds</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Currency</label>
                <Select value={withdrawCurrency} onValueChange={setWithdrawCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Amount</label>
                <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Destination</label>
                <Input value={withdrawDest} onChange={(e) => setWithdrawDest(e.target.value)} placeholder="Bank acc / wallet address" className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Destination Type</label>
                <Select value={withdrawDestType} onValueChange={setWithdrawDestType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_account">Bank Account</SelectItem>
                    <SelectItem value="usdt_address">USDT Address</SelectItem>
                    <SelectItem value="pi_wallet">PI Wallet</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" variant="outline" onClick={handleWithdraw} disabled={withdraw.isPending || !withdrawAmount || !withdrawDest}>
                {withdraw.isPending ? "PROCESSING..." : "SUBMIT_WITHDRAWAL"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full" variant="secondary">
              <RefreshCcw className="w-4 h-4 mr-2" /> Convert
            </Button>
          </DialogTrigger>
          <DialogContent className="font-mono">
            <DialogHeader><DialogTitle className="font-mono uppercase">Convert Currency</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">From</label>
                <Select value={convertFrom} onValueChange={setConvertFrom}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">To</label>
                <Select value={convertTo} onValueChange={setConvertTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.filter((c) => c !== convertFrom).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Amount ({convertFrom})</label>
                <Input type="number" value={convertAmount} onChange={(e) => setConvertAmount(e.target.value)} placeholder="0.00" className="font-mono" />
              </div>
              <Button className="w-full" variant="secondary" onClick={handleConvert} disabled={convert.isPending || !convertAmount}>
                {convert.isPending ? "CONVERTING..." : "EXECUTE_CONVERSION"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 backdrop-blur border-border">
        <CardHeader>
          <CardTitle className="font-mono uppercase flex items-center">
            <Landmark className="w-5 h-5 mr-2 text-primary" />
            Transaction Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground font-mono uppercase bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Currency</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">
                      {tx.reference || tx.id.slice(0, 12) + "…"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] uppercase">{tx.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase">{tx.currency}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] uppercase ${
                        tx.status === "completed" ? "text-primary border-primary/30" :
                        tx.status === "failed" ? "text-destructive border-destructive/30" :
                        "text-yellow-500 border-yellow-500/30"
                      }`}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(tx.created_at), "yyyy-MM-dd HH:mm")}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${tx.direction === "credit" ? "text-primary" : "text-destructive"}`}>
                      {tx.direction === "credit" ? "+" : "−"}{SYM[tx.currency] ?? ""}{Number(tx.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground font-mono">NO_TRANSACTIONS_FOUND</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
