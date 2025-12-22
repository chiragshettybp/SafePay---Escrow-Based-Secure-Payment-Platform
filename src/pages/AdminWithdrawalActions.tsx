import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAdminWithdrawalDetails, useWithdrawalActions } from "@/hooks/useAdminWithdrawals";
import { CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminWithdrawalActions() {
  const { withdrawal_id } = useParams<{ withdrawal_id: string }>();
  const { withdrawal } = useAdminWithdrawalDetails(withdrawal_id || "");
  const { withdrawalAction } = useWithdrawalActions();
  const [reason, setReason] = useState("");

  const handleAction = (action: "approve" | "reject" | "process" | "paid" | "failed" | "retry") => {
    if (!withdrawal_id) return;
    withdrawalAction.mutate({ withdrawalId: withdrawal_id, action, reason: reason || undefined });
    setReason("");
  };

  if (!withdrawal) return null;

  const ActionCard = ({ title, description, icon: Icon, action, variant, requiresReason }: any) => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {requiresReason && <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Enter reason..." value={reason} onChange={(e) => setReason(e.target.value)} /></div>}
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant={variant} className="w-full" disabled={requiresReason && !reason}>{title}</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirm {title}</AlertDialogTitle><AlertDialogDescription>Are you sure you want to {title.toLowerCase()}?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleAction(action)}>Confirm</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {withdrawal.status === "pending" && <ActionCard title="Approve" description="Approve this withdrawal request" icon={CheckCircle} action="approve" variant="default" />}
      {["pending", "approved"].includes(withdrawal.status) && <ActionCard title="Reject" description="Reject with reason" icon={XCircle} action="reject" variant="destructive" requiresReason />}
      {withdrawal.status === "approved" && <ActionCard title="Process" description="Start processing payment" icon={Clock} action="process" variant="outline" />}
      {withdrawal.status === "processing" && <ActionCard title="Mark Paid" description="Confirm payment completed" icon={DollarSign} action="paid" variant="default" />}
      {withdrawal.status === "processing" && <ActionCard title="Mark Failed" description="Mark as failed with reason" icon={AlertTriangle} action="failed" variant="destructive" requiresReason />}
      {withdrawal.status === "failed" && <ActionCard title="Retry" description="Retry the payout" icon={RefreshCw} action="retry" variant="outline" />}
    </div>
  );
}
