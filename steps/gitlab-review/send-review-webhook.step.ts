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
    // 发送 webhook
    await webhookService.sendSlackNotification({
      reviewId,
      mrUrl,
      mrTitle,
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

