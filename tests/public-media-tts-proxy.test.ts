import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../workers/public-media/src/index.js';

const APPROVED =
  'https://github.com/tymonius/Gauntlet/releases/download/tts-v0.7.0-qa-pr-917-68247f095969/';
const PUBLIC = 'https://gauntlet-public-media.tymon-scott.workers.dev/tts/v0.7.0/';
const ASSETS = 'https://gauntlet-public-media.tymon-scott.workers.dev/tts/v0.7.0/assets/917/';

describe('public-media TTS proxy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies a clean asset URL to the exact approved immutable release asset', async () => {
    const body = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    );

    const response = await worker.fetch(
      new Request(ASSETS + 'Gauntlet_v0.7.0_TTS_Environment_Table.png'),
      {},
    );

    expect(fetchMock).toHaveBeenCalledWith(
      APPROVED + 'Gauntlet_v0.7.0_TTS_Environment_Table.png',
      expect.objectContaining({ method: 'GET', redirect: 'follow' }),
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(response.headers.get('x-gauntlet-tts-source')).toBe('pr-917-68247f095969');
  });

  it('rewrites only the approved release prefix in the public mod JSON', async () => {
    const source = {
      SaveName: 'Gauntlet v0.7.0 TTS Review Scaffold',
      ObjectStates: [
        { CustomImage: { ImageURL: APPROVED + 'Gauntlet_v0.7.0_TTS_Environment_Table.png' } },
        { CustomDeck: { 1: { FaceURL: APPROVED + 'Gauntlet_v0.7.0_TTS_Cards_neutral_01.png' } } },
      ],
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(source), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await worker.fetch(
      new Request(PUBLIC + 'Gauntlet_v0.7.0_TTS_Mod.json'),
      {},
    );
    const text = await response.text();

    expect(fetchMock).toHaveBeenCalledWith(
      APPROVED + 'Gauntlet_v0.7.0_TTS_PR917_Preview.json',
      { redirect: 'follow' },
    );
    expect(text).not.toContain(APPROVED);
    expect(text).toContain(ASSETS + 'Gauntlet_v0.7.0_TTS_Environment_Table.png');
    expect(text).toContain(ASSETS + 'Gauntlet_v0.7.0_TTS_Cards_neutral_01.png');
    expect(JSON.parse(text).SaveName).toBe(source.SaveName);
  });

  it('keeps the public mod URL stable while versioning internal asset cache keys', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        ObjectStates: [{ CustomImage: { ImageURL: APPROVED + 'Gauntlet_v0.7.0_TTS_Environment_Table.png' } }],
      })),
    );

    const response = await worker.fetch(
      new Request(PUBLIC + 'Gauntlet_v0.7.0_TTS_Mod.json'),
      {},
    );
    const text = await response.text();

    expect(fetchMock).toHaveBeenCalled();
    expect(text).toContain(ASSETS + 'Gauntlet_v0.7.0_TTS_Environment_Table.png');
    expect(text).not.toContain(PUBLIC + 'Gauntlet_v0.7.0_TTS_Environment_Table.png');
  });

  it('does not proxy arbitrary nested paths', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const response = await worker.fetch(
      new Request(ASSETS + 'nested/file.png'),
      {},
    );
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
