// Results for matches without demos, edited by hand.
// These count in Results, Standings, map records and match previews, but NOT in player
// season stats (EOS Rating etc. need a demo). The optional box score is shown in the
// match scoreboard only: [player, kills, deaths, ADR (null if unknown)].
window.EOS_EXTRA_RESULTS = [
  {
    date: '2026-11-11', time: '20:00', a: 'HAVU', b: 'boyband',
    note: 'No demo for this match - box score taken from the broadcast.',
    maps: [
      {
        map: 'Dust2', as: 16, bs: 12, ot: true,
        boxNote: 'Box score from the broadcast during the final overtime round (27 of 28 rounds); ADR hidden for two players.',
        box: {
          'HAVU':    [['8Juho8', 21, 19, null], ['p3kko', 20, 20, 88], ['alxc', 18, 22, null], ['Uli', 17, 18, 60], ['ottob', 14, 17, 52]],
          'boyband': [['Myggis', 35, 17, 123], ['myltsi', 22, 18, 88], ['sLowi', 16, 18, 68], ['spargo', 16, 18, 59], ['Kossu72', 6, 19, 36]]
        }
      },
      {
        map: 'Inferno', as: 13, bs: 9,
        boxNote: 'Final box score from the broadcast.',
        box: {
          'HAVU':    [['8Juho8', 18, 12, 84], ['Uli', 18, 12, 82], ['alxc', 17, 13, 92], ['ottob', 16, 13, 69], ['p3kko', 14, 15, 67]],
          'boyband': [['spargo', 17, 14, 77], ['sLowi', 17, 14, 84], ['myltsi', 12, 19, 67], ['Kossu72', 11, 18, 81], ['Myggis', 6, 18, 48]]
        }
      }
    ]
  }
];
