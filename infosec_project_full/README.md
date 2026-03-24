# infosec_project_full

该目录包含信息安全课程笔记与可编辑网站版本。

## 目录说明

- `editable_note_site/`：核心站点（阅读、编辑、导入、保存、搜索、目录导航；支持网页统一转 Markdown 与 WYSIWYG 快捷语法）。
- `信息安全原理_知识点总结.md`：课程知识点主文档。

## 推荐使用方式

1. 进入 `editable_note_site` 目录。
2. 使用 `python scripts/server.py`（跨平台）或 `begin.bat`（Windows）启动。
3. 在浏览器打开 `http://127.0.0.1:8000/`。

## 适用场景（为什么要用它）

- 想把零散网页（教程、博客、文档）沉淀为统一 Markdown 知识库。
- 想同时拥有“所见即所得”与“Markdown 源码”两种编辑方式。
- 想把笔记变化纳入 Git 历史，方便回溯、对比与备份。

详细功能、版本说明与更新记录请查看：

- `editable_note_site/README.md`
- `editable_note_site/WORKLOG.md`
