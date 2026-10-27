/* ================================================================
   60fps Video Exporter UI & WebCodecs/MediaRecorder Orchestrator (src/ui/video-webm.ts)
   ================================================================ */
import { say } from "../runtime/event-loop";
import { startDebug, computeAndAppendNextStep, initWatchedVars } from "../runtime/runner";
import { appState, AUTO_PLAY_MS, MAX_STEPS, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "../state";
import { muxWebmChunks, fixWebmDuration } from "../utils/webm-muxer";
import { renderPicker, renderStatic } from "../viz/memory-graph";
import { stopAuto, setVideoExportSpeed } from "./controls";
import { $ } from "./dom";
import { renderVideoFrameToCanvas } from "./share";

export * from "../utils/webm-muxer";

const btnExportVideo = $<HTMLButtonElement>('btnExportVideo');
const btnExportVideoLabel = $('btnExportVideoLabel');
const videoExportStatus = $('videoExportStatus');


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

export async function exportVideo(speedMult = appState.VIDEO_EXPORT_SPEED) {
  if (appState.IS_EXPORTING_VIDEO) return false;
  const mult = setVideoExportSpeed(speedMult);
  stopAuto();

  const savedCur = appState.cur;

  if (!startDebug(0)) {
    say('✗ 代码编译未通过，无法导出视频', 'err');
    return false;
  }
  while (!appState.DEBUG_SESSION.finished && appState.TRACE.steps.length < MAX_STEPS) {
    if (!computeAndAppendNextStep({ silent: true })) break;
  }
  initWatchedVars();

  if (!appState.TRACE.steps.length) {
    say('✗ 当前代码未产生可录制的调试步骤', 'err');
    return false;
  }

  appState.IS_EXPORTING_VIDEO = true;
  if (btnExportVideo) btnExportVideo.disabled = true;
  if (btnExportVideoLabel) btnExportVideoLabel.textContent = '⏺ 正在极速导出...';
  if (videoExportStatus) {
    videoExportStatus.classList.add('active');
    videoExportStatus.textContent = `准备极速导出 1920×1080 @ ${VIDEO_FPS}fps (${mult}x 倍速)...`;
  }
  say(`🎬 开始极速导出视频：分辨率 ${VIDEO_WIDTH}×${VIDEO_HEIGHT} · ${VIDEO_FPS}fps · 倍速 ${mult}x`, 'ok');

  try {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext('2d');

    const stepDurationMs = Math.max(120, Math.round(AUTO_PLAY_MS / mult));
    const totalSteps = appState.TRACE.steps.length;
    const targetTotalDurationMs = totalSteps * stepDurationMs;

    const fastRes = ctx ? await encodeVideoFastWebCodecs(canvas, ctx, totalSteps, stepDurationMs, mult) : null;
    if (fastRes && fastRes.blob) {
      appState.cur = Math.min(savedCur, Math.max(0, appState.TRACE.steps.length - 1));
      renderPicker();
      renderStatic(appState.cur, false);

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

    appState.cur = Math.min(savedCur, Math.max(0, appState.TRACE.steps.length - 1));
    renderPicker();
    renderStatic(appState.cur, false);

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
    appState.IS_EXPORTING_VIDEO = false;
    if (btnExportVideo) btnExportVideo.disabled = false;
    if (btnExportVideoLabel) btnExportVideoLabel.textContent = '🎬 导出视频';
  }
}

if (btnExportVideo) {
  btnExportVideo.onclick = (e: MouseEvent) => {
    e.stopPropagation();
    exportVideo(appState.VIDEO_EXPORT_SPEED);
  };
}
