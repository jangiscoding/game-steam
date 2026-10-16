#!/usr/bin/env python3
"""Translate cached Steam descriptions with a local Argos EN→VI model (CTranslate2)."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.content-deps'))
from enrich_game_content import CACHE, atomic_json, attach, now


def chunks(text,tokenizer,limit=160):
    """Bound model input without dropping long sentences or tail content."""
    result=[]
    for paragraph in (text or '').splitlines():
        if not paragraph.strip():
            result.append(None);continue
        for sentence in re.split(r'(?<=[.!?])\s+',paragraph.strip()):
            tokens=tokenizer.encode(sentence,out_type=str)
            result.extend(tokens[i:i+limit] for i in range(0,len(tokens),limit))
    return result


def decode(tokens):
    """Decode Marian/Argos target pieces without leaking SentencePiece markers."""
    return ''.join(tokens).replace('▁',' ').lstrip()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model-dir',type=Path,required=True)
    parser.add_argument('--limit',type=int)
    parser.add_argument('--threads',type=int,default=4)
    args=parser.parse_args()
    import ctranslate2
    import sentencepiece
    models=list(args.model_dir.rglob('model.bin'))
    tokenizers=list(args.model_dir.rglob('sentencepiece.model'))
    if len(models)!=1 or len(tokenizers)!=1:
        raise RuntimeError('Expected one CTranslate2 model.bin and one sentencepiece.model')
    translator=ctranslate2.Translator(str(models[0].parent),device='cpu',compute_type='int8',inter_threads=1,intra_threads=args.threads)
    tokenizer=sentencepiece.SentencePieceProcessor(model_file=str(tokenizers[0]))
    done=0
    for path in sorted(CACHE.glob('*.json')):
        content=json.loads(path.read_text())
        if content.get('status')!='success':continue
        original=content['locales']['en']
        fields=('shortDescription','detailedDescription','aboutGame')
        digest=hashlib.sha256(json.dumps({f:original.get(f) for f in fields},sort_keys=True).encode()).hexdigest()
        existing=content['locales'].get('vi',{})
        if existing.get('status')=='reviewed' or (existing.get('status')=='translated' and existing.get('sourceHash')==digest):continue
        translated={'status':'translated','provider':'argos-translate-en_vi-1.9-ctranslate2-int8','translatedAt':now(),'sourceHash':digest,'reviewStatus':'machine_translation_unreviewed'}
        for field in fields:
            text=original.get(field)
            if not text:
                translated[field]=None;continue
            parts=chunks(text,tokenizer)
            tokenized=[p for p in parts if p is not None]
            results=translator.translate_batch(tokenized,max_batch_size=16,beam_size=2,max_decoding_length=512)
            outputs=iter(decode(result.hypotheses[0]) for result in results)
            translated[field]=re.sub(r' *\n *','\n',' '.join('\n' if part is None else next(outputs) for part in parts)).strip()
        content['locales']['vi']=translated
        atomic_json(path,content)
        done+=1
        if done%10==0: print(f'Translated {done} apps',flush=True)
        if args.limit and done>=args.limit:break
    attach(ROOT/'data/game-library.json')
    print(f'Translated {done} apps; source text and media URLs preserved.',flush=True)

if __name__=='__main__':main()
