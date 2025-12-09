/**
 * 获取 GitLab MR 的详细信息
 */
export async function getMRDetails(projectPath: string, mrIid: number) {
  const GITLAB_TOKEN = process.env.GITLAB_TOKEN || 'abcdefg';
  const GITLAB_API_BASE = 'https://gitlab.com/api/v4';
  
  // 对项目路径进行 URL 编码
  const encodedProjectPath = encodeURIComponent(projectPath);
  
  const url = `${GITLAB_API_BASE}/projects/${encodedProjectPath}/merge_requests/${mrIid}`;
  
  const response = await fetch(url, {
    headers: {
      'PRIVATE-TOKEN': GITLAB_TOKEN
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitLab API 请求失败 (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    iid: data.iid,
    title: data.title,
    description: data.description || '',
    state: data.state,
    source_branch: data.source_branch,
    target_branch: data.target_branch,
    author: data.author,
    created_at: data.created_at,
    updated_at: data.updated_at,
    web_url: data.web_url
  };
}

