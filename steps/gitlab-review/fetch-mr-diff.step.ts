import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { gitlabService } from '../../src/services/gitlab';

const inputSchema = z.object({
  reviewId: z.string(),
  mrUrl: z.string(),
  projectPath: z.string(),
  mrIid: z.number()
});

export const config: EventConfig = {
  name: 'FetchMRDiff',
  type: 'event',
  description: '获取 GitLab MR 的 diff 内容',
  subscribes: ['fetch-mr-diff'],
  emits: ['process-ai-review'],
  input: inputSchema,
  flows: ['gitlab-mr-review']
};

export const handler: Handlers['FetchMRDiff'] = async (input, { emit, logger, state }) => {
  const { reviewId, mrUrl, projectPath, mrIid } = input;
  
  logger.info('开始获取 MR diff', { reviewId, projectPath, mrIid });
  
  try {
    // 获取 MR 详细信息和 diff
    const mrDetails = await gitlabService.getMRDetails(projectPath, mrIid);
    const mrDiff = await gitlabService.getMRDiff(projectPath, mrIid);
    
    // 将 diff 数据存储到 state 中（避免在 emit 中传输过大的数据）
    await state.set('mr-reviews', reviewId, {
      reviewId,
      mrUrl,
      projectPath,
      mrIid,
      mrDetails,
      mrDiff,
      timestamp: new Date().toISOString()
    });
    
    logger.info('MR diff 获取成功', { 
      reviewId, 
      diffCount: mrDiff.length,
      title: mrDetails.title 
    });
    
    // 触发 AI review 事件
    await emit({
      topic: 'process-ai-review',
      data: {
        reviewId,
        projectPath,
        mrTitle: mrDetails.title,
        mrDescription: mrDetails.description
      }
    });
    
  } catch (error: any) {
    logger.error('获取 MR diff 失败', { 
      reviewId, 
      error: error.message,
      stack: error.stack 
    });
    
    // 存储错误信息
    await state.set('mr-reviews', reviewId, {
      reviewId,
      mrUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
};

