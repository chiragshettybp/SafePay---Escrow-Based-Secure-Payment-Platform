import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAdminEscrowDetails, useEscrowActions } from "@/hooks/useAdminEscrow";
import { Lock, Unlock, Settings, Snowflake, MessageSquare, AlertTriangle, ShieldAlert } from "lucide-react";
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
    
    // Clear form after mutation starts
    escrowAction.mutate({
      escrowId: escrow_id,
      action,
      amount,
      reason: reason || `Admin ${action} action`,
    }, {
      onSuccess: () => {
        // Clear form fields on success
        setLockAmount("");
        setLockReason("");
        setUnlockAmount("");
        setUnlockReason("");
        setAdjustAmount("");
        setAdjustReason("");
        setFreezeReason("");
      }
    });
  };

  if (isLoading || !escrowAccount) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  // Check if actions are blocked (frozen account blocks all except unfreeze)
  const isFrozen = escrowAccount.is_frozen;
  const actionsBlocked = isFrozen;

  return (
    <div className="space-y-6">
      {/* Warning for Frozen Account */}
      {isFrozen && (
        <Alert variant="destructive" className="border-destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Account Frozen</AlertTitle>
          <AlertDescription>
            This escrow account is frozen. All actions except <strong>Unfreeze</strong> are blocked.
            You must unfreeze the account before performing any other operations.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lock Funds */}
        <Card className={actionsBlocked ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Lock Funds
              {actionsBlocked && <Badge variant="outline" className="ml-2 text-xs">Blocked</Badge>}
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
                disabled={actionsBlocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockReason">Reason (required, min 5 chars)</Label>
              <Textarea
                id="lockReason"
                placeholder="Reason for locking funds..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                disabled={actionsBlocked}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={actionsBlocked || !lockAmount || !lockReason || lockReason.length < 5 || parseFloat(lockAmount) <= 0 || parseFloat(lockAmount) > escrowAccount.available_balance || escrowAction.isPending}
                >
                  {escrowAction.isPending ? "Processing..." : "Lock Funds"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Confirm Lock Funds
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>You are about to lock <strong>{formatCurrency(parseFloat(lockAmount) || 0)}</strong>.</p>
                    <p>This will prevent the merchant from withdrawing these funds until unlocked.</p>
                    <p className="text-sm font-medium mt-2">Reason: {lockReason}</p>
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
        <Card className={actionsBlocked ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" /> Unlock Funds
              {actionsBlocked && <Badge variant="outline" className="ml-2 text-xs">Blocked</Badge>}
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
                disabled={actionsBlocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlockReason">Reason (required, min 5 chars)</Label>
              <Textarea
                id="unlockReason"
                placeholder="Reason for unlocking funds..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                disabled={actionsBlocked}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={actionsBlocked || !unlockAmount || !unlockReason || unlockReason.length < 5 || parseFloat(unlockAmount) <= 0 || parseFloat(unlockAmount) > escrowAccount.locked_balance || escrowAction.isPending}
                >
                  {escrowAction.isPending ? "Processing..." : "Unlock Funds"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Confirm Unlock Funds
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>You are about to unlock <strong>{formatCurrency(parseFloat(unlockAmount) || 0)}</strong>.</p>
                    <p>This will make these funds available for merchant withdrawal.</p>
                    <p className="text-sm font-medium mt-2">Reason: {unlockReason}</p>
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
        <Card className={actionsBlocked ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Adjust Balance
              {actionsBlocked && <Badge variant="outline" className="ml-2 text-xs">Blocked</Badge>}
            </CardTitle>
            <CardDescription>
              Add or subtract from available balance. Use negative for deduction. Current: {formatCurrency(escrowAccount.total_balance)}
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
                disabled={actionsBlocked}
              />
              {adjustAmount && parseFloat(adjustAmount) !== 0 && (
                <p className="text-sm text-muted-foreground">
                  New balance will be: {formatCurrency(escrowAccount.total_balance + (parseFloat(adjustAmount) || 0))}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustReason">Reason (required, min 5 chars)</Label>
              <Textarea
                id="adjustReason"
                placeholder="Reason for balance adjustment..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                disabled={actionsBlocked}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={actionsBlocked || !adjustAmount || !adjustReason || adjustReason.length < 5 || parseFloat(adjustAmount) === 0 || (escrowAccount.total_balance + parseFloat(adjustAmount)) < 0 || escrowAction.isPending}
                >
                  {escrowAction.isPending ? "Processing..." : "Apply Adjustment"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Confirm Balance Adjustment
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      You are about to {parseFloat(adjustAmount) > 0 ? "add" : "subtract"}{" "}
                      <strong>{formatCurrency(Math.abs(parseFloat(adjustAmount) || 0))}</strong>{" "}
                      {parseFloat(adjustAmount) > 0 ? "to" : "from"} the escrow balance.
                    </p>
                    <p>Current: {formatCurrency(escrowAccount.total_balance)} → New: {formatCurrency(escrowAccount.total_balance + (parseFloat(adjustAmount) || 0))}</p>
                    <p className="text-sm font-medium mt-2">Reason: {adjustReason}</p>
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

        {/* Freeze/Unfreeze Account - Always enabled */}
        <Card className={isFrozen ? "border-destructive bg-destructive/5" : "border-amber-500/50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Snowflake className={`h-5 w-5 ${isFrozen ? "text-destructive" : "text-amber-500"}`} />
              {isFrozen ? "Unfreeze Account" : "Freeze Account"}
              {isFrozen && <Badge variant="destructive" className="ml-2">Currently Frozen</Badge>}
            </CardTitle>
            <CardDescription>
              {isFrozen
                ? "Unfreeze to allow normal operations. Merchant will be notified."
                : "Freeze to prevent ALL transactions including withdrawals. This is a high-risk action."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="freezeReason">Reason (required, min 5 chars)</Label>
              <Textarea
                id="freezeReason"
                placeholder={`Reason for ${isFrozen ? "unfreezing" : "freezing"} the account...`}
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant={isFrozen ? "default" : "destructive"}
                  className="w-full"
                  disabled={!freezeReason || freezeReason.length < 5 || escrowAction.isPending}
                >
                  {escrowAction.isPending ? "Processing..." : (isFrozen ? "Unfreeze Account" : "Freeze Account")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <ShieldAlert className={`h-5 w-5 ${isFrozen ? "text-green-500" : "text-destructive"}`} />
                    Confirm {isFrozen ? "Unfreeze" : "Freeze"} Account
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    {isFrozen ? (
                      <>
                        <p>You are about to <strong>unfreeze</strong> this escrow account.</p>
                        <p>The merchant will be able to resume normal operations including withdrawals.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-destructive font-medium">⚠️ HIGH RISK ACTION</p>
                        <p>You are about to <strong>freeze</strong> this escrow account.</p>
                        <p>This will block ALL operations:</p>
                        <ul className="list-disc list-inside text-sm">
                          <li>All withdrawals blocked</li>
                          <li>Auto-confirm blocked</li>
                          <li>All admin actions (except unfreeze) blocked</li>
                        </ul>
                      </>
                    )}
                    <p className="text-sm font-medium mt-2">Reason: {freezeReason}</p>
                    <p className="text-sm text-muted-foreground">Merchant will be notified of this action.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={!isFrozen ? "bg-destructive hover:bg-destructive/90" : ""}
                    onClick={() => handleAction(isFrozen ? "unfreeze" : "freeze", undefined, freezeReason)}
                  >
                    Confirm {isFrozen ? "Unfreeze" : "Freeze"}
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
            <MessageSquare className="h-5 w-5" /> Admin Actions Audit Log
            <Badge variant="outline">{actionsLog.length} entries</Badge>
          </CardTitle>
          <CardDescription>
            Immutable record of all admin actions on this escrow account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {actionsLog.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No admin actions recorded</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {actionsLog.map((action) => (
                <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant={
                          action.action_type.includes("freeze") ? "destructive" :
                          action.action_type.includes("unfreeze") ? "default" :
                          "outline"
                        }
                      >
                        {action.action_type}
                      </Badge>
                      {action.amount !== null && action.amount !== 0 && (
                        <span className="font-mono text-sm font-medium">
                          {action.amount > 0 ? "+" : ""}{formatCurrency(action.amount)}
                        </span>
                      )}
                    </div>
                    {action.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{action.reason}</p>
                    )}
                    {action.ip_address && (
                      <p className="text-xs text-muted-foreground mt-1">IP: {action.ip_address}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(action.created_at), "MMM d, yyyy HH:mm")}
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