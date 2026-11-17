// Lightweight event tracking for Pimped.io
// Fire-and-forget to console for now, can wire to Supabase later

let queue = []

function getSessionId() {
  let sid = sessionStorage.getItem('pimped-sid')
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem('pimped-sid', sid)
  }
  return sid
}

function getDeviceId() {
  try {
    let did = localStorage.getItem('pimped-did')
    if (!did) {
      did = crypto.randomUUID()
      localStorage.setItem('pimped-did', did)
    }
    return did
  } catch { return null }
}

export function track(event, props = {}) {
  const entry = {
    event,
    session_id: getSessionId(),
    device_id: getDeviceId(),
    props,
    url: window.location.pathname,
    timestamp: new Date().toISOString(),
  }
  queue.push(entry)
  console.log('[track]', event, props)
}
