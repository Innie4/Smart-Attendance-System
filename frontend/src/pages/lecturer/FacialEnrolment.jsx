import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Circle, ShieldCheck } from 'lucide-react'
import client from '../../api/client.js'
import GlassCard from '../../components/GlassCard.jsx'
import Modal from '../../components/Modal.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { startCamera, stopCamera, captureFrameAsBase64 } from '../../lib/camera.js'
import { loadFaceModels, detectFaceWithLandmarks, extractOfflineDescriptor } from '../../lib/faceApi.js'
import { describeError } from '../../lib/errors.js'

const ANGLES = [
  { key: 'front', label: 'Look straight at the camera' },
  { key: 'left', label: 'Turn slightly to your left' },
  { key: 'right', label: 'Turn slightly to your right' },
  { key: 'up', label: 'Tilt your chin slightly up' },
]

// Stroked onto a canvas, so it mirrors accent-500 from tailwind.config.js.
const BOX_COLOR = '#b56f6a'

export default function FacialEnrolment() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [frames, setFrames] = useState({})
  const [descriptors, setDescriptors] = useState({})
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await client.get('/admin/students')
        setStudents(data)
        setStatus(null)
      } catch (err) {
        setStatus({ type: 'error', message: describeError(err, 'Could not load students') })
      }
    }
    load()
    loadFaceModels().catch(() => {})
    return () => {
      cancelAnimationFrame(rafRef.current)
      stopCamera(streamRef.current)
    }
  }, [])

  async function handleStartCamera() {
    setStatus(null)
    streamRef.current = await startCamera(videoRef.current)
    setCameraReady(true)
    runDetectionLoop()
  }

  function runDetectionLoop() {
    async function tick() {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const detection = await detectFaceWithLandmarks(videoRef.current)
          drawOverlay(detection)
          setFaceDetected(Boolean(detection))
        } catch {
          // model still loading; skip this frame
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  function drawOverlay(detection) {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!detection) return

    const { x, y, width, height } = detection.detection.box
    ctx.strokeStyle = BOX_COLOR
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)
  }

  async function captureAngle(angleKey) {
    if (!videoRef.current) return
    const dataUrl = captureFrameAsBase64(videoRef.current)
    setFrames((prev) => ({ ...prev, [angleKey]: dataUrl }))

    try {
      const descriptor = await extractOfflineDescriptor(videoRef.current)
      if (descriptor) {
        setDescriptors((prev) => ({ ...prev, [angleKey]: descriptor }))
      }
    } catch {
      // Offline descriptor is a bonus signal for the resilience path; the
      // server-side vector below remains the source of truth either way.
    }
  }

  function averagedOfflineDescriptor() {
    const values = Object.values(descriptors)
    if (values.length === 0) return null
    const length = values[0].length
    const sums = new Array(length).fill(0)
    values.forEach((descriptor) => {
      descriptor.forEach((value, index) => {
        sums[index] += value
      })
    })
    return sums.map((sum) => sum / values.length)
  }

  const allCaptured = ANGLES.every((angle) => frames[angle.key])

  async function handleSubmit() {
    setSubmitting(true)
    setStatus(null)
    try {
      const { data } = await client.post(`/facial-enrolment/${studentId}`, {
        consent_given: true,
        frames: Object.values(frames),
        offline_descriptor: averagedOfflineDescriptor(),
      })
      setStatus({ type: 'success', message: `Enrolled with a ${data.vector_length}D vector.` })
      setFrames({})
      setDescriptors({})
      setConsentOpen(false)
      setConsentChecked(false)
    } catch (err) {
      setStatus({ type: 'error', message: describeError(err, 'Enrolment failed') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Facial enrolment"
        subtitle="Registers a numerical face vector for recognition. No photograph is stored, in line with NDPA 2023."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <GlassCard className="space-y-5 p-7">
          <div>
            <label className="label" htmlFor="enrolment-student-select">
              Student
            </label>
            <select
              id="enrolment-student-select"
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="" disabled>
                Select a student
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.matric_number} - {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {!cameraReady ? (
            <button className="btn-primary w-full" disabled={!studentId} onClick={handleStartCamera}>
              <Camera size={16} /> Start camera
            </button>
          ) : (
            <div className="space-y-2.5">
              {ANGLES.map((angle) => (
                <button
                  key={angle.key}
                  onClick={() => captureAngle(angle.key)}
                  disabled={!faceDetected}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/50 px-4 py-3 text-left text-sm font-medium text-ink-700 transition-all duration-300 ease-spring hover:border-accent-300 hover:bg-white/80 disabled:opacity-50"
                >
                  <span>{angle.label}</span>
                  {frames[angle.key] ? (
                    <CheckCircle2 size={16} className="shrink-0 text-signal-present" />
                  ) : (
                    <Circle size={16} className="shrink-0 text-ink-300" />
                  )}
                </button>
              ))}

              <button
                className="btn-primary mt-2 w-full"
                disabled={!allCaptured}
                onClick={() => setConsentOpen(true)}
              >
                <ShieldCheck size={16} /> Continue to consent
              </button>
            </div>
          )}

          {status && (
            <p
              role="status"
              className={`text-sm font-medium ${
                status.type === 'success' ? 'text-signal-present' : 'text-signal-absent'
              }`}
            >
              {status.message}
            </p>
          )}
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div className="relative aspect-video bg-ink-900">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-300">
                Camera preview will appear here
              </div>
            )}
            {cameraReady && (
              <div className="absolute bottom-4 left-4">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white ${
                    faceDetected ? 'bg-signal-present/90' : 'bg-signal-warning/90'
                  }`}
                >
                  {faceDetected ? 'Face detected' : 'No face detected'}
                </span>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <Modal
        open={consentOpen}
        title="NDPA 2023 consent"
        onClose={() => setConsentOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConsentOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={!consentChecked || submitting} onClick={handleSubmit}>
              {submitting ? 'Registering...' : 'Confirm and register'}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-600">
          The captured images are converted into a numerical face vector and then discarded. Only the vector
          is stored, and it is used solely to mark attendance for enrolled courses. The student may request
          erasure of this vector at any time.
        </p>
        <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-ink-700">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded-md accent-accent-600"
          />
          The student has read and accepted this notice and consents to biometric enrolment.
        </label>
      </Modal>
    </div>
  )
}
