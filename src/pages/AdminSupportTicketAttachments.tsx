import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTicketDetails } from "@/hooks/useAdminSupport";
import { format } from "date-fns";
import { 
  Paperclip, 
  Download, 
  FileImage, 
  FileText, 
  File as FileIcon,
  User
} from "lucide-react";

const getFileIcon = (fileType?: string) => {
  if (!fileType) return FileIcon;
  if (fileType.startsWith("image/")) return FileImage;
  if (fileType.includes("pdf") || fileType.includes("doc")) return FileText;
  return FileIcon;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AdminSupportTicketAttachments() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { attachments, isLoading } = useAdminTicketDetails(ticketId || "");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Attachments
          <span className="text-sm font-normal text-muted-foreground">
            ({attachments.length} files)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No attachments</p>
            <p className="text-sm">Files attached to this ticket will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => {
              const FileTypeIcon = getFileIcon(attachment.file_type);
              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <FileTypeIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{attachment.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.file_size)}</span>
                        <span>•</span>
                        <span>{format(new Date(attachment.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(attachment.file_url, "_blank")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
