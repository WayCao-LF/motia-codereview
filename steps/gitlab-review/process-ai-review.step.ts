import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { aiService } from '../../src/services/ai';

const inputSchema = z.object({
  reviewId: z.string(),
  projectPath: z.string(),
  mrTitle: z.string(),
  mrDescription: z.string().optional()
});

export const config: EventConfig = {
  name: 'ProcessAIReview',
  type: 'event',
  description: '使用 AI 分析 MR 内容',
  subscribes: ['process-ai-review'],
  emits: ['send-review-webhook'],
  input: inputSchema,
  flows: ['gitlab-mr-review']
};

export const handler: Handlers['ProcessAIReview'] = async (input, { emit, logger, state }) => {
  const { reviewId, projectPath, mrTitle, mrDescription } = input;
  
  logger.info('开始 AI Review', { reviewId, projectPath });
  
  try {
    // 从 state 中获取存储的 MR 数据
    const mrData = await state.get<any>('mr-reviews', reviewId);
    
    if (!mrData || !mrData.mrDiff) {
      throw new Error('无法找到 MR diff 数据');
    }
    
    // 判断项目类型（基于路径）
    let projectType = 'unknown';
    let codingStandard = '通用编程规范';
    
    if (projectPath.includes('ios-source-code')) {
      projectType = 'swift';
      codingStandard = 'Apple Swift 编程指南和 iOS 开发最佳实践';
    } else if (projectPath.includes('kotlin-multiplatform')) {
      projectType = 'kotlin';
      codingStandard = 'Google Kotlin 编程指南和 Compose 最佳实践';
    }
    
    logger.info('识别项目类型', { reviewId, projectType, codingStandard });
    
    // 调用 AI 服务进行 review
    const reviewResult = await aiService.reviewMR({
      mrTitle,
      mrDescription: mrDescription || '',
      diff: mrData.mrDiff,
      codingStandard,
      projectType
    });
    
    // 更新 state 中的数据
    await state.set('mr-reviews', reviewId, {
      ...mrData,
      reviewResult,
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    logger.info('AI Review 完成', { 
      reviewId, 
      issuesFound: reviewResult.issues?.length || 0 
    });
    
    // 触发 webhook 通知事件
    await emit({
      topic: 'send-review-webhook',
      data: {
        reviewId,
        mrUrl: mrData.mrUrl,
        mrTitle,
        reviewResult
      }
    });
    
  } catch (error: any) {
    logger.error('AI Review 失败', { 
      reviewId, 
      error: error.message,
      stack: error.stack 
    });
    
    // 更新错误状态
    const mrData = await state.get<any>('mr-reviews', reviewId);
    if (mrData) {
      await state.set('mr-reviews', reviewId, {
        ...mrData,
        error: error.message,
        status: 'ai-review-failed',
        failedAt: new Date().toISOString()
      });
    }
    
    throw error;
  }
};

