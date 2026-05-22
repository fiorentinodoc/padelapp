'use client'

import { useRouter } from 'next/navigation'

export default function GuidaPage() {
  const router = useRouter()

  const sections = [
    {
      id: '1',
      icon: '🔐',
      title: 'Primo accesso',
      steps: [
        { title: 'Richiedi l\'accesso', desc: 'Vai su /richiedi-accesso, compila il form con i tuoi dati e il nome del club. Riceverai una email di approvazione entro 24 ore.' },
        { title: 'Registrati', desc: 'Dopo l\'approvazione ricevi un link via email. Clicca il link, crea la password e accedi alla dashboard.' },
        { title: 'Accedi', desc: 'Vai su /login e inserisci email e password. Puoi accedere da computer, tablet o cellulare.' },
      ]
    },
    {
      id: '2',
      icon: '📅',
      title: 'Gestire le lezioni',
      steps: [
        { title: 'Crea una lezione', desc: 'Vai su Lezioni → clicca "+ Nuova" oppure clicca direttamente su un giorno nel calendario. Compila nome, campo, orario, livello e posti.' },
        { title: 'Lezioni ricorrenti', desc: 'Scegli "Settimanale" per creare automaticamente la stessa lezione ogni settimana. Modifica o annulla ogni data singolarmente.' },
        { title: 'Vista calendario', desc: 'Passa tra vista Settimana (orari dettagliati) e vista Mese (panoramica). Con più centri ogni club ha un colore diverso.' },
      ]
    },
    {
      id: '3',
      icon: '👥',
      title: 'Gestire gli alunni',
      steps: [
        { title: 'Link invito (consigliato)', desc: 'Vai su Inviti → "+ Genera nuovo link" → manda il link WhatsApp agli alunni. Si registrano da soli e vengono collegati automaticamente al tuo club.' },
        { title: 'Aggiunta manuale', desc: 'Vai su Alunni → "+ Aggiungi". Inserisci nome, cognome, email, telefono, livello e gruppo.' },
        { title: 'Livelli', desc: 'Assegna il livello corretto: Principiante, Intermedio, Avanzato. Il livello determina chi riceve le notifiche WhatsApp quando si libera un posto.' },
      ]
    },
    {
      id: '4',
      icon: '📱',
      title: 'Notifiche WhatsApp',
      steps: [
        { title: 'Posto libero automatico', desc: 'Quando un alunno cancella, vai su Notifiche — trovi la lista degli alunni compatibili (stesso livello) da avvisare con il messaggio già pronto.' },
        { title: 'Manda il WhatsApp', desc: 'Clicca "📱 WhatsApp" accanto a ogni alunno per aprire la chat, oppure "Manda a tutti" per avvisarli in sequenza.' },
        { title: 'Messaggi manuali', desc: 'Scrivi un messaggio personalizzato e mandalo a tutti gli alunni o per livello. Utile per avvisi, spostamenti, eventi.' },
      ]
    },
    {
      id: '5',
      icon: '🎾',
      title: 'App per gli alunni',
      steps: [
        { title: 'Come accedono', desc: 'Gli alunni usano lo stesso link della dashboard. L\'app riconosce automaticamente il ruolo e mostra la schermata giusta.' },
        { title: 'Prenotare una lezione', desc: 'L\'alunno va su Lezioni, vede i posti disponibili e clicca Prenota. La conferma è immediata.' },
        { title: 'Installare sul telefono', desc: 'Dal browser del cellulare → tocca "Aggiungi alla schermata Home". L\'app appare come un\'app normale senza download da store.' },
      ]
    },
    {
      id: '6',
      icon: '💳',
      title: 'Piani e abbonamento',
      steps: [
        { title: 'Piano Free', desc: '1 centro, max 20 alunni. Calendario lezioni, link invito, WhatsApp manuale. Gratuito.' },
        { title: 'Piano Starter — €29/mese', desc: 'Fino a 3 centri, max 100 alunni. WhatsApp automatico, analytics. Upgrade da Abbonamento nel menu.' },
        { title: 'Piano Pro — €69/mese', desc: 'Centri e alunni illimitati. Analytics avanzate, supporto prioritario. Scrivi su WhatsApp per attivarlo.' },
      ]
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', fontFamily: 'system-ui', color: '#fff' }}>

      {/* Header */}
      <div style={{ background: '#161b27', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#c8f53a' }}>remate●</div>
        <button onClick={() => router.push('/login')}
          style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
          Accedi →
        </button>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '12px' }}>
            Guida per istruttori 🎾
          </div>
          <div style={{ fontSize: '16px', color: '#8b93a8', lineHeight: '1.6', marginBottom: '24px' }}>
            Tutto quello che ti serve per gestire il tuo club con Remate
          </div>
          <a href="https://wa.me/393395889666?text=Ciao!%20Ho%20bisogno%20di%20aiuto%20con%20Remate"
            target="_blank"
            style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
            📱 Supporto WhatsApp
          </a>
        </div>

        {/* Indice */}
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Indice</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sections.map(s => (
              <a key={s.id} href={`#section-${s.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c8f53a', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                <span>{s.icon}</span>
                <span>{s.id}. {s.title}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Sezioni */}
        {sections.map(section => (
          <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '28px' }}>{section.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '800' }}>
                {section.id}. {section.title}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {section.steps.map((step, i) => (
                <div key={i} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #c8f53a', borderRadius: '0 12px 12px 0', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ background: '#c8f53a', color: '#0e1117', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{step.title}</div>
                      <div style={{ fontSize: '13px', color: '#8b93a8', lineHeight: '1.6' }}>{step.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer supporto */}
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Hai bisogno di aiuto?</div>
          <div style={{ fontSize: '13px', color: '#8b93a8', marginBottom: '20px', lineHeight: '1.6' }}>
            Il nostro supporto è disponibile su WhatsApp. Rispondiamo entro poche ore.
          </div>
          <a href="https://wa.me/393395889666?text=Ciao!%20Ho%20bisogno%20di%20aiuto%20con%20Remate"
            target="_blank"
            style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', marginBottom: '12px' }}>
            📱 Scrivici su WhatsApp
          </a>
          <div style={{ fontSize: '12px', color: '#5a5a6a' }}>+39 339 588 9666</div>
        </div>

      </div>
    </div>
  )
}