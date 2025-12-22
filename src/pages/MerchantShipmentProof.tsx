import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useMerchantShipment, useMerchantShipmentProofs } from "@/hooks/useMerchantShipments";
import { useMerchantDeliveryProof } from "@/hooks/useMerchantDeliveryProof";
import { toast } from "sonner";

const MAX_FILES = 5;
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function MerchantShipmentProof() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();

  const { shipment, isLoading: shipmentLoading } = useMerchantShipment(shipmentId);
  const { proofs, getFileUrl, isLoading: proofsLoading } = useMerchantShipmentProofs(shipment?.order_id);
  const { saveProof, isSaving } = useMerchantDeliveryProof(shipment?.order_id);

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [isDragging, setIsDragging] = useState(false);

  const validateFiles = (newFiles: FileList | File[]): File[] => {
    const validFiles: File[] = [];

    Array.from(newFiles).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Use JPG, PNG, WebP, or PDF.`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: File too large. Max ${MAX_SIZE_MB}MB.`);
        return;
      }
      if (files.length + validFiles.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed.`);
        return;
      }
      validFiles.push(file);
    });

    return validFiles;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = validateFiles(e.target.files);
      setFiles((prev) => [...prev, ...validFiles]);
    }
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        const validFiles = validateFiles(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...validFiles]);
      }
    },
    [files.length]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    saveProof(
      {
        files,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          navigate(`/merchant/shipments/${shipmentId}`);
        },
      }
    );
  };

  const isLoading = shipmentLoading || proofsLoading;

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MerchantLayout>
    );
  }

  if (!shipment) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Shipment not found</h3>
              <Button className="mt-4" onClick={() => navigate("/merchant/shipments")}>
                Back to Shipments
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo
        title="Upload Delivery Proof | Merchant"
        description="Upload proof of delivery for your shipment"
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto pb-24 sm:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Upload Delivery Proof</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Add photos or documents
            </p>
          </div>
        </div>

        {/* Shipment Summary */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {shipment.order?.product_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {shipment.carrier} • {shipment.tracking_number}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Proofs */}
        {proofs.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Uploaded Proofs ({proofs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {proofs.map((proof) => (
                  <a
                    key={proof.id}
                    href={getFileUrl(proof.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={getFileUrl(proof.file_path)}
                      alt="Delivery proof"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upload Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  Drag & drop or{" "}
                  <span className="text-primary">browse files</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WebP, PDF • Max {MAX_SIZE_MB}MB • Up to {MAX_FILES} files
                </p>
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Selected Files ({files.length})</Label>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-background rounded flex items-center justify-center shrink-0">
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
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delivery Date */}
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Delivery Date</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="h-12"
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Delivery Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add delivery notes, recipient name, signature details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions - Desktop */}
          <div className="hidden sm:flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={files.length === 0 || isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload Proof
            </Button>
          </div>
        </form>

        {/* Sticky Actions - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t sm:hidden">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11"
              disabled={files.length === 0 || isSaving}
              onClick={handleSubmit}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload Proof
            </Button>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}
