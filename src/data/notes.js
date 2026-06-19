/**
 * notes.js — Collectible field notes (lore)
 *
 * Each region (zone1/zone2/zone3) has 10 notes, one awarded the first time the
 * player clears each floor (1–10). See gameState END_RUN, where clearing a new
 * floor sets progress.notesCollected[`${zoneId}_floor${floor}`] = true.
 *
 * Shape per note:
 *   id      – '${zoneId}_floor${floor}' (matches the key written on first clear)
 *   floor   – 1–10
 *   title   – display title, e.g. 'Soggy Ruins — Note I'
 *   context – the italic "where it was found" framing line
 *   body    – the full transcribed text ([unclear] markers preserved)
 *
 * Source text: meow_depths_notes_v2.md (doc "Zone N" = our floor N within a region).
 */

// "3rd row, 7th frame" of icons-map.png (480×320 = 15 cols × 10 rows @ 32px):
// frameIndex = (3-1) * 15 + (7-1) = 36
export const NOTE_SPRITE = { spritesheet: 'icons-map', frameIndex: 36, frameSize: 32 };

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const NOTES = {
  // ───────────────────────────────────────────────────────────────────────────
  // REGION 1 — THE SOGGY RUINS (doc notes 01–10)
  // ───────────────────────────────────────────────────────────────────────────
  zone1: [
    {
      id: 'zone1_floor1',
      floor: 1,
      title: 'Soggy Ruins — Note I',
      context: 'Scratched into the wall near the entrance. Old enough that some words are difficult to read.',
      body:
        'We came down on the [unclear] of March. Forty-three of us from the [unclear] district. Mira said the tunnels would protect us from what was in the air above.\n\n' +
        'We brought what we could carry. Food for [unclear] weeks if we were careful. Some medicine. Blankets.\n\n' +
        '[unclear] said we\'d be back up in a month. That it would pass like the [unclear] passed, that people were resilient, that this was not as bad as it [unclear].\n\n' +
        'The smell is bad. We are trying not to mind the smell.\n\n' +
        'Above us the city is [unclear].\n\n' +
        'We are trying not to think about that either.',
    },
    {
      id: 'zone1_floor2',
      floor: 2,
      title: 'Soggy Ruins — Note II',
      context: 'Found folded inside a sealed metal container. Paper brittle and some words already fading. Written in two different hands.',
      body:
        'Day 12 underground. Food manageable if careful. Water from the pipes still running, Domenico says safe enough for now. Counting heads every morning. Still forty-three.\n\n' +
        'We\'ve organized the space. The children sleep in the eastern section where it\'s driest. The [unclear] ones take shifts watching the entrance. Mira has set up a medical area near the [unclear] pipes where it\'s warmest.\n\n' +
        'It feels almost like [unclear]. Almost like something we chose rather than something that [unclear] us.\n\n' +
        '[margin, different hand] Day 31. Thirty-four. Mira is one of the [unclear].\n\n' +
        'The counting is the hardest part. You count every morning hoping the number is the same and when it [unclear] you have to decide whether to write it down or pretend you [unclear].',
    },
    {
      id: 'zone1_floor3',
      floor: 3,
      title: 'Soggy Ruins — Note III',
      context: 'Found pinned to a pipe with a piece of wire. The handwriting is careful — someone who had time to write slowly. Sadly the time has not been kind to the ink.',
      body:
        'I keep thinking about my apartment. The window that looked east. I used to watch the light change in the morning while the [unclear] cooled on the counter.\n\n' +
        'None of that exists anymore probably.\n\n' +
        'I\'ve been trying to remember exactly what the light looked like at [unclear] in the morning. The specific color of it. The way it moved across the [unclear] floor. I\'m afraid I\'m already forgetting it and it\'s only been [unclear] days.\n\n' +
        'This is what nobody tells you about [unclear]. That it isn\'t just the large things you lose. It\'s the small ones too. The particular [unclear] of your own kitchen. The sound your door made. The way your neighbor always [unclear] at the same time every morning.\n\n' +
        'All of that is gone and I am underground trying to remember the color of morning light and I can\'t [unclear] get it right anymore.',
    },
    {
      id: 'zone1_floor4',
      floor: 4,
      title: 'Soggy Ruins — Note IV',
      context: 'Found wedged between two pipes, wrapped in a plastic bag that partially preserved it. The handwriting changes halfway through.',
      body:
        'We found another group today. Came through the eastern tunnel. Twenty-two of them from the [unclear] quarter. They brought medicine which we needed and news which we did not want.\n\n' +
        'They described the surface.\n\n' +
        'I\'m not going to write what they described. Some things should not be written down. Some things you carry in your body and that is [unclear] already without making them permanent on [unclear].\n\n' +
        'What I will write is this: the war did not end. I think we understood that already but hearing it from [unclear] people who had just come from [unclear] made it real in a way that the sounds from above had not quite managed.\n\n' +
        'The war did not end. It simply [unclear] everything it needed to [unclear] and then stopped because there was nothing left to [unclear].\n\n' +
        'We are staying underground. All sixty-five of us. Nobody argued.',
    },
    {
      id: 'zone1_floor5',
      floor: 5,
      title: 'Soggy Ruins — Note V',
      context: 'Found scratched directly into the floor in an area that appears to have been used as a living space. Some words are unreadable.',
      body:
        'My brother fought in the [unclear] campaign. He wrote to me twice after the [unclear] started. The first letter said he was [unclear] and that his unit was holding the [unclear] line and that I shouldn\'t [unclear].\n\n' +
        'The second letter said he was sorry.\n\n' +
        'I don\'t know what he was sorry for. The letter arrived [unclear] weeks after he sent it and by then [unclear] had already happened and I couldn\'t write back because the [unclear] had stopped and I have been wondering ever since what he meant.\n\n' +
        'I think about it down here in the [unclear]. I have a lot of time to think.\n\n' +
        'I think he was sorry for the war. Not his part in it specifically. All of it. The whole [unclear] thing. I think he could see by then what it was going to [unclear] and he was sorry that we had done it to ourselves and to [unclear].\n\n' +
        'I think that\'s what he meant.\n\n' +
        'I hope that\'s what he [unclear].',
    },
    {
      id: 'zone1_floor6',
      floor: 6,
      title: 'Soggy Ruins — Note VI',
      context: 'Found in a child\'s exercise book, most pages water damaged. This page was still somewhat legible because it was in the middle.',
      body:
        'My name is [unclear] and I am [unclear] years old and I am writing this because my father said to write things down so we remember.\n\n' +
        'We have been underground for a long time. I don\'t know how long exactly because I lost count and Papa lost count too.\n\n' +
        'Before we came down here I had a school and a [unclear] and a friend called [unclear] who lived on the [unclear] floor and we used to [unclear] on the roof when it was warm.\n\n' +
        'I don\'t know where [unclear] is now. Papa says not to ask about [unclear] anymore.\n\n' +
        'I remember our classroom. The [unclear] on the wall above the board. The way the teacher always [unclear] when she was thinking. The smell of the [unclear] in the morning when they were [unclear].\n\n' +
        'I don\'t want to forget these things. That\'s why I\'m writing them.\n\n' +
        'Papa says writing them down means they [unclear] even if we [unclear].\n\n' +
        'I hope he\'s [unclear].',
    },
    {
      id: 'zone1_floor7',
      floor: 7,
      title: 'Soggy Ruins — Note VII',
      context: 'Found carved into a section of pipe that had been deliberately removed from the wall and placed flat. Corrosion has made some words unclear.',
      body:
        'I am writing this for whoever finds it. I don\'t think it will be one of us.\n\n' +
        'We came down here [unclear] months ago. There were sixty-one of us. I won\'t write the number now.\n\n' +
        'What I want to write is this:\n\n' +
        'We were not bad people. Most of us. We made mistakes like everyone makes mistakes and we lived in a world that had been making mistakes for [unclear] years before any of us were born, mistakes that accumulated until they [unclear] everything at once.\n\n' +
        'We didn\'t start the war. Most of us. We didn\'t want it. We watched it start the way you watch something terrible happen when you\'re too far away to [unclear] and too close to look [unclear].\n\n' +
        'And then it [unclear] us anyway.\n\n' +
        'I want whoever finds this to know that. That most of us were just [unclear]. That we loved things and tried to [unclear] the people near us and did not understand, until it was too late, what the people making the [unclear] decisions were actually [unclear].\n\n' +
        'I want that written somewhere. I want it to [unclear].',
    },
    {
      id: 'zone1_floor8',
      floor: 8,
      title: 'Soggy Ruins — Note VIII',
      context: 'Found in a sealed metal box stamped with official markings. Even though the box was sealed, the paper inside was still somewhat degraded.',
      body:
        'INTERNAL COMMUNICATION — [classification unclear]\n' +
        'STATUS REPORT — Underground Shelter Network — Sector [unclear]\n\n' +
        'Current population: [number faded]\n' +
        'Food reserves: [unclear] weeks at current rationing\n' +
        'Medical: [unclear] cases of radiation [unclear], [unclear] cases of [unclear] syndrome\n\n' +
        'SECURITY STATUS:\n' +
        'The eastern entrance has been [unclear] following the incident on [unclear]. All residents have been advised to remain in the [unclear] sections until further [unclear].\n\n' +
        'EXTERNAL COMMUNICATION STATUS:\n' +
        'Last contact with [unclear] authority: [unclear] weeks ago.\n' +
        'Last contact with any external party: [unclear] days ago.\n' +
        'Attempts to reach [unclear]: [number] attempts, no response.\n\n' +
        '[handwritten note at bottom] Authorization request forwarded [unclear] weeks ago. No response received. No response expected. — [signature illegible]\n\n' +
        '[different hand below that] There is no one left to authorize anything. We are making our own [unclear] now. I hope we make them [unclear].',
    },
    {
      id: 'zone1_floor9',
      floor: 9,
      title: 'Soggy Ruins — Note IX',
      context: 'Found wrapped around a pipe, held in place by wire. Written on the back of a child\'s drawing — crayon figures, faded but visible.',
      body:
        'Benedetta kept a list of everyone\'s birthdays. She said it was important to [unclear] them even down here. That marking time was how you [unclear] it still mattered.\n\n' +
        'On your birthday she would find something small. A piece of [unclear] she\'d saved. A drawing one of the children had [unclear]. Something. She\'d present it to you seriously, like a ceremony, and say the words she always said which I won\'t write here because they were hers and [unclear] her.\n\n' +
        'She kept doing this until there were [unclear] of us left and then she stopped. Not because she forgot. Because the list had gotten too [unclear] to look at.\n\n' +
        'She gave me her list before she [unclear]. I still have it.\n\n' +
        'All those names.\n\n' +
        'All those [unclear] days that came and went down here in the [unclear] and she remembered every one.\n\n' +
        'I think about that. I think about what it means to [unclear] people carefully even when everything is [unclear].\n\n' +
        'I think it means something. I think it might be the most important [unclear] there is.',
    },
    {
      id: 'zone1_floor10',
      floor: 10,
      title: 'Soggy Ruins — Note X',
      context: 'Found carved into the wall directly outside one of the deepest chambers. Corrosion really took a toll on this one.',
      body:
        'This is the last note I will write down here.\n\n' +
        'The [unclear] is smaller now. Much smaller. I won\'t write the number. I wrote the number once, months ago, and I [unclear] I had.\n\n' +
        'I want to write something that [unclear]. Something true and final that whoever finds this will carry with them.\n\n' +
        'Here is what I know:\n\n' +
        'This [unclear] was not an accident. It was the result of [unclear] made by [unclear] people who wanted things they didn\'t [unclear] and couldn\'t stop [unclear] even when they could see what they were [unclear]. We watched it happen for [unclear] years before it [unclear] and we told ourselves it wouldn\'t and then it [unclear].\n\n' +
        'I don\'t know if that\'s a [unclear] nature thing or a [unclear] circumstance thing. I don\'t know if it could have been [unclear] differently. I used to think about that a lot. I think about it less now.\n\n' +
        'What I think about now is the weird rat that has been sitting at the end of this tunnel for [unclear] days. Just sitting. Watching.\n\n' +
        'I\'ve never seen a rat so [unclear].\n\n' +
        'I don\'t know what it [unclear].\n\n' +
        'I really [unclear].',
    },
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // REGION 2 — THE TWISTED GARDEN (doc notes 11–20)
  // ───────────────────────────────────────────────────────────────────────────
  zone2: [
    {
      id: 'zone2_floor1',
      floor: 1,
      title: 'Twisted Garden — Note I',
      context: 'Found in a sealed specimen jar. The label is mostly legible. The note inside is pristine — someone sealed it carefully.',
      body:
        'FIELD NOTES — Underground Botanical Research Station [unclear]\n' +
        'Date: approximately 8 months post-[unclear]\n\n' +
        'We retreated to the facility on [unclear] when the surface became [unclear]. The greenhouse was designed to be self-contained — sealed atmosphere, independent water supply, preserved seed stock. It was built for [unclear] research continuity. It was not built for [unclear] people to live in indefinitely but it is what we have.\n\n' +
        'Current team: [unclear] researchers, [unclear] support staff. Total [unclear].\n\n' +
        'The facility is intact. The specimens are largely [unclear]. The sealed sections performed as designed.\n\n' +
        'Outside: we can see [unclear] through the observation panels in the north wall. The sky is the wrong [unclear]. Has been since [unclear].\n\n' +
        'We are continuing our work. It is what we know how to [unclear]. It is, at the moment, the only thing that feels like it [unclear].',
    },
    {
      id: 'zone2_floor2',
      floor: 2,
      title: 'Twisted Garden — Note II',
      context: 'Found pressed between the pages of a field notebook.',
      body:
        'Year [unclear], month [unclear].\n\n' +
        'The accelerated growth continues. We\'ve had to [unclear] the eastern wing twice. Whatever the [unclear] did to the soil composition it has produced growth rates we have no [unclear] for.\n\n' +
        'More interesting to me personally: the behavior of the insect population within the facility. The [unclear] beetles specifically. I\'ve been watching them for [unclear] weeks. Their movement patterns have changed in ways I find difficult to [unclear] under existing frameworks.\n\n' +
        'I mentioned this to [unclear] colleague at dinner. She said I was projecting. That I was looking for [unclear] because the circumstances made me want to find [unclear]. That the behavioral changes were explicable through resource competition and nothing [unclear] than that.\n\n' +
        'She\'s probably right.\n\n' +
        'I\'m going to keep [unclear] them anyway.\n\n' +
        '[later, different pen] She was not right. But I don\'t know yet what she was wrong [unclear].',
    },
    {
      id: 'zone2_floor3',
      floor: 3,
      title: 'Twisted Garden — Note III',
      context: 'Found pinned to a laboratory wall. Formal letterhead at the top, mostly illegible.',
      body:
        'INTERNAL MEMO\n' +
        'RE: Revised safety protocols\n\n' +
        'Following the [unclear] of last week and the loss of [unclear], the remaining team has agreed:\n\n' +
        '1. No researcher works alone in any section.\n' +
        '2. The eastern wing remains [unclear] until we understand what happened to [unclear].\n' +
        '3. All personal effects of [unclear] colleagues to be preserved per standard [unclear] in the storage room.\n\n' +
        '[handwritten below] I want to write something about [unclear] here but I don\'t know what to write. She was here for [unclear] years. She knew the name of every specimen in the facility. She used to bring [unclear] to the morning briefings even when the [unclear] ran low because she said small [unclear] kept you human.\n\n' +
        'She was right about that.\n\n' +
        'I don\'t know how to write what the facility feels like without her in it. The notes feel [unclear] without her corrections in the margins.\n\n' +
        'I\'ll keep writing them anyway. Someone has to.',
    },
    {
      id: 'zone2_floor4',
      floor: 4,
      title: 'Twisted Garden — Note IV',
      context: 'Found in a sealed specimen container. Inside: pressed plant samples and this note.',
      body:
        'Personal log. Not for official record.\n\n' +
        'The war started, as best I can piece together from what we knew before we came down here, over [unclear]. The [unclear] basin. The [unclear] treaty that [unclear] never ratified. The [unclear] incident that everyone had a different [unclear] for.\n\n' +
        'I\'ve been thinking about it a lot lately. Down here in the [unclear] with nothing but time and specimens and colleagues I am watching get [unclear] one by one.\n\n' +
        'We knew. That\'s the thing I keep coming back to. Not everyone. But enough people knew that what was [unclear] was going to end in [unclear]. There were [unclear]. There were people who [unclear] very clearly what the trajectory was. There were moments when it could have [unclear] differently.\n\n' +
        'It didn\'t go differently.\n\n' +
        'I keep asking myself why. I keep not finding an answer that [unclear] me.\n\n' +
        'Maybe there isn\'t one. Maybe that\'s the [unclear] thing.',
    },
    {
      id: 'zone2_floor5',
      floor: 5,
      title: 'Twisted Garden — Note V',
      context: 'Found carved into a wooden laboratory bench — the researcher had apparently run out of paper.',
      body:
        'Year [unclear] approximate. Hard to keep track now.\n\n' +
        'There are [unclear] of us left. We don\'t talk about the ones who are [unclear] anymore. Not because we\'ve forgotten. Because talking about them makes the facility feel [unclear] in a way that makes it harder to [unclear] working and working is what keeps us [unclear].\n\n' +
        '[unclear] colleague suggested yesterday that we should start rationing the [unclear] more strictly. I agreed. [unclear] colleague suggested we should [unclear] some of the specimens to supplement our [unclear]. I agreed to that too.\n\n' +
        'We are becoming practical in ways I would not have [unclear] a year ago.\n\n' +
        'I think this is what survival [unclear]. Not nobility. Not [unclear]. Just the slow [unclear] of things you thought were essential until all that\'s left is the [unclear] things.\n\n' +
        'I miss [unclear] food. Specific things. Not hunger in general — that I\'ve gotten [unclear] to. Specific [unclear]. My mother\'s [unclear]. The [unclear] place near the university that was open late. [unclear] in summer.\n\n' +
        'I write these down so I don\'t [unclear] them. So they [unclear] somewhere.',
    },
    {
      id: 'zone2_floor6',
      floor: 6,
      title: 'Twisted Garden — Note VI',
      context: 'Found in a specimen jar. Different handwriting from the earlier notes — rougher, less formally trained.',
      body:
        'I am not a scientist. I was the [unclear] for this facility before [unclear]. The last researcher asked me to keep [unclear] notes after she [unclear].\n\n' +
        'I don\'t know the right words. I\'ll write what I [unclear].\n\n' +
        'The facility is quieter now. I do [unclear] in the morning and check the specimens the way she [unclear] me and write down what I [unclear] in the books she left [unclear]. I don\'t always know what I\'m looking at. I write down what it [unclear] and hope that\'s [unclear].\n\n' +
        'I\'ve been reading her notes. All of them, from the [unclear]. She was trying to understand what the [unclear] did to the plants. She had [unclear]. She was getting [unclear].\n\n' +
        'I don\'t have her [unclear] but I have her notes and I have time and I am going to keep [unclear] until I understand what she was [unclear].\n\n' +
        'She would have wanted that I think.\n\n' +
        'She wanted things to be [unclear] even when they were [unclear].',
    },
    {
      id: 'zone2_floor7',
      floor: 7,
      title: 'Twisted Garden — Note VII',
      context: 'Found scratched into the metal surface of a specimen cabinet using a laboratory instrument.',
      body:
        'Reading through the old notes. The ones from before I came here. Before any of us came here.\n\n' +
        'The war started, in these notes, as a footnote. An entry in [unclear] log that says: external communication disrupted due to [unclear] situation. Will update when [unclear].\n\n' +
        'Then a week later: facility going to [unclear] protocol. All non-essential [unclear] suspended.\n\n' +
        'Then: external situation [unclear]. Recommend extended [unclear] period.\n\n' +
        'Then nothing for [unclear] months. Then the first [unclear] arrived and wrote that first entry and the notes became something [unclear].\n\n' +
        'I think about those early entries. That word: situation. As if it were a [unclear] problem. A logistical [unclear]. As if whoever wrote it couldn\'t find the words for what was [unclear] or didn\'t want to write them [unclear] down in an official [unclear].\n\n' +
        'Maybe they thought it would [unclear]. Maybe they couldn\'t [unclear] it wouldn\'t.\n\n' +
        'I understand that. I\'ve written [unclear] in these notes when I meant [unclear]. When the real word was too [unclear] to put down.\n\n' +
        'The real word for what happened to the world is not [unclear] I\'ve found yet.',
    },
    {
      id: 'zone2_floor8',
      floor: 8,
      title: 'Twisted Garden — Note VIII',
      context: 'Found in a field notebook. The handwriting is the same as Note VI — the non-scientist caretaker.',
      body:
        'Something I want to write down because I\'ve been thinking about it.\n\n' +
        'Before the [unclear], before all of this, I was [unclear]. Not important work. Maintenance. [unclear] things that broke, [unclear] things that needed [unclear]. Nobody thought much about what I did. I didn\'t think much about it [unclear].\n\n' +
        'Now I am the only one keeping this [unclear] running. The plants alive. The records [unclear]. Everything she worked for [unclear].\n\n' +
        'I don\'t say this to feel [unclear] about myself. I say it because I think about all the [unclear] people. The ones who kept things [unclear] without anyone [unclear] them. Everywhere. In every [unclear] and facility and [unclear]. The ones who made sure the [unclear] worked and the [unclear] ran and the [unclear] was collected.\n\n' +
        'When the war came those people [unclear] first because they were [unclear] and unprotected and nobody had thought to make them [unclear].\n\n' +
        'The world ran on them and [unclear] them when they were needed most.\n\n' +
        'I think about that a lot down here [unclear] alone.',
    },
    {
      id: 'zone2_floor9',
      floor: 9,
      title: 'Twisted Garden — Note IX',
      context: 'Found folded into a tiny square tucked into a crack in the wall. Written on the back of a page torn from a field notebook.',
      body:
        'I\'ve been here alone for [unclear] now. Long enough that the days have stopped feeling like separate [unclear].\n\n' +
        'I keep the notes. I keep the specimens. I do what she showed me.\n\n' +
        'I\'ve started talking out loud while I work. To [unclear]. Not because I\'ve lost my [unclear] — I don\'t think I have. But because silence in a place like this becomes its own kind of [unclear] after a while. And talking keeps you [unclear] to the things you\'re [unclear] about.\n\n' +
        'I talk about the specimens. I talk about her notes and what I think they [unclear]. I talk about the war sometimes, what I knew of it, what I\'ve pieced together from what the others [unclear] before they [unclear].\n\n' +
        'I talk about before. The town I came from. The [unclear] near the river. My sister\'s [unclear].\n\n' +
        'I don\'t know if talking to [unclear] is something people do when they\'re [unclear] or something they do when they\'re [unclear].\n\n' +
        'Maybe it\'s [unclear].',
    },
    {
      id: 'zone2_floor10',
      floor: 10,
      title: 'Twisted Garden — Note X',
      context: 'Found carved into the wall of the Stronghold chamber. Surrounded by root structures that appear to have grown around it deliberately, framing it.',
      body:
        'Last entry.\n\n' +
        'I\'ve been here [unclear] years. Alone for most of them. The facility is [unclear] now in ways I can\'t fully [unclear] — the plants have [unclear] into sections I stopped going to, the eastern wing is [unclear], the roots have [unclear] through the walls in patterns I used to find [unclear] and now find almost [unclear].\n\n' +
        'The war seems very far away from here. Not in time — I know how long it\'s been. In [unclear]. Like something that happened to a different [unclear] in a different [unclear] that I used to [unclear] before I came down here.\n\n' +
        'What I think about instead:\n\n' +
        'She spent her last [unclear] trying to understand what the [unclear] did to living things. Why some [unclear] and others [unclear] and others changed into something [unclear].\n\n' +
        'I think she was asking the wrong [unclear].\n\n' +
        'I don\'t think the question is what the [unclear] did.\n\n' +
        'I think the question is what was already [unclear] to happen and the [unclear] just made it happen [unclear].\n\n' +
        'I don\'t know what that [unclear]. I\'m not a [unclear]. I\'m just someone who kept the lights [unclear] long enough to think about it.\n\n' +
        'The plants are very [unclear] today.\n\n' +
        'I think that\'s [unclear].',
    },
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // REGION 3 — THE SUNKEN DOCKS (doc notes 21–30)
  // ───────────────────────────────────────────────────────────────────────────
  zone3: [
    {
      id: 'zone3_floor1',
      floor: 1,
      title: 'Sunken Docks — Note I',
      context: 'Found in an official harbor master\'s logbook, still on the harbor master\'s desk.',
      body:
        'HARBOR LOG\n' +
        'Entry [unclear]\n\n' +
        'Vessel [unclear]. Passengers [unclear]. Destination: northern coastal settlements per [unclear] reports. Departed [unclear].\n\n' +
        'Vessel [unclear]. Passengers [unclear]. Destination: southern [unclear]. Departed [unclear].\n\n' +
        'Vessel [unclear]. Returned to port. Previous destination: eastern [unclear]. Passengers departed: [unclear]. Passengers returned: [unclear]. Vessel decommissioned, fuel [unclear].\n\n' +
        '[margin note] The ones who come back don\'t talk about what they saw. You can tell from their faces. I\'ve stopped asking. I record what they tell me which is [unclear] and I don\'t record what their [unclear] say.',
    },
    {
      id: 'zone3_floor2',
      floor: 2,
      title: 'Sunken Docks — Note II',
      context: 'Found in a passenger\'s journal tucked inside a jacket left hanging on a dock piling.',
      body:
        'Day [unclear] at sea.\n\n' +
        'They told us the southern islands were [unclear]. Green, untouched, someone who knew someone who\'d been there said the soil was dark and the air was [unclear] and you could breathe without [unclear].\n\n' +
        'I got on the boat because staying felt like dying and moving felt like living even if the destination was [unclear]. I think most of us got on for the same [unclear].\n\n' +
        'The other passengers don\'t talk much. There is a woman in the bunk below mine who cries at night very quietly, trying not to be [unclear]. There is an old man who plays cards alone for hours. There are [unclear] children who run on the deck when the crew lets them and forget, for a few minutes at a time, to be [unclear].\n\n' +
        'I watch them and I think: this is what people [unclear] like. Even now. Even [unclear]. The cards. The running. The crying quietly so as not to [unclear] anyone.\n\n' +
        'We are very [unclear], I think. And also very [unclear].',
    },
    {
      id: 'zone3_floor3',
      floor: 3,
      title: 'Sunken Docks — Note III',
      context: 'Found in the same passenger\'s journal, a later entry.',
      body:
        'We found the islands.\n\n' +
        'From the boat they looked almost [unclear]. Green. I heard someone at the railing make a sound I hadn\'t heard from anyone in [unclear] months.\n\n' +
        'We went ashore.\n\n' +
        'We left the same day.\n\n' +
        'I\'m not going to write what we saw. I decided that on the boat back. Some things you keep inside because writing them down makes them [unclear] in a way that you then have to [unclear] with every time you [unclear] the page. Some things you carry in your body and that is already [unclear] without making them [unclear].\n\n' +
        'What I will write: there is nowhere that is [unclear] from what happened.\n\n' +
        'I think we knew that. I think we got on the boats anyway because knowing something and [unclear] it are different things and sometimes you need to [unclear] it before you can [unclear] it.',
    },
    {
      id: 'zone3_floor4',
      floor: 4,
      title: 'Sunken Docks — Note IV',
      context: 'Found in a captain\'s log, sealed in a waterproof case.',
      body:
        'Captain\'s Log — Third expedition, destination: [unclear] coast.\n\n' +
        'Day 1: Departed with [unclear] passengers. Better morale than last time which is not saying [unclear].\n\n' +
        'Day 18: Reached destination. The settlement exists. Population [unclear]. They have food which we needed and information which we [unclear]. The information: they\'ve sent their own [unclear] east and north and south. Same report from all directions. The [unclear] doesn\'t respect [unclear].\n\n' +
        'There is nowhere to [unclear] to. This is what nobody wants to say out loud. I\'ve known it since the second voyage. The passengers don\'t know it yet. The crew knows it. We don\'t [unclear] about it.\n\n' +
        'Day 31: Returning with [unclear] passengers from the settlement who wanted to [unclear]. Left [unclear] of our own who wanted to [unclear].\n\n' +
        'I don\'t judge either [unclear]. Somewhere unfamiliar that might be [unclear] versus somewhere familiar that is definitely [unclear]. I\'ve stopped knowing which one I\'d [unclear].',
    },
    {
      id: 'zone3_floor5',
      floor: 5,
      title: 'Sunken Docks — Note V',
      context: 'Found in a waterproof case marked with scientific insignia. A marine biologist\'s field notes.',
      body:
        'FIELD NOTES — Coastal Marine Research — Relocated to dock facilities.\n\n' +
        'The war reached the research station on [unclear]. I was the only one there — the rest of the team had [unclear] when the [unclear] started. I packed what I could carry and came to the docks because the docks were the last place with [unclear].\n\n' +
        'I\'ve been here [unclear] months now. I\'ve been continuing my [unclear] because it is what I know how to do and because, honestly, what I am seeing in the water is more [unclear] than anything I observed before the [unclear].\n\n' +
        'The changes in marine life are [unclear] rapid. I have no framework for the [unclear] of what I\'m observing. The [unclear] radiation models we used before the war predicted [unclear] effects. They did not predict [unclear].\n\n' +
        'I keep writing it down. There is no one to send the reports to. I write them anyway.\n\n' +
        'Someone should know what the [unclear] is doing to the [unclear].\n\n' +
        'Someone should have the [unclear] even if they can\'t use it [unclear].',
    },
    {
      id: 'zone3_floor6',
      floor: 6,
      title: 'Sunken Docks — Note VI',
      context: 'Found in the harbor master\'s log, years after the first entries. The handwriting has changed — slower, more deliberate.',
      body:
        'HARBOR LOG — Year [unclear]\n\n' +
        'Fleet status: [unclear] vessels operational. [unclear] decommissioned. [unclear] unaccounted for.\n\n' +
        'Fuel reserves: none.\n\n' +
        'No departures this [unclear]. No arrivals.\n\n' +
        '[personal note] I have been keeping this log for [unclear] years. I don\'t know for whom. The last vessel that left did not [unclear] and I\'ve marked it unaccounted for because I don\'t want to write the other [unclear].\n\n' +
        'I keep the log because keeping the log is what I do. Because if I stop keeping the log then I have to think about what I do [unclear]. Because the routine of it — the daily entry, the fleet status, the [unclear] conditions — is the only thing that still feels like [unclear] something normal.\n\n' +
        'I know it isn\'t [unclear].\n\n' +
        'I keep it anyway.',
    },
    {
      id: 'zone3_floor7',
      floor: 7,
      title: 'Sunken Docks — Note VII',
      context: 'Found in a passenger\'s diary — different from the earlier one. This person never got on a boat.',
      body:
        'I never left.\n\n' +
        'Three times I booked passage. Three times I stood at the [unclear] and watched the vessel and didn\'t get [unclear]. I don\'t know why exactly. Something about the faces of the people coming back. Something about the harbor master\'s log which I was not supposed to read but which he left open and eventually I [unclear].\n\n' +
        'So I stayed.\n\n' +
        'My family left on the second [unclear]. My mother, my brother, his [unclear]. They made it as far as the [unclear] coast before [unclear]. I received one letter. Then nothing.\n\n' +
        'I have their photograph. I keep it in the [unclear] that I found in the [unclear] storeroom and have been sleeping in since the [unclear].\n\n' +
        'I look at it every morning. My mother\'s [unclear]. My brother\'s [unclear]. His [unclear]\'s expression that always looked like she was about to say something [unclear].\n\n' +
        'I don\'t know why I\'m writing this down. There\'s no one to read it. The harbor master is the only other person [unclear] here now and he has his own [unclear] to keep.\n\n' +
        'I think I\'m writing it so they [unclear]. So someone somewhere [unclear] they were [unclear].\n\n' +
        'They were [unclear]. I want that written down [unclear].',
    },
    {
      id: 'zone3_floor8',
      floor: 8,
      title: 'Sunken Docks — Note VIII',
      context: 'Found in the marine biologist\'s notes — her last formal entry before the writing becomes personal.',
      body:
        'I went outside today for the first time in [unclear] months.\n\n' +
        'I\'ve been working from samples brought to me by [unclear]. Today I needed to collect directly and there was no one left to [unclear] for me so I went myself.\n\n' +
        'The radiation [unclear] are higher than my models predicted for this stage of [unclear]. I\'m not going to write the [unclear] because they don\'t [unclear] anything useful at this point and I\'m tired of numbers that [unclear] things I can\'t [unclear].\n\n' +
        'What I want to write about is the [unclear].\n\n' +
        'I have spent [unclear] years studying marine [unclear]. I know how the ocean [unclear]. I know what it looks like when it is [unclear] and what it looks like when it is [unclear] and what it looks like when something is [unclear].\n\n' +
        'The ocean outside the docks does not look like any of those things.\n\n' +
        'I don\'t have the [unclear] for what it looks like. I\'ve been trying to find the [unclear] since I came back inside and I can\'t.\n\n' +
        'It looks like it\'s [unclear].\n\n' +
        'That\'s the only word I have.\n\n' +
        'I\'m going to keep collecting [unclear] and I\'m going to keep writing it down and I\'m going to keep trying to find better [unclear].\n\n' +
        'But right now, today, what it looks like is [unclear].',
    },
    {
      id: 'zone3_floor9',
      floor: 9,
      title: 'Sunken Docks — Note IX',
      context: 'Found in a sealed container marked: FOR WHOEVER FINDS THIS. Several documents inside. This one was on top.',
      body:
        'My name is [unclear]. I came to the docks to save things. Books, records, [unclear]. I loaded everything onto the last vessel and the vessel [unclear] before it cleared the harbor and I stayed because there was nowhere else to go and because the things still needed [unclear] even if no one was coming for them.\n\n' +
        'I\'ve been here [unclear] years.\n\n' +
        'I spend my days reading. Everything we saved. The history, the science, the [unclear], the [unclear]. Everything we were and everything we knew. I read it all and I think about it all and I write down what I [unclear] in notebooks that are running [unclear].\n\n' +
        'I think about the war a lot. How it [unclear]. The specific [unclear] that led to the specific [unclear] that led to everything [unclear]. I\'ve read enough history now to see the [unclear] clearly. Each decision that seemed [unclear] at the time. Each moment where something different might have [unclear].\n\n' +
        'There were so many moments.\n\n' +
        'That\'s the thing that [unclear] me most. Not that it happened. That it didn\'t have to. That there were so many [unclear] where it could have gone [unclear] and it didn\'t and here we are in the [unclear] at the end of everything reading books to [unclear].\n\n' +
        'I keep reading anyway.\n\n' +
        'Someone should know what we [unclear].\n\n' +
        'Someone should carry it [unclear].',
    },
    {
      id: 'zone3_floor10',
      floor: 10,
      title: 'Sunken Docks — Note X',
      context: 'Found carved into the wall of the sealed chamber at the deepest point of the Sunken Docks. The carving is surrounded by markings in a script that matches no known writing system — older than the carving, as if the wall was waiting.',
      body:
        'This is the last note.\n\n' +
        'I\'ve said what I came here to say. Read everything. Written down what I [unclear]. Left the containers sealed and [unclear] on the shelves in the order that makes most [unclear].\n\n' +
        'I want to write one final [unclear].\n\n' +
        'The grey cat has been coming to the [unclear] for months now. Every day. She sits while I read and leaves when I [unclear]. I don\'t know why she comes. I don\'t know what she [unclear], if anything.\n\n' +
        'Today I read to her for [unclear] hours. Everything I had left. All of it. The history, the science, the accounts of the war, the [unclear], all of it. I read until my voice [unclear].\n\n' +
        'She stayed for all of it.\n\n' +
        'Her eyes are very [unclear].\n\n' +
        'I don\'t know what she understands. I don\'t know if she understands [unclear].\n\n' +
        'But I think — and I know how this [unclear], I know what it sounds like, I\'ve been alone too long and the world has been [unclear] and I know all the reasons not to [unclear] this — I think she was [unclear].\n\n' +
        'I think something was [unclear] in her while I read. Something [unclear] and new.\n\n' +
        'I named her [unclear].\n\n' +
        'I hope she [unclear].\n\n' +
        'I hope whatever comes after us [unclear] better than we did.\n\n' +
        'I really [unclear].\n\n' +
        'The markings on this wall — the ones that were here before I came — I\'ve spent [unclear] years looking at them. I can\'t read them. They\'re not our [unclear].\n\n' +
        'But they were [unclear] here. Waiting.\n\n' +
        'As if whoever made them knew something was [unclear].\n\n' +
        'As if they left this [unclear] on purpose.\n\n' +
        'For [unclear].\n\n' +
        'Take care of [unclear].\n\n' +
        'Take care of all of [unclear].',
    },
  ],
};

/**
 * Returns the note definition awarded for clearing a given floor of a zone.
 * @param {string} zoneId – 'zone1' | 'zone2' | 'zone3'
 * @param {number} floor  – 1-indexed floor number
 */
export function getNote(zoneId, floor) {
  const list = NOTES[zoneId];
  if (!list) return null;
  return list.find((n) => n.floor === floor) || null;
}

export { ROMAN as NOTE_NUMERALS };
