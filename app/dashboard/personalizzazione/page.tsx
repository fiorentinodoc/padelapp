'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useClub } from '../club-context'

const PRESET_COLORS = [
  '#c8f53a', // Verde lime (default)
  '#5b7fff', // Blu
  '#38c97a', // Verde
  '#f5a623', // Arancio
  '#e85858', // Rosso
  '#a855f7', // Viola
  '#06b6d4', // Azzurro
  '#f43f5e', // Rosa
  '#f97316', // Arancio scuro
  '#ffffff', // Bianco
]

export default function PersonalizzazionePage() {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [color, setColor] = useState('#c8f53a')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { activeClub, refreshClub } = useClub()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (activeClub) {
      setColor(activeClub.primary_color ?? '#c8f53a')
      setLogoUrl(activeClub.logo_url ?? null)
      setLogoPreview(activeClub.logo_url ?? null)
    }
  }, [activeClub])

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeClub) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Il file è troppo grande. Massimo 2MB.')
      return
    }

    setUploading(true)

    // Preview locale
    const reader = new FileReader()
    reader.onload = (e) => setLogoPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload su Supabase Storage
    const ext      = file.name.split('.').pop()
    const filename = `${activeClub.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('club-logos')
      .upload(filename, file, { upsert: true })

    if (uploadError) {
      alert('Errore upload: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('club-logos')
      .getPublicUrl(filename)

    setLogoUrl(publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    if (!activeClub) return
    setSaving(true)
    setSuccess(false)

    const { error } = await supabase
      .from('clubs')
      .update({
        primary_color: color,
        logo_url:      logoUrl
      })
      .eq('id', activeClub.id)

    if (error) {
      alert('Errore: ' + error.message)
    } else {
      setSuccess(true)
      refreshClub()
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  async function removeLogo() {
    setLogoUrl(null)
    setLogoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Calcola colore testo (scuro o chiaro) in base al colore primario
  function getTextColor(bg: string): string {
    const hex = bg.replace('#', '')
    const r = parseInt(hex.slice(0,2), 16)
    const g = parseInt(hex.slice(2,4), 16)
    const b = parseInt(hex.slice(4,6), 16)
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255
    return luminance > 0.5 ? '#0e1117' : '#ffffff'
  }

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Personalizzazione</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>
          Personalizza l'aspetto dell'app per {activeClub?.name}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', maxWidth: '800px' }}>

        {/* Colore principale */}
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>🎨 Colore principale</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '20px' }}>
            Usato per pulsanti, accenti e icone attive
          </div>

          {/* Preset colori */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {PRESET_COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)}
                style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: c, cursor: 'pointer',
                  border: color === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: color === c ? '0 0 0 2px #5b7fff' : 'none',
                  transition: 'all 0.15s'
                }} />
            ))}
          </div>

          {/* Color picker custom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: '48px', height: '48px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent' }} />
            <div>
              <div style={{ fontSize: '12px', color: '#8b93a8', marginBottom: '2px' }}>Colore personalizzato</div>
              <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>{color.toUpperCase()}</div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: '#1e2535', borderRadius: '10px', padding: '14px', marginTop: '8px' }}>
            <div style={{ fontSize: '11px', color: '#5a5a6a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anteprima</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ background: color, color: getTextColor(color), padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
                Bottone primario
              </div>
              <div style={{ background: `${color}18`, color: color, border: `1px solid ${color}40`, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
                Badge
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: '800', color }}>
              {activeClub?.name}●
            </div>
          </div>
        </div>

        {/* Logo */}
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>🖼️ Logo club</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '20px' }}>
            Appare nella sidebar al posto del nome. PNG o JPG, max 2MB.
          </div>

          {/* Preview logo */}
          <div style={{ background: '#0e1117', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '16px', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" style={{ maxHeight: '80px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '32px', fontWeight: '800', color }}>
                {activeClub?.name.charAt(0).toUpperCase()}●
              </div>
            )}
          </div>

          {/* Upload */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUploadLogo}
            style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ flex: 1, background: '#1e2535', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? 'Caricamento...' : '📁 Carica logo'}
            </button>
            {logoPreview && (
              <button onClick={removeLogo}
                style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                Rimuovi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottone salva */}
      <div style={{ marginTop: '24px', maxWidth: '800px' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ background: saving ? '#5a7a20' : color, border: 'none', color: getTextColor(color), padding: '14px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Salvataggio...' : '✓ Salva personalizzazione'}
        </button>
        {success && (
          <span style={{ marginLeft: '16px', color: '#38c97a', fontSize: '14px', fontWeight: '600' }}>
            ✓ Salvato!
          </span>
        )}
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#5a5a6a', maxWidth: '800px' }}>
        Le modifiche si applicano immediatamente alla tua dashboard e all'app dei tuoi alunni.
      </div>

    </div>
  )
}