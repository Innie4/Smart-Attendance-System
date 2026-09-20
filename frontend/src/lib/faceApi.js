import * as faceapi from 'face-api.js'

// face-api.js ships its inference code via npm but the pretrained weight
// files live in its GitHub repo. jsDelivr's raw-GitHub mirror serves them
// without any hosting setup of our own; swap MODEL_URL for a same-origin
// /models path if the deployment target has no outbound internet access.
const MODEL_URL =
  import.meta.env.VITE_FACE_MODEL_URL ||
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'

let loadPromise = null

export function loadFaceModels() {
  if (!loadPromise) {
    loadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
  }
  return loadPromise
}

export async function detectFaceWithLandmarks(videoEl) {
  const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
  return faceapi.detectSingleFace(videoEl, detectorOptions).withFaceLandmarks()
}

// Used only for the offline recognition fallback: a 128D descriptor from
// face-api.js's own FaceRecognitionNet, a separate embedding space from the
// server-side SFace vector used for online recognition.
export async function extractOfflineDescriptor(videoEl) {
  const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
  const result = await faceapi
    .detectSingleFace(videoEl, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor()
  return result ? Array.from(result.descriptor) : null
}

export const OFFLINE_MATCH_THRESHOLD = 0.6

export { faceapi }
