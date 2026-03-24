# note_book

本仓库当前主工作目录在 `infosec_project_full/editable_note_site`，它是一个可本地编辑、可导入网页并统一转换为 Markdown 的笔记工作台（包含 WYSIWYG 中的 Markdown 快捷语法触发）。

## 这个项目有什么用

你可以把它当成一个“本地可写 + 网页可导入”的笔记工作台：

- 能读：支持多文档阅读、目录导航、全文搜索。
- 能写：支持 Markdown 源码编辑和所见即所得（WYSIWYG）编辑。
- 能导：可把 HTML / Markdown / 文本网页统一转成 `.md` 后纳入笔记库。
- 能存：通过本地服务端直接保存到仓库文件，便于 Git 版本管理。

## 快速入口

- 项目说明：`infosec_project_full/README.md`
- 前端/服务端详细文档：`infosec_project_full/editable_note_site/README.md`
- 持续迭代日志：`infosec_project_full/editable_note_site/WORKLOG.md`

## 一键启动（Windows）

进入 `infosec_project_full/editable_note_site` 后执行：

```bat
begin.bat
```

## 如何克隆到你本地（首次）

```bash
git clone https://github.com/cypf420/note_book.git
cd note_book
```

然后进入核心目录启动：

```bash
cd infosec_project_full/editable_note_site
python scripts/server.py
```

浏览器打开：

```text
http://127.0.0.1:8000/
```

## 后续怎么保持本地是最新（不必重复 clone）

```bash
cd note_book
git pull --rebase origin main
```

## 常见 Git 问题（合并冲突 / 最新同步）

如果你看到 `CONFLICT`、`MERGE_HEAD exists` 或无法提交，按下面顺序执行：

```bash
git status
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true
git fetch --all --prune
git pull --rebase origin main
```

如果你只是想“本地直接对齐远端最新”（会丢掉本地未提交修改）：

```bash
git fetch origin
git reset --hard origin/main
```

## 什么是 Pull Request（拉取请求）

Pull Request（PR）可以理解为“提交合并申请单”：

1. 你先在分支上完成修改并提交 commit。  
2. 发起 PR，请求把该分支合并到主分支（如 `main`）。  
3. PR 页面会展示差异（diff）、变更说明、测试结果。  
4. 你确认后合并，主分支才更新。  

简单说：**commit 是保存改动，PR 是申请把改动合入主分支**。
