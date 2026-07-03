const buildTranslationBubble = (translatedText, pronunciationText, roleName, originalText, langCode, thaiMeaning, avatarUrl) => {
  // Truncate text to fit into postback 300 char limit (encodeURIComponent expands 1 char to up to 9 bytes)
  const safeText = translatedText.substring(0, 25);
  
  const bodyContents = [
    {
      type: "text",
      text: roleName,
      weight: "bold",
      color: "#e91e63", // Elegant pink
      size: "sm"
    },
    {
      type: "text",
      text: translatedText,
      weight: "bold",
      size: "xl",
      margin: "md",
      wrap: true
    }
  ];

  if (pronunciationText && pronunciationText.trim() !== '') {
    bodyContents.push({
      type: "text",
      text: `🗣️ อ่านว่า: ${pronunciationText}`,
      size: "sm",
      color: "#888888",
      wrap: true,
      margin: "md"
    });
  }

  if (thaiMeaning && thaiMeaning.trim() !== '') {
    bodyContents.push({
      type: "text",
      text: `✨ ความหมาย: ${thaiMeaning}`,
      size: "sm",
      color: "#9c27b0",
      weight: "bold",
      wrap: true,
      margin: "md"
    });
  }

  bodyContents.push(
    {
      type: "separator",
      margin: "xxl"
    },
    {
      type: "text",
      text: originalText,
      size: "xs",
      color: "#aaaaaa",
      wrap: true,
      margin: "md"
    }
  );

  const bubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#e91e63", // Elegant pink
          action: {
            type: "clipboard",
            label: "📋 คัดลอก",
            clipboardText: translatedText
          }
        },
        {
          type: "button",
          style: "primary",
          color: "#9c27b0", // Elegant purple
          action: {
            type: "postback",
            label: "🔊 ฟังเสียง",
            data: `action=tts&lang=${langCode}&text=${encodeURIComponent(safeText)}`
          }
        }
      ]
    }
  };

  if (avatarUrl) {
    bubble.hero = {
      type: "image",
      url: avatarUrl,
      size: "full",
      aspectRatio: "1.51:1",
      aspectMode: "cover"
    };
  }

  return {
    type: "flex",
    altText: `🌸 คุณหนูซินเหยียนแปลว่า: ${translatedText.substring(0, 30)}...`,
    contents: bubble
  };
};

module.exports = {
  buildTranslationBubble
};
