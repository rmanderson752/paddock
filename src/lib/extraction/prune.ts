// Trim the sentences of a Bring a Trailer write-up that never carry an
// extracted fact — the gauge-cluster tour, factory power ratings, "see the
// gallery" pointers, tire brands and the empty "Decoding the option sticker"
// stub. Each rule keeps any sentence that also mentions something we do
// extract (an odometer reading, a rebuild, an aftermarket part, damage), so
// the pruning is conservative: a false keep costs a few tokens, a false drop
// could cost a flag. Applied when building the model input; stored text is
// untouched.

const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z“"(])/;

// Anything that can feed a field or a flag — a sentence mentioning one of
// these is always kept (word starts only, so "replac" covers replaced /
// replacing / replacement)
const KEEP = /\b(odometer|miles?|mileage|kilomet|tmu|rebuil|replac|overhaul|swap|modif|aftermarket|upgrade|convert|leak|crack|worn|wear|damage|accident|collision|rust|corrosion|bubbl|repaint|refinish|resprayed|invoice|receipt|records?|service|recommend|needs?|inoperative|does not|doesn't|not work|fault|warning|repair|title|owner|purchased|acquired|dry[- ]rot|lift|lowered|coilover|spacer|track|race|racing|hpde|autocross|momo|nardi|sparco|recaro|aem|defi|apexi|a'pexi|autometer|greddy|hks|blitz|works bell)/i;

const DROP: RegExp[] = [
  // "The leather-wrapped steering wheel frames a 180-mph speedometer and a tachometer with a 6,800-rpm redline as well as gauges for…"
  /\b(speedometer|tachometer|redline|gauges?\s+(for|to monitor|displaying)|instrumentation|instrument\s+(array|cluster|panel))\b/i,
  // "The 3.6-liter flat-six was factory rated at 282 horsepower and 250 lb-ft of torque."
  /\b(factory[- ]rated|rated at \d[\d,]*\s*(horsepower|hp)|\d[\d,]*\s*lb-ft of torque)\b/i,
  // "Additional photos of the underside are provided in the gallery below."
  /\b(photos?|photographs?|images?|readings?|results?|measurements?)\b[^.]*\bgallery\b|\bgallery\b[^.]*\b(photos?|photographs?|images?|readings?|imperfections?)\b/i,
  // "The 17″ wheels are mounted with Michelin Pilot Sport tires."
  /\b(mounted with|wrapped in|wear|fitted with|shod with)\b[^.]*\btires?\b/i,
  // A stub whose table wasn't captured
  /^(Decoding|Deciphering)\s+the\b.*:\s*$/i,
];

export interface PruneResult {
  text: string;
  removed: string[];
}

export function pruneBoilerplate(description: string): PruneResult {
  const removed: string[] = [];
  const paragraphs = description
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const kept = paragraph
        .split(SENTENCE_SPLIT)
        .filter((sentence) => {
          const drop = DROP.some((re) => re.test(sentence)) && !KEEP.test(sentence);
          if (drop) removed.push(sentence.trim());
          return !drop;
        });
      return kept.join(" ").trim();
    })
    .filter(Boolean);
  return { text: paragraphs.join("\n\n"), removed };
}
