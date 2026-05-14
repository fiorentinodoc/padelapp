export async function registerPush(supabase: any, profileId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push non supportato su questo browser')
    return false
  }

  try {
    // Registra il service worker
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    console.log('Service Worker registrato')

    // Chiedi permesso
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Permesso notifiche negato')
      return false
    }

    // Sottoscrivi al push service del browser
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY!
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    })

    // Salva la subscription su Supabase
    const token = JSON.stringify(subscription)
    const { error } = await supabase.from('push_tokens').upsert({
      profile_id: profileId,
      token,
      platform:   'web',
      active:     true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'profile_id' })

    if (error) {
      console.error('Errore salvataggio token:', error)
      return false
    }

    console.log('✅ Push subscription salvata')
    return true

  } catch (err) {
    console.error('Errore registrazione push:', err)
    return false
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer  = new ArrayBuffer(rawData.length)
  const view    = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i)
  }
  return buffer
}