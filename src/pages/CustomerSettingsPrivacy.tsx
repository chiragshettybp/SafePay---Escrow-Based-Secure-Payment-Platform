import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Trash2, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { useCustomerSettings } from "@/hooks/useCustomerSettings";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CustomerSettingsPrivacy = () => {
  const navigate = useNavigate();
  const { privacyRequests, privacyRequestsLoading, createPrivacyRequest } = useCustomerSettings();
  const [requestingExport, setRequestingExport] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  const handleDataExport = async () => {
    setRequestingExport(true);
    await createPrivacyRequest.mutateAsync("data_export");
    setRequestingExport(false);
  };

  const handleAccountDeletion = async () => {
    setRequestingDeletion(true);
    await createPrivacyRequest.mutateAsync("account_deletion");
    setRequestingDeletion(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge className="gap-1 bg-blue-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingExport = privacyRequests?.find(
    (r) => r.request_type === "data_export" && r.status === "pending"
  );
  const pendingDeletion = privacyRequests?.find(
    (r) => r.request_type === "account_deletion" && r.status === "pending"
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Privacy & Data</h1>
            <p className="text-muted-foreground mt-1">
              Manage your data and privacy preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Download Data */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Download Your Data</CardTitle>
                    <CardDescription>
                      Get a copy of all your personal data stored on our platform
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Button
                  onClick={handleDataExport}
                  disabled={requestingExport || !!pendingExport}
                  className="w-full sm:w-auto"
                >
                  {requestingExport ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : pendingExport ? (
                    "Request Pending"
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Request Data Export
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  We'll prepare your data and notify you when it's ready for download
                </p>
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className="border-destructive/50">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg text-destructive">
                      Delete Account
                    </CardTitle>
                    <CardDescription>
                      Permanently delete your account and all associated data
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={requestingDeletion || !!pendingDeletion}
                      className="w-full sm:w-auto"
                    >
                      {pendingDeletion ? (
                        "Deletion Requested"
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Request Account Deletion
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="mx-4 sm:mx-0">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleAccountDeletion}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {requestingDeletion ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Yes, delete my account"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                  This request will be reviewed by our team before processing
                </p>
              </CardContent>
            </Card>

            {/* Request History */}
            {privacyRequests && privacyRequests.length > 0 && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg">Request History</CardTitle>
                  <CardDescription>
                    Track the status of your privacy requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="space-y-3">
                    {privacyRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {request.request_type === "data_export"
                              ? "Data Export"
                              : "Account Deletion"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSettingsPrivacy;
