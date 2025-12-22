import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { useCustomerSupport } from "@/hooks/useCustomerSupport";
import { toast } from "sonner";

const CustomerSupportCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createTicket } = useCustomerSupport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    category: searchParams.get("category") || "",
    relatedOrderId: searchParams.get("orderId") || "",
    subject: "",
    description: "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const categories = [
    { value: "order", label: "Order Issue" },
    { value: "payment", label: "Payment Issue" },
    { value: "refund", label: "Refund Request" },
    { value: "account", label: "Account Issue" },
    { value: "other", label: "Other" },
  ];

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileChange(e.dataTransfer.files);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    return FileText;
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.subject || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    createTicket.mutate(
      {
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        relatedOrderId: formData.relatedOrderId || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      {
        onSuccess: () => {
          navigate("/support/tickets");
        },
      }
    );
  };

  const isValid = formData.category && formData.subject && formData.description;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-2xl px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/support")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Support
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Create Support Ticket</h1>
            <p className="text-muted-foreground mt-1">
              Tell us about your issue and we'll help you resolve it
            </p>
          </div>

          <div className="space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Ticket Details</CardTitle>
                <CardDescription>Provide information about your issue</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderId">Related Order ID (optional)</Label>
                  <Input
                    id="orderId"
                    value={formData.relatedOrderId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, relatedOrderId: e.target.value }))
                    }
                    placeholder="Enter order ID if applicable"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Provide as much detail as possible about your issue"
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Attachments</CardTitle>
                <CardDescription>
                  Upload screenshots or documents (max 5 files, 10MB each)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports images and PDFs
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files)}
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => {
                      const Icon = getFileIcon(file.type);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(index);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticky Submit Button for Mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:hidden">
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!isValid || createTicket.isPending}
            >
              {createTicket.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </div>

          {/* Desktop Submit Button */}
          <div className="hidden sm:flex justify-end mt-6">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || createTicket.isPending}
            >
              {createTicket.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSupportCreate;
