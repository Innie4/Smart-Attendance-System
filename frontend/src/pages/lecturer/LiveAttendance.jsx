import { useEffect, useRef, useState } from 'react'
import { Video, Square, WifiOff } from 'lucide-react'
import client from '../../api/client.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { startCamera, stopCamera, captureFrameAsBase64 } from '../../lib/camera.js'
import { loadFaceModels, detectFaceWithLandmarks, extractOfflineDescriptor, faceapi, OFFLINE_MATCH_THRESHOLD } from '../../lib/faceApi.js'
import { eyeAspectRatio, BlinkDetector } from '../../lib/ear.js'
import { cacheRoster, getCachedRoster } from '../../lib/rosterCache.js'
import { queueAttendanceTick } from '../../lib/offlineQueue.js'

const RECOGNITION_INTERVAL_MS = 2500

export default function LiveAttendance() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const intervalRef = useRef(null)
  const blinkDetectorRef = useRef(new BlinkDetector({ earThreshold: 0.21, consecFrames: 2 }))
  const earBufferRef = useRef([])
  const busyRef = useRef(false)
  const markedRef = useRef(new Set())

  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [sessionYear, setSessionYear] = useState('2025/2026')
  const [session, setSession] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [liveStatus, setLiveStatus] = useState('idle')
  const [feed, setFeed] = useState([])

  useEffect(() => {
    client.get('/admin/courses').then((res) => setCourses(res.data))
    loadFaceModels().catch(() => {})
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(intervalRef.current)
      stopCamera(streamRef.current)
    }
  }, [])

  function pushFeed(entry) {
    setFeed((prev) => [{ ...entry, at: new Date().toLocaleTimeString() }, ...prev].slice(0, 30))
  }

  async function handleOpenSession() {
    const { data } = await client.post('/attendance/sessions', { course_id: Number(courseId) })
    setSession(data)

    try {
      const { data: roster } = await client.get(`/attendance/sessions/${data.id}/roster-cache`, {
        params: { session_year: sessionYear },
      })
      await cacheRoster(data.id, roster)
    } catch {
      // Roster caching best-effort only; online recognition still works.
    }

    streamRef.current = await startCamera(videoRef.current)
    setCameraReady(true)
    blinkDetectorRef.current.reset()
    earBufferRef.current = []
    markedRef.current = new Set()
    runDetectionLoop()
    intervalRef.current = setInterval(attemptRecognition, RECOGNITION_INTERVAL_MS)
  }

  async function handleCloseSession() {
    if (session) {
      await client.post(`/attendance/sessions/${session.id}/close`)
    }
    clearInterval(intervalRef.current)
    cancelAnimationFrame(rafRef.current)
    stopCamera(streamRef.current)
    setCameraReady(false)
    setSession(null)
    setLiveStatus('idle')
  }

  function runDetectionLoop() {
    async function tick() {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const detection = await detectFaceWithLandmarks(videoRef.current)
          drawOverlay(detection)
          if (detection) {
            const leftEar = eyeAspectRatio(detection.landmarks.getLeftEye())
            const rightEar = eyeAspectRatio(detection.landmarks.getRightEye())
            blinkDetectorRef.current.update(leftEar, rightEar)
            earBufferRef.current = [...earBufferRef.current, { left: leftEar, right: rightEar }].slice(-30)
            setLiveStatus(blinkDetectorRef.current.isLive() ? 'live' : 'checking')
          } else {
            setLiveStatus('no_face')
          }
        } catch {
          // model still warming up
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
    ctx.strokeStyle = blinkDetectorRef.current.isLive() ? '#1a7f5a' : '#b8791a'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)
  }

  async function attemptRecognition() {
    if (busyRef.current || !session || !videoRef.current) return
    busyRef.current = true
    try {
      const frame = captureFrameAsBase64(videoRef.current)

      try {
        const { data } = await client.post(`/attendance/sessions/${session.id}/recognize`, {
          frame,
          session_year: sessionYear,
          ear_sequence: earBufferRef.current,
        })
        handleRecognitionResult(data)
      } catch (err) {
        if (err.response) {
          // Server reachable and rejected the request on its own terms.
          handleRecognitionResult(err.response.data)
          return
        }
        await attemptOfflineRecognition(frame)
      }
    } finally {
      busyRef.current = false
    }
  }

  function handleRecognitionResult(data) {
    if (data.status === 'marked_present') {
      pushFeed({ label: data.log?.student_name || 'Student', detail: 'Marked present', variant: 'present' })
    } else if (data.status === 'already_marked') {
      pushFeed({ label: 'Duplicate scan', detail: 'Already marked this session', variant: 'pending' })
    } else if (data.status === 'liveness_check_failed') {
      pushFeed({ label: 'Liveness check failed', detail: 'Possible spoof attempt', variant: 'warning' })
    } else if (data.status === 'no_match') {
      pushFeed({ label: 'No match', detail: 'Face not recognised in this course roster', variant: 'absent' })
    }
  }

  async function attemptOfflineRecognition(frame) {
    if (!blinkDetectorRef.current.isLive()) return

    const descriptor = await extractOfflineDescriptor(videoRef.current).catch(() => null)
    if (!descriptor) return

    const roster = await getCachedRoster(session.id)
    let best = null
    for (const candidate of roster) {
      if (!candidate.offline_descriptor) continue
      const distance = faceapi.euclideanDistance(descriptor, candidate.offline_descriptor)
      if (!best || distance < best.distance) {
        best = { distance, candidate }
      }
    }

    if (!best || best.distance > OFFLINE_MATCH_THRESHOLD) {
      pushFeed({ label: 'Offline: no match', detail: 'Cached roster did not match', variant: 'absent' })
      return
    }
    if (markedRef.current.has(best.candidate.student_id)) {
      return
    }

    markedRef.current.add(best.candidate.student_id)
    await queueAttendanceTick({
      sessionId: session.id,
      studentId: best.candidate.student_id,
      confidenceScore: Math.max(0, 1 - best.distance / OFFLINE_MATCH_THRESHOLD),
      capturedAt: new Date().toISOString(),
    })
    pushFeed({
      label: best.candidate.full_name,
      detail: 'Marked present offline, queued for sync',
      variant: 'warning',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">Live attendance</h1>
        <p className="text-sm text-ink-500">
          Runs face recognition with blink-based liveness detection against the course roster.
        </p>
      </div>

      {!session ? (
        <div className="card max-w-md space-y-4 p-5">
          <div>
            <label className="label">Course</label>
            <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="" disabled>
                Select a course
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Session year</label>
            <input className="input" value={sessionYear} onChange={(e) => setSessionYear(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={!courseId} onClick={handleOpenSession}>
            <Video size={16} /> Open session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card overflow-hidden">
            <div className="relative aspect-video bg-ink-950">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              <div className="absolute bottom-3 left-3 flex gap-2">
                <StatusIndicator status={liveStatus} />
                {!navigator.onLine && (
                  <span className="flex items-center gap-1 rounded-full bg-signal-warning/90 px-2.5 py-1 text-xs font-medium text-white">
                    <WifiOff size={12} /> Offline mode
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3">
              <p className="text-sm text-ink-600">
                Session #{session.id} - {sessionYear}
              </p>
              <button className="btn-danger" onClick={handleCloseSession}>
                <Square size={14} /> Close session
              </button>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-900">Live feed</h3>
            <div className="space-y-2">
              {feed.length === 0 && <p className="text-sm text-ink-400">Waiting for the first match...</p>}
              {feed.map((entry, index) => (
                <div key={index} className="flex items-start justify-between rounded-md border border-ink-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{entry.label}</p>
                    <p className="text-xs text-ink-500">{entry.detail}</p>
                  </div>
                  <span className="text-xs text-ink-400">{entry.at}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusIndicator({ status }) {
  const map = {
    idle: { label: 'Idle', variant: 'pending' },
    checking: { label: 'Checking liveness...', variant: 'warning' },
    live: { label: 'Live face confirmed', variant: 'present' },
    no_face: { label: 'No face detected', variant: 'absent' },
  }
  const current = map[status] || map.idle
  return <StatusBadge variant={current.variant}>{current.label}</StatusBadge>
}
