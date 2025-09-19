import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ExternalLink,
  Download,
  Copy,
  Share2,
  MoreHorizontal,
  Edit,
  Eye,
  Calendar,
  Tag,
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CanvaConnectService } from "@/services/canva/CanvaConnectService";
import type { CanvaDesign, ExportRequest } from "@/types/canva";
import { formatDistanceToNow } from "date-fns";

interface CanvaDesignPreviewProps {
  design: CanvaDesign;
  canvaService?: CanvaConnectService;
  onExport?: (exportUrl: string) => void;
  onShare?: (shareUrl: string) => void;
  className?: string;
}

export const CanvaDesignPreview = ({
  design,
  canvaService,
  onExport,
  onShare,
  className = "",
}: CanvaDesignPreviewProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    if (!canvaService) {
      toast({
        title: "Service Unavailable",
        description: "Canva service is not initialized.",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(true);
    try {
      const exportRequest: ExportRequest = {
        design_id: design.id,
        format,
        quality: 'high',
      };

      const exportResult = await canvaService.exportDesign(exportRequest);

      // Poll for export completion
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        const status = await canvaService.getExportStatus(exportResult.id);

        if (status.status === 'completed' && status.download_url) {
          onExport?.(status.download_url);
          toast({
            title: "Export Complete",
            description: `Design exported as ${format.toUpperCase()} successfully.`,
          });
          break;
        } else if (status.status === 'failed') {
          throw new Error(status.error_message || 'Export failed');
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Export timeout - please try again');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export design.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleShare = async () => {
    if (!canvaService) {
      toast({
        title: "Service Unavailable",
        description: "Canva service is not initialized.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const shareResult = await canvaService.shareDesign(design.id, {
        view: true,
        edit: false,
        comment: true,
      });

      await navigator.clipboard.writeText(shareResult.share_url);
      onShare?.(shareResult.share_url);

      toast({
        title: "Share Link Copied",
        description: "Design share link has been copied to clipboard.",
      });
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: "Failed to generate share link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDesign = async () => {
    if (!canvaService) {
      toast({
        title: "Service Unavailable",
        description: "Canva service is not initialized.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Note: Canva Connect API doesn't have a direct duplicate endpoint
      // This would need to be implemented through the MCP server
      toast({
        title: "Feature Coming Soon",
        description: "Design duplication will be available in a future update.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to duplicate design.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDesignTypeColor = (designType: string) => {
    const colors = {
      presentation: "bg-blue-100 text-blue-800",
      document: "bg-green-100 text-green-800",
      social_media: "bg-purple-100 text-purple-800",
      marketing: "bg-orange-100 text-orange-800",
      video: "bg-red-100 text-red-800",
      logo: "bg-yellow-100 text-yellow-800",
      poster: "bg-pink-100 text-pink-800",
      flyer: "bg-indigo-100 text-indigo-800",
      business_card: "bg-gray-100 text-gray-800",
      resume: "bg-teal-100 text-teal-800",
      infographic: "bg-cyan-100 text-cyan-800",
      custom: "bg-slate-100 text-slate-800",
    };
    return colors[designType as keyof typeof colors] || colors.custom;
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-medium truncate" title={design.title}>
              {design.title}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={design.urls.edit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit in Canva
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={design.urls.view_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Design
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('png')} disabled={exportLoading}>
                <Download className="mr-2 h-4 w-4" />
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('jpg')} disabled={exportLoading}>
                <Download className="mr-2 h-4 w-4" />
                Export as JPG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={exportLoading}>
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleShare} disabled={isLoading}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Design
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyDesign} disabled={isLoading}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Design
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="flex items-center space-x-2">
          <Badge
            variant="secondary"
            className={`text-xs ${getDesignTypeColor(design.design_type)}`}
          >
            {design.design_type.replace('_', ' ')}
          </Badge>
          {design.is_owner && (
            <Badge variant="outline" className="text-xs">
              Owner
            </Badge>
          )}
          {design.can_edit && (
            <Badge variant="outline" className="text-xs">
              Editable
            </Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Design Thumbnail */}
        <div className="relative">
          <img
            src={design.thumbnail.url}
            alt={design.title}
            className="w-full h-32 object-cover rounded-md border"
            loading="lazy"
          />
          {exportLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
              <div className="flex items-center space-x-2 text-white text-sm">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Exporting...</span>
              </div>
            </div>
          )}
        </div>

        {/* Design Metadata */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDistanceToNow(new Date(design.created_at), { addSuffix: true })}</span>
            </div>
            <div className="text-right">
              {design.thumbnail.width} × {design.thumbnail.height}
            </div>
          </div>

          {design.tags.length > 0 && (
            <div className="flex items-start space-x-1">
              <Tag className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {design.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                    {tag}
                  </Badge>
                ))}
                {design.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{design.tags.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex-1"
          >
            <a
              href={design.urls.edit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center"
            >
              <Edit className="mr-1 h-3 w-3" />
              Edit
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={isLoading}
            className="flex-1"
          >
            <Share2 className="mr-1 h-3 w-3" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={design.urls.view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};