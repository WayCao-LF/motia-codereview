interface SlackNotificationInput {
  reviewId: string;
  mrUrl: string;
  mrTitle: string;
  reviewResult: any;
}

/**
 * 发送 Slack 通知
 */
export async function sendSlackNotification(input: SlackNotificationInput) {
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || 
    'https://hooks.slack.com';
  
  const { reviewId, mrUrl, mrTitle, reviewResult } = input;
  // 从 URL 中提取 MR 编号
  // URL 格式通常为: https://gitlab.com/project/repo/-/merge_requests/123
  const mrNumber = mrUrl.match(/merge_requests\/(\d+)/)?.[1] || 'N/A';

  // 构建审查内容文本
  let reviewContent = `🤖 *AI Code Review 完成*\n\n`;
  reviewContent += `📋 *MR 标题:* ${mrTitle}\n`;
  reviewContent += `🔗 *MR 编号:* ${mrNumber}\n`;
  reviewContent += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  reviewContent += `📊 *审查结果摘要:*\n${reviewResult.summary}\n\n`;
  
  // 添加问题列表
  if (reviewResult.issues && reviewResult.issues.length > 0) {
    reviewContent += `⚠️ *发现 ${reviewResult.issues.length} 个问题:*\n\n`;
    reviewResult.issues.forEach((issue: any, index: number) => {
      const severityEmoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      const fileName = issue.file.split('/').pop(); // 只取文件名
      reviewContent += `${index + 1}. ${severityEmoji} *${issue.type}*\n`;
      reviewContent += `   📁 文件: ${fileName}\n`;
      reviewContent += `   💬 ${issue.message}\n`;
      if (issue.suggestion) {
        reviewContent += `   💡 建议: ${issue.suggestion}\n`;
      }
      reviewContent += `\n`;
    });
  } else {
    reviewContent += `✅ *未发现明显问题*\n\n`;
  }
  
  // 添加建议
  if (reviewResult.recommendations && reviewResult.recommendations.length > 0) {
    reviewContent += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    reviewContent += `💡 *改进建议:*\n`;
    reviewResult.recommendations.forEach((rec: string, index: number) => {
      reviewContent += `${index + 1}. ${rec}\n`;
    });
  }
  
  // Slack Workflow Webhook 的简化格式
  const payload = {
    reviewContent: reviewContent
  };
  
  // 发送 webhook
  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack Webhook 请求失败 (${response.status}): ${errorText}`);
  }
  
  return { success: true };
}

