# 信息安全原理笔记可编辑网站：工作记录（持续更新）

## 0. 最新迭代（v3.1）

- 新增“阅读宽度三档切换”按钮：专栏窄栏 / 标准 / 沉浸宽幅。
- 阅读宽度选择会持久化（`localStorage`），刷新后延续用户偏好。
- 搜索索引流程升级为分批渐进构建，状态文案会显示当前进度（例如 `6/42`）。
- 同步更新文档说明，保证 README 与功能保持一致。

## 0.1 持续迭代补充（v3.2）

- 导入链路增强：网页正文从“固定容器优先”升级为“容器评分 + 噪音剔除 + 统一 Markdown 输出”。
- 所见即所得支持常见 Markdown 快捷语法：标题、列表、引用、代码块可在输入时快速触发。
- 同步刷新多个 README，确保“网页统一转 Markdown”与“WYSIWYG 快捷语法”有明确说明。

## 0.2 运维文档补充（v3.3）

- 新增 Git 合并冲突排查章节（`merge --abort` / `rebase --abort` / `pull --rebase` / `reset --hard`）。
- 新增“什么是 Pull Request”解释，方便非开发背景用户理解提交流程。

## 0.3 新手接入说明补充（v3.4）

- 增加“项目用途”说明，明确它是网页转 Markdown 的本地可编辑知识库。
- 增加 clone 与后续 pull 更新流程，降低首次上手成本。

## 0.4 导入链路稳健性增强（v3.5）

- 网页导入新增懒加载图片识别（`data-src` / `data-original` / `srcset`）。
- 图片下载增加安全扩展名白名单和内容类型校验，减少错误资源写入。
- 导入状态新增“跳过数量”反馈，便于判断被过滤或超限的图片。

## 1. 本轮目标

在上一个增强版基础上继续完善，并完成以下升级：

- 保留网址一键导入能力
- 增加全文搜索
- 增加自动目录（TOC）
- 增加自动导航站点
- 增加 GitHub Pages 部署模板
- 把阅读渲染与源码编辑做成一体化体验，平时隐藏源码，风格接近 Typora

## 2. 本轮新增内容

### 2.1 阅读 / 编辑一体化改造

原来的版本是三栏中固定显示编辑区和预览区。
本轮改成：

- 默认只显示渲染后的正文（阅读模式）
- 编辑器改为右侧抽屉式源码面板
- 点击“编辑当前文档”才展开源码
- 关闭后回到纯阅读状态

这让日常使用更像 Typora：
- 平时专注阅读
- 修改时进入源码编辑
- 预览与正文是同一个工作区

### 2.2 自动目录（TOC）

新增逻辑：
- 渲染后自动扫描 `h1 / h2 / h3`
- 生成右侧目录导航
- 点击目录可平滑跳转
- 当前章节可映射到 URL hash

### 2.3 全文搜索

新增逻辑：
- 初始化时读取 `content/library.json`
- 抓取全部文档 Markdown
- 构建浏览器端轻量搜索索引
- 搜索标题与正文
- 返回匹配片段并可直接打开文档

### 2.4 自动导航站点

新增左侧文档导航：
- 文档列表卡片化
- 当前文档高亮
- 下拉快速切换保留
- 文档路径、类型、来源可见

同时新增 hash 路由：

```text
#doc=<slug>&section=<heading-id>
```

这样一个页面就能承担：
- 文档首页
- 文档阅读页
- 章节定位页

### 2.5 GitHub Pages 模板

新增文件：

```text
.github/workflows/deploy-editable-note-site.yml
```

作用：
- 自动把 `editable_note_site/` 目录打包为 Pages artifact
- 适合独立仓库部署此网站

同时新增：

```text
.nojekyll
```

避免 GitHub Pages 因 Jekyll 过滤静态资源目录。

### 2.6 服务端保持增强版能力

保留并整理 `scripts/server.py`，使其继续支持：
- 保存文档到本地
- 自动更新 `library.json`
- 抓取网址正文
- 自动下载图片到 `content/assets/<slug>/`
- 转 Markdown 后写入站点

## 3. 文件更新清单

### 重点更新

- `index.html`
- `style.css`
- `app.js`
- `README.md`
- `WORKLOG.md`
- `scripts/server.py`

### 新增

- `.github/workflows/deploy-editable-note-site.yml`
- `.nojekyll`

## 4. 当前交互方式

### 阅读模式

- 默认模式
- 只显示渲染结果
- 右侧显示目录
- 左侧显示文档导航与搜索

### 编辑模式

- 点击“编辑当前文档”
- 右侧抽屉显示源码
- 渲染内容实时同步
- `Esc` 退出编辑

### 搜索

- 在左侧输入关键词
- 搜索全部文档标题与正文
- 点击结果打开文档

### 导入网址

- 输入网址
- 选择“导入到编辑区”或“导入并保存到站点”
- 需要通过 `python scripts/server.py` 启动

## 5. 本轮命令

### 本地完整运行

```bash
cd editable_note_site
python scripts/server.py
```

### 静态预览

```bash
python -m http.server 8000
```

### 依赖安装

```bash
pip install requests beautifulsoup4 markdownify
```

### Git 提交

```bash
git add .
git commit -m "feat: typora-like mode, toc, search, nav and pages workflow"
git push
```

## 6. 关于 GitHub 同步

本轮仍按你的要求继续准备好了可同步到 GitHub 的完整目录结构，并补齐了 Pages 工作流模板。

如果仓库写权限正常：
- 你本地执行 `git push` 即可

如果仓库仍受权限限制：
- 需要你在有权限的本地环境手动 push
- 或者把这个项目放到一个新的独立仓库中部署

## 7. 后续还能继续扩展

可选方向：
- 更接近真正 Typora 的块级原位编辑
- 多标签页文档管理
- 本地文件拖拽导入 Markdown / 图片
- 批量网址导入
- 章节拆分与自动重组
- 网页导入时保留更多结构语义
