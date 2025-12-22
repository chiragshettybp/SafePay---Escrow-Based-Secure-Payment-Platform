import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMerchantSupport, MERCHANT_TICKET_CATEGORIES } from "@/hooks/useMerchantSupport";
import { ArrowLeft, Upload, X, FileText, Image } from "lucide-react";

const MerchantSupportCreate = () => {
  const navigate = useNavigate();
  const { createTicket } = useMerchantSupport();

  const [formData, setFormData] = useState({
    category: "",
    relatedOrderId: "",
    relatedShipmentId: "",
    subject: "",
    description: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (attachments.length + newFiles.length <= 5) {
        setAttachments((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      if (attachments.length + newFiles.length <= 5) {
        setAttachments((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return Image;
    return FileText;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subject || !formData.description) return;

    try {
      const result = await createTicket.mutateAsync({
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        relatedOrderId: formData.relatedOrderId || undefined,
        relatedShipmentId: formData.relatedShipmentId || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      navigate(`/merchant/support/ticket/${result.id}`);
    } catch (error) {
      console.error("Failed to create ticket:", error);
    }
  };

  const isValid = formData.category && formData.subject && formData.description;

  return (
    <MerchantLayout>
      <div className="container max-w-3xl px-4 sm:px-6 py-4 sm:py-6">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate("/merchant/support")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Support
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Create Support Ticket</h1>
          <p className="text-muted-foreground mt-1">Describe your issue and we'll help you resolve it</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Issue Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MERCHANT_TICKET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Related IDs - Two Column on Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderId">Related Order ID (optional)</Label>
                  <Input
                    id="orderId"
                    placeholder="e.g., ORD-123456"
                    value={formData.relatedOrderId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, relatedOrderId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipmentId">Related Shipment ID (optional)</Label>
                  <Input
                    id="shipmentId"
                    placeholder="e.g., SHP-123456"
                    value={formData.relatedShipmentId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, relatedShipmentId: e.target.value }))}
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your issue"
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide as much detail as possible about your issue..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.description.length}/2000
                </p>
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>Attachments (optional)</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={attachments.length >= 5}
                  >
                    Select Files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Max 5 files. Images, PDFs, or documents.
                  </p>
                </div>

                {/* Attachment Previews */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {attachments.map((file, index) => {
                      const FileIcon = getFileIcon(file);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50"
                        >
                          <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="sm:flex-1"
              onClick={() => navigate("/merchant/support")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="sm:flex-1"
              disabled={!isValid || createTicket.isPending}
            >
              {createTicket.isPending ? "Creating..." : "Submit Ticket"}
            </Button>
          </div>

          {/* Mobile Sticky Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:hidden">
            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || createTicket.isPending}
            >
              {createTicket.isPending ? "Creating..." : "Submit Ticket"}
            </Button>
          </div>
          <div className="h-20 sm:hidden" />
        </form>
      </div>
    </MerchantLayout>
  );
};

export default MerchantSupportCreate;
