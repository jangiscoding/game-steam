#!/usr/bin/env python3
"""Resumable official Steam text/media collection, with explicit locale status."""
from library_data import load_library, save_library

import argparse
import json
import re
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'exports/content-cache'


def now():
    return datetime.now(timezone.utc).isoformat()


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value,ensure_ascii=False,separators=(',', ':'))+'\n',encoding='utf-8')
    temporary.replace(path)


def safe_url(value):
    if not isinstance(value,str): return None
    if value.startswith('//'): value='https:'+value
    return value if urlparse(value).scheme in ('http','https') else None


class DescriptionParser(HTMLParser):
    """Extract plain text and inline assets; never pass executable HTML through."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts=[]; self.images=[]; self.suppressed=0
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag in ('script','style','iframe'): self.suppressed+=1
        if self.suppressed: return
        if tag in ('p','div','h1','h2','h3','h4','ul','ol','li','br'): self.parts.append('\n')
        if tag=='li': self.parts.append('• ')
        if tag=='img':
            src=safe_url(attrs.get('src'))
            if src: self.images.append({'url':src,'alt':attrs.get('alt','')})
    def handle_endtag(self, tag):
        if tag in ('script','style','iframe'):
            self.suppressed=max(0,self.suppressed-1)
        if not self.suppressed and tag in ('p','div','h1','h2','h3','h4','li'): self.parts.append('\n')
    def handle_data(self,data):
        if not self.suppressed: self.parts.append(data)
    def text(self):
        return re.sub(r'\n{3,}','\n\n',''.join(self.parts)).strip()


def description(value):
    parser=DescriptionParser(); parser.feed(value or '')
    return parser.text(), parser.images


def extract(data, app_id):
    short,_=description(data.get('short_description'))
    detailed,inline=description(data.get('detailed_description') or data.get('about_the_game'))
    about,about_images=description(data.get('about_the_game'))
    images=[]; seen=set()
    for role,key in [('header','header_image'),('capsule','capsule_image'),('background','background_raw')]:
        url=safe_url(data.get(key))
        if url and url not in seen:
            seen.add(url); images.append({'role':role,'url':url})
    for image in inline+about_images:
        if image['url'] not in seen:
            seen.add(image['url']); images.append({'role':'description',**image})
    screenshots=[]
    for item in data.get('screenshots',[]):
        full=safe_url(item.get('path_full'))
        if full: screenshots.append({'id':item.get('id'),'thumbnailUrl':safe_url(item.get('path_thumbnail')),'url':full})
    videos=[]
    for movie in data.get('movies',[]):
        sources=[]
        for format in ('mp4','webm'):
            for quality,url in (movie.get(format) or {}).items():
                if safe_url(url): sources.append({'format':format,'quality':quality,'url':safe_url(url)})
        for key in ('hls_h264','hls_av1','dash_h264','dash_av1'):
            if safe_url(movie.get(key)): sources.append({'format':key,'url':safe_url(movie[key])})
        videos.append({'id':movie.get('id'),'name':movie.get('name'),'thumbnailUrl':safe_url(movie.get('thumbnail')),'highlight':movie.get('highlight',False),'sources':sources,'sourceData':movie})
    return {'status':'success','steamAppId':app_id,'steamName':data.get('name'),'sourceUrl':f'https://store.steampowered.com/app/{app_id}/','fetchedAt':now(),
        'locales':{'en':{'status':'source','provider':'steam','shortDescription':short or None,'detailedDescription':detailed or None,'aboutGame':about if about!=detailed else None},
                   'vi':{'status':'pending_translation','provider':None,'shortDescription':None,'detailedDescription':None,'aboutGame':None}},
        'media':{'images':images,'screenshots':screenshots,'videos':videos,'note':'URL nguồn Steam; chưa tải file media, chưa dịch chữ trong ảnh hoặc âm thanh/phụ đề video.'}}


class RateLimiter:
    def __init__(self,interval):
        self.lock=threading.Lock();self.next=0;self.interval=interval;self.blocked_until=0
    def wait(self):
        while True:
            with self.lock:
                clock=time.monotonic(); due=max(self.next,self.blocked_until)
                if clock>=due:
                    self.next=clock+self.interval;return
                delay=min(due-clock,10)
            time.sleep(delay)
    def pause(self,seconds):
        with self.lock:self.blocked_until=max(self.blocked_until,time.monotonic()+seconds)


def fetch_one(app_id,limiter):
    path=CACHE/f'{app_id}.json'
    if path.exists():
        cached=json.loads(path.read_text())
        if cached.get('status') in ('success','not_found'): return cached
    for attempt in range(4):
        limiter.wait()
        try:
            url=f'https://store.steampowered.com/api/appdetails?appids={app_id}&l=english&cc=us&filters=basic,screenshots,movies'
            req=urllib.request.Request(url,headers={'User-Agent':'game-steam-library/1.0'})
            with urllib.request.urlopen(req,timeout=30) as response: payload=json.load(response)
            entry=payload.get(app_id) or {}
            if not entry.get('success'):
                result={'status':'not_found','steamAppId':app_id,'fetchedAt':now(),'error':'Steam không có dữ liệu công khai cho App ID này.'}
            else: result=extract(entry['data'],app_id)
            atomic_json(path,result);return result
        except urllib.error.HTTPError as error:
            if error.code==429:
                seconds=max(300,int(error.headers.get('Retry-After','300')) if error.headers.get('Retry-After','300').isdigit() else 300)
                limiter.pause(seconds)
                print(f'Rate limit: global cooldown {seconds}s, app {app_id}',flush=True)
            elif error.code>=500: limiter.pause(5*(attempt+1))
            else: break
        except (urllib.error.URLError,TimeoutError,json.JSONDecodeError):
            limiter.pause(2*(attempt+1))
    result={'status':'retry_pending','steamAppId':app_id,'fetchedAt':now(),'error':'Không lấy được dữ liệu sau nhiều lần thử; chạy lại để tiếp tục.'}
    atomic_json(path,result);return result


def attach(library_path):
    import fcntl
    lock_path=ROOT/'exports/content-attach.lock'
    lock_path.parent.mkdir(parents=True,exist_ok=True)
    with lock_path.open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        _attach_locked(library_path)


def _attach_locked(library_path):
    library=load_library(library_path)
    counts={}; image_count=video_count=0; vi_counts={}
    for game in library['games']:
        app=game.get('steamAppId')
        path=CACHE/f'{app}.json'
        if not path.exists():
            content={'status':'pending_collection','steamAppId':app,'locales':{'en':{'status':'existing_summary','provider':'steam','shortDescription':game.get('sourceProfile',{}).get('shortDescription') or None,'detailedDescription':None,'aboutGame':None},'vi':{'status':'pending_translation','provider':None,'shortDescription':None,'detailedDescription':None,'aboutGame':None}},'media':{'images':[],'screenshots':[],'videos':[]}}
        else:
            content=json.loads(path.read_text())
        # Keep manually added language versions when refreshing official content.
        old=game.get('content',{})
        if content.get('status')=='success':
            if old.get('locales',{}).get('vi',{}).get('status') in ('translated','reviewed') and content['locales']['vi']['status']=='pending_translation':
                content['locales']['vi']=old['locales']['vi']
            content['identityStatus']='verified' if game.get('verificationStatus')=='identified' else 'needs_verification'
        game['content']=content
        counts[content['status']]=counts.get(content['status'],0)+1
        vi_status=content.get('locales',{}).get('vi',{}).get('status','unavailable')
        vi_counts[vi_status]=vi_counts.get(vi_status,0)+1
        image_count+=len(content.get('media',{}).get('screenshots',[]))
        video_count+=len(content.get('media',{}).get('videos',[]))
    library['metadata']['updatedAt']=now()
    library['metadata']['content']={'updatedAt':now(),'recordsByStatus':counts,'vietnameseByStatus':vi_counts,'screenshots':image_count,'videos':video_count,'defaultLocale':'vi','fallbackLocale':'en'}
    backup=ROOT/'exports/backups'/f'game-library-content-{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")}.json'
    backup.parent.mkdir(parents=True,exist_ok=True);atomic_json(backup,load_library(library_path))
    save_library(library_path,library)
    atomic_json(ROOT/'exports/content-progress.json',library['metadata']['content'])
    print('Content attached:',json.dumps(library['metadata']['content'],ensure_ascii=False),flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit',type=int)
    parser.add_argument('--workers',type=int,default=4)
    parser.add_argument('--interval',type=float,default=1.6)
    parser.add_argument('--attach-only',action='store_true')
    args=parser.parse_args()
    path=ROOT/'data/game-library.json'
    if not args.attach_only:
        library=load_library(path)
        # A cloned repository can resume from the content already in its master JSON.
        for game in library['games']:
            cached=game.get('content',{})
            app=game.get('steamAppId')
            if app and cached.get('status') in ('success','not_found') and not (CACHE/f'{app}.json').exists():
                atomic_json(CACHE/f'{app}.json',cached)
        ids=sorted({g['steamAppId'] for g in library['games'] if g.get('steamAppId')})
        if args.limit is not None: ids=ids[:args.limit]
        limiter=RateLimiter(args.interval); counts={}
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures=[pool.submit(fetch_one,app,limiter) for app in ids]
            for i,future in enumerate(as_completed(futures),1):
                result=future.result(); status=result['status'];counts[status]=counts.get(status,0)+1
                if i%100==0 or i==len(ids):
                    print(f'Content {i}/{len(ids)} {counts}',flush=True)
                    attach(path)
    attach(path)

if __name__=='__main__':main()
