## Workflows

### GitLab MR AI Review

自动化的 GitLab Merge Request AI 代码审查工作流。

**功能特性：**
- 🤖 使用豆包 AI 进行智能代码审查
- 📋 检查编程规范、逻辑错误、性能和安全问题
- 🔔 通过 Slack 发送审查结果通知

**快速使用：**

```bash
# 创建 .env 文件并填入你的 tokens

# 2. 测试 Slack Webhook（可选但推荐）
./scripts/test-slack-webhook.sh

# 3. 启动服务
npm run dev

# 4. 触发 MR 审查
curl -X POST http://localhost:3000/gitlab/reviewmr \
  -H "Content-Type: application/json" \
  -d '{
    "mrUrl": "https://gitlab.com"
  }'
```

---

## Learn More

- [Documentation](https://motia.dev/docs) - Complete guides and API reference
- [Quick Start Guide](https://motia.dev/docs/getting-started/quick-start) - Detailed getting started tutorial
- [Core Concepts](https://motia.dev/docs/concepts/overview) - Learn about Steps and Motia architecture
- [Discord Community](https://discord.gg/motia) - Get help and connect with other developers

