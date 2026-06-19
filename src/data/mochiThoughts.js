/**
 * mochiThoughts.js — Mochi's banner thought-balloon phrases
 *
 * These are the little musings Mochi shows in the speech bubble on the Camp hub,
 * to give the hero some personality and quietly tie into the world's lore.
 *
 * Shape per phrase:
 *   id          – unique key
 *   text        – the phrase shown in the bubble (keep it short: ~1–2 lines)
 *   default     – true → always available from the start
 *   unlockedBy  – a note id (see data/notes.js); the phrase only joins the pool
 *                 once progress.notesCollected[unlockedBy] is true
 *
 * Note ids map to `${zoneId}_floor${floor}` and are set in gameState END_RUN
 * the first time the player clears each floor.
 */

export const MOCHI_THOUGHTS = [
  // ─── Default — cozy, curious, always available ─────────────────────────────
  { id: 'd1',  default: true, text: "What adventures lie ahead today? I'm excited!" },
  { id: 'd2',  default: true, text: "I could go for a nap... right after one little expedition." },
  { id: 'd3',  default: true, text: "Do you think there are fish down in the depths?" },
  { id: 'd4',  default: true, text: "My whiskers are tingling. That always means treasure!" },
  { id: 'd5',  default: true, text: "Onward, into the dark! ...after a quick snack." },
  { id: 'd6',  default: true, text: "I wonder what's waiting past the next region." },
  { id: 'd7',  default: true, text: "A brave cat fears nothing. Well... almost nothing." },
  { id: 'd8',  default: true, text: "The campfire's so warm. Just five more minutes?" },
  { id: 'd9',  default: true, text: "Claws sharpened. Ready for anything!" },
  { id: 'd10', default: true, text: "Gold, gear, glory... and maybe a cozy nap." },
  { id: 'd11', default: true, text: "Supplies packed! Did I forget anything? Probably snacks." },
  { id: 'd12', default: true, text: "Every depth has a story. I want to hear them all." },
  { id: 'd13', default: true, text: "Today feels lucky. I can smell it!" },
  { id: 'd14', default: true, text: "Stretch, yawn, adventure. In that order." },
  { id: 'd15', default: true, text: "I hope we find something shiny down there." },
  { id: 'd16', default: true, text: "One day I'll map every tunnel. One day!" },
  { id: 'd17', default: true, text: "The tent's comfy, but the unknown is calling." },
  { id: 'd18', default: true, text: "I'm small, but I'm mighty!" },
  { id: 'd19', default: true, text: "Let's make today a good one, friend." },
  { id: 'd20', default: true, text: "I dreamt of a giant ball of yarn. Best dream ever." },
  { id: 'd21', default: true, text: "Did you hear that? ...probably just the wind. Probably." },
  { id: 'd22', default: true, text: "A full belly and a brave heart. Let's go!" },
  { id: 'd23', default: true, text: "Rations packed, spirits high!" },
  { id: 'd24', default: true, text: "The depths are scary... but I'm scarier. Maybe." },
  { id: 'd25', default: true, text: "Adventure now, biscuits later. That's the plan." },

  // ─── Unlocked by notes — quieter, reflective, lore-tinged ───────────────────
  { id: 'n_z1f1',  unlockedBy: 'zone1_floor1',  text: "These old tunnels... it's like the walls remember someone." },
  { id: 'n_z1f2',  unlockedBy: 'zone1_floor2',  text: "I found marks scratched in the stone. Someone was counting the days." },
  { id: 'n_z1f3',  unlockedBy: 'zone1_floor3',  text: "Funny — I keep picturing a morning light I've never seen." },
  { id: 'n_z1f5',  unlockedBy: 'zone1_floor5',  text: "Somewhere, long ago, someone was sorry. I can almost feel it." },
  { id: 'n_z1f6',  unlockedBy: 'zone1_floor6',  text: "A child drew on these walls once. I wonder where they went." },
  { id: 'n_z1f10', unlockedBy: 'zone1_floor10', text: "Why does it feel like I've sat in this dark before... just watching?" },
  { id: 'n_z2f1',  unlockedBy: 'zone2_floor1',  text: "The garden grows where it shouldn't. Nature's stubborn — like me!" },
  { id: 'n_z2f6',  unlockedBy: 'zone2_floor6',  text: "Someone tended these plants long after they had to. That's kindness." },
  { id: 'n_z2f10', unlockedBy: 'zone2_floor10', text: "The roots grew around the old words, like they were keeping them safe." },
  { id: 'n_z3f1',  unlockedBy: 'zone3_floor1',  text: "Boats that never came home... I hope their crews found somewhere warm." },
  { id: 'n_z3f3',  unlockedBy: 'zone3_floor3',  text: "They sailed everywhere seeking safety. I'm glad I have a home to return to." },
  { id: 'n_z3f7',  unlockedBy: 'zone3_floor7',  text: "Someone kept a photograph down here. They only wanted to be remembered." },
  { id: 'n_z3f9',  unlockedBy: 'zone3_floor9',  text: "So many books, so much knowing. Somebody had to carry it forward." },
  { id: 'n_z3f10', unlockedBy: 'zone3_floor10', text: "Sometimes I dream of a voice reading to me in the dark. It gave me my name." },
];

/**
 * Returns the phrases currently available to the player: all defaults plus any
 * note-gated phrases whose note has been collected.
 * @param {Object} notesCollected – progress.notesCollected ({ noteId: true })
 */
export function getAvailableThoughts(notesCollected = {}) {
  return MOCHI_THOUGHTS.filter(
    (t) => t.default || (t.unlockedBy && notesCollected[t.unlockedBy])
  );
}

/**
 * Picks a random available phrase. Falls back to the first default if needed.
 * @param {Object} notesCollected – progress.notesCollected ({ noteId: true })
 */
export function pickRandomThought(notesCollected = {}) {
  const pool = getAvailableThoughts(notesCollected);
  if (pool.length === 0) return MOCHI_THOUGHTS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
