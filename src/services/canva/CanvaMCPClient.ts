import WebSocket from 'ws';
import {
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPError,
  CanvaDesign,
  DesignRequest,
  ExportRequest,
  ExportResult,
  MCPConnectionError,
  CanvaTemplate,
  TemplateFilter,
  DesignFilter
} from '@/types/canva';

export class CanvaMCPClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(serverUrl = 'ws://localhost:4001/mcp') {
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<void> {
    console.log('🔗 Attempting MCP connection to:', this.serverUrl);
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new MCPConnectionError('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('Connected to Canva MCP server');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('Disconnected from Canva MCP server', event.code, event.reason);
          this.isConnecting = false;
          this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error details:', {
            error,
            url: this.serverUrl,
            readyState: this.ws?.readyState,
            timestamp: new Date().toISOString()
          });
          this.isConnecting = false;
          reject(new MCPConnectionError(`Connection failed to ${this.serverUrl}: ${error}`));
        };

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new MCPConnectionError('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
  }

  private handleMessage(data: string): void {
    try {
      const message: MCPMessage = JSON.parse(data);

      if (message.id && this.pendingRequests.has(message.id)) {
        const pending = this.pendingRequests.get(message.id)!;
        this.pendingRequests.delete(message.id);
        clearTimeout(pending.timeout);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    } catch (error) {
      console.error('Failed to parse MCP message:', error);
    }
  }

  private handleDisconnection(): void {
    // Reject all pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new MCPConnectionError('Connection lost'));
    });
    this.pendingRequests.clear();

    // Attempt reconnection
    this.attemptReconnection();
  }

  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  private async sendRequest(method: string, params: any = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new MCPConnectionError('Request timeout'));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.ws!.send(JSON.stringify(request));
    });
  }

  // Design Management Methods
  async createDesign(request: DesignRequest): Promise<CanvaDesign> {
    try {
      const result = await this.sendRequest('canva.design.create', request);
      return result.design;
    } catch (error) {
      throw new Error(`Failed to create design: ${error.message}`);
    }
  }

  async getDesign(designId: string): Promise<CanvaDesign> {
    try {
      const result = await this.sendRequest('canva.design.get', { design_id: designId });
      return result.design;
    } catch (error) {
      throw new Error(`Failed to get design: ${error.message}`);
    }
  }

  async listDesigns(filter: DesignFilter = {}): Promise<CanvaDesign[]> {
    try {
      const result = await this.sendRequest('canva.design.list', filter);
      return result.designs;
    } catch (error) {
      throw new Error(`Failed to list designs: ${error.message}`);
    }
  }

  async updateDesign(designId: string, changes: any): Promise<CanvaDesign> {
    try {
      const result = await this.sendRequest('canva.design.update', {
        design_id: designId,
        changes
      });
      return result.design;
    } catch (error) {
      throw new Error(`Failed to update design: ${error.message}`);
    }
  }

  async deleteDesign(designId: string): Promise<void> {
    try {
      await this.sendRequest('canva.design.delete', { design_id: designId });
    } catch (error) {
      throw new Error(`Failed to delete design: ${error.message}`);
    }
  }

  async duplicateDesign(designId: string, title?: string): Promise<CanvaDesign> {
    try {
      const result = await this.sendRequest('canva.design.duplicate', {
        design_id: designId,
        title
      });
      return result.design;
    } catch (error) {
      throw new Error(`Failed to duplicate design: ${error.message}`);
    }
  }

  // Export Methods
  async exportDesign(request: ExportRequest): Promise<ExportResult> {
    try {
      const result = await this.sendRequest('canva.design.export', request);
      return result.export;
    } catch (error) {
      throw new Error(`Failed to export design: ${error.message}`);
    }
  }

  async getExportStatus(exportId: string): Promise<ExportResult> {
    try {
      const result = await this.sendRequest('canva.export.status', { export_id: exportId });
      return result.export;
    } catch (error) {
      throw new Error(`Failed to get export status: ${error.message}`);
    }
  }

  // Template Methods
  async searchTemplates(filter: TemplateFilter): Promise<CanvaTemplate[]> {
    try {
      const result = await this.sendRequest('canva.template.search', filter);
      return result.templates;
    } catch (error) {
      throw new Error(`Failed to search templates: ${error.message}`);
    }
  }

  async createFromTemplate(templateId: string, title?: string): Promise<CanvaDesign> {
    try {
      const result = await this.sendRequest('canva.design.create_from_template', {
        template_id: templateId,
        title
      });
      return result.design;
    } catch (error) {
      throw new Error(`Failed to create design from template: ${error.message}`);
    }
  }

  // Asset Management Methods
  async uploadAsset(file: File, folderId?: string): Promise<string> {
    try {
      // Convert file to base64 for JSON transport
      const base64 = await this.fileToBase64(file);
      const result = await this.sendRequest('canva.asset.upload', {
        file_data: base64,
        file_name: file.name,
        file_type: file.type,
        folder_id: folderId
      });
      return result.asset_id;
    } catch (error) {
      throw new Error(`Failed to upload asset: ${error.message}`);
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    try {
      await this.sendRequest('canva.asset.delete', { asset_id: assetId });
    } catch (error) {
      throw new Error(`Failed to delete asset: ${error.message}`);
    }
  }

  // Utility Methods
  async ping(): Promise<boolean> {
    try {
      await this.sendRequest('ping');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    try {
      const result = await this.sendRequest('canva.capabilities');
      return result.capabilities || [];
    } catch (error) {
      console.error('Failed to get capabilities:', error);
      return [];
    }
  }

  // AI-Powered Design Generation
  async generateDesignFromText(prompt: string, designType: string = 'presentation'): Promise<CanvaDesign> {
    try {
      const result = await this.sendRequest('canva.ai.generate', {
        prompt,
        design_type: designType,
        auto_layout: true
      });
      return result.design;
    } catch (error) {
      throw new Error(`Failed to generate design from text: ${error.message}`);
    }
  }

  async suggestImprovements(designId: string): Promise<any[]> {
    try {
      const result = await this.sendRequest('canva.ai.suggest_improvements', {
        design_id: designId
      });
      return result.suggestions || [];
    } catch (error) {
      throw new Error(`Failed to get design suggestions: ${error.message}`);
    }
  }

  // Helper Methods
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:type;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Connection Status
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'disconnected';
  }
}

// Singleton instance
export const canvaMCPClient = new CanvaMCPClient();