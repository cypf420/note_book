# Editable Note Site v3

这是升级后的可编辑笔记网站，重点改成了 **Typora 风格的阅读 / 编辑一体化体验**：

- 默认只显示渲染结果（阅读模式）
- 点击“编辑当前文档”后，在同一页面右侧拉出源码编辑器
- 按 `Esc` 退出编辑，按 `Ctrl/Cmd + S` 保存

## 一句话用途

把常见网页内容统一转换为 Markdown，进入一个支持阅读、搜索、WYSIWYG 和源码双模式编辑的本地知识库。

---

## 3.1 版本增量（本轮继续迭代）

- 新增**阅读宽度三档切换**（专栏窄栏 / 标准 / 沉浸宽幅），并自动记住你的选择。
- 搜索索引改为**渐进式构建**（分批处理），文档量变大时首屏不会被一次性索引阻塞。
- 顶部与页脚文案同步更新，明确“渐进索引 + 阅读宽度控制”能力。
- 网址导入增强为“内容主区域评分提取 + 统一 Markdown 转换”流程，尽可能覆盖更多站点正文。
- 所见即所得模式新增常见 Markdown 快捷语法触发（`# `、`## `、`### `、`- `、`1. `、`> `、`````）。

---

## 2.0 版本说明（你可以在仓库历史里直接看到）

为便于你确认“仓库是否真的发生了变更”，这里补一份明确的 2.0 版本记录。

### v2.0 新增与改进

- 新增**所见即所得（WYSIWYG）编辑模式**，可在阅读与富文本编辑之间切换。
- 新增**可收起边栏（专注模式）**，收起后正文区域可占据更大可视宽度。
- 新增**富文本工具栏**（加粗、斜体、标题、列表、引用、代码、链接等常用操作）。
- 优化整体视觉样式为更偏“报刊阅读”的排版风格，提升长文阅读体验。

### 如何确认你本地仓库已更新到这个版本

在仓库目录运行：

```bash
git log --oneline -n 5
```

如果能看到类似以下提交，说明版本更新已经存在于仓库历史：

```text
6ba33fb Add WYSIWYG rich-edit mode, sidebar collapse and visual redesign
```

## 本次新增功能

### 1. 阅读与源码一体化（Typora 风格）

- 平时隐藏原文源码，只显示渲染结果
- 需要修改时再打开编辑器
- 预览始终同步更新

### 2. 自动目录（TOC）

- 自动读取 `h1 / h2 / h3`
- 右侧目录栏可以跳转到对应章节
- URL hash 会同步文档和章节位置

### 3. 全文搜索

- 启动后会扫描 `library.json` 中的全部文档
- 索引采用分批渐进构建，避免一次性阻塞界面
- 可按标题与正文关键字搜索
- 点击结果会直接打开对应文档

### 4.1 阅读宽度切换（新）

- 顶栏新增“阅读宽度”按钮
- 三种宽度循环切换：专栏窄栏 / 标准 / 沉浸宽幅
- 选择会保存在浏览器 `localStorage`，刷新后继续生效

### 4. 自动导航站点

- 左侧文档列表就是站点导航
- 支持快速切换、当前文档高亮、文档链接
- 通过 hash 路由实现“单页多文档”站点

### 5. GitHub Pages 工作流模板

新增：

```text
.github/workflows/deploy-editable-note-site.yml
```

用途：
- 把 `editable_note_site/` 子目录作为 Pages 构建产物
- 适合独立仓库或单独子项目部署

> 注意：GitHub Pages 版本是 **只读模式**。因为 Pages 不能直接写本地文件，也不能充当网页抓取服务端。

### 6. 网址一键导入（保留）

需要本地服务端：

```bash
python scripts/server.py
```

按钮：
- `一键导入到编辑区`
- `一键导入并保存到站点`

导入行为：
- 支持 `HTML` 与 `Markdown` 网址
- 支持 `text/plain` 文本页导入
- 服务端会自动识别内容类型，并统一转换为 Markdown 再进入编辑/保存流程（包含大部分网页正文提取）
- 导入完成后状态栏会显示内容类型与图片下载统计（成功/总数/失败/跳过）
- 对懒加载图片（`data-src` / `data-original` / `srcset`）会尽量识别并本地化

### 6.1 所见即所得里的 Markdown 快捷语法

在所见即所得模式中输入后按空格/回车可触发：

- `# ` / `## ` / `### `：切换标题级别
- `- ` / `* `：无序列表
- `1. `：有序列表
- `> `：引用块
- `````：插入代码块

## 项目结构

```text
editable_note_site/
├── index.html
├── style.css
├── app.js
├── README.md
├── WORKLOG.md
├── .nojekyll
├── content/
│   ├── note.md
│   ├── library.json
│   ├── imports/
│   └── assets/
├── scripts/
│   ├── server.py
│   ├── fetch_note.py
│   ├── fetch_assets.py
│   └── fetch_all.py
└── .github/
    └── workflows/
        └── deploy-editable-note-site.yml
```

## 启动方式

### Windows 一键启动（推荐）

在 `editable_note_site` 目录双击或执行：

```bat
begin.bat
```

说明：
- 自动检测 Python（`py -3` 或 `python`）
- 自动检查并安装依赖（首次）
- 自动打开浏览器并启动本地服务

界面支持：
- 顶栏可一键切换浅色报刊 / 夜间雅黑主题（浏览器会记住选择）

### 本地完整模式（推荐）

```bash
cd editable_note_site
python scripts/server.py
```

打开：

```text
http://127.0.0.1:8000/
```

本地完整模式支持：
- 编辑
- 保存
- 一键导入网址
- 下载网页图片到本地
- 自动更新文档索引

### 静态只读模式

```bash
python -m http.server 8000
```

静态模式支持：
- 阅读
- 搜索
- 目录跳转
- 多文档导航

静态模式不支持：
- 保存到本地站点
- 一键抓取网址

## 键盘快捷键

- `Ctrl/Cmd + S`：保存当前文档
- `Ctrl/Cmd + E`：打开/关闭编辑器
- `Esc`：退出编辑器

## GitHub Pages 部署说明

如果你要部署到 GitHub Pages：

1. 把整个 `editable_note_site` 目录放进仓库
2. 确保 workflow 文件路径正确
3. 到 GitHub 仓库设置里启用 Pages / Actions
4. Push 后自动部署

### 注意

如果你的仓库本身已经在用 MkDocs 或其他 Pages 工作流，
这个工作流可能会与现有部署冲突。更稳妥的方式是：

- 用单独仓库部署这个编辑站
- 或者把 workflow 改成手动触发

## 依赖

本地服务端依赖：

```bash
pip install requests beautifulsoup4 markdownify
```

## Git 提交示例

```bash
git add .
git commit -m "feat: add typora-like reading mode, toc, search and pages workflow"
git push
```

## 合并冲突排查（你本地仓库“出问题”时）

先看状态：

```bash
git status
```

如果当前正卡在 merge/rebase 流程，可先中止：

```bash
git merge --abort
# 或
git rebase --abort
```

然后同步远端最新：

```bash
git fetch --all --prune
git pull --rebase origin main
```

如果你确认本地改动不要了，直接覆盖到远端最新版：

```bash
git fetch origin
git reset --hard origin/main
```

> 注意：`reset --hard` 会删除本地未提交改动，请先备份。

## 关于同步到 GitHub

我已经为你补齐了可推送的目录和工作流模板。
如果当前仓库权限允许，直接 push 即可生效；如果仍然是受限仓库，则需要你在本地执行 git push。
