import { useState } from 'react';
import { loadMatchHistory, saveMatchRecord } from '../types/registration';
import type { MatchRecord } from '../types/registration';

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function exportCSV(records: MatchRecord[]) {
  const rows: string[] = [
    'Date,Game Mode,Player,Name,Company,Contact,Score,Winner',
  ];
  for (const r of records) {
    for (const p of r.players) {
      rows.push([
        formatDate(r.timestamp),
        r.numPlayers === 1 ? '1 Player' : '2 Players',
        p.playerId === 'player1' ? 'P1' : 'P2',
        p.registration.name,
        p.registration.company,
        p.registration.contact,
        p.score,
        p.isWinner ? 'Yes' : 'No',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pumba-game-history-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminPanel() {
  const [records, setRecords] = useState<MatchRecord[]>(() =>
    [...loadMatchHistory()].reverse()
  );
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = records.filter(r =>
    r.players.some(p =>
      p.registration.name.toLowerCase().includes(search.toLowerCase()) ||
      p.registration.company.toLowerCase().includes(search.toLowerCase()) ||
      p.registration.contact.toLowerCase().includes(search.toLowerCase())
    )
  );

  const clearAll = () => {
    localStorage.removeItem('pumba_match_history');
    setRecords([]);
    setConfirmClear(false);
  };

  // Add dummy seed data for development/demo
  const addSeedData = () => {
    const demo: MatchRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      numPlayers: 2,
      players: [
        { playerId: 'player1', registration: { name: 'Demo Player 1', company: 'Pumba', contact: 'demo@pumba.co' }, score: 7, isWinner: true },
        { playerId: 'player2', registration: { name: 'Demo Player 2', company: 'Tel Aviv Corp', contact: '050-1234567' }, score: 5, isWinner: false },
      ],
    };
    saveMatchRecord(demo);
    setRecords([demo, ...records]);
  };

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: '#080c18', color: '#fff' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-8 py-4 flex items-center gap-4 justify-between"
        style={{ background: '#080c18dd', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo_2.svg" alt="Pumba" style={{ height: 36 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 13, letterSpacing: '0.2em' }}>
            ADMIN
          </span>
        </div>

        <input
          type="text"
          placeholder="Search name, company, contact…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '8px 16px',
            color: '#fff',
            width: 300,
            fontSize: 14,
            outline: 'none',
          }}
        />

        <div className="flex items-center gap-3">
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            {records.length} game{records.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => exportCSV(filtered)}
            style={{
              background: '#33FFCC',
              color: '#060a14',
              border: 'none',
              borderRadius: 10,
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
          {records.length === 0 && (
            <button
              onClick={addSeedData}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Add demo data
            </button>
          )}
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              style={{
                background: 'rgba(255,50,50,0.12)',
                color: '#FF5555',
                border: '1px solid rgba(255,50,50,0.25)',
                borderRadius: 10,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Clear All
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span style={{ color: '#FF5555', fontSize: 13 }}>Sure?</span>
              <button onClick={clearAll} style={{ background: '#FF5555', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setConfirmClear(false)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>No</button>
            </div>
          )}
          <a
            href="/"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            ← Back to game
          </a>
        </div>
      </div>

      {/* Stats bar */}
      {records.length > 0 && (
        <div className="px-8 py-4 flex gap-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: 'Total games', value: records.length },
            { label: 'Total players', value: records.reduce((s, r) => s + r.players.length, 0) },
            { label: 'Avg score', value: (() => {
              const all = records.flatMap(r => r.players.map(p => p.score));
              return all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : '—';
            })() },
            { label: 'High score', value: Math.max(...records.flatMap(r => r.players.map(p => p.score)), 0) },
          ].map(s => (
            <div key={s.label}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ color: '#33FFCC', fontSize: 28, fontWeight: 900 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span style={{ fontSize: 64 }}>🚗</span>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: 700 }}>
              {records.length === 0 ? 'No games played yet.' : 'No results match your search.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Date', 'Mode', 'Player', 'Name', 'Company', 'Contact', 'Score', 'Result'].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      color: 'rgba(255,255,255,0.3)',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((record, ri) =>
                record.players.map((p, pi) => (
                  <tr
                    key={`${record.id}-${p.playerId}`}
                    style={{
                      borderBottom: pi === record.players.length - 1
                        ? '1px solid rgba(255,255,255,0.06)'
                        : 'none',
                      background: ri % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                    }}
                  >
                    {pi === 0 && (
                      <td
                        rowSpan={record.players.length}
                        style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', verticalAlign: 'middle' }}
                      >
                        {formatDate(record.timestamp)}
                      </td>
                    )}
                    {pi === 0 && (
                      <td
                        rowSpan={record.players.length}
                        style={{ padding: '12px 14px', verticalAlign: 'middle' }}
                      >
                        <span
                          style={{
                            background: record.numPlayers === 1 ? 'rgba(51,204,255,0.15)' : 'rgba(255,51,102,0.15)',
                            color: record.numPlayers === 1 ? '#33CCFF' : '#FF3366',
                            borderRadius: 6,
                            padding: '3px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {record.numPlayers}P
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '12px 14px', color: p.playerId === 'player1' ? '#33CCFF' : '#FF3366', fontWeight: 700 }}>
                      {p.playerId === 'player1' ? 'P1' : 'P2'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{p.registration.name}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.55)' }}>{p.registration.company}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{p.registration.contact || '—'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 900, fontSize: 18, color: '#fff' }}>{p.score}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {p.isWinner ? (
                        <span style={{ background: 'rgba(51,255,204,0.15)', color: '#33FFCC', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                          🏆 Winner
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
