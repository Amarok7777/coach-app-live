import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const IDB_STORE = 'attendance_queue'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('coach_offline', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { keyPath: 'key' })
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}
async function idbSet(key, value) {
  const db = await openDB()
  const tx = db.transaction(IDB_STORE, 'readwrite')
  tx.objectStore(IDB_STORE).put({ key, value })
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej })
}
async function idbGet(key) {
  const db  = await openDB()
  const tx  = db.transaction(IDB_STORE, 'readonly')
  const req = tx.objectStore(IDB_STORE).get(key)
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result?.value ?? null)
    req.onerror   = () => rej(req.error)
  })
}
async function idbGetAll() {
  const db  = await openDB()
  const tx  = db.transaction(IDB_STORE, 'readonly')
  const req = tx.objectStore(IDB_STORE).getAll()
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result ?? [])
    req.onerror   = () => rej(req.error)
  })
}
async function idbDelete(key) {
  const db = await openDB()
  const tx = db.transaction(IDB_STORE, 'readwrite')
  tx.objectStore(IDB_STORE).delete(key)
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej })
}

export function useTrainingDetail(sessionId) {
  const [session, setSession]         = useState(null)
  const [players, setPlayers]         = useState([])
  const [attendance, setAttendance]   = useState({})
  const [availability, setAvailability] = useState({})
  const [loading, setLoading]         = useState(true)
  const [syncing, setSyncing]         = useState(false)
  const [isOnline, setIsOnline]       = useState(navigator.onLine)
  const [dirty, setDirty]             = useState(false)

  useEffect(() => {
    const on  = () => { setIsOnline(true); syncQueue() }
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => { if (sessionId) load() }, [sessionId])

  async function load() {
    setLoading(true)
    try {
      const { data: sess } = await supabase
        .from('training_sessions').select('*').eq('id', sessionId).single()
      setSession(sess)

      const { data: pls } = await supabase
        .from('players').select('id, name, position, number').order('name')
      setPlayers(pls ?? [])

      const { data: att } = await supabase
        .from('training_attendance').select('*').eq('session_id', sessionId)
      const map = {}
      ;(att ?? []).forEach(a => {
        map[a.player_id] = {
          id: a.id,
          present: a.present,
          note: a.note ?? '',
          rating: a.rating,
          minutes: a.minutes ?? null,   // ← persisted custom minutes
        }
      })

      // Merge offline changes
      const offlineData = await idbGet(`session_${sessionId}`)
      if (offlineData) {
        Object.assign(map, offlineData)
        setDirty(true)
      }
      setAttendance(map)

      // Availability + injuries for this session date
      if (sess) {
        const { data: avail } = await supabase
          .from('player_availability')
          .select('player_id, type')
          .lte('date_from', sess.date)
          .gte('date_to', sess.date)
        const { data: inj } = await supabase
          .from('injuries').select('player_id').eq('status', 'active')
        const availMap = {}
        ;(avail ?? []).forEach(a => { availMap[a.player_id] = { type: a.type } })
        ;(inj ?? []).forEach(i => { availMap[i.player_id] = { type: 'injured' } })
        setAvailability(availMap)
      }
    } finally {
      setLoading(false)
    }
  }

  function updateField(playerId, fields) {
    setAttendance(prev => {
      const cur  = prev[playerId] ?? { present: false, note: '', rating: null, minutes: null }
      const next = { ...prev, [playerId]: { ...cur, ...fields } }
      saveOffline(next)
      return next
    })
  }

  function togglePresent(playerId) {
    setAttendance(prev => {
      const cur  = prev[playerId] ?? { present: false, note: '', rating: null, minutes: null }
      const next = { ...prev, [playerId]: { ...cur, present: !cur.present } }
      saveOffline(next)
      return next
    })
  }

  const setNote    = (id, note)    => updateField(id, { note })
  const setRating  = (id, rating)  => updateField(id, { rating: rating ? parseFloat(rating) : null })
  const setMinutes = (id, minutes) => updateField(id, { minutes })   // ← NEW

  async function saveOffline(data) {
    setDirty(true)
    await idbSet(`session_${sessionId}`, data)
  }

  async function sync() {
    if (!isOnline) return
    setSyncing(true)
    try {
      const upserts = Object.entries(attendance).map(([player_id, a]) => ({
        session_id: sessionId,
        player_id,
        present: a.present ?? false,
        note:    a.note    || null,
        rating:  a.rating  || null,
        minutes: a.minutes ?? null,   // ← persisted
      }))
      const { error } = await supabase
        .from('training_attendance')
        .upsert(upserts, { onConflict: 'session_id,player_id' })
      if (error) throw error
      await idbDelete(`session_${sessionId}`)
      setDirty(false)
    } finally {
      setSyncing(false)
    }
  }

  async function syncQueue() {
    const all = await idbGetAll()
    for (const { key, value } of all) {
      if (!key.startsWith('session_')) continue
      const sid = key.replace('session_', '')
      const upserts = Object.entries(value).map(([player_id, a]) => ({
        session_id: sid, player_id,
        present: a.present ?? false,
        note:    a.note    || null,
        rating:  a.rating  || null,
        minutes: a.minutes ?? null,
      }))
      const { error } = await supabase
        .from('training_attendance')
        .upsert(upserts, { onConflict: 'session_id,player_id' })
      if (!error) await idbDelete(key)
    }
  }

  return {
    session, players, attendance, availability,
    loading, syncing, isOnline, dirty,
    togglePresent, setNote, setRating, setMinutes, sync, reload: load,
  }
}
