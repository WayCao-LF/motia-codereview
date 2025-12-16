import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { webhookService } from '../../src/services/webhook';

const inputSchema = z.object({
  reviewId: z.string(),
  mrUrl: z.string(),
  mrTitle: z.string(),
  reviewResult: z.object({
    summary: z.string(),
    issues: z.array(z.any()).optional(),
    recommendations: z.array(z.string()).optional()
  })
});

export const config: EventConfig = {
  name: 'SendReviewWebhook',
  type: 'event',
  description: '通过 Webhook 发送 Review 结果',
  subscribes: ['send-review-webhook'],
  emits: [],
  input: inputSchema,
  flows: ['gitlab-mr-review']
};

export const handler: Handlers['SendReviewWebhook'] = async (input, { logger }) => {
  const { reviewId, mrUrl, mrTitle, reviewResult } = input;
  
  logger.info('开始发送 Webhook 通知', { reviewId, mrUrl });
  
  try {
    // 格式化 review 结果用于通知
    const message = formatReviewMessage(mrTitle, mrUrl, reviewResult);
    
    // 发送 webhook
    await webhookService.sendSlackNotification({
      reviewId,
      mrUrl,
      mrTitle,
      message,
      reviewResult
    });
    
    logger.info('Webhook 通知发送成功', { reviewId });
    
  } catch (error: any) {
    logger.error('发送 Webhook 通知失败', { 
      reviewId, 
      error: error.message,
      stack: error.stack 
    });
    
    throw error;
  }
};

/**
 * 格式化 review 结果为可读消息
 */
function formatReviewMessage(
  mrTitle: string, 
  mrUrl: string, 
  reviewResult: any
): string {
  const issuesCount = reviewResult.issues?.length || 0;
  const hasIssues = issuesCount > 0;
  
  // 从 URL 中提取 MR 编号
  // URL 格式通常为: https://gitlab.com/project/repo/-/merge_requests/123
  const mrNumber = mrUrl.match(/merge_requests\/(\d+)/)?.[1] || 'N/A';
  
  let message = `*AI Code Review 完成* :robot_face:\n\n`;
  message += `*MR:* ${mrTitle}\n`;
  message += `*MR NO.:* ${mrNumber}\n\n`;
  message += `*结果概要:*\n${reviewResult.summary}\n\n`;
  
  if (hasIssues) {
    message += `*发现 ${issuesCount} 个问题:*\n`;
    reviewResult.issues.slice(0, 5).forEach((issue: any, index: number) => {
      message += `${index + 1}. ${issue.type || '问题'}: ${issue.message || issue}\n`;
    });
    
    if (issuesCount > 5) {
      message += `... 还有 ${issuesCount - 5} 个问题\n`;
    }
  } else {
    message += `✅ 未发现明显问题\n`;
  }
  
  if (reviewResult.recommendations?.length > 0) {
    message += `\n*建议:*\n`;
    reviewResult.recommendations.slice(0, 3).forEach((rec: string, index: number) => {
      message += `• ${rec}\n`;
    });
  }
  return message;
}

