const express = require('express');
const line = require('@line/bot-sdk');
const { handleUserMessage } = require('../services/chat');

const router = express.Router();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'DUMMY_TOKEN',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'DUMMY_SECRET'
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken
});

const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: lineConfig.channelAccessToken
});

// Middleware for LINE Signature validation
router.post('/', line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }

    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  // Ignore non-message events
  if (event.type !== 'message') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const isGroup = event.source.type === 'group' || event.source.type === 'room';

  // Support Text and Image
  if (event.message.type !== 'text' && event.message.type !== 'image') {
    return Promise.resolve(null);
  }

  // Group chat filtering: only respond to text messages containing triggers
  if (isGroup) {
    if (event.message.type !== 'text') return Promise.resolve(null); // Ignore images in groups
    const text = event.message.text.toLowerCase();
    const triggers = ['ซินเหยียน', 'บอท', 'xinyan', 'ซินเยียน', 'xinyen'];
    const hasTrigger = triggers.some(t => text.includes(t));
    if (!hasTrigger) return Promise.resolve(null); // Ignore normal group chatter
  }

  try {
    let replyMessages;
    
    if (event.message.type === 'image') {
      // Fetch image from LINE API using Blob Client
      const stream = await blobClient.getMessageContent(event.message.id);
      
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const base64Image = buffer.toString('base64');
      
      replyMessages = await handleUserMessage(userId, null, base64Image, client);
    } else {
      const userText = event.message.text;
      replyMessages = await handleUserMessage(userId, userText, null, client);
    }

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: replyMessages
    });
  } catch (err) {
    console.error('Error handling message:', err);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'ข้าวิงเวียนศีรษะเล็กน้อย... กรุณาส่งใหม่อีกครั้งเถิด' }]
    });
  }
}

module.exports = router;
