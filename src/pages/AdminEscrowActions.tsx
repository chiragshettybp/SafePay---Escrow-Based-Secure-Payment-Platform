import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAdminEscrowDetails, useEscrowActions } from "@/hooks/useAdminEscrow";
import { Lock, Unlock, Settings, Snowflake, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function AdminEscrowActions() {
  const { escrow_id } = useParams<{ escrow_id: string }>();
  const { escrowAccount, actionsLog, isLoading } = useAdminEscrowDetails(escrow_id || "");
  const { escrowAction } = useEscrowActions();

  const [lockAmount, setLockAmount] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [unlockAmount, setUnlockAmount] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [freezeReason, setFreezeReason] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAction = (action: "lock" | "unlock" | "adjust" | "freeze" | "unfreeze", amount?: number, reason?: string) => {
    if (!escrow_id) return;
    escrowAction.mutate({
      escrowId: escrow_id,
      action,
      amount,
      reason: reason || `Admin ${action} action`,
    });
  };

  if (isLoading || !escrowAccount) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lock Funds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Lock Funds
            </CardTitle>
            <CardDescription>
              Lock funds to prevent withdrawal. Available: {formatCurrency(escrowAccount.available_balance)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lockAmount">Amount to Lock</Label>
              <Input
                id="lockAmount"
                type="number"
                placeholder="0.00"
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockReason">Reason (required)</Label>
              <Textarea
                id="lockReason"
                placeholder="Reason for locking funds..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={!lockAmount || !lockReason || parseFloat(lockAmount) <= 0 || escrowAction.isPending}
                >
                  Lock Funds
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Lock Funds</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to lock {formatCurrency(parseFloat(lockAmount) || 0)}. This will prevent the merchant from withdrawing these funds.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction("lock", parseFloat(lockAmount), lockReason)}>
                    Confirm Lock
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Unlock Funds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" /> Unlock Funds
            </CardTitle>
            <CardDescription>
              Release locked funds. Locked: {formatCurrency(escrowAccount.locked_balance)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlockAmount">Amount to Unlock</Label>
              <Input
                id="unlockAmount"
                type="number"
                placeholder="0.00"
                value={unlockAmount}
                onChange={(e) => setUnlockAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlockReason">Reason (required)</Label>
              <Textarea
                id="unlockReason"
                placeholder="Reason for unlocking funds..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!unlockAmount || !unlockReason || parseFloat(unlockAmount) <= 0 || escrowAction.isPending}
                >
                  Unlock Funds
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Unlock Funds</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to unlock {formatCurrency(parseFloat(unlockAmount) || 0)}. This will make these funds available for withdrawal.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction("unlock", parseFloat(unlockAmount), unlockReason)}>
                    Confirm Unlock
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Adjust Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Adjust Balance
            </CardTitle>
            <CardDescription>
              Add or subtract from available balance. Use negative for deduction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjustAmount">Adjustment Amount</Label>
              <Input
                id="adjustAmount"
                type="number"
                placeholder="e.g., 100 or -50"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustReason">Reason (required)</Label>
              <Textarea
                id="adjustReason"
                placeholder="Reason for balance adjustment..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={!adjustAmount || !adjustReason || parseFloat(adjustAmount) === 0 || escrowAction.isPending}
                >
                  Apply Adjustment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Balance Adjustment</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to {parseFloat(adjustAmount) > 0 ? "add" : "subtract"} {formatCurrency(Math.abs(parseFloat(adjustAmount) || 0))} {parseFloat(adjustAmount) > 0 ? "to" : "from"} the escrow balance.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction("adjust", parseFloat(adjustAmount), adjustReason)}>
                    Confirm Adjustment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Freeze/Unfreeze Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Snowflake className="h-5 w-5" /> {escrowAccount.is_frozen ? "Unfreeze Account" : "Freeze Account"}
            </CardTitle>
            <CardDescription>
              {escrowAccount.is_frozen
                ? "Unfreeze to allow normal operations"
                : "Freeze to prevent all transactions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="freezeReason">Reason (required)</Label>
              <Textarea
                id="freezeReason"
                placeholder={`Reason for ${escrowAccount.is_frozen ? "unfreezing" : "freezing"}...`}
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant={escrowAccount.is_frozen ? "default" : "destructive"}
                  className="w-full"
                  disabled={!freezeReason || escrowAction.isPending}
                >
                  {escrowAccount.is_frozen ? "Unfreeze Account" : "Freeze Account"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm {escrowAccount.is_frozen ? "Unfreeze" : "Freeze"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {escrowAccount.is_frozen
                      ? "This will allow the merchant to perform transactions again."
                      : "This will prevent all transactions on this escrow account until unfrozen."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleAction(escrowAccount.is_frozen ? "unfreeze" : "freeze", undefined, freezeReason)}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Actions Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Admin Actions Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionsLog.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No admin actions recorded</p>
          ) : (
            <div className="space-y-3">
              {actionsLog.map((action) => (
                <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{action.action_type}</Badge>
                      {action.amount && (
                        <span className="font-mono text-sm">{formatCurrency(action.amount)}</span>
                      )}
                    </div>
                    {action.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{action.reason}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(action.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
