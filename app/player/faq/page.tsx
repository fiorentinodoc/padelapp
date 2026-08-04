'use client'

import { useState } from 'react'

const faqs = [
  {
    category: '🔐 Account e accesso',
    items: [
      {
        q: 'Non riesco ad accedere, cosa faccio?',
        a: 'Verifica di usare la stessa email comunicata dal tuo istruttore. Se hai dimenticato la password, clicca "Password dimenticata?" nella schermata di login e ricevi il link di reset via email.'
      },
      {
        q: 'Come installo l\'app sul telefono?',
        a: 'Su iPhone: apri Safari → vai su padelapp-zeta.vercel.app → tocca l\'icona di condivisione (quadrato con freccia) → "Aggiungi a schermata Home". Su Android: apri Chrome → accetta il banner che appare in automatico oppure tocca i tre puntini → "Aggiungi a schermata Home".'
      },
    ]
  },
  {
    category: '📅 Prenotazioni',
    items: [
      {
        q: 'Non vedo nessuna lezione disponibile',
        a: 'Possibili cause: l\'istruttore non ha ancora programmato lezioni, tutte le lezioni sono al completo, oppure non ci sono lezioni per il tuo livello. Contatta il tuo istruttore.'
      },
      {
        q: 'Perché vedo solo alcune lezioni e non tutte?',
        a: 'L\'app mostra solo le lezioni del tuo livello (Principiante, Intermedio o Avanzato). Se pensi che il tuo livello sia sbagliato, contatta il tuo istruttore per modificarlo.'
      },
      {
        q: 'Ho prenotato per errore, posso cancellare?',
        a: 'Sì — vai su "Le mie lezioni" → trova la lezione → tocca "Cancella prenotazione". Il posto si libera immediatamente per altri alunni.'
      },
      {
        q: 'La lezione è al completo, cosa posso fare?',
        a: 'Contatta il tuo istruttore — può aumentare i posti massimi o aggiungerti manualmente. Puoi anche monitorare la sezione home: se qualcuno cancella, ricevi l\'avviso "Posto libero!"'
      },
      {
        q: 'Cosa significa il banner "Posto libero!"?',
        a: 'Significa che c\'è una lezione del tuo livello con posti disponibili che non hai ancora prenotato. Tocca il banner per vedere le lezioni disponibili e prenotare.'
      },
    ]
  },
  {
    category: '📲 Calendario e notifiche',
    items: [
      {
        q: 'Come aggiungo la lezione al calendario del telefono?',
        a: 'Dalla home, con la lezione prenotata mostrata, tocca "📲 Aggiungi al calendario del telefono". Scarica un file che puoi aprire con Calendar (iOS) o Google Calendar (Android). Include un promemoria 30 minuti prima della lezione.'
      },
      {
        q: 'Perché si apre WhatsApp quando prenoto?',
        a: 'È normale! Quando prenoti una lezione, l\'app apre WhatsApp per inviare automaticamente una notifica al tuo istruttore. Devi solo premere "Invia".'
      },
    ]
  },
  {
    category: '⏸ Account in pausa',
    items: [
      {
        q: 'Vedo il messaggio "Account in pausa", cosa significa?',
        a: 'Il tuo istruttore ha sospeso temporaneamente il tuo account. Puoi ancora visualizzare le lezioni ma non puoi prenotare. Contatta il tuo istruttore per sapere il motivo e per essere riattivato.'
      },
    ]
  },
  {
    category: '🏟️ Multi-centro',
    items: [
      {
        q: 'Sono iscritto a più centri, come li distinguo?',
        a: 'Nella schermata "Prenota lezione" usa i pulsanti colorati in cima per filtrare per centro. Ogni centro ha un colore diverso. Nella home vedi la prossima lezione indipendentemente dal centro.'
      },
    ]
  },
]

export default function PlayerFaqPage() {
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = faqs.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0)

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'system-ui', color: '#fff', background: '#0e1117', minHeight: '100vh' }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>FAQ</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>Domande frequenti</div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Cerca una domanda..."
          style={{ width: '100%', padding: '12px 14px', background: '#161b27', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#5a5a6a' }}>
          Nessun risultato per "{search}"
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filtered.map(cat => (
            <div key={cat.category}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#c8f53a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                {cat.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cat.items.map(item => {
                  const key = item.q
                  const isOpen = openItem === key
                  return (
                    <div key={key} style={{ background: '#161b27', border: `1px solid ${isOpen ? '#c8f53a' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', overflow: 'hidden' }}>
                      <div
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', flex: 1 }}>{item.q}</div>
                        <div style={{ fontSize: '18px', color: '#c8f53a', flexShrink: 0, transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '12px 16px 14px', fontSize: '13px', color: '#8b93a8', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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