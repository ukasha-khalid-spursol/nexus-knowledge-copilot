#!/usr/bin/env node

/**
 * Mock Canva MCP Server for Testing
 *
 * This is a simple WebSocket server that simulates a Canva MCP server
 * for testing the integration without requiring the real Canva MCP server.
 *
 * Usage:
 *   node mock-mcp-server.js
 *
 * The server will run on ws://localhost:3001/mcp
 */

const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({
  port: 4001,
  path: '/mcp',
  perMessageDeflate: false,
  verifyClient: (info) => {
    // Allow connections from any origin during development
    console.log('🔍 WebSocket connection attempt from:', info.origin);
    return true;
  }
});

console.log('🚀 Mock Canva MCP Server starting...');
console.log('📡 Listening on ws://localhost:4001/mcp');
console.log('💡 This is a mock server for testing the integration\n');

// Mock design data
const mockDesigns = {
  'design_001': {
    id: 'design_001',
    title: 'AI Generated Presentation',
    design_type: 'presentation',
    thumbnail: {
      url: 'https://via.placeholder.com/400x300/6366f1/white?text=AI+Presentation',
      width: 400,
      height: 300
    },
    urls: {
      edit_url: 'https://canva.com/design/DAF123456/edit',
      view_url: 'https://canva.com/design/DAF123456/view'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_owner: true,
    can_edit: true,
    tags: ['presentation', 'ai-generated', 'business']
  }
};

const mockTemplates = [
  {
    id: 'template_001',
    title: 'Professional Business Presentation',
    design_type: 'presentation',
    thumbnail: { url: 'https://via.placeholder.com/300x200/4f46e5/white?text=Business+Template' },
    is_premium: false,
    categories: ['business', 'professional']
  },
  {
    id: 'template_002',
    title: 'Creative Marketing Flyer',
    design_type: 'flyer',
    thumbnail: { url: 'https://via.placeholder.com/300x200/10b981/white?text=Marketing+Flyer' },
    is_premium: false,
    categories: ['marketing', 'creative']
  }
];

// Helper function to create MCP response
function createMCPResponse(id, result = null, error = null) {
  return {
    jsonrpc: '2.0',
    id,
    ...(result && { result }),
    ...(error && { error })
  };
}

// Helper function to generate mock design
function generateMockDesign(prompt, designType) {
  const designId = 'design_' + Date.now();
  return {
    id: designId,
    title: `AI Generated ${designType}`,
    design_type: designType,
    thumbnail: {
      url: `https://via.placeholder.com/400x300/6366f1/white?text=AI+${designType}`,
      width: 400,
      height: 300
    },
    urls: {
      edit_url: `https://canva.com/design/${designId}/edit`,
      view_url: `https://canva.com/design/${designId}/view`
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_owner: true,
    can_edit: true,
    tags: ['ai-generated', designType, 'mock']
  };
}

wss.on('connection', function connection(ws, req) {
  const clientIP = req.socket.remoteAddress;
  console.log(`✅ Client connected from ${clientIP}`);

  // Send welcome message
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to Mock Canva MCP Server',
      capabilities: [
        'canva.design.create',
        'canva.design.get',
        'canva.design.list',
        'canva.template.search',
        'canva.ai.generate'
      ]
    }));
  }, 100);

  ws.on('message', function message(data) {
    console.log(`📨 Received message: ${data}`);

    try {
      const request = JSON.parse(data);
      console.log(`🔧 Processing request: ${request.method} (ID: ${request.id})`);

      // Handle different MCP methods
      switch (request.method) {
        case 'ping':
          ws.send(JSON.stringify(createMCPResponse(request.id, { pong: true })));
          break;

        case 'canva.capabilities':
          ws.send(JSON.stringify(createMCPResponse(request.id, {
            capabilities: [
              'canva.design.create',
              'canva.design.get',
              'canva.design.list',
              'canva.template.search',
              'canva.ai.generate'
            ]
          })));
          break;

        case 'canva.design.create':
          const newDesign = {
            ...generateMockDesign('', request.params.design_type),
            title: request.params.title || `New ${request.params.design_type}`
          };
          mockDesigns[newDesign.id] = newDesign;

          // Simulate processing delay
          setTimeout(() => {
            ws.send(JSON.stringify(createMCPResponse(request.id, { design: newDesign })));
          }, 1000);
          break;

        case 'canva.design.get':
          const design = mockDesigns[request.params.design_id];
          if (design) {
            ws.send(JSON.stringify(createMCPResponse(request.id, { design })));
          } else {
            ws.send(JSON.stringify(createMCPResponse(request.id, null, {
              code: 404,
              message: 'Design not found'
            })));
          }
          break;

        case 'canva.design.list':
          const designs = Object.values(mockDesigns);
          ws.send(JSON.stringify(createMCPResponse(request.id, { designs })));
          break;

        case 'canva.template.search':
          const filteredTemplates = mockTemplates.filter(template => {
            if (request.params.design_type && template.design_type !== request.params.design_type) {
              return false;
            }
            if (request.params.search_term) {
              const searchTerm = request.params.search_term.toLowerCase();
              return template.title.toLowerCase().includes(searchTerm) ||
                     template.categories.some(cat => cat.toLowerCase().includes(searchTerm));
            }
            return true;
          });

          ws.send(JSON.stringify(createMCPResponse(request.id, { templates: filteredTemplates })));
          break;

        case 'canva.ai.generate':
          const aiDesign = generateMockDesign(
            request.params.prompt,
            request.params.design_type || 'presentation'
          );
          aiDesign.title = `AI: ${request.params.prompt.substring(0, 30)}...`;
          mockDesigns[aiDesign.id] = aiDesign;

          // Simulate AI processing delay
          setTimeout(() => {
            ws.send(JSON.stringify(createMCPResponse(request.id, { design: aiDesign })));
          }, 2000);
          break;

        case 'canva.design.create_from_template':
          const templateDesign = generateMockDesign('', 'presentation');
          templateDesign.title = request.params.title || 'Design from Template';
          templateDesign.tags.push('from-template');
          mockDesigns[templateDesign.id] = templateDesign;

          setTimeout(() => {
            ws.send(JSON.stringify(createMCPResponse(request.id, { design: templateDesign })));
          }, 1500);
          break;

        default:
          console.log(`❓ Unknown method: ${request.method}`);
          ws.send(JSON.stringify(createMCPResponse(request.id, null, {
            code: -32601,
            message: `Method not found: ${request.method}`
          })));
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error'
        }
      }));
    }
  });

  ws.on('close', function close() {
    console.log(`❌ Client disconnected from ${clientIP}`);
  });

  ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err);
  });
});

wss.on('error', function error(err) {
  console.error('❌ Server error:', err);
});

console.log('✨ Mock MCP Server is ready!');
console.log('🔧 Supported methods:');
console.log('   - ping');
console.log('   - canva.capabilities');
console.log('   - canva.design.create');
console.log('   - canva.design.get');
console.log('   - canva.design.list');
console.log('   - canva.template.search');
console.log('   - canva.ai.generate');
console.log('   - canva.design.create_from_template');
console.log('\n💡 Test by enabling MCP Server in the Canva integration card');
console.log('📱 Then try creating designs through the chat interface\n');