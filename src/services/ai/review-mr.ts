interface ReviewMRInput {
  mrTitle: string;
  mrDescription: string;
  diff: Array<{
    old_path: string;
    new_path: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
    diff: string;
  }>;
  codingStandard: string;
  projectType: string;
}

interface ReviewResult {
  summary: string;
  issues: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    file: string;
    message: string;
    suggestion?: string;
  }>;
  recommendations: string[];
}

/**
 * 使用 AI 对 MR 进行代码审查
 */
export async function reviewMR(input: ReviewMRInput): Promise<ReviewResult> {
  const AI_BASE_URL = process.env.AI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
  const AI_API_KEY = process.env.AI_API_KEY || '1234567890';
  const AI_MODEL = process.env.AI_MODEL || 'doubao-seed-code-preview-251028';
  
  const { mrTitle, mrDescription, diff, codingStandard, projectType } = input;
  
  // 构建 prompt
  const systemPrompt = `你是一个专业的代码审查助手。你需要根据以下编程规范审查代码：${codingStandard}
请使用中文来返回 review 结果，不要使用英文。除非代码中的专有名词是英文，否则请使用中文。
给出的建议 尽量简单清晰可读 不要太啰嗦 不要出现类似 "你可以考虑" 这样的词语
请重点关注：
1. 代码规范和风格问题
2. 潜在的逻辑错误
3. 最佳实践违背

请以 JSON 格式返回审查结果，格式如下：
{
  "summary": "整体评价摘要",
  "issues": [
    {
      "type": "代码规范|逻辑错误|最佳实践",
      "severity": "high|medium|low",
      "file": "文件路径",
      "message": "问题描述",
      "suggestion": "改进建议（可选）"
    }
  ],
  "recommendations": ["总体建议1", "总体建议2"]
}`;

  // 构建用户消息，包含 MR 信息和 diff
  let userMessage = `请审查以下 Merge Request：

标题：${mrTitle}
${mrDescription ? `描述：${mrDescription}\n` : ''}
项目类型：${projectType}

代码变更如下：
`;

  // 添加 diff 内容（限制大小避免超出 token 限制）
  const maxDiffSize = 50000; // 限制 diff 大小
  let currentSize = 0;
  let includedFiles = 0;
  
  for (const change of diff) {
    const fileDiff = `
文件：${change.new_path}
${change.new_file ? '(新文件)' : change.deleted_file ? '(删除文件)' : change.renamed_file ? `(重命名自 ${change.old_path})` : ''}

\`\`\`diff
${change.diff}
\`\`\`
`;
    
    if (currentSize + fileDiff.length > maxDiffSize) {
      userMessage += `\n... (还有 ${diff.length - includedFiles} 个文件未显示，已达到大小限制)`;
      break;
    }
    
    userMessage += fileDiff;
    currentSize += fileDiff.length;
    includedFiles++;
  }
  
  // 调用 AI API
  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.3, // 降低温度以获得更稳定的输出
      max_tokens: 4000
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 请求失败 (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  
  // 解析 AI 响应
  const aiResponse = data.choices?.[0]?.message?.content;
  
  if (!aiResponse) {
    throw new Error('AI 返回的响应为空');
  }
  
  // 尝试解析 JSON 响应
  try {
    // 提取 JSON 部分（AI 可能返回带有额外文本的内容）
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // 如果没有找到 JSON，返回原始文本作为摘要
      return {
        summary: aiResponse,
        issues: [],
        recommendations: []
      };
    }
    
    const reviewResult = JSON.parse(jsonMatch[0]);
    return reviewResult;
  } catch (parseError) {
    // JSON 解析失败，返回原始响应作为摘要
    return {
      summary: aiResponse,
      issues: [],
      recommendations: []
    };
  }
}

