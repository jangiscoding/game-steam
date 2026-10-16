#!/usr/bin/env python3
"""Download the public Argos English–Vietnamese model through configured networking."""
import hashlib
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'exports/translation-models'
URL='https://argos-net.com/v1/translate-en_vi-1_9.argosmodel'

def main():
    DEST.mkdir(parents=True,exist_ok=True)
    archive=DEST/'translate-en_vi-1_9.argosmodel'
    if not archive.exists():
        partial=archive.with_suffix('.download')
        try:
            with urllib.request.urlopen(URL,timeout=60) as response,partial.open('wb') as output:
                shutil.copyfileobj(response,output)
            partial.replace(archive)
        finally:
            partial.unlink(missing_ok=True)
    extracted=DEST/'en-vi'
    with zipfile.ZipFile(archive) as package:
        if any(not (extracted/item.filename).resolve().is_relative_to(extracted.resolve()) for item in package.infolist()):
            raise RuntimeError('Unsafe model archive path')
        package.extractall(extracted)
    metadata={'source':URL,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'modelDirectory':str(extracted)}
    (DEST/'provenance.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print('Installed model:',extracted)

if __name__=='__main__':main()
