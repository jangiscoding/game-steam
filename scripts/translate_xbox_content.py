#!/usr/bin/env python3
"""Translate Xbox catalog descriptions to Vietnamese with the local Argos model."""
import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.content-deps'))


def chunks(text, tokenizer, limit=160):
    result = []
    for paragraph in (text or '').splitlines():
        if not paragraph.strip():
            result.append(None)
            continue
        for sentence in re.split(r'(?<=[.!?])\s+', paragraph.strip()):
            tokens = tokenizer.encode(sentence, out_type=str)
            result.extend(tokens[index:index + limit] for index in range(0, len(tokens), limit))
    return result


def decode(tokens):
    return ''.join(tokens).replace('▁', ' ').lstrip()


def translate_text(text, translator, tokenizer):
    if not text:
        return None
    parts = chunks(text, tokenizer)
    tokenized = [part for part in parts if part is not None]
    results = translator.translate_batch(tokenized, max_batch_size=32, beam_size=1, max_decoding_length=512)
    outputs = iter(decode(result.hypotheses[0]) for result in results)
    return re.sub(r' *\n *', '\n', ' '.join('\n' if part is None else next(outputs) for part in parts)).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT / 'data/xbox-game-pass.json')
    parser.add_argument('--model-dir', type=Path, required=True)
    parser.add_argument('--threads', type=int, default=4)
    parser.add_argument('--limit', type=int)
    args = parser.parse_args()
    import ctranslate2
    import sentencepiece

    models = list(args.model_dir.rglob('model.bin'))
    tokenizers = list(args.model_dir.rglob('sentencepiece.model'))
    if len(models) != 1 or len(tokenizers) != 1:
        raise RuntimeError('Expected one CTranslate2 model.bin and one sentencepiece.model')
    translator = ctranslate2.Translator(str(models[0].parent), device='cpu', compute_type='int8', inter_threads=1, intra_threads=args.threads)
    tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(tokenizers[0]))
    catalog = json.loads(args.input.read_text(encoding='utf-8'))
    translated = 0
    for game in catalog['games']:
        source = {'shortDescription': game.get('shortDescription'), 'description': game.get('description')}
        digest = hashlib.sha256(json.dumps(source, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        existing = game.get('translation') or {}
        if existing.get('sourceHash') == digest and game.get('shortDescriptionVi') and game.get('descriptionVi'):
            continue
        if str(game.get('descriptionLanguage') or '').lower().startswith('vi'):
            short_vi, description_vi, provider = source['shortDescription'], source['description'], 'microsoft-store-vi'
        else:
            short_vi = translate_text(source['shortDescription'], translator, tokenizer)
            description_vi = translate_text(source['description'], translator, tokenizer)
            provider = 'argos-translate-en_vi-1.9-ctranslate2-int8'
        game['shortDescriptionVi'] = short_vi
        game['descriptionVi'] = description_vi
        game['translation'] = {
            'status': 'machine_translation_unreviewed' if provider.startswith('argos') else 'official',
            'provider': provider,
            'sourceHash': digest,
            'translatedAt': datetime.now(timezone.utc).isoformat(),
        }
        translated += 1
        if translated % 10 == 0:
            print(f'Translated {translated} Xbox games', flush=True)
        if args.limit and translated >= args.limit:
            break
    catalog['metadata']['vietnameseDescriptionGames'] = sum(bool(game.get('descriptionVi')) for game in catalog['games'])
    args.input.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Translated {translated} Xbox games; Vietnamese descriptions: {catalog["metadata"]["vietnameseDescriptionGames"]}.')


if __name__ == '__main__':
    main()
