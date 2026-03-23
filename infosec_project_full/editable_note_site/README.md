# Editable Note Site v3

这是升级后的可编辑笔记网站，重点改成了 **Typora 风格的阅读 / 编辑一体化体验**：

- 默认只显示渲染结果（阅读模式）
- 点击“编辑当前文档”后，在同一页面右侧拉出源码编辑器
- 按 `Esc` 退出编辑，按 `Ctrl/Cmd + S` 保存

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
- 可按标题与正文关键字搜索
- 点击结果会直接打开对应文档

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

## 关于同步到 GitHub

我已经为你补齐了可推送的目录和工作流模板。
如果当前仓库权限允许，直接 push 即可生效；如果仍然是受限仓库，则需要你在本地执行 git push。
