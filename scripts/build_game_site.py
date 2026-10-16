#!/usr/bin/env python3
"""Build a static searchable site from the complete master JSON, with lazy details."""
import argparse,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--input',type=Path,default=ROOT/'data/game-library.json');p.add_argument('--output',type=Path,default=ROOT/'web-game-library/dist');args=p.parse_args()
 source=json.loads(args.input.read_text()); out=args.output;out.mkdir(parents=True,exist_ok=True)
 for name in ('index.html','styles.css','app.js','hls.min.js','gamepad.js'):shutil.copy2(ROOT/'web-game-library'/name,out/name)
 data=out/'data';(data/'games').mkdir(parents=True,exist_ok=True)
 games=[]
 for g in source['games']:
  assert g['id'].replace('-','').isalnum()
  summary={k:g.get(k) for k in ('id','steamAppId','name','imageUrl','genres','controllerSupport','platforms','playerModes','verificationStatus')}
  games.append(summary)
  (data/'games'/f'{g["id"]}.json').write_text(json.dumps(g,ensure_ascii=False,separators=(',',':')))
 index={'metadata':source['metadata'],'tabs':source['tabs'],'games':games}
 (data/'catalog.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':')))
 print(f'Built {len(games)} game summaries, full detail records and {len(source["tabs"])} tabs → {out}')
if __name__=='__main__':main()
