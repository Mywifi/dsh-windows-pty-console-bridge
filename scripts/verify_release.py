"""Check every published release artifact and the portable kit's internal hashes."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile
from build_release import validate_archive

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


def check_sums(text, read):
    lines = text.splitlines()
    names = []
    for line in lines:
        digest, name = line.split('  ', 1)
        if len(digest) != 64 or hashlib.sha256(read(name)).hexdigest() != digest:
            raise ValueError('Checksum mismatch: ' + name)
        names.append(name)
    if len(names) != len(set(names)):
        raise ValueError('Duplicate checksum entries')
    return set(names)


def main():
    package = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    stem = f"{package['name']}-{package['version']}"
    archive_name = stem + '.tgz'
    zip_name = stem + '-windows.zip'
    checked = check_sums((DIST / 'SHA256SUMS.txt').read_text(encoding='utf-8'), lambda n: (DIST / n).read_bytes())
    if checked != {archive_name, zip_name}:
        raise ValueError('Unexpected release checksum names')
    validate_archive(DIST / archive_name, package)
    prefix = stem + '-windows/'
    expected = {archive_name, 'install.ps1', 'release.json', 'README.md', '安装说明.md', 'LICENSE', 'SHA256SUMS.txt'}
    with zipfile.ZipFile(DIST / zip_name) as kit:
        names = kit.namelist()
        if len(names) != len(expected) or set(names) != {prefix + n for n in expected}:
            raise ValueError('Unexpected ZIP members')
        if any(PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts for n in names):
            raise ValueError('Unsafe ZIP member')
        checks = check_sums(kit.read(prefix + 'SHA256SUMS.txt').decode(), lambda n: kit.read(prefix + n))
        if checks != expected - {'SHA256SUMS.txt'}:
            raise ValueError('Incomplete portable checksum manifest')
        if kit.read(prefix + archive_name) != (DIST / archive_name).read_bytes():
            raise ValueError('Portable archive differs from standalone archive')
        if not kit.read(prefix + 'install.ps1').startswith(b'\xef\xbb\xbf'):
            raise ValueError('Installer must have UTF-8 BOM for Windows PowerShell 5.1')
        release = json.loads(kit.read(prefix + 'release.json'))
        if release != {'name': package['name'], 'version': package['version'], 'archive': archive_name}:
            raise ValueError('Portable release metadata mismatch')
    print('Verified npm pack whitelist, release hashes, ZIP members, metadata and installer encoding')


if __name__ == '__main__':
    main()
