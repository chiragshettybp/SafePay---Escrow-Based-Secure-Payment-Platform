import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantDisputeDetails, EVIDENCE_TYPES, ISSUE_TYPES } from "@/hooks/useMerchantDisputes";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertTriangle,
  Image,
  File,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  description: string;
  evidenceType: string;
}

export default function MerchantDisputeUpload() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [description, setDescription] = useState("");
  const [evidenceType, setEvidenceType] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const {
    dispute,
    isLoadingDispute,
    merchantEvidence,
    uploadEvidence,
    isUploadingEvidence,
  } = useMerchantDisputeDetails(disputeId || "");

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return Image;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => {
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !evidenceType) return;

    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);

    for (const file of filesToUpload) {
      const uploadItem: UploadingFile = {
        file,
        progress: 0,
        status: "uploading",
        description,
        evidenceType,
      };

      setUploadingFiles((prev) => [...prev, uploadItem]);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((item) =>
              item.file === file && item.status === "uploading"
                ? { ...item, progress: Math.min(item.progress + 20, 90) }
                : item
            )
          );
        }, 200);

        await uploadEvidence({
          file,
          description,
          evidenceType,
        });

        clearInterval(progressInterval);

        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.file === file ? { ...item, progress: 100, status: "success" } : item
          )
        );
      } catch (error) {
        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.file === file ? { ...item, status: "error" } : item
          )
        );
      }
    }

    setDescription("");
    setEvidenceType("");
  };

  const getIssueTypeLabel = (value: string | null) => {
    return ISSUE_TYPES.find((t) => t.value === value)?.label || value || "Unknown";
  };

  // Loading skeleton
  if (isLoadingDispute) {
    return (
      <MerchantLayout>
        <Seo title="Upload Evidence | Merchant Portal" canonicalPath={`/merchant/dispute/${disputeId}/upload`} />
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </MerchantLayout>
    );
  }

  // Not found
  if (!dispute) {
    return (
      <MerchantLayout>
        <Seo title="Dispute Not Found | Merchant Portal" canonicalPath={`/merchant/dispute/${disputeId}/upload`} />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Dispute Not Found</h2>
          <p className="text-muted-foreground mb-6">This dispute doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/merchant/disputes")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Disputes
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  const canUpload = dispute.status === "open" || dispute.status === "under_review";

  return (
    <MerchantLayout>
      <Seo
        title="Upload Evidence | Merchant Portal"
        description="Upload evidence for dispute"
        canonicalPath={`/merchant/dispute/${disputeId}/upload`}
      />
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/merchant/dispute/${disputeId}/respond`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Upload Evidence</h1>
            <p className="text-sm text-muted-foreground">
              {getIssueTypeLabel(dispute.issue_type)} • #{dispute.id.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Upload Area */}
        {canUpload ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Add Supporting Documents</CardTitle>
              <CardDescription>
                Upload tracking screenshots, delivery proofs, chat logs, or any relevant evidence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">
                  Drag and drop files here
                </p>
                <p className="text-sm text-muted-foreground mb-3">or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  Max file size: 10MB • Supported: Images, PDF, DOC, TXT
                </p>
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <Label>Selected Files</Label>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => {
                      const FileIcon = getFileIcon(file);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => removeSelectedFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evidence Type */}
              <div className="space-y-2">
                <Label htmlFor="evidence-type">Evidence Type *</Label>
                <Select value={evidenceType} onValueChange={setEvidenceType}>
                  <SelectTrigger id="evidence-type">
                    <SelectValue placeholder="Select evidence type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe this evidence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || !evidenceType || isUploadingEvidence}
                className="w-full"
                size="lg"
              >
                {isUploadingEvidence ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : "Evidence"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/20 border-border">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                This dispute has been {dispute.status}. No further evidence can be uploaded.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Uploading Files Progress */}
        {uploadingFiles.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Upload Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {uploadingFiles.map((item, index) => {
                const FileIcon = getFileIcon(item.file);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    {item.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : item.status === "error" ? (
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                    ) : (
                      <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file.name}</p>
                      {item.status === "uploading" && (
                        <Progress value={item.progress} className="h-1 mt-2" />
                      )}
                      {item.status === "success" && (
                        <p className="text-xs text-green-500">Uploaded successfully</p>
                      )}
                      {item.status === "error" && (
                        <p className="text-xs text-destructive">Upload failed</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Already Uploaded Evidence */}
        {merchantEvidence.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Previously Uploaded Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {merchantEvidence.map((evidence) => (
                  <a
                    key={evidence.id}
                    href={evidence.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{evidence.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {EVIDENCE_TYPES.find((t) => t.value === evidence.evidence_type)?.label ||
                            evidence.evidence_type}
                        </Badge>
                        <span>{format(new Date(evidence.created_at), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 md:relative md:bottom-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/merchant/dispute/${disputeId}/respond`)}
          >
            Back to Response
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate("/merchant/disputes")}
          >
            Done
          </Button>
        </div>
      </div>
    </MerchantLayout>
  );
}
