import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Palette,
  Wand2,
  Plus,
  Search,
  FileImage,
  Presentation,
  FileText,
  Share2,
  Video,
  Image,
  Layout,
  Briefcase,
  User,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { canvaMCPClient } from "@/services/canva/CanvaMCPClient";
import type { CanvaDesignType, DesignRequest, TemplateFilter } from "@/types/canva";

interface CanvaDesignActionsProps {
  onDesignCreated?: (design: any) => void;
  onTemplateSelected?: (template: any) => void;
  className?: string;
}

export const CanvaDesignActions = ({
  onDesignCreated,
  onTemplateSelected,
  className = "",
}: CanvaDesignActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDesignType, setSelectedDesignType] = useState<CanvaDesignType>('presentation');
  const [aiPrompt, setAiPrompt] = useState("");
  const [designTitle, setDesignTitle] = useState("");
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const { toast } = useToast();

  const designTypes = [
    { value: 'presentation', label: 'Presentation', icon: Presentation },
    { value: 'document', label: 'Document', icon: FileText },
    { value: 'social_media', label: 'Social Media', icon: Share2 },
    { value: 'marketing', label: 'Marketing', icon: Briefcase },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'logo', label: 'Logo', icon: Image },
    { value: 'poster', label: 'Poster', icon: FileImage },
    { value: 'flyer', label: 'Flyer', icon: Layout },
    { value: 'business_card', label: 'Business Card', icon: User },
    { value: 'resume', label: 'Resume', icon: FileText },
    { value: 'infographic', label: 'Infographic', icon: BarChart3 },
    { value: 'custom', label: 'Custom', icon: Palette },
  ];

  const handleCreateBlankDesign = async () => {
    setIsLoading(true);
    try {
      const designRequest: DesignRequest = {
        type: 'create',
        design_type: selectedDesignType,
        title: designTitle || `New ${selectedDesignType.replace('_', ' ')}`,
      };

      const design = await canvaMCPClient.createDesign(designRequest);
      onDesignCreated?.(design);

      toast({
        title: "Design Created",
        description: `New ${selectedDesignType.replace('_', ' ')} design created successfully.`,
      });

      setDesignTitle("");
    } catch (error) {
      console.error('Create design error:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiGeneration = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your design.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const design = await canvaMCPClient.generateDesignFromText(
        aiPrompt,
        selectedDesignType
      );
      onDesignCreated?.(design);

      toast({
        title: "AI Design Generated",
        description: "Your design has been generated successfully using AI.",
      });

      setAiPrompt("");
      setIsAiDialogOpen(false);
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate design with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchTemplates = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter search terms to find templates.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const filter: TemplateFilter = {
        search_term: searchQuery,
        design_type: selectedDesignType,
      };

      const searchResults = await canvaMCPClient.searchTemplates(filter);
      setTemplates(searchResults);
      setIsTemplateDialogOpen(true);

      if (searchResults.length === 0) {
        toast({
          title: "No Templates Found",
          description: "No templates found for your search. Try different keywords.",
        });
      }
    } catch (error) {
      console.error('Template search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = async (template: any) => {
    setIsLoading(true);
    try {
      const design = await canvaMCPClient.createFromTemplate(
        template.id,
        designTitle || `Design from ${template.title}`
      );
      onDesignCreated?.(design);
      onTemplateSelected?.(template);

      toast({
        title: "Design Created from Template",
        description: `Design created successfully from template: ${template.title}`,
      });

      setIsTemplateDialogOpen(false);
      setDesignTitle("");
    } catch (error) {
      console.error('Template creation error:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create design from template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDesignTypeIcon = (type: CanvaDesignType) => {
    const typeData = designTypes.find(dt => dt.value === type);
    return typeData?.icon || Palette;
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="h-5 w-5 text-purple-600" />
          <span>Create Design</span>
        </CardTitle>
        <CardDescription>
          Create new designs using AI, templates, or start from scratch
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Design Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="design-type">Design Type</Label>
          <Select value={selectedDesignType} onValueChange={(value) => setSelectedDesignType(value as CanvaDesignType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select design type" />
            </SelectTrigger>
            <SelectContent>
              {designTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Design Title */}
        <div className="space-y-2">
          <Label htmlFor="design-title">Title (Optional)</Label>
          <Input
            id="design-title"
            placeholder="Enter design title..."
            value={designTitle}
            onChange={(e) => setDesignTitle(e.target.value)}
          />
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Create Blank Design */}
          <Button
            onClick={handleCreateBlankDesign}
            disabled={isLoading}
            className="w-full"
            variant="default"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isLoading ? "Creating..." : "Create Blank Design"}
          </Button>

          {/* AI Generation */}
          <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Wand2 className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Design with AI</DialogTitle>
                <DialogDescription>
                  Describe what you want to create and AI will generate a design for you.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Design Description</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="e.g., A professional presentation about renewable energy with green colors and modern graphics..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    {(() => {
                      const Icon = getDesignTypeIcon(selectedDesignType);
                      return <Icon className="h-3 w-3" />;
                    })()}
                    <span>{selectedDesignType.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAiGeneration}
                  disabled={isLoading || !aiPrompt.trim()}
                  className="w-full"
                >
                  {isLoading ? "Generating..." : "Generate Design"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Template Search */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchTemplates()}
              />
              <Button
                onClick={handleSearchTemplates}
                disabled={isLoading || !searchQuery.trim()}
                variant="outline"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Template Selection Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Template</DialogTitle>
              <DialogDescription>
                Choose a template to start your design
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="p-3">
                    <img
                      src={template.thumbnail.url}
                      alt={template.title}
                      className="w-full h-24 object-cover rounded border mb-2"
                    />
                    <h4 className="font-medium text-sm truncate">{template.title}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant={template.is_premium ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {template.is_premium ? "Premium" : "Free"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.design_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No templates found. Try a different search term.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};