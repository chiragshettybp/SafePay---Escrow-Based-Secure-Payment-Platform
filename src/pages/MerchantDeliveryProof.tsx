import { useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantDeliveryProof } from "@/hooks/useMerchantDeliveryProof";
import { useMerchantOrderDetails } from "@/hooks/useMerchantOrderDetails";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Upload,
  Loader2,
  AlertTriangle,
  Package,
  X,
  ImageIcon,
  FileText,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function MerchantDeliveryProof() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { order, deliveryProofs, isLoading: orderLoading } = useMerchantOrderDetails(orderId);
  const { saveProof, isSaving } = useMerchantDeliveryProof(orderId);

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      if (files.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Use JPG, PNG, WebP, or PDF`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum 10MB`);
        return;
      }
      newFiles.push(file);
    });

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
    }

    setFiles([...files, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    saveProof(
      { files, notes },
      {
        onSuccess: () => {
          navigate(`/merchant/order/${orderId}`);
        },
      }
    );
  };

  if (orderLoading) {
    return (
      <MerchantLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </MerchantLayout>
    );
  }

  if (!order) {
    return (
      <MerchantLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This order doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/merchant/orders">Back to Orders</Link>
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo
        title="Upload Delivery Proof | Merchant Portal"
        description="Upload proof of delivery for your order"
        canonicalPath={`/merchant/order/${orderId}/delivery-proof`}
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/merchant/order/${orderId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Upload Delivery Proof
            </h1>
            <p className="text-sm text-muted-foreground">Order #{orderId?.slice(0, 8)}</p>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{order.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  ₹{Number(order.amount).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Proofs */}
        {deliveryProofs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Existing Delivery Proofs ({deliveryProofs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {deliveryProofs.map((proof, index) => (
                  <div
                    key={proof.id}
                    className="aspect-square bg-muted rounded-lg flex items-center justify-center"
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Proof
            </CardTitle>
            <CardDescription>
              Upload photos or documents showing proof of delivery. This helps protect you in case
              of disputes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dropzone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Drop files here or click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG, WebP, or PDF up to 10MB each (max {MAX_FILES} files)
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <Label>Selected Files ({files.length})</Label>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          {file.type.startsWith("image/") ? (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about the delivery, e.g., handed to security guard, left at doorstep..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/merchant/order/${orderId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving || files.length === 0}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Proof
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
