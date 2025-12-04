import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisputeDetails } from "@/hooks/useDisputes";
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  X, 
  FileImage, 
  FileText, 
  File,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Info
} from "lucide-react";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  url?: string;
}

export default function DisputeUpload() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const { dispute, files, isLoadingDispute, uploadFile, isUploadingFile } = useDisputeDetails(disputeId || "");

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <FileImage className="h-5 w-5" />;
    if (type === "application/pdf") return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    
    for (const file of newFiles) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        continue;
      }

      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
        status: "uploading",
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file === file && f.status === "uploading"
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f
            )
          );
        }, 100);

        const url = await uploadFile(file);

        clearInterval(progressInterval);

        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file
              ? { ...f, progress: 100, status: "completed", url }
              : f
          )
        );
      } catch (error) {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file
              ? { ...f, status: "error" }
              : f
          )
        );
      }
    }
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const totalUploaded = files.length + uploadingFiles.filter(f => f.status === "completed").length;
  const hasUploads = totalUploaded > 0;

  if (isLoadingDispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Card className="glass-card">
              <CardContent className="py-12">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!dispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Dispute Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The dispute you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate("/orders")}>
                  Back to Orders
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
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Upload className="h-7 w-7 text-primary" />
              Upload Evidence
            </h1>
            <p className="text-muted-foreground mt-1">
              Provide supporting documents for your dispute
            </p>
          </div>

          <div className="flex-1 pb-24 sm:pb-6 space-y-6">
            {/* Info Banner */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">What evidence helps?</p>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Screenshots of conversations with the merchant</li>
                    <li>Photos of damaged or wrong items</li>
                    <li>Delivery receipts or tracking information</li>
                    <li>Any other relevant documentation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Upload Files</CardTitle>
                <CardDescription>
                  Drag and drop files or click to browse (max 10MB per file)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${dragOver 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }
                  `}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  />
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-medium mb-1">
                    {dragOver ? "Drop files here" : "Drag & drop files here"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports: Images, PDF, Word documents
                  </p>
                </div>

                {/* Uploading Files */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Uploading</p>
                    {uploadingFiles.map((uploadFile, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="text-muted-foreground">
                          {getFileIcon(uploadFile.file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                          {uploadFile.status === "uploading" && (
                            <Progress value={uploadFile.progress} className="h-1 mt-2" />
                          )}
                        </div>
                        <div>
                          {uploadFile.status === "uploading" && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {uploadFile.status === "completed" && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {uploadFile.status === "error" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeUploadingFile(uploadFile.file)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Previously Uploaded Files */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Uploaded Evidence ({files.length})</p>
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="text-muted-foreground">
                          {getFileIcon(file.file_type || "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.file_size ? formatFileSize(file.file_size) : "Unknown size"}
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Desktop Buttons */}
                <div className="hidden sm:flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/dispute/${disputeId}/status`)}
                  >
                    Skip for Now
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => navigate(`/dispute/${disputeId}/status`)}
                    disabled={isUploadingFile}
                  >
                    {hasUploads ? "Continue to Status" : "Continue Without Files"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Sticky Buttons */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border sm:hidden">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/dispute/${disputeId}/status`)}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate(`/dispute/${disputeId}/status`)}
                disabled={isUploadingFile}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
