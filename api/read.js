const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  // --- 關鍵修改：設定 CORS 通行證 ---
  // 告訴瀏覽器：允許任何來源 ('*') 來連線，包含你的本地檔案
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 處理瀏覽器的「試探請求」(OPTIONS)
  // 瀏覽器在正式發送資料前，會先問伺服器：「我可以傳資料給你嗎？」
  // 我們這裡直接回答：「可以！」(status 200)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // ----------------------------------

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, cardResults } = req.body;

    if (!question || !cardResults) {
      return res.status(400).json({ error: '缺少必要資料' });
    }

    console.log('收到請求，開始呼叫 OpenAI...');

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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const aiResponseText = completion.choices[0].message.content;
    res.status(200).json({ result: aiResponseText });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'AI 服務暫時無法使用，請稍後再試。' });
  }
};