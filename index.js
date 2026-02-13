import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3001;

app.use(cors());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gemini Proxy Server' });
});

wss.on('connection', (clientWs) => {
  console.log('Client connected');

  if (!GEMINI_API_KEY) {
    clientWs.close(1008, 'API key not configured');
    return;
  }

  const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/v1beta/models/gemini-2.5-flash-native-audio-preview-09-2025:streamGenerateContent?key=${GEMINI_API_KEY}`;
  
  const geminiWs = new WebSocket(geminiWsUrl);

  geminiWs.on('open', () => {
    console.log('Connected to Gemini API');
  });

  clientWs.on('message', (data) => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(data);
    }
  });

  geminiWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  geminiWs.on('error', (error) => {
    console.error('Gemini error:', error);
    clientWs.close();
  });

  geminiWs.on('close', () => {
    console.log('Gemini disconnected');
    clientWs.close();
  });

  clientWs.on('close', () => {
    console.log('Client disconnected');
    geminiWs.close();
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
