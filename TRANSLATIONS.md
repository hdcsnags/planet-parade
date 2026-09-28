# Planet Parade translations: notes for the grandparents

Every French and Farsi sentence in the game lives in one table, between `/*I18N-START*/` and
`/*I18N-END*/` in `planet-parade.html`. Two AI reviewers (GPT-5.6 Sol and Gemini 3.8 Flash) read
all of it on 2026-09-26. They were asked for toddler-friendly Canadian-neutral French and
conversational Iranian Farsi. Their full reports are in `MaestroOrchestra/project/Maestro/docs/audits/planet-parade/`.

**Please check the Farsi and French yourselves.** A grandparent's ear beats any model. To change a
line, edit the `fa:` or `fr:` text in that table.

## Applied: both reviewers agreed a change was needed
| Key | Before | Now | Why |
|---|---|---|---|
| yesThats (fa) | آفرین! این {p} هست! | آفرین! اینم {p}! | «هست» sounded formal. Gemini's form was chosen because a colloquial «ـه» suffix breaks on names ending in a vowel (زهره, مشتری) |
| notThat (fa) | این {p} هست. {q} کجاست؟ | اینم {p}. {q} کجاست؟ | same |
| thatsP (fa) | این {p} هست. | اینم {p}. | same |
| thatsWord (fa) | این {w} هست. | اینم {w}. | same |
| didIt (fa) | آفرین! همه‌ی سیاره‌ها به ترتیب شدن! | آفرین! همه‌ی سیاره‌ها رو به ترتیب چیدی! | the old line was unidiomatic. Sol's version was chosen because it praises her for doing it |

## Not applied: only one reviewer suggested these (your call)
| Key | Current | Suggestion | From |
|---|---|---|---|
| yesThats / notThat / thatsP / thatsWord (fa) | اینم {p} | این {p}ـه (spoken copula). Grammatical only for names ending in a consonant: «مریخه» is fine, but zohre needs «زهره‌ست» | Sol |
| notThat (fa) | اینم {p}. {q} کجاست؟ | این {p} بود. {q} کجاست؟ | Gemini |
| didIt (fa) | …رو به ترتیب چیدی! | آفرین! همه‌ی سیاره‌ها مرتب شدن! | Gemini |
| m_rocket_s (fa) | برو پیش هر هشت تا | از کنار هر هشت تا سیاره رد شو | Sol |
| takeOne / takeMany (fr) | Combien en reste-t-il ? | Il en reste combien ? (more natural when speaking to a toddler) | Gemini |
| sub (fr) | …pour petits astronautes… | …pour les petits astronautes… | Sol |
| m_rocket_s (fr) | Visite les huit planètes | Passe près des huit planètes | Sol |

## Built-in limits
- «Touche chacune» (fr) only works because all three counted objects (étoile, fusée, lune) are feminine. Adding a masculine object means adding a masculine form too.
- Speech uses the tablet's own voices. If no Farsi or French voice is installed, the game shows captions only, and the grown-ups panel says so.

## Round 3 lines (2026-09-26): **unreviewed**, please check
Nobody has reviewed these yet. They are in the same table (`ui.whichMore`, `ui.moreYes`, `ui.song`, and all of `acts`).

| Key | English | Français | فارسی |
|---|---|---|---|
| ui.whichMore | Which side has more {pl}? | De quel côté il y a plus de {pl} ? | کدوم طرف {pl} بیشتره؟ |
| ui.moreYes | Yes! This side has more! | Oui ! Ce côté-ci en a plus ! | آفرین! این طرف بیشتره! |
| ui.song | The planet song! | La chanson des planètes ! | آهنگ سیاره‌ها! |
| acts.rocket | Rocket flies! | La fusée vole ! | موشک پرواز می‌کنه! |
| acts.star | Star twinkles! | L’étoile brille ! | ستاره چشمک می‌زنه! |
| acts.moon | Moon bounces! | La lune saute ! | ماه می‌پره! |
| acts.sun | Sun shines! | Le soleil brille ! | خورشید می‌تابه! |
| acts.planet | Planet spins! | La planète tourne ! | سیاره می‌چرخه! |
| acts.astronaut | Astronaut waves! | L’astronaute fait coucou ! | فضانورد دست تکون می‌ده! |
| acts.comet | Comet zooms! | La comète file ! | ستاره‌ی دنباله‌دار تند می‌ره! |
| acts.telescope | Telescope looks! | Le télescope regarde ! | تلسکوپ نگاه می‌کنه! |
| acts.satellite | Satellite spins! | Le satellite tourne ! | ماهواره می‌چرخه! |
| acts.ring | Ring spins! | L’anneau tourne ! | حلقه می‌چرخه! |
| menu title | Planet Parade | (kept as the English name) | رژه‌ی سیاره‌ها |

## Round 4 lines (2026-09-28): **unreviewed**, please check
| Key | English | Français | فارسی |
|---|---|---|---|
| positions | on the left / in the middle / on the right | à gauche / au milieu / à droite | سمت چپ / وسط / سمت راست |
| posShort (arrow label) | LEFT / MIDDLE / RIGHT | GAUCHE / MILIEU / DROITE | چپ / وسط / راست |
| whereLMR | Where is {p}? On the left, in the middle, or on the right? | Où est {p} ? À gauche, au milieu ou à droite ? | {p} کجاست؟ سمت چپ، وسط، یا سمت راست؟ |
| whichAt | Which planet is {pos}? | Quelle planète est {pos} ? | کدوم سیاره {pos}ه؟ |
| isAt / yesAt | {p} is {pos}! | {p} est {pos} ! | {p} {pos}ه! |
| thatsAt | That's {p}, {pos}. | Ça, c’est {p}, {pos}. | اینم {p}، {pos}. |
| whichOneAt | Which one is {pos}? | Laquelle est {pos} ? (all three objects are feminine) | کدومش {pos}ه؟ |
| yesTheAt / thatsTheAt | Yes! The {w} is {pos}! / That's the {w}, {pos}. | Oui ! {W} est {pos} ! / Ça, c’est {w}, {pos}. | آفرین! {w} {pos}ه! / اینم {w}، {pos}. |
| eatOne / eatMany | …The space whale eats one / {b}! How many are left? | …La baleine de l’espace en mange une / {b} ! Combien en reste-t-il ? | …نهنگ فضایی یکی رو / {b} تا رو خورد! چند تا موند؟ |
| rollOne / rollMany | …One rolls / {b} roll away! | …Une roule et s’en va / {b} roulent et s’en vont ! | …یکی قل خورد و رفت / {b} تا قل خوردن و رفتن! |
| makeN / makeHint | Make {a}! / Tap the plus to add one. Tap one to send it away. | Fais {a} ! / Touche le plus pour en ajouter une. Touches-en une pour l’envoyer au loin. | {a} درست کن! / به بعلاوه بزن تا یکی اضافه شه. به یکی بزن تا بره. |
| goodnight | The planets are going to sleep. Goodnight, astronaut! | Les planètes vont dormir. Bonne nuit, astronaute ! | سیاره‌ها می‌خوان بخوابن. شب بخیر، فضانورد کوچولو! |

Note for Farsi reviewers: «{pos}ه» joins the spoken copula to the position word (سمت چپه، وسطه، سمت راسته).
Left and right always mean the child's real left and right on the screen. They are not mirrored in Farsi.
