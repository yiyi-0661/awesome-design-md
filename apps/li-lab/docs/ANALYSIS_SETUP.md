# Analysis 配置与测试

Analysis 的真实链路如下：

1. 浏览器将单个 PDF 作为 `multipart/form-data` 上传。
2. 服务器在内存中验证并提取文本，不把原始 PDF 写入磁盘或 Supabase。
3. 服务器从正文提取 DOI，并使用 Crossref 获取被引文献元数据；同时通过 Crossref 和 OpenAlex检索相关论文候选。
4. 只有在用户勾选外部处理同意项后，论文提取文本与已核验候选列表才会发送给 DeepSeek。
5. DeepSeek 必须返回结构化 JSON；服务器用 Zod 校验，并拒绝任何不在候选集合中的引用。
6. 页面展示 Core Method、Reference Origins、Related Papers 和明确的 limitations。

## 1. 获取 DeepSeek API Key

1. 打开 [DeepSeek Platform](https://platform.deepseek.com/)。
2. 登录并进入 API Keys 页面。
3. 创建一个新的 API Key，并立即复制保存。密钥通常以 `sk-` 开头。
4. 确认账号有可用余额。不要把 Key 发到聊天、截图或提交到 Git。

## 2. 创建本地环境文件

在终端执行：

```bash
cd /Users/yiyi/Documents/Lyra/apps/li-lab
cp .env.example .env.local
```

打开 `.env.local`，至少填写：

```dotenv
LLM_API_KEY=sk-你的真实密钥
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-flash
LLM_MAX_OUTPUT_TOKENS=6000
CROSSREF_POLITE_EMAIL=你的联系邮箱
```

这些变量与 `chem-research-radar` 使用的命名一致。也支持 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL` 和 `DEEPSEEK_MODEL`，但 `LLM_*` 优先。

`OPENALEX_API_KEY` 是可选项；如果你的 OpenAlex 账号提供了 Key，可以填写以获得更稳定的请求配额。Crossref 不要求 Key，建议填写联系邮箱进入 polite pool。

## 3. 重启开发服务器

修改 `.env.local` 后必须重启：

```bash
npm run dev
```

打开 [http://localhost:3000/analysis](http://localhost:3000/analysis)。页面应显示 `DEEPSEEK READY`。

## 4. 端到端测试

1. 使用一篇可公开发送到 DeepSeek 的、文字可复制的 PDF；不要先用扫描件。
2. 勾选外部处理同意项。
3. 上传 PDF，并等待四个阶段完成。
4. 检查三部分结果是否出现。
5. 随机打开至少两个 DOI 链接，确认标题与页面结果一致。
6. 检查 Core Method 的 page/section/text 锚点是否能在原文中找到。
7. 点击 `Create Methods draft`，确认生成的 Markdown 草稿包含三部分结果。

## 常见错误

- `SETUP REQUIRED`：缺少 `LLM_API_KEY`，或修改 `.env.local` 后没有重启服务器。
- `401`：API Key 不正确或已失效。
- `402`：DeepSeek 账号余额不足。
- `This PDF has no extractable text`：PDF 是扫描图像，需要先 OCR。
- `No verifiable literature candidates`：Crossref/OpenAlex 暂时不可用，或论文没有足够可检索元数据。
- `DeepSeek returned an incomplete structured result`：模型输出被截断；重试，或提高 `LLM_MAX_OUTPUT_TOKENS`。

## 隐私边界

- 未勾选同意项时，服务器拒绝分析。
- 原始 PDF 不会被 Li Lab 持久化。
- DeepSeek 会收到最多约 120,000 个字符的论文提取文本。
- Crossref/OpenAlex 只收到 DOI、标题或短检索词，不收到论文全文。
- 对未公开、受保密协议约束或含敏感数据的论文，先确认你有权发送给第三方模型提供商。
