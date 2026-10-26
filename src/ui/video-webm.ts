/* ================================================================
   WebM EBML Muxer, Duration Patcher & 60fps Video Exporter (src/ui/video-webm.ts)
   ================================================================ */
import { say } from "../runtime/event-loop";
import { startDebug, computeAndAppendNextStep, initWatchedVars } from "../runtime/runner";
import { renderPicker, renderStatic } from "../viz/memory-graph";
import { stopAuto, setVideoExportSpeed } from "./controls";
import { renderVideoFrameToCanvas } from "./share";

const btnExportVideo = $<HTMLButtonElement>('btnExportVideo');
const btnExportVideoLabel = $('btnExportVideoLabel');
const videoExportStatus = $('videoExportStatus');

export function ebmlUintBytes(num: number | string) {
  let v = Math.max(0, Math.floor(Number(num) || 0));
  if (v === 0) return new Uint8Array([0]);
  const bytes: number[] = [];
  while (v > 0) {
    bytes.unshift(v & 0xFF);
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
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0x7F;
  return out;
}

export function ebmlVintSize(len: number) {
  const n = Math.max(0, Math.floor(len));
  if (n < 0x7F) return new Uint8Array([0x80 | n]);
  if (n < 0x3FFF) return new Uint8Array([0x40 | (n >> 8), n & 0xFF]);
  if (n < 0x1FFFFF) return new Uint8Array([0x20 | (n >> 16), (n >> 8) & 0xFF, n & 0xFF]);
  if (n < 0x0FFFFFFF) {
    return new Uint8Array([
      0x10 | ((n >>> 24) & 0x0F),
      (n >>> 16) & 0xFF,
      (n >>> 8) & 0xFF,
      n & 0xFF,
    ]);
  }
  const hi = Math.floor(n / 0x100000000);
  const lo = n >>> 0;
  return new Uint8Array([
    0x01,
    (hi >>> 16) & 0xFF,
    (hi >>> 8) & 0xFF,
    hi & 0xFF,
    (lo >>> 24) & 0xFF,
    (lo >>> 16) & 0xFF,
    (lo >>> 8) & 0xFF,
    lo & 0xFF,
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

export function ebmlElement(idBytes: Uint8Array | number[], payload: Uint8Array | Uint8Array[] | number[]) {
  const idArr = idBytes instanceof Uint8Array ? idBytes : new Uint8Array(idBytes);
  const body = Array.isArray(payload)
    ? (payload[0] instanceof Uint8Array ? concatUint8Arrays(payload as Uint8Array[]) : new Uint8Array(payload as number[]))
    : (payload instanceof Uint8Array ? payload : new Uint8Array(payload));
  const sizeArr = ebmlVintSize(body.length);
  return concatUint8Arrays([idArr, sizeArr, body]);
}

/* Build a 100% standards-compliant WebM file with known Segment/Info sizes, 0-based Cluster timestamps, and Cues index */
export function muxWebmChunks(
  frames: Array<{ data: Uint8Array; timestampMs: number; isKey: boolean }>,
  durationMs: number,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  fps = VIDEO_FPS,
  codecId = 'V_VP8'
) {
  const ebmlHeader = ebmlElement([0x1A, 0x45, 0xDF, 0xA3], [
    ebmlElement([0x42, 0x86], ebmlUintBytes(1)),
    ebmlElement([0x42, 0xF7], ebmlUintBytes(1)),
    ebmlElement([0x42, 0xF2], ebmlUintBytes(4)),
    ebmlElement([0x42, 0xF3], ebmlUintBytes(8)),
    ebmlElement([0x42, 0x82], ebmlAsciiBytes('webm')),
    ebmlElement([0x42, 0x87], ebmlUintBytes(4)),
    ebmlElement([0x42, 0x85], ebmlUintBytes(2)),
  ]);

  const infoElem = ebmlElement([0x15, 0x49, 0xA9, 0x66], [
    ebmlElement([0x2A, 0xD7, 0xB1], ebmlUintBytes(1000000)),
    ebmlElement([0x44, 0x89], ebmlFloat64Bytes(durationMs)),
    ebmlElement([0x4D, 0x80], ebmlAsciiBytes('TSPlaygroundVisual')),
    ebmlElement([0x57, 0x41], ebmlAsciiBytes('TSPlaygroundVisual')),
  ]);

  const defaultDurNs = Math.round(1_000_000_000 / fps);
  const tracksElem = ebmlElement([0x16, 0x54, 0xAE, 0x6B], [
    ebmlElement([0xAE], [
      ebmlElement([0xD7], ebmlUintBytes(1)),
      ebmlElement([0x73, 0xC5], ebmlUintBytes(1)),
      ebmlElement([0x9C], ebmlUintBytes(0)),
      ebmlElement([0x22, 0xB5, 0x9C], ebmlAsciiBytes('und')),
      ebmlElement([0x86], ebmlAsciiBytes(codecId)),
      ebmlElement([0x83], ebmlUintBytes(1)),
      ebmlElement([0x23, 0xE3, 0x83], ebmlUintBytes(defaultDurNs)),
      ebmlElement([0xE0], [
        ebmlElement([0xB0], ebmlUintBytes(width)),
        ebmlElement([0xBA], ebmlUintBytes(height)),
      ]),
    ]),
  ]);

  const clusters: Array<{ timecodeMs: number; blocks: Uint8Array[] }> = [];
  let curCluster: { timecodeMs: number; blocks: Uint8Array[] } | null = null;
  for (const f of frames) {
    const tMs = Math.max(0, Math.round(f.timestampMs));
    if (!curCluster || f.isKey || (tMs - curCluster.timecodeMs >= 2000)) {
      curCluster = { timecodeMs: tMs, blocks: [] };
      clusters.push(curCluster);
    }
    const relMs = Math.max(0, Math.min(32767, tMs - curCluster.timecodeMs));
    const blockHeader = new Uint8Array([
      0x81,
      (relMs >> 8) & 0xFF,
      relMs & 0xFF,
      f.isKey ? 0x80 : 0x00,
    ]);
    const simpleBlock = ebmlElement([0xA3], [blockHeader, f.data]);
    curCluster.blocks.push(simpleBlock);
  }

  let segOffset = infoElem.length + tracksElem.length;
  const clusterElems: Uint8Array[] = [];
  const cuePoints: Uint8Array[] = [];

  for (const cl of clusters) {
    const tcElem = ebmlElement([0xE7], ebmlUintBytes(cl.timecodeMs));
    const clElem = ebmlElement([0x1F, 0x43, 0xB6, 0x75], [tcElem, ...cl.blocks]);
    cuePoints.push(
      ebmlElement([0xBB], [
        ebmlElement([0xB3], ebmlUintBytes(cl.timecodeMs)),
        ebmlElement([0xB7], [
          ebmlElement([0xF7], ebmlUintBytes(1)),
          ebmlElement([0xF1], ebmlUintBytes(segOffset)),
        ]),
      ])
    );
    clusterElems.push(clElem);
    segOffset += clElem.length;
  }

  const cuesElem = ebmlElement([0x1C, 0x53, 0xBB, 0x6B], cuePoints);
  const segmentBody = concatUint8Arrays([infoElem, tracksElem, ...clusterElems, cuesElem]);
  const segmentSize8 = new Uint8Array([
    0x01, 0x00, 0x00, 0x00,
    (segmentBody.length >>> 24) & 0xFF,
    (segmentBody.length >>> 16) & 0xFF,
    (segmentBody.length >>> 8) & 0xFF,
    segmentBody.length & 0xFF,
  ]);
  const segmentElem = concatUint8Arrays([new Uint8Array([0x18, 0x53, 0x80, 0x67]), segmentSize8, segmentBody]);
  return new Blob([ebmlHeader, segmentElem], { type: 'video/webm' });
}

/* Patch WebM EBML Segment & Info with exact Duration (float64), known sizes, and 0-based Cluster Timecodes */
export async function fixWebmDuration(blob: Blob, durationMs: number) {
  if (!blob || !(durationMs > 0)) return blob;
  try {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);

    const searchLimit = Math.min(bytes.length - 12, 16384);
    let infoPos = -1;
    let tracksPos = -1;
    for (let i = 0; i < searchLimit; i++) {
      if (infoPos < 0 && bytes[i] === 0x15 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0xA9 && bytes[i + 3] === 0x66) {
        infoPos = i;
      } else if (infoPos >= 0 && bytes[i] === 0x16 && bytes[i + 1] === 0x54 && bytes[i + 2] === 0xAE && bytes[i + 3] === 0x6B) {
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
      parsedInfoSize = (parsedInfoSize * 256) + (bytes[sizeIdx + k] ?? 0);
    }
    const isUnknownInfoSize = (vintLen === 8 && bytes[sizeIdx + 1] === 0xFF && bytes[sizeIdx + 2] === 0xFF) ||
      (parsedInfoSize === Math.pow(2, 7 * vintLen) - 1);

    const infoDataStart = sizeIdx + vintLen;
    const infoDataEnd = tracksPos > infoDataStart
      ? tracksPos
      : (!isUnknownInfoSize ? Math.min(bytes.length, infoDataStart + parsedInfoSize) : Math.min(bytes.length, infoDataStart + 64));

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
        0x10 | ((newInfoPayloadLen >>> 24) & 0x0F),
        (newInfoPayloadLen >>> 16) & 0xFF,
        (newInfoPayloadLen >>> 8) & 0xFF,
        newInfoPayloadLen & 0xFF,
      ]);

      const head = bytes.subarray(0, infoPos + 4);
      const tail = bytes.subarray(infoDataEnd);
      outBytes = concatUint8Arrays([head, newSizeVint, durElem, origInfoPayload, tail]);
      tailStartInOut = head.length + newSizeVint.length + durElem.length + origInfoPayload.length;
    }

    for (let i = 0; i < Math.min(infoPos, 128); i++) {
      if (outBytes[i] === 0x18 && outBytes[i + 1] === 0x53 && outBytes[i + 2] === 0x80 && outBytes[i + 3] === 0x67) {
        if (outBytes[i + 4] === 0x01 && outBytes[i + 5] === 0xFF && outBytes[i + 6] === 0xFF) {
          const segPayloadLen = outBytes.length - (i + 12);
          outBytes[i + 4] = 0x01;
          outBytes[i + 5] = 0x00;
          outBytes[i + 6] = 0x00;
          outBytes[i + 7] = 0x00;
          outBytes[i + 8] = (segPayloadLen >>> 24) & 0xFF;
          outBytes[i + 9] = (segPayloadLen >>> 16) & 0xFF;
          outBytes[i + 10] = (segPayloadLen >>> 8) & 0xFF;
          outBytes[i + 11] = segPayloadLen & 0xFF;
        }
        break;
      }
    }

    let firstClusterTc: number | null = null;
    for (let i = tailStartInOut; i < outBytes.length - 16; i++) {
      if (outBytes[i] === 0x1F && outBytes[i + 1] === 0x43 && outBytes[i + 2] === 0xB6 && outBytes[i + 3] === 0x75) {
        const b0 = outBytes[i + 4] ?? 0;
        let vLen = 1, m = 0x80;
        while (vLen <= 8 && !(b0 & m)) { m >>= 1; vLen++; }
        const tcPos = i + 4 + vLen;
        if (tcPos + 2 < outBytes.length && outBytes[tcPos] === 0xE7) {
          const tcSizeByte = outBytes[tcPos + 1] ?? 0;
          const tcLen = tcSizeByte & 0x7F;
          if (tcLen >= 1 && tcLen <= 8 && tcPos + 2 + tcLen <= outBytes.length) {
            let val = 0;
            for (let b = 0; b < tcLen; b++) {
              val = (val * 256) + (outBytes[tcPos + 2 + b] ?? 0);
            }
            if (firstClusterTc === null) {
              firstClusterTc = val;
            }
            if (firstClusterTc > 0) {
              let rebased = Math.max(0, Math.min(Math.round(durationMs), val - firstClusterTc));
              for (let b = tcLen - 1; b >= 0; b--) {
                outBytes[tcPos + 2 + b] = rebased & 0xFF;
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

/* Fast offline 1920x1080 60fps encoding via WebCodecs VideoEncoder + deterministic WebM muxer */
export async function encodeVideoFastWebCodecs(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  totalSteps: number,
  stepDurationMs: number,
  mult: number
) {
  if (typeof VideoEncoder !== 'function' || typeof VideoFrame !== 'function') return null;

  const codecCandidates = [
    { codec: 'vp8', webmId: 'V_VP8' },
    { codec: 'vp09.00.10.08', webmId: 'V_VP9' },
  ];
  let chosen: { codec: string; webmId: string } | null = null;
  for (const c of codecCandidates) {
    try {
      const sup = await VideoEncoder.isConfigSupported({
        codec: c.codec,
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        bitrate: 8_000_000,
        framerate: VIDEO_FPS,
        latencyMode: 'realtime',
      });
      if (sup && sup.supported) {
        chosen = c;
        break;
      }
    } catch (_) {}
  }
  if (!chosen) return null;

  const encodedFrames: Array<{ data: Uint8Array; timestampMs: number; isKey: boolean }> = [];
  let encoderError: DOMException | Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      encodedFrames.push({
        data,
        timestampMs: Math.max(0, Math.round(chunk.timestamp / 1000)),
        isKey: chunk.type === 'key',
      });
    },
    error: (err) => {
      encoderError = err;
    },
  });

  encoder.configure({
    codec: chosen.codec,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    bitrate: 8_000_000,
    framerate: VIDEO_FPS,
    latencyMode: 'realtime',
  });

  const frameDurMs = 1000 / VIDEO_FPS;
  const totalDurationMs = totalSteps * stepDurationMs;
  const subFramesPerStep = 6;

  for (let s = 0; s < totalSteps; s++) {
    if (encoderError) throw encoderError;
    if (videoExportStatus && (s % 2 === 0 || s === totalSteps - 1)) {
      const pct = Math.round(((s + 1) / totalSteps) * 100);
      videoExportStatus.textContent = `正在极速编码 1920×1080 60fps (${mult}x) · ${pct}%`;
      await new Promise(r => setTimeout(r, 0));
    }

    const stepStartMs = s * stepDurationMs;
    for (let k = 0; k < subFramesPerStep; k++) {
      const frac = k / subFramesPerStep;
      const rawMs = stepStartMs + frac * stepDurationMs;
      const tickIdx = Math.round(rawMs / frameDurMs);
      const tMs = Math.min(totalDurationMs - 17, Math.round(tickIdx * frameDurMs));
      const tUs = tMs * 1000;

      if (k === 0 || k === 3) {
        renderVideoFrameToCanvas(ctx, s, frac, mult);
      }
      const vf = new VideoFrame(canvas, {
        timestamp: tUs,
        duration: Math.round((stepDurationMs / subFramesPerStep) * 1000),
      });
      encoder.encode(vf, { keyFrame: k === 0 });
      vf.close();
    }

    if (s === totalSteps - 1) {
      const endMs = Math.max(0, Math.round(totalDurationMs - frameDurMs));
      const vfEnd = new VideoFrame(canvas, {
        timestamp: endMs * 1000,
        duration: Math.round(frameDurMs * 1000),
      });
      encoder.encode(vfEnd, { keyFrame: false });
      vfEnd.close();
    }

    while (encoder.encodeQueueSize > 12) {
      await new Promise(r => setTimeout(r, 4));
    }
  }

  await encoder.flush();
  encoder.close();
  if (encoderError || !encodedFrames.length) return null;

  return {
    blob: muxWebmChunks(encodedFrames, totalDurationMs, VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, chosen.webmId),
    durationMs: totalDurationMs,
  };
}

export async function exportVideo(speedMult = VIDEO_EXPORT_SPEED) {
  if (IS_EXPORTING_VIDEO) return false;
  const mult = setVideoExportSpeed(speedMult);
  stopAuto();

  const savedCur = cur;

  if (!startDebug(0)) {
    say('✗ 代码编译未通过，无法导出视频', 'err');
    return false;
  }
  while (!DEBUG_SESSION.finished && TRACE.steps.length < MAX_STEPS) {
    if (!computeAndAppendNextStep({ silent: true })) break;
  }
  initWatchedVars();

  if (!TRACE.steps.length) {
    say('✗ 当前代码未产生可录制的调试步骤', 'err');
    return false;
  }

  IS_EXPORTING_VIDEO = true;
  if (btnExportVideo) btnExportVideo.disabled = true;
  if (btnExportVideoLabel) btnExportVideoLabel.textContent = '⏺ 正在极速导出...';
  if (videoExportStatus) {
    videoExportStatus.classList.add('active');
    videoExportStatus.textContent = `准备极速导出 1920×1080 @ ${VIDEO_FPS}fps (${mult}x 倍速)...`;
  }
  say(`🎬 开始极速导出视频：分辨率 ${VIDEO_WIDTH}×${VIDEO_HEIGHT} · ${VIDEO_FPS}fps · 倍速 ${mult}x`, 'ok');

  try {
    const canvas = document.createElement('canvas') as HTMLCanvasElement & {
      captureStream?: (fps?: number) => MediaStream;
    };
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext('2d');

    const stepDurationMs = Math.max(120, Math.round(AUTO_PLAY_MS / mult));
    const totalSteps = TRACE.steps.length;
    const targetTotalDurationMs = totalSteps * stepDurationMs;

    const fastRes = ctx ? await encodeVideoFastWebCodecs(canvas, ctx, totalSteps, stepDurationMs, mult) : null;
    if (fastRes && fastRes.blob) {
      cur = Math.min(savedCur, Math.max(0, TRACE.steps.length - 1));
      renderPicker();
      renderStatic(cur, false);

      const url = URL.createObjectURL(fastRes.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ts-playground-1080p-60fps-${mult}x.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const secTxt = (fastRes.durationMs / 1000).toFixed(1) + 's';
      if (videoExportStatus) {
        videoExportStatus.textContent = `✓ 已极速导出 (${secTxt}) ts-playground-1080p-60fps-${mult}x.webm`;
      }
      say(`✓ 视频极速导出完成：ts-playground-1080p-60fps-${mult}x.webm (1920×1080 · 60fps · ${mult}x 倍速 · 精确时长 ${secTxt})`, 'ok');
      return true;
    }

    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      if (ctx) renderVideoFrameToCanvas(ctx, totalSteps - 1, 1, mult);
      return true;
    }

    const mimeCandidates = [
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm',
    ];
    let mimeType = '';
    for (const m of mimeCandidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)) {
        mimeType = m;
        break;
      }
    }

    if (ctx) renderVideoFrameToCanvas(ctx, 0, 0, mult);
    const stream = canvas.captureStream(VIDEO_FPS);
    const videoTrack = (stream.getVideoTracks && stream.getVideoTracks()[0]) as
      | (MediaStreamTrack & { requestFrame?: () => void })
      | undefined;
    const recorderOpts: MediaRecorderOptions = { videoBitsPerSecond: 8_000_000 };
    if (mimeType) recorderOpts.mimeType = mimeType;
    const recorder = new MediaRecorder(stream, recorderOpts);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    const stoppedPromise = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = (ev) => reject(ev.error || new Error('MediaRecorder error'));
    });

    const recStartWall = performance.now();
    recorder.start(100);
    const frameIntervalMs = 1000 / VIDEO_FPS;

    for (let s = 0; s < totalSteps; s++) {
      if (videoExportStatus && (s % 2 === 0 || s === totalSteps - 1)) {
        const pct = Math.round(((s + 1) / totalSteps) * 100);
        videoExportStatus.textContent = `正在合成 1920×1080 60fps (${mult}x) · ${pct}%`;
      }
      const stepStart = performance.now();
      if (ctx) renderVideoFrameToCanvas(ctx, s, 0.5, mult);
      while (true) {
        const now = performance.now();
        const elapsedStep = now - stepStart;
        if (elapsedStep >= stepDurationMs) break;
        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          try { videoTrack.requestFrame(); } catch (_) {}
        }
        const waitMs = Math.max(1, Math.min(frameIntervalMs, stepDurationMs - elapsedStep));
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    const actualDurationMs = Math.max(200, Math.round(performance.now() - recStartWall));
    recorder.stop();
    await stoppedPromise;
    stream.getTracks().forEach((t: { stop: () => void }) => t.stop());

    cur = Math.min(savedCur, Math.max(0, TRACE.steps.length - 1));
    renderPicker();
    renderStatic(cur, false);

    let blob = new Blob(chunks, { type: mimeType || 'video/webm' });
    blob = await fixWebmDuration(blob, actualDurationMs || targetTotalDurationMs);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ts-playground-1080p-60fps-${mult}x.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const secTxt = (actualDurationMs / 1000).toFixed(1) + 's';
    if (videoExportStatus) {
      videoExportStatus.textContent = `✓ 已导出 (${secTxt}) ts-playground-1080p-60fps-${mult}x.webm`;
    }
    say(`✓ 视频导出完成：ts-playground-1080p-60fps-${mult}x.webm (1920×1080 · 60fps · ${mult}x 倍速 · 时长 ${secTxt})`, 'ok');
    return true;
  } catch (err) {
    const msg = err instanceof Error && err.message ? err.message : String(err);
    if (videoExportStatus) videoExportStatus.textContent = '✗ 导出失败: ' + msg;
    say('✗ 视频导出失败: ' + msg, 'err');
    return false;
  } finally {
    IS_EXPORTING_VIDEO = false;
    if (btnExportVideo) btnExportVideo.disabled = false;
    if (btnExportVideoLabel) btnExportVideoLabel.textContent = '🎬 导出视频';
  }
}

if (btnExportVideo) {
  btnExportVideo.onclick = (e: MouseEvent) => {
    e.stopPropagation();
    exportVideo(VIDEO_EXPORT_SPEED);
  };
}
