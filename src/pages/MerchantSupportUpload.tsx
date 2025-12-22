import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMerchantSupport } from "@/hooks/useMerchantSupport";
import { ArrowLeft, Upload, X, FileText, Image, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MerchantSupportUpload = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { fetchTicket, uploadEvidence } = useMerchantSupport();

  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["merchant-support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId!),
    enabled: !!ticketId,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length <= 10) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      if (files.length + newFiles.length <= 10) {
        setFiles((prev) => [...prev, ...newFiles]);
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

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return Image;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!ticketId || files.length === 0) return;

    try {
      await uploadEvidence.mutateAsync({
        ticketId,
        files,
        description: description || undefined,
      });
      navigate(`/merchant/support/ticket/${ticketId}`);
    } catch (error) {
      console.error("Failed to upload evidence:", error);
    }
  };

  if (ticketLoading) {
    return (
      <MerchantLayout>
        <div className="container max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </MerchantLayout>
    );
  }

  if (!ticket) {
    return (
      <MerchantLayout>
        <div className="container max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium mb-4">Ticket not found</p>
              <Button onClick={() => navigate("/merchant/support/tickets")}>
                Back to Tickets
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="container max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate(`/merchant/support/ticket/${ticketId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ticket
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Upload Evidence</h1>
          <p className="text-muted-foreground mt-1">
            Add additional files to support ticket {ticket.ticket_number}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>
              Drag and drop files or click to browse. Max 10 files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Drag & drop files here, or click to browse
              </p>
              <input
                type="file"
                id="evidence-upload"
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("evidence-upload")?.click()}
                disabled={files.length >= 10}
              >
                Select Files
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Supported: Images, PDFs, Word, Excel files
              </p>
            </div>

            {/* File Previews */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({files.length}/10)</Label>
                <div className="grid gap-2">
                  {files.map((file, index) => {
                    const FileIcon = getFileIcon(file);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                      >
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the uploaded files..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="sm:flex-1"
                onClick={() => navigate(`/merchant/support/ticket/${ticketId}`)}
              >
                Cancel
              </Button>
              <Button
                className="sm:flex-1"
                onClick={handleUpload}
                disabled={files.length === 0 || uploadEvidence.isPending}
              >
                {uploadEvidence.isPending ? (
                  "Uploading..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Upload {files.length} File{files.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
};

export default MerchantSupportUpload;
