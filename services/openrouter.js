const fetch = require('node-fetch');

const openrouterKey = process.env.OPENROUTER_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY; // For future OpenAI direct support if needed

// Generate a chat response using OpenRouter API
const generateChatResponse = async (messagesArray, systemPrompt, base64Image = null) => {
  if (!openrouterKey && !openaiKey) {
    throw new Error('No API keys configured');
  }

  const useOpenRouter = !!openrouterKey;
  const endpoint = useOpenRouter 
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${useOpenRouter ? openrouterKey : openaiKey}`
  };

  if (useOpenRouter) {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'LINE Roleplay Bot';
  }

  // Model selection (default to gemini-2.5-flash for OpenRouter)
  let model = useOpenRouter ? 'google/gemini-2.5-flash' : 'gpt-4o-mini';
  
  // Format messages
  let apiMessages = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  // Append history messages
  apiMessages = apiMessages.concat(messagesArray);

  // If there's a new image, append it to the last user message
  if (base64Image && apiMessages.length > 0) {
    const lastUserMessage = apiMessages[apiMessages.length - 1];
    if (lastUserMessage.role === 'user') {
      const textContent = lastUserMessage.content;
      lastUserMessage.content = [
        { type: "text", text: textContent },
        { 
          type: "image_url", 
          image_url: { url: `data:image/jpeg;base64,${base64Image}` }
        }
      ];
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        temperature: 0.8,
        max_tokens: 1500
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('API Error Response:', JSON.stringify(data, null, 2));
      throw new Error(`API Error: ${data.error?.message || response.statusText}`);
    }

    if (data.choices && data.choices.length > 0) {
      const content = data.choices[0].message.content;
      return content ? content.trim() : 'ข้าไม่รู้จะกล่าวสิ่งใด... (ทำหน้างงงวย)';
    } else {
      return 'ข้าไม่รู้จะกล่าวสิ่งใด...';
    }
  } catch (error) {
    console.error('Error generating chat response:', error);
    return 'ข้าขออภัย... ข้ารู้สึกวิงเวียนศีรษะเล็กน้อย (ระบบขัดข้อง)';
  }
};

module.exports = {
  generateChatResponse
};
