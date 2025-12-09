/**
 * 获取 GitLab MR 的 diff 内容
 */
export async function getMRDiff(projectPath: string, mrIid: number) {
  const GITLAB_TOKEN = process.env.GITLAB_TOKEN || 'abcdefg';
  const GITLAB_API_BASE = 'https://gitlab.com/api/v4';
  
  // 对项目路径进行 URL 编码
  const encodedProjectPath = encodeURIComponent(projectPath);
  
  const url = `${GITLAB_API_BASE}/projects/${encodedProjectPath}/merge_requests/${mrIid}/changes`;
  
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
  
  // 提取并格式化 diff 信息
  const changes = data.changes || [];
  
  return changes.map((change: any) => ({
    old_path: change.old_path,
    new_path: change.new_path,
    new_file: change.new_file,
    renamed_file: change.renamed_file,
    deleted_file: change.deleted_file,
    diff: change.diff
  }));
}

