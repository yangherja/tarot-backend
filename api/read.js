// api/read.js
// 導入 OpenAI 的套件
const OpenAI = require('openai');

// 初始化 OpenAI 客戶端，金鑰會從環境變數中讀取
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 這就是 Vercel Serverless Function 的標準寫法
// req (Request) 是前端寄來的資料，res (Response) 是我們要回傳的資料
module.exports = async (req, res) => {
  // 1. 安全檢查：只允許 POST 方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. 從前端傳來的資料中取出問題和牌陣
    const { question, cardResults } = req.body;

    if (!question || !cardResults) {
      return res.status(400).json({ error: '缺少必要資料' });
    }

    console.log('收到請求，開始呼叫 OpenAI...');

    // 3. 組合給 AI 的提示詞 (Prompt)
    // 這裡很重要！你要教 AI 扮演什麼角色，以及如何輸出格式。
    let cardsDescription = cardResults.map(c => 
      `【${c.position}】：${c.cardName} ${c.statusText} (牌義參考: ${c.desc})`
    ).join("\n");

    const systemPrompt = `
      你是一位資深且富有同理心的塔羅牌占卜師，擅長結合東方水墨的禪意與西方塔羅的智慧。
      你的任務是根據使用者抽出的「過去、現在、未來」三張牌陣，為他們的問題提供深度解析與指引。
      請使用溫暖、神祕但堅定的語氣。
      **重要：請直接以 HTML 格式輸出內容**，使用 <p> 分段，用 <strong> 或 <b> 強調重點，用 <hr> 分隔區塊。不需要DOCTYPE或html、body標籤。
      結構要求：
      1. 先用一段話回應使用者的問題。
      2. 用 <hr> 分隔線。
      3. 依序針對過去、現在、未來進行綜合解讀，說明它們之間的因果流動。不要只是單獨解釋每張牌，要把它們串連成一個故事。
      4. 最後給出一個總結性的建議或祝福。
    `;

    const userPrompt = `
      求卜者的問題是：「${question}」
      抽出的牌陣如下：
      ${cardsDescription}
      
      請大師開始解讀。
    `;

    // 4. 呼叫 OpenAI API (使用較便宜且快速的 gpt-3.5-turbo 模型)
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // 0.7 讓回答在創意與穩定之間取得平衡
    });

    // 5. 取得 AI 的回應文字
    const aiResponseText = completion.choices[0].message.content;

    // 6. 將結果回傳給前端
    res.status(200).json({ result: aiResponseText });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    // 如果發生錯誤，回傳錯誤訊息給前端
    res.status(500).json({ error: 'AI 服務暫時無法使用，請稍後再試。' || error.message });
  }
};