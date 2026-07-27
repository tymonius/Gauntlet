#!/usr/bin/env python3
from __future__ import annotations

import argparse
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('input_dir', type=Path)
    parser.add_argument('pattern')
    parser.add_argument('output_prefix', type=Path)
    parser.add_argument('--columns', type=int, default=4)
    parser.add_argument('--chunk', type=int, default=20)
    args = parser.parse_args()

    pages = sorted(args.input_dir.glob(args.pattern))
    if not pages:
        raise SystemExit(f'No pages matched {args.pattern}')

    font = ImageFont.load_default()
    thumb_w, thumb_h = 306, 396
    label_h, gap = 20, 12

    args.output_prefix.parent.mkdir(parents=True, exist_ok=True)
    for chunk_index in range(0, len(pages), args.chunk):
        chunk = pages[chunk_index:chunk_index + args.chunk]
        rows = math.ceil(len(chunk) / args.columns)
        sheet = Image.new('RGB', (
            args.columns * thumb_w + (args.columns + 1) * gap,
            rows * (thumb_h + label_h) + (rows + 1) * gap,
        ), 'white')
        draw = ImageDraw.Draw(sheet)

        for local_index, page_path in enumerate(chunk):
            image = Image.open(page_path).convert('RGB')
            image.thumbnail((thumb_w, thumb_h))
            col = local_index % args.columns
            row = local_index // args.columns
            x = gap + col * (thumb_w + gap) + (thumb_w - image.width) // 2
            y = gap + row * (thumb_h + label_h + gap)
            sheet.paste(image, (x, y))
            label = f'Page {chunk_index + local_index + 1}'
            box = draw.textbbox((0, 0), label, font=font)
            draw.text((gap + col * (thumb_w + gap) + (thumb_w - (box[2] - box[0])) / 2, y + thumb_h + 3), label, fill='black', font=font)

        output = args.output_prefix.with_name(f'{args.output_prefix.name}-{chunk_index // args.chunk + 1}.png')
        sheet.save(output, optimize=True)
        print(output)


if __name__ == '__main__':
    main()
