import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  mrUrl: z.string().url('MR URL 必须是有效的 URL').refine(
    (url) => url.includes('gitlab.com') && url.includes('/merge_requests/'),
    { message: 'URL 必须是有效的 GitLab Merge Request URL' }
  )
});

export const config: ApiRouteConfig = {
  name: 'TriggerMRReview',
  type: 'api',
  path: '/gitlab/reviewmr',
  method: 'POST',
  description: '触发 GitLab MR AI Review 工作流',
  emits: ['fetch-mr-diff'],
  flows: ['gitlab-mr-review'],
  bodySchema,
  responseSchema: {
    200: z.object({
      message: z.string(),
      reviewId: z.string(),
      mrUrl: z.string()
    }),
    400: z.object({ error: z.string() })
  }
};

export const handler: Handlers['TriggerMRReview'] = async (req, { emit, logger }) => {
  try {
    const { mrUrl } = bodySchema.parse(req.body);
    
    logger.info('收到 MR Review 请求', { mrUrl });
    
    // 生成唯一的 review ID
    const reviewId = `review-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // 提取 MR 信息
    // URL 格式: https://gitlab.com/group/project/-/merge_requests/123
    const urlMatch = mrUrl.match(/gitlab\.com\/([^\/]+\/[^\/]+(?:\/[^\/]+)*)\/\-\/merge_requests\/(\d+)/);
    
    if (!urlMatch) {
      logger.error('无法解析 MR URL', { mrUrl });
      return {
        status: 400,
        body: { error: '无法解析 MR URL，请确保 URL 格式正确' }
      };
    }
    
    const projectPath = urlMatch[1];
    const mrIid = urlMatch[2];
    
    logger.info('解析 MR 信息成功', { projectPath, mrIid, reviewId });
    
    // 触发获取 MR diff 的事件
    await emit({
      topic: 'fetch-mr-diff',
      data: {
        reviewId,
        mrUrl,
        projectPath,
        mrIid: parseInt(mrIid, 10)
      }
    });
    
    return {
      status: 200,
      body: {
        message: 'MR Review 已触发，正在处理中',
        reviewId,
        mrUrl
      }
    };
  } catch (error: any) {
    logger.error('触发 MR Review 失败', { error: error.message });
    return {
      status: 400,
      body: { error: error.message || '请求处理失败' }
    };
  }
};

