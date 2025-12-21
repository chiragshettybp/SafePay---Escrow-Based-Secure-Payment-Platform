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
    
    // Upload documents
    const documentPaths: string[] = [];
    for (const file of files) {
      const path = await uploadDocument(file);
      if (path) {
        documentPaths.push(path);
      }
    }

    setUploading(false);

    // Create dispute
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
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Report Issue</h1>
              <p className="text-muted-foreground">
                Order #{order.id.slice(0, 8)} • {order.product_name}
              </p>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Submit a Dispute
              </CardTitle>
              <CardDescription>
                Please provide details about the issue you're experiencing with this order.
                Our team will review your dispute and respond within 24-48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Dispute</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please describe the issue in detail. Include any relevant information that will help us resolve your dispute."
                            className="min-h-[150px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* File Upload */}
                  <div className="space-y-3">
                    <FormLabel>Supporting Documents (Optional)</FormLabel>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, WebP or PDF (max 10MB, up to 5 files)
                        </p>
                      </label>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {file.type.startsWith("image/") ? (
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isCreatingDispute || uploading}
                      className="flex-1 sm:flex-none"
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                      className="flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
