/* ================================================================
   Pure Binary WebM / EBML Container Muxer & Duration Patcher (src/utils/webm-muxer.ts)
   ================================================================ */

export function ebmlUintBytes(num: number | string) {
  let v = Math.max(0, Math.floor(Number(num) || 0));
  if (v === 0) return new Uint8Array([0]);
  const bytes: number[] = [];
  while (v > 0) {
    bytes.unshift(v & 0xff);
    v = Math.floor(v / 256);
  }
  return new Uint8Array(bytes);
}

export function ebmlFloat64Bytes(val: number | string) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, Number(val) || 0, false);
  return new Uint8Array(buf);
}

export function ebmlAsciiBytes(str: string | null | undefined) {
  const s = String(str || '');
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0x7f;
  return out;
}

export function ebmlVintSize(len: number) {
  const n = Math.max(0, Math.floor(len));
  if (n < 0x7f) return new Uint8Array([0x80 | n]);
  if (n < 0x3fff) return new Uint8Array([0x40 | (n >> 8), n & 0xff]);
  if (n < 0x1fffff) return new Uint8Array([0x20 | (n >> 16), (n >> 8) & 0xff, n & 0xff]);
  if (n < 0x0fffffff) {
    return new Uint8Array([
      0x10 | ((n >>> 24) & 0x0f),
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ]);
  }
  const hi = Math.floor(n / 0x100000000);
  const lo = n >>> 0;
  return new Uint8Array([
    0x01,
    (hi >>> 16) & 0xff,
    (hi >>> 8) & 0xff,
    hi & 0xff,
    (lo >>> 24) & 0xff,
    (lo >>> 16) & 0xff,
    (lo >>> 8) & 0xff,
    lo & 0xff,
  ]);
}

