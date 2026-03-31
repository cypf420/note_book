from __future__ import annotations

import json
import sys
import unittest
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / 'scripts'
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import server


@contextmanager
def isolated_site():
    with TemporaryDirectory() as tmp_dir:
        tmp_root = Path(tmp_dir)
        content_dir = tmp_root / 'content'
        import_dir = content_dir / 'imports'
        asset_dir = content_dir / 'assets'
        runtime_dir = tmp_root / 'runtime'
        import_dir.mkdir(parents=True, exist_ok=True)
        asset_dir.mkdir(parents=True, exist_ok=True)
        runtime_dir.mkdir(parents=True, exist_ok=True)
        (content_dir / 'library.json').write_text(
            json.dumps({'groups': [], 'documents': []}, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )

        original = {
            'ROOT': server.ROOT,
            'CONTENT_DIR': server.CONTENT_DIR,
            'IMPORT_DIR': server.IMPORT_DIR,
            'ASSET_DIR': server.ASSET_DIR,
            'LIBRARY_FILE': server.LIBRARY_FILE,
            'RUNTIME_DIR': server.RUNTIME_DIR,
            'SERVER_STATE_FILE': server.SERVER_STATE_FILE,
            'STOP_BAT_FILE': server.STOP_BAT_FILE,
            'SITE_REPO_ROOT': server.SITE_REPO_ROOT,
        }

        server.ROOT = tmp_root
        server.CONTENT_DIR = content_dir
        server.IMPORT_DIR = import_dir
        server.ASSET_DIR = asset_dir
        server.LIBRARY_FILE = content_dir / 'library.json'
        server.RUNTIME_DIR = runtime_dir
        server.SERVER_STATE_FILE = runtime_dir / 'server-state.json'
        server.STOP_BAT_FILE = tmp_root / 'stop.bat'
        server.SITE_REPO_ROOT = Path('.')
        try:
            yield tmp_root
        finally:
            for name, value in original.items():
                setattr(server, name, value)


class SharedSyncTests(unittest.TestCase):
    def test_prepare_shared_bundle_excludes_shared_imports(self) -> None:
        with isolated_site() as tmp_root:
            local_doc = server.IMPORT_DIR / 'local.md'
            local_doc.write_text('# local', encoding='utf-8')
            (server.ASSET_DIR / 'local-note').mkdir(parents=True, exist_ok=True)
            (server.ASSET_DIR / 'local-note' / 'cover.png').write_bytes(b'local')

            shared_doc = server.IMPORT_DIR / 'shared.md'
            shared_doc.write_text('# shared', encoding='utf-8')
            (server.ASSET_DIR / 'shared-remote').mkdir(parents=True, exist_ok=True)
            (server.ASSET_DIR / 'shared-remote' / 'cover.png').write_bytes(b'shared')

            server.save_library({
                'groups': [],
                'documents': [
                    {
                        'title': 'Local',
                        'slug': 'local-note',
                        'path': './content/imports/local.md',
                        'type': 'import',
                        'group': '我的笔记',
                        'order': 1,
                    },
                    {
                        'title': 'Shared',
                        'slug': 'shared-remote',
                        'path': './content/imports/shared.md',
                        'type': 'import',
                        'group': '共享笔记/信息学院/软件工程/2026',
                        'order': 2,
                        'sharedFromBranch': 'info_se_2026',
                        'sourceUrl': 'https://example.com/shared',
                    },
                ],
            })

            share_library = server.collect_shareable_library_data(server.load_library())
            worktree_root = tmp_root / 'worktree'
            manifest = server.build_shared_manifest(
                'my_branch',
                {
                    'academy': '信息学院',
                    'major': '软件工程',
                    'year': '2026',
                    'author': 'tester',
                    'authorSlug': 'tester',
                    'tags': [],
                    'summary': 'test bundle',
                },
                'https://github.com/example/repo.git',
                share_library,
            )
            bundle_root = server.prepare_shared_bundle(worktree_root, manifest, share_library)

            self.assertTrue((bundle_root / 'content' / 'imports' / 'local.md').exists())
            self.assertFalse((bundle_root / 'content' / 'imports' / 'shared.md').exists())
            self.assertTrue((bundle_root / 'content' / 'assets' / 'local-note' / 'cover.png').exists())
            self.assertFalse((bundle_root / 'content' / 'assets' / 'shared-remote').exists())

            bundle_library = json.loads((bundle_root / 'content' / 'library.json').read_text(encoding='utf-8'))
            self.assertEqual(len(bundle_library['documents']), 1)
            self.assertEqual(bundle_library['documents'][0]['slug'], 'local-note')

    def test_apply_shared_bundle_syncs_branch_docs_and_removes_stale_files(self) -> None:
        with isolated_site() as tmp_root:
            branch_name = 'info_se_2026'
            stale_slug = 'info_se_2026-old-note'
            stale_path = server.IMPORT_DIR / f'{stale_slug}.md'
            stale_path.write_text('# old', encoding='utf-8')
            (server.ASSET_DIR / stale_slug).mkdir(parents=True, exist_ok=True)
            (server.ASSET_DIR / stale_slug / 'old.png').write_bytes(b'old')

            local_path = server.IMPORT_DIR / 'local.md'
            local_path.write_text('# local', encoding='utf-8')

            server.save_library({
                'groups': [],
                'documents': [
                    {
                        'title': 'Old note',
                        'slug': stale_slug,
                        'path': f'./content/imports/{stale_slug}.md',
                        'type': 'import',
                        'group': '共享笔记/信息学院/软件工程/2026/历史',
                        'order': 1,
                        'sourceUrl': 'https://example.com/old',
                        'sharedFromBranch': branch_name,
                    },
                    {
                        'title': 'Local only',
                        'slug': 'local',
                        'path': './content/imports/local.md',
                        'type': 'import',
                        'group': '我的笔记',
                        'order': 1,
                    },
                ],
            })

            site_root = tmp_root / 'remote'
            remote_import_dir = site_root / server.SHARED_NOTES_DIRNAME / 'content' / 'imports'
            remote_asset_dir = site_root / server.SHARED_NOTES_DIRNAME / 'content' / 'assets' / 'remote-note'
            remote_import_dir.mkdir(parents=True, exist_ok=True)
            remote_asset_dir.mkdir(parents=True, exist_ok=True)
            (remote_import_dir / 'remote.md').write_text(
                '![img](./content/assets/remote-note/pic.png)\n\nnew content',
                encoding='utf-8',
            )
            (remote_asset_dir / 'pic.png').write_bytes(b'png')

            result = server.apply_shared_bundle(
                site_root,
                branch_name,
                {'academy': '信息学院', 'major': '软件工程', 'year': '2026'},
                {
                    'groups': [],
                    'documents': [
                        {
                            'title': 'Remote note',
                            'slug': 'remote-note',
                            'path': './content/imports/remote.md',
                            'type': 'import',
                            'group': '课程资料',
                            'order': 3,
                            'sourceUrl': 'https://example.com/remote',
                        },
                    ],
                },
            )

            target_slug = 'info_se_2026-remote-note'
            target_file = server.IMPORT_DIR / f'{target_slug}.md'
            self.assertTrue(target_file.exists())
            self.assertIn(f'./content/assets/{target_slug}/pic.png', target_file.read_text(encoding='utf-8'))
            self.assertTrue((server.ASSET_DIR / target_slug / 'pic.png').exists())
            self.assertFalse(stale_path.exists())
            self.assertFalse((server.ASSET_DIR / stale_slug).exists())

            library = server.load_library()
            docs_by_slug = {doc['slug']: doc for doc in library['documents']}
            self.assertIn('local', docs_by_slug)
            self.assertIn(target_slug, docs_by_slug)
            self.assertNotIn(stale_slug, docs_by_slug)
            self.assertEqual(docs_by_slug[target_slug]['sharedFromBranch'], branch_name)
            self.assertEqual(docs_by_slug[target_slug]['sharedSourceUrl'], 'https://example.com/remote')
            self.assertEqual(docs_by_slug[target_slug]['group'], '共享笔记/信息学院/软件工程/2026/课程资料')
            self.assertEqual(result['documentCount'], 1)
            self.assertEqual(result['removedCount'], 1)


if __name__ == '__main__':
    unittest.main()
