import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useOrder } from "@/hooks/useOrders";
import { useDisputes } from "@/hooks/useDisputes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertTriangle,
  Upload,
  X,
  Loader2,
  FileText,
  ImageIcon,
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { toast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const formSchema = z.object({
  reason: z.string().min(1, "Please select a reason"),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000, "Description must be less than 1000 characters"),
});

type FormValues = z.infer<typeof formSchema>;

const reasonOptions = [
  { value: "not_received", label: "Item Not Received" },
  { value: "wrong_item", label: "Wrong Item Delivered" },
  { value: "damaged", label: "Item Damaged" },
  { value: "not_as_described", label: "Item Not As Described" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "other", label: "Other" },
];

export default function ReportIssue() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading: orderLoading } = useOrder(orderId || "");
  const { createDispute, isCreatingDispute, uploadDocument } = useDisputes();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
      description: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormValues) => {
    if (!orderId) return;

    setUploading(true);
    
    const documentPaths: string[] = [];
    for (const file of files) {
      const path = await uploadDocument(file);
      if (path) {
        documentPaths.push(path);
      }
    }

    setUploading(false);

    createDispute({
      order_id: orderId,
      reason: data.reason,
      description: data.description,
      issue_type: "other",
      documents: documentPaths,
    }, {
      onSuccess: () => {
        navigate(`/order/${orderId}`);
      },
    });
  };

  if (orderLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-sm glass-card text-center">
              <CardContent className="pt-6 pb-6">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">Order Not Found</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  The order doesn't exist or you don't have access.
                </p>
                <Button asChild className="w-full">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex flex-col pb-24">
          {/* Header */}
          <div className="mb-4 px-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-3 -ml-2 h-9"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Report Issue</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Order #{order.id.slice(0, 8)} • {order.product_name}
            </p>
          </div>

          {/* Form */}
          <Card className="glass-card mx-1">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Submit a Dispute
              </CardTitle>
              <CardDescription className="text-xs">
                Our team will review and respond within 24-48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Reason for Dispute</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {reasonOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the issue in detail..."
                            className="min-h-[120px] resize-none text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* File Upload */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm">Supporting Documents (Optional)</FormLabel>
                    <div 
                      className="border-2 border-dashed border-border rounded-xl p-5 text-center active:bg-muted/30"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Tap to upload files
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        JPG, PNG, WebP or PDF (max 10MB, up to 5 files)
                      </p>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {file.type.startsWith("image/") ? (
                                <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Sticky Bottom Actions */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border z-40">
            <div className="flex gap-3 max-w-lg mx-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingDispute || uploading}
                className="flex-1 h-12"
                onClick={form.handleSubmit(onSubmit)}
              >
                {isCreatingDispute || uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploading ? "Uploading..." : "Submitting..."}
                  </>
                ) : (
                  "Submit Dispute"
                )}
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
