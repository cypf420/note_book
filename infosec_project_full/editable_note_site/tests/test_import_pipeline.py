from __future__ import annotations

import contextlib
import threading
import sys
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / 'scripts'
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import import_pipeline as pipeline


class ImportPipelineTests(unittest.TestCase):
    def test_repairs_mojibake_markdown(self) -> None:
        fixture = ROOT / 'tests' / 'fixtures' / 'cc98_mojibake.md.txt'
        source = pipeline.decode_bytes(fixture.read_bytes(), is_html=False)

        output = pipeline.render_source_to_markdown(
            source,
            source_type='markdown',
            source_name=str(fixture),
        )

        self.assertIn('title: CC98论坛', output)
        self.assertIn('## 哎呀，出错了', output)
        self.assertIn('网站运行时发生了意外错误', output)
        self.assertIn('[立即清空本地缓存](/reset)', output)
        self.assertNotIn('è®º', output)
        self.assertNotIn('å', output)

    def test_renders_html_blocks_to_markdown(self) -> None:
        html = '''
        <html>
          <head>
            <title>CC98论坛</title>
          </head>
          <body>
            <main>
              <h2>哎呀，出错了</h2>
              <p>网站运行时发生了意外错误，网页内容无法正常显示。</p>
              <hr>
              <p hidden>不应该被保留</p>
              <p><a href="/reset">立即清空本地缓存</a></p>
            </main>
          </body>
        </html>
        '''

        output = pipeline.render_source_to_markdown(
            html,
            source_type='html',
            source_name='https://example.com/cc98',
        )

        self.assertIn('title: CC98论坛', output)
        self.assertIn('## 哎呀，出错了', output)
        self.assertIn('网站运行时发生了意外错误，网页内容无法正常显示。', output)
        self.assertIn('---', output)
        self.assertIn('[立即清空本地缓存](https://example.com/reset)', output)
        self.assertNotIn('不应该被保留', output)

    def test_rewrites_relative_links_to_absolute_urls(self) -> None:
        html = '''
        <html>
          <head><title>链接测试</title></head>
          <body>
            <main>
              <p><a href="/topic/123">帖子链接</a></p>
              <p><a href="reply/2#floor">楼层链接</a></p>
              <p><a href="#tail">页内跳转</a></p>
              <p><a href="mailto:test@example.com">邮件</a></p>
            </main>
          </body>
        </html>
        '''

        output = pipeline.render_source_to_markdown(
            html,
            source_type='html',
            source_name='https://www.cc98.org/topic/5969492',
        )

        self.assertIn('[帖子链接](https://www.cc98.org/topic/123)', output)
        self.assertIn('[楼层链接](https://www.cc98.org/topic/reply/2#floor)', output)
        self.assertIn('[页内跳转](https://www.cc98.org/topic/5969492#tail)', output)
        self.assertIn('[邮件](mailto:test@example.com)', output)

    @unittest.skipUnless(pipeline.browser_render_available(), 'Playwright unavailable')
    def test_browser_render_picks_dynamic_dom(self) -> None:
        html = '''
        <html>
          <head>
            <meta charset="utf-8">
            <title>动态页面测试</title>
            <script>
              window.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                  document.getElementById('app').innerHTML = `
                    <main>
                      <h1>动态加载完成</h1>
                      <p>这里是浏览器真正渲染后的正文。</p>
                    </main>
                  `;
                }, 120);
              });
            </script>
          </head>
          <body>
            <div id="app">加载中...</div>
          </body>
        </html>
        '''

        with TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            (tmp_path / 'index.html').write_text(html, encoding='utf-8')

            class QuietHandler(SimpleHTTPRequestHandler):
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, directory=tmp_dir, **kwargs)

                def log_message(self, format, *args):
                    return

            server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                url = f'http://127.0.0.1:{server.server_port}/index.html'
                rendered = pipeline.render_url_in_browser(url, timeout_ms=10000, wait_after_load_ms=1200)
                output = pipeline.render_source_to_markdown(
                    rendered['html'],
                    source_type='html',
                    source_name=rendered['url'],
                )
            finally:
                server.shutdown()
                thread.join(timeout=5)
                with contextlib.suppress(Exception):
                    server.server_close()

        self.assertIn('title: 动态页面测试', output)
        self.assertIn('# 动态加载完成', output)
        self.assertIn('这里是浏览器真正渲染后的正文。', output)
        self.assertNotIn('加载中', output)

    def test_cc98_topic_extractor_removes_navigation_noise(self) -> None:
        html = '''
        <html>
          <head>
            <meta charset="utf-8">
            <title>示例帖子 - CC98论坛</title>
          </head>
          <body>
            <div class="main-container">
              <div>CC98论坛 | 版面列表 | 登录 | 注册</div>
              <div id="topicTitleProp" class="column">
                <div id="essay1" class="row">示例帖子</div>
                <div id="essayProp" class="row">标签： 求助 2026-03-24 20:00:00 收藏 收起所有图片 分享帖子链接</div>
              </div>
              <div id="1" class="reply">
                <div class="userMessage">
                  <div class="column userMessage-left">
                    <a class="userMessage-userName">楼主用户</a>
                  </div>
                </div>
                <div class="column">
                  <div class="reply-content">
                    <article><p>这是主楼正文。</p></article>
                  </div>
                  <div class="column">
                    <div class="comment1">发表于 2026-03-24 20:00:00 1 0 评分 引用 追踪</div>
                    <div id="tooFast" class="noticeSuccess displaynone">你的操作太快了，慢慢来。</div>
                  </div>
                </div>
                <div class="reply-floor">1</div>
                <div class="reply-floor-lz">楼主</div>
              </div>
              <div id="2" class="reply">
                <div class="userMessage">
                  <div class="column userMessage-left">
                    <a class="userMessage-userName">回复用户</a>
                  </div>
                </div>
                <div class="column">
                  <div class="reply-content">
                    <article><p>这是回复内容。</p></article>
                  </div>
                  <div class="column">
                    <div class="comment1">发表于 2026-03-24 20:05:00 0 0 评分 引用 追踪</div>
                  </div>
                </div>
                <div class="reply-floor">2</div>
              </div>
            </div>
          </body>
        </html>
        '''

        output = pipeline.render_source_to_markdown(
            html,
            source_type='html',
            source_name='https://www.cc98.org/topic/123456',
        )

        self.assertIn('title: 示例帖子', output)
        self.assertIn('# 示例帖子', output)
        self.assertIn('## 1 楼 楼主用户（楼主）', output)
        self.assertIn('## 2 楼 回复用户', output)
        self.assertIn('这是主楼正文。', output)
        self.assertIn('这是回复内容。', output)
        self.assertNotIn('CC98论坛 | 版面列表 | 登录 | 注册', output)
        self.assertNotIn('你的操作太快了，慢慢来。', output)


if __name__ == '__main__':
    unittest.main()
