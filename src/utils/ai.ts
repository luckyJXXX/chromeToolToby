// AI 功能工具函数
// 使用 MiniMax API 进行内容分析和摘要

export interface AIAnalysisResult {
  summary: string;        // 内容摘要
  keywords: string[];     // 关键词
  category: string;       // 分类
  title?: string;        // 建议标题
}

// 获取 MiniMax API Key
export async function getMiniMaxApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get('toby_minimax_api_key');
  return result.toby_minimax_api_key || null;
}

// 保存 MiniMax API Key
export async function setMiniMaxApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({ toby_minimax_api_key: apiKey });
}

// 提取页面正文内容
export async function extractPageContent(tabId: number): Promise<string> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 移除脚本和样式
        const removeElements = ['script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer'];
        const clone = document.body.cloneNode(true) as HTMLElement;

        removeElements.forEach(tag => {
          clone.querySelectorAll(tag).forEach(el => el.remove());
        });

        // 获取主要内容区域
        const contentSelectors = [
          'article', 'main', '.content', '#content',
          '.post-content', '.article-content', '.entry-content'
        ];

        let content = '';
        for (const selector of contentSelectors) {
          const element = clone.querySelector(selector);
          if (element) {
            content = element.textContent || '';
            break;
          }
        }

        // 如果没有找到主要内容区域，获取 body 文本
        if (!content) {
          content = clone.textContent || '';
        }

        // 清理空白字符
        content = content.replace(/\s+/g, ' ').trim();

        // 限制内容长度（API 限制）
        return content.substring(0, 8000);
      }
    });

    return results[0]?.result || '';
  } catch (error) {
    console.error('提取页面内容失败:', error);
    return '';
  }
}

// 调用 MiniMax API 进行内容分析
export async function analyzeContent(
  content: string,
  title?: string,
  apiKey?: string
): Promise<AIAnalysisResult> {
  const key = apiKey || await getMiniMaxApiKey();
  if (!key) {
    throw new Error('请先配置 MiniMax API Key');
  }

  const prompt = `你是一个智能内容分析助手。请分析以下网页内容，提取关键信息。

网页标题: ${title || '未知'}
网页内容:
${content}

请以 JSON 格式返回分析结果，包含以下字段：
- summary: 2-3句话的内容摘要
- keywords: 3-5个关键词数组
- category: 内容分类（如：技术、新闻、教育、娱乐、商业等）
- title: 如果觉得标题需要改进，给出建议标题

只返回 JSON，不要其他内容。`;

  const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'abab6.5s-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的网页内容分析助手，擅长提取摘要、关键词和分类。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API 请求失败: ${error}`);
  }

  const data = await response.json();
  const content_text = data.choices?.[0]?.message?.content || '';

  // 解析 JSON
  try {
    // 尝试提取 JSON 部分
    const jsonMatch = content_text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        summary: result.summary || '',
        keywords: result.keywords || [],
        category: result.category || '未分类',
        title: result.title
      };
    }
    throw new Error('无法解析 API 返回结果');
  } catch (error) {
    console.error('解析 AI 结果失败:', error);
    // 返回默认结果
    return {
      summary: content.substring(0, 200) + '...',
      keywords: [],
      category: '未分类'
    };
  }
}

// 批量分析多个 URL
export async function batchAnalyze(
  items: Array<{ url: string; title?: string; tabId?: number }>,
  onProgress?: (current: number, total: number) => void,
  apiKey?: string
): Promise<Map<string, AIAnalysisResult>> {
  const results = new Map<string, AIAnalysisResult>();
  const key = apiKey || await getMiniMaxApiKey();

  if (!key) {
    throw new Error('请先配置 MiniMax API Key');
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      let content = '';

      // 如果有 tabId，尝试提取内容
      if (item.tabId) {
        content = await extractPageContent(item.tabId);
      }

      // 如果成功提取到内容，进行分析
      if (content && content.length > 50) {
        const result = await analyzeContent(content, item.title, key);
        results.set(item.url, result);
      }

      onProgress?.(i + 1, items.length);

      // 添加延迟避免 API 限流
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`分析失败: ${item.url}`, error);
    }
  }

  return results;
}
