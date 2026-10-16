"""Retry unavailable source covers using official Steam assets on the same host."""
import json
import re
import urllib.request
from PIL import Image
from export_master_excel import REPORT, path_for
report = json.loads(REPORT.read_text())
recovered = []
failed = []
for item in report['failures']:
    url = item['url']
    match = re.search(r'/apps/(\d+)/',url)
    if not match:
        failed.append(item)
        continue
    app = match.group(1)
    for filename in ('library_600x900.jpg', 'portrait.png', 'header.jpg', 'capsule_616x353.jpg'):
        alternate = f'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app}/{filename}'
        if alternate == url:
            continue
        try:
            with urllib.request.urlopen(alternate,timeout=20) as response:
                with Image.open(response) as image:
                    image = image.convert('RGB')
                    image.thumbnail((160,160))
                    image.save(path_for(url),'JPEG',quality=85)
            recovered.append({'original':url,'used':alternate})
            print('Recovered',app,filename,flush=True)
            break
        except Exception:
            continue
    else:
        failed.append(item)
REPORT.with_name('master-image-recovery.json').write_text(json.dumps({'recovered':recovered,'failed':failed},ensure_ascii=False,indent=2))
print('Recovered',len(recovered),'unavailable',len(failed),flush=True)
