export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  })
  videoEl.srcObject = stream
  await videoEl.play()
  return stream
}

export function stopCamera(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function captureFrameAsBase64(videoEl, quality = 0.85) {
  const canvas = document.createElement('canvas')
  canvas.width = videoEl.videoWidth
  canvas.height = videoEl.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
