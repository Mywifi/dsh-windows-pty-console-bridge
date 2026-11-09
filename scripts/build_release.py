"""Build the portable Windows kit using only Python's standard library."""
import hashlib
import json
from pathlib import Path
import sys
import tarfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate_archive(archive, package):
    allowed = {'package.json', 'index.mjs', 'bridge.cmd', 'cordis.patch.yml', 'icon.svg',
               'locale/en.json', 'locale/zh.json', 'README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'LICENSE'}
    with tarfile.open(archive, 'r:gz') as bundle:
        members = bundle.getmembers()
        names = [member.name.removeprefix('package/') for member in members]
        if set(names) != allowed or len(names) != len(allowed) or not all(m.isfile() for m in members):
            raise ValueError('Unexpected npm pack contents; inspect archive before publishing')
        packed = json.load(bundle.extractfile('package/package.json'))
        if packed != package:
            raise ValueError('Packed manifest differs from source manifest')


def main():
    package = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    archive = Path(sys.argv[1]).resolve()
    validate_archive(archive, package)
    stem = f"{package['name']}-{package['version']}"
    if archive.parent != DIST or archive.name != stem + '.tgz':
        raise ValueError('Expected the versioned archive inside dist/')
    kit = DIST / (stem + '-windows')
    kit.mkdir(parents=True, exist_ok=True)
    contents = {
        archive.name: archive.read_bytes(),
        'install.ps1': (ROOT / 'scripts/install.ps1').read_text(encoding='utf-8-sig').replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8-sig'),
        'release.json': (json.dumps({'name': package['name'], 'version': package['version'], 'archive': archive.name}, indent=2) + '\n').encode(),
        'README.md': (ROOT / 'README.md').read_bytes(),
        '安装说明.md': (ROOT / 'README.zh-CN.md').read_bytes(),
        'LICENSE': (ROOT / 'LICENSE').read_bytes(),
    }
    contents['SHA256SUMS.txt'] = ''.join(f'{sha(data)}  {name}\n' for name, data in contents.items()).encode()
    for name, data in contents.items():
        (kit / name).write_bytes(data)
    destination = DIST / (stem + '-windows.zip')
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for name, data in contents.items():
            entry = zipfile.ZipInfo(stem + '-windows/' + name, date_time=(2020, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            bundle.writestr(entry, data)
    (DIST / 'SHA256SUMS.txt').write_text(f'{sha(archive.read_bytes())}  {archive.name}\n{sha(destination.read_bytes())}  {destination.name}\n', encoding='utf-8')
    print('Built', archive.name, 'and', destination.name)


if __name__ == '__main__':
    main()