export function concatUint8Arrays(arrays: Uint8Array[]) {
  let total = 0;
  for (const arr of arrays) total += arr.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

function isUint8ArrayList(arr: Uint8Array[] | number[]): arr is Uint8Array[] {
  return arr[0] instanceof Uint8Array;
}

export function ebmlElement(
  idBytes: Uint8Array | number[],
  payload: Uint8Array | Uint8Array[] | number[]
) {
  const idArr = idBytes instanceof Uint8Array ? idBytes : new Uint8Array(idBytes);
  const body = Array.isArray(payload)
    ? isUint8ArrayList(payload)
      ? concatUint8Arrays(payload)
      : new Uint8Array(payload)
    : payload instanceof Uint8Array
    ? payload
    : new Uint8Array(payload);
  const sizeArr = ebmlVintSize(body.length);
  return concatUint8Arrays([idArr, sizeArr, body]);
}

/* Build a 100% standards-compliant WebM file with known Segment/Info sizes, 0-based Cluster timestamps, and Cues index */
export function muxWebmChunks(
  frames: Array<{ data: Uint8Array; timestampMs: number; isKey: boolean }>,
  durationMs: number,
  width = 1920,
  height = 1080,
  fps = 60,
  codecId = 'V_VP8'
): Blob {
  const ebmlHeader = ebmlElement([0x1a, 0x45, 0xdf, 0xa3], [
    ebmlElement([0x42, 0x86], ebmlUintBytes(1)),
    ebmlElement([0x42, 0xf7], ebmlUintBytes(1)),
    ebmlElement([0x42, 0xf2], ebmlUintBytes(4)),
    ebmlElement([0x42, 0xf3], ebmlUintBytes(8)),
    ebmlElement([0x42, 0x82], ebmlAsciiBytes('webm')),
    ebmlElement([0x42, 0x87], ebmlUintBytes(4)),
    ebmlElement([0x42, 0x85], ebmlUintBytes(2)),
  ]);

  const infoElem = ebmlElement([0x15, 0x49, 0xa9, 0x66], [
    ebmlElement([0x2a, 0xd7, 0xb1], ebmlUintBytes(1000000)),
    ebmlElement([0x44, 0x89], ebmlFloat64Bytes(durationMs)),
    ebmlElement([0x4d, 0x80], ebmlAsciiBytes('TSPlaygroundVisual')),
    ebmlElement([0x57, 0x41], ebmlAsciiBytes('TSPlaygroundVisual')),
  ]);

  const defaultDurNs = Math.round(1_000_000_000 / fps);
  const tracksElem = ebmlElement([0x16, 0x54, 0xae, 0x6b], [
    ebmlElement([0xae], [
      ebmlElement([0xd7], ebmlUintBytes(1)),
      ebmlElement([0x73, 0xc5], ebmlUintBytes(1)),
      ebmlElement([0x9c], ebmlUintBytes(0)),
      ebmlElement([0x22, 0xb5, 0x9c], ebmlAsciiBytes('und')),
      ebmlElement([0x86], ebmlAsciiBytes(codecId)),
      ebmlElement([0x83], ebmlUintBytes(1)),
      ebmlElement([0x23, 0xe3, 0x83], ebmlUintBytes(defaultDurNs)),
      ebmlElement([0xe0], [
        ebmlElement([0xb0], ebmlUintBytes(width)),
        ebmlElement([0xba], ebmlUintBytes(height)),
      ]),
    ]),
  ]);

  const clusters: Array<{ timecodeMs: number; blocks: Uint8Array[] }> = [];
  let curCluster: { timecodeMs: number; blocks: Uint8Array[] } | null = null;
  for (const f of frames) {
    const tMs = Math.max(0, Math.round(f.timestampMs));
    if (!curCluster || f.isKey || tMs - curCluster.timecodeMs >= 2000) {
      curCluster = { timecodeMs: tMs, blocks: [] };
      clusters.push(curCluster);
    }
    const relMs = Math.max(0, Math.min(32767, tMs - curCluster.timecodeMs));
    const blockHeader = new Uint8Array([
      0x81,
      (relMs >> 8) & 0xff,
      relMs & 0xff,
      f.isKey ? 0x80 : 0x00,
    ]);
    const simpleBlock = ebmlElement([0xa3], [blockHeader, f.data]);
    curCluster.blocks.push(simpleBlock);
  }

  let segOffset = infoElem.length + tracksElem.length;
  const clusterElems: Uint8Array[] = [];
  const cuePoints: Uint8Array[] = [];

  for (const cl of clusters) {
    const tcElem = ebmlElement([0xe7], ebmlUintBytes(cl.timecodeMs));
    const clElem = ebmlElement([0x1f, 0x43, 0xb6, 0x75], [tcElem, ...cl.blocks]);
    cuePoints.push(
      ebmlElement([0xbb], [
        ebmlElement([0xb3], ebmlUintBytes(cl.timecodeMs)),
        ebmlElement([0xb7], [
          ebmlElement([0xf7], ebmlUintBytes(1)),
          ebmlElement([0xf1], ebmlUintBytes(segOffset)),
        ]),
      ])
    );
    clusterElems.push(clElem);
    segOffset += clElem.length;
  }

  const cuesElem = ebmlElement([0x1c, 0x53, 0xbb, 0x6b], cuePoints);
  const segmentBody = concatUint8Arrays([infoElem, tracksElem, ...clusterElems, cuesElem]);
  const segmentSize8 = new Uint8Array([
    0x01,
    0x00,
    0x00,
    0x00,
    (segmentBody.length >>> 24) & 0xff,
    (segmentBody.length >>> 16) & 0xff,
    (segmentBody.length >>> 8) & 0xff,
    segmentBody.length & 0xff,
  ]);
  const segmentElem = concatUint8Arrays([
    new Uint8Array([0x18, 0x53, 0x80, 0x67]),
    segmentSize8,
    segmentBody,
  ]);
  return new Blob([ebmlHeader, segmentElem], { type: 'video/webm' });
}

/* Patch WebM EBML Segment & Info with exact Duration (float64), known sizes, and 0-based Cluster Timecodes */
export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob || !(durationMs > 0)) return blob;
  try {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);

    const searchLimit = Math.min(bytes.length - 12, 16384);
    let infoPos = -1;
    let tracksPos = -1;
    for (let i = 0; i < searchLimit; i++) {
      if (
        infoPos < 0 &&
        bytes[i] === 0x15 &&
        bytes[i + 1] === 0x49 &&
        bytes[i + 2] === 0xa9 &&
        bytes[i + 3] === 0x66
      ) {
        infoPos = i;
      } else if (
        infoPos >= 0 &&
        bytes[i] === 0x16 &&
        bytes[i + 1] === 0x54 &&
        bytes[i + 2] === 0xae &&
        bytes[i + 3] === 0x6b
      ) {
        tracksPos = i;
        break;
      }
    }
    if (infoPos < 0) return blob;

    const sizeIdx = infoPos + 4;
    const firstByte = bytes[sizeIdx] ?? 0;
    let vintLen = 1;
    let mask = 0x80;
    while (vintLen <= 8 && !(firstByte & mask)) {
      mask >>= 1;
      vintLen++;
    }
    if (vintLen > 8) return blob;

    let parsedInfoSize = firstByte & (mask - 1);
    for (let k = 1; k < vintLen; k++) {
      parsedInfoSize = parsedInfoSize * 256 + (bytes[sizeIdx + k] ?? 0);
    }
    const isUnknownInfoSize =
      (vintLen === 8 && bytes[sizeIdx + 1] === 0xff && bytes[sizeIdx + 2] === 0xff) ||
      parsedInfoSize === Math.pow(2, 7 * vintLen) - 1;

    const infoDataStart = sizeIdx + vintLen;
    const infoDataEnd =
      tracksPos > infoDataStart
        ? tracksPos
        : !isUnknownInfoSize
        ? Math.min(bytes.length, infoDataStart + parsedInfoSize)
        : Math.min(bytes.length, infoDataStart + 64);

    let existingDurUpdated = false;
    for (let i = infoDataStart; i <= infoDataEnd - 11; i++) {
      if (bytes[i] === 0x44 && bytes[i + 1] === 0x89 && bytes[i + 2] === 0x88) {
        new DataView(bytes.buffer, bytes.byteOffset + i + 3, 8).setFloat64(0, durationMs, false);
        existingDurUpdated = true;
        break;
      }
    }

    let outBytes = bytes;
    let tailStartInOut = infoDataEnd;

    if (!existingDurUpdated) {
      const durElem = new Uint8Array(11);
      durElem[0] = 0x44;
      durElem[1] = 0x89;
      durElem[2] = 0x88;
      new DataView(durElem.buffer).setFloat64(3, durationMs, false);

      const origInfoPayload = bytes.subarray(infoDataStart, infoDataEnd);
      const newInfoPayloadLen = durElem.length + origInfoPayload.length;
      const newSizeVint = new Uint8Array([
        0x10 | ((newInfoPayloadLen >>> 24) & 0x0f),
        (newInfoPayloadLen >>> 16) & 0xff,
        (newInfoPayloadLen >>> 8) & 0xff,
        newInfoPayloadLen & 0xff,
      ]);

      const head = bytes.subarray(0, infoPos + 4);
      const tail = bytes.subarray(infoDataEnd);
      outBytes = concatUint8Arrays([head, newSizeVint, durElem, origInfoPayload, tail]);
      tailStartInOut = head.length + newSizeVint.length + durElem.length + origInfoPayload.length;
    }

    for (let i = 0; i < Math.min(infoPos, 128); i++) {
      if (
        outBytes[i] === 0x18 &&
        outBytes[i + 1] === 0x53 &&
        outBytes[i + 2] === 0x80 &&
        outBytes[i + 3] === 0x67
      ) {
        if (outBytes[i + 4] === 0x01 && outBytes[i + 5] === 0xff && outBytes[i + 6] === 0xff) {
          const segPayloadLen = outBytes.length - (i + 12);
          outBytes[i + 4] = 0x01;
          outBytes[i + 5] = 0x00;
          outBytes[i + 6] = 0x00;
          outBytes[i + 7] = 0x00;
          outBytes[i + 8] = (segPayloadLen >>> 24) & 0xff;
          outBytes[i + 9] = (segPayloadLen >>> 16) & 0xff;
          outBytes[i + 10] = (segPayloadLen >>> 8) & 0xff;
          outBytes[i + 11] = segPayloadLen & 0xff;
        }
        break;
      }
    }

    let firstClusterTc: number | null = null;
    for (let i = tailStartInOut; i < outBytes.length - 16; i++) {
      if (
        outBytes[i] === 0x1f &&
        outBytes[i + 1] === 0x43 &&
        outBytes[i + 2] === 0xb6 &&
        outBytes[i + 3] === 0x75
      ) {
        const b0 = outBytes[i + 4] ?? 0;
        let vLen = 1,
          m = 0x80;
        while (vLen <= 8 && !(b0 & m)) {
          m >>= 1;
          vLen++;
        }
        const tcPos = i + 4 + vLen;
        if (tcPos + 2 < outBytes.length && outBytes[tcPos] === 0xe7) {
          const tcSizeByte = outBytes[tcPos + 1] ?? 0;
          const tcLen = tcSizeByte & 0x7f;
          if (tcLen >= 1 && tcLen <= 8 && tcPos + 2 + tcLen <= outBytes.length) {
            let val = 0;
            for (let b = 0; b < tcLen; b++) {
              val = val * 256 + (outBytes[tcPos + 2 + b] ?? 0);
            }
            if (firstClusterTc === null) {
              firstClusterTc = val;
            }
            if (firstClusterTc > 0) {
              let rebased = Math.max(0, Math.min(Math.round(durationMs), val - firstClusterTc));
              for (let b = tcLen - 1; b >= 0; b--) {
                outBytes[tcPos + 2 + b] = rebased & 0xff;
                rebased = Math.floor(rebased / 256);
              }
            }
          }
        }
      }
    }

    return new Blob([outBytes], { type: 'video/webm' });
  } catch (_) {
    return blob;
  }
}
