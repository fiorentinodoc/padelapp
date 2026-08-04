'use client'

import { useState } from 'react'
import { useTheme } from '../club-context'

const faqs = [
  {
    category: '🔐 Account e accesso',
    items: [
      {
        q: 'Ho dimenticato la password, cosa faccio?',
        a: 'Vai su /login → clicca "Password dimenticata?" → inserisci la tua email → ricevi il link di reset. Clicca il link e inserisci la nuova password.'
      },
      {
        q: 'Posso usare Remate su computer e telefono contemporaneamente?',
        a: 'Sì — puoi accedere da più dispositivi con lo stesso account. La dashboard è ottimizzata sia per desktop che per mobile.'
      },
      {
        q: 'Come installo l\'app sul telefono?',
        a: 'Su iOS: apri Safari, vai sul sito, tocca l\'icona di condivisione → "Aggiungi a schermata Home". Su Android: Chrome ti chiede automaticamente di installare l\'app.'
      },
    ]
  },
  {
    category: '📅 Lezioni e calendario',
    items: [
      {
        q: 'Come faccio a sapere chi ha prenotato una lezione?',
        a: 'Clicca sulla lezione nel calendario → si apre il pannello con la lista completa degli iscritti, i loro nomi e livelli.'
      },
      {
        q: 'Come cancello una lezione intera?',
        a: 'Clicca sulla lezione → clicca "Annulla lezione" in rosso → conferma. Tutti gli iscritti perdono la prenotazione.'
      },
      {
        q: 'Posso aggiungere un alunno a una lezione al completo?',
        a: 'No — devi prima aumentare i posti massimi (clicca sulla lezione → Modifica → aumenta i posti) oppure rimuovere un alunno esistente.'
      },
      {
        q: 'A cosa servono i colori nel calendario?',
        a: 'Verde = Principiante, Giallo = Intermedio, Rosso = Avanzato. Il bordo sinistro colorato indica il centro (utile se hai più centri).'
      },
      {
        q: 'Come creo lezioni ricorrenti?',
        a: 'Quando crei una nuova lezione, nella voce "Ricorrenza" seleziona "Settimanale (12 settimane)" — crea automaticamente 12 lezioni consecutive ogni settimana.'
      },
    ]
  },
  {
    category: '👥 Alunni',
    items: [
      {
        q: 'Un alunno ha il livello sbagliato, come lo cambio?',
        a: 'Vai su "Alunni" → trova l\'alunno → clicca "✏️ Modifica" → cambia il livello → salva. L\'alunno vedrà automaticamente le lezioni del nuovo livello.'
      },
      {
        q: 'Cosa significa il badge "Non registrato"?',
        a: 'L\'alunno è stato aggiunto ma non si è ancora registrato sull\'app. Clicca "📱 Manda invito" per mandargli il link su WhatsApp.'
      },
      {
        q: 'Cosa succede se metto un alunno in pausa?',
        a: 'L\'alunno può ancora visualizzare le lezioni ma non può prenotare. Vede un banner arancio che lo avvisa di contattare l\'istruttore.'
      },
      {
        q: 'Perché l\'email dell\'alunno è obbligatoria?',
        a: 'L\'email serve per riconoscere l\'alunno quando si registra sull\'app. Senza email l\'alunno non può accedere alla PWA.'
      },
    ]
  },
  {
    category: '📱 WhatsApp e notifiche',
    items: [
      {
        q: 'Come ricevo le notifiche quando un alunno prenota?',
        a: 'Vai su "Centri" → Modifica → inserisci il tuo numero WhatsApp. Ogni volta che un alunno prenota ricevi un messaggio automatico.'
      },
      {
        q: 'Ogni centro può avere un numero WhatsApp diverso?',
        a: 'Sì — ogni centro ha il suo numero WhatsApp per le notifiche. Utile se hai collaboratori che gestiscono centri diversi.'
      },
      {
        q: 'Cosa succede quando aggiungo manualmente un alunno a una lezione?',
        a: 'Se l\'alunno ha il numero di telefono salvato, si apre automaticamente WhatsApp con un messaggio di conferma pre-compilato da inviargli.'
      },
    ]
  },
  {
    category: '💳 Abbonamento e piani',
    items: [
      {
        q: 'Come faccio l\'upgrade del piano?',
        a: 'Vai su "Abbonamento" → clicca sul piano desiderato → si apre WhatsApp con il tuo nome nel messaggio. Il team Remate attiva il piano entro 24 ore.'
      },
      {
        q: 'La dashboard è bloccata con "Piano scaduto", cosa faccio?',
        a: 'Clicca "📱 Rinnova via WhatsApp" nella schermata di blocco. I tuoi dati sono al sicuro e vengono ripristinati al rinnovo.'
      },
      {
        q: 'Quando aggiungo un secondo centro, quale piano riceve?',
        a: 'Il secondo centro eredita automaticamente lo stesso piano del primo. Se hai il piano Pro, tutti i tuoi centri sono Pro.'
      },
    ]
  },
]

export default function FaqPage() {
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const { bg, surface, surface2, border, text, textSub, textMuted, pc } = useTheme()

  const filtered = faqs.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0)

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>FAQ</div>
        <div style={{ fontSize: '13px', color: textMuted, marginTop: '4px' }}>Domande frequenti</div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Cerca una domanda..."
          style={{ width: '100%', padding: '12px 14px', background: surface, border: `1.5px solid ${border}`, borderRadius: '10px', color: text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '40px', textAlign: 'center', color: textMuted }}>
          Nessun risultato per "{search}"
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filtered.map(cat => (
            <div key={cat.category}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: pc, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                {cat.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cat.items.map(item => {
                  const key = item.q
                  const isOpen = openItem === key
                  return (
                    <div key={key} style={{ background: surface, border: `1px solid ${isOpen ? pc : border}`, borderRadius: '12px', overflow: 'hidden' }}>
                      <div
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: text, flex: 1 }}>{item.q}</div>
                        <div style={{ fontSize: '18px', color: pc, flexShrink: 0, transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 16px 14px', fontSize: '13px', color: textSub, lineHeight: '1.6', borderTop: `1px solid ${border}`, paddingTop: '12px' }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}