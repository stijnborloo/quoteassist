const fs = require('fs');
const CleanCSS = require('clean-css');

/**
 * Minify alleen ECHTE <style>-elementen.
 *
 * Waarom: index.html bevat JavaScript-strings die letterlijk '<style>' en
 * '</style>' bevatten (de builders voor de klant-ondertekenpagina, de zv2-
 * zaalviewer en de pl2-fotoviewer). Een naïeve /<style>...<\/style>/g regex
 * matcht die JS-broncode ook. CleanCSS meldt daar GEEN error op, maar slaat
 * wel @media-wrappers plat en gooit JS-comments + conditionals weg.
 * Netto: .a4{margin:0!important} uit @media print lekt naar het scherm en de
 * quoteCss-conditional verdwijnt -> offertepagina's staan links i.p.v.
 * gecentreerd.
 */
function minifyRealStyles(html) {
  const scripts = [];
  const MARK = '\u0000SCRIPT';

  // 1. Alle <script>-inhoud tijdelijk uit de weg zetten.
  const masked = html.replace(/<script\b[\s\S]*?<\/script>/gi, (m) => {
    scripts.push(m);
    return MARK + (scripts.length - 1) + '\u0000';
  });

  // 2. Nu zijn alleen echte <style>-elementen over.
  let skipped = 0, done = 0;
  const out = masked.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (m, attrs, css) => {
    // Vangnet: de handtekening van JS-string-concatenatie ('...' + '...').
    if (/'\s*\+\s*'/.test(css)) {
      console.warn('  ! <style>-blok bevat JS-achtige tekens, overgeslagen');
      skipped++;
      return m;
    }
    const r = new CleanCSS({ level: 2 }).minify(css);
    if (r.errors.length) {
      console.warn('  ! CSS-fout, origineel behouden:', r.errors[0]);
      skipped++;
      return m;
    }
    done++;
    return '<style' + attrs + '>' + r.styles + '</style>';
  });

  console.log(`CSS: ${done} blok(ken) geminifyed, ${skipped} overgeslagen`);

  // 3. Scripts ongewijzigd terugzetten.
  return out.replace(/\u0000SCRIPT(\d+)\u0000/g, (_, i) => scripts[Number(i)]);
}

/**
 * Post-build assertions. Draai deze ALTIJD voor je deployt.
 * Ze vangen precies de klasse fouten die de CSS-stap veroorzaakte.
 */
function verify(html) {
  const checks = [
    // De signing-page builder moet zijn media queries en conditional houden.
    ['signing-page @media(max-width:500px)', /@media\(max-width:500px\)\{\.ig,\.sig-cols/],
    ['signing-page @media print',            /@media print\{/],
    ['quoteCss-conditional',                 /quoteCss\s*\?/],
    ['.wrap centreert',                      /\.wrap\{max-width:800px;margin:0 auto/],
    // Escaped closing tags in JS-strings mogen niet "gerepareerd" zijn.
    ['geen kale </script> in JS-string',     /<\\\/script>/],
  ];
  let ok = true;
  for (const [name, re] of checks) {
    const hit = re.test(html);
    console.log(`  ${hit ? 'OK  ' : 'FOUT'}  ${name}`);
    if (!hit) ok = false;
  }
  return ok;
}

module.exports = { minifyRealStyles, verify };

// CLI: node build-css.js <in> <out>
if (require.main === module) {
  const [, , inFile, outFile] = process.argv;
  const src = fs.readFileSync(inFile, 'utf-8');
  const out = minifyRealStyles(src);
  console.log('Verificatie:');
  if (!verify(out)) {
    console.error('\nBuild afgebroken: verificatie gefaald.');
    process.exit(1);
  }
  fs.writeFileSync(outFile, out);
  console.log(`\n${(src.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
}
