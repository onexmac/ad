import { readFileSync, existsSync } from "fs";
const src = readFileSync("data/histok/topics.ts","utf8");
// resolve const NAME = "/kit/histok/images/x.jpg"
const consts = Object.fromEntries([...src.matchAll(/const (\w+) = "(\/kit\/histok\/images\/[^"]+)";/g)].map(m=>[m[1],m[2]]));
// Audita data/histok/topics.ts sin compilarlo: recorta el bloque de materias, le
// quita los tipos y lo evalúa. Corre con `node scripts/histok/audit-content.mjs`
// desde la raíz del proyecto. Revisa, por cada diapositiva:
//   · que el archivo de imagen exista en public/
//   · que tenga `info` (el caption que sale al hacer tap-and-hold)
//   · que ninguna imagen se repita entre secciones
//   · que todo término de glosario se use, y que todo término usado exista
//   · que la diapositiva no recite la definición del término que enlaza
//     (si lo hace, tocar la palabra roja no enseña nada)
const start = src.indexOf("const socialesI:");
const end = src.indexOf("export function getTopic");
// Quita lo que es TypeScript y no JavaScript, y devuelve cada sección UNA vez
// (2 Semestre › Biología reusa secciones de Biología I: no se auditan doble).
let body = src.slice(start,end)
  .replace(new RegExp('^const \\w+ = "/kit/histok/images/[^"]+";\\n',"gm"),"")
  .replace(/export interface \w+ \{[\s\S]*?\n\}\n/g,"")
  .replace(/^export /gm,"")
  .replace(/(const \w+): (Topic|Materia|Semestre)(\[\])? =/g,"$1 =")
  .replace(/\((\w+): string\): Topic/g,"($1)")
  + `; const __seen=new Set(); return semestres.flatMap(s=>s.materias.flatMap(m=>m.topics
      .filter(t=>!__seen.has(t.slug)&&__seen.add(t.slug))
      .map(t=>({...t,slug:s.slug+"/"+m.slug+"/"+t.slug}))));`;
const fn = new Function(...Object.keys(consts), body);
const topics = fn(...Object.values(consts));
let issues=[];
const seen = new Map();
for (const t of topics){
  const used = new Set();
  t.slides.forEach((s,i)=>{
    const where = `${t.slug}[${i}] "${s.title}"`;
    if(!existsSync("public"+s.image)) issues.push(`FALTA ARCHIVO  ${where} → ${s.image}`);
    if(!s.info) issues.push(`SIN CAPTION    ${where}`);
    if(seen.has(s.image)) issues.push(`IMG DUPLICADA  ${where} ↔ ${seen.get(s.image)}`);
    else seen.set(s.image, where);
    (s.body||[]).forEach(p=>{ if(p&&p.term) used.add(p.term); });
  });
  for(const term of Object.keys(t.glossary)) if(!used.has(term)) issues.push(`TÉRMINO NO USADO ${t.slug} → "${term}"`);
  for(const term of used) if(!(term in t.glossary)) issues.push(`SIN DEFINICIÓN ${t.slug} → "${term}"`);
  // redundancia: ¿la diapositiva que usa el término ya contiene su definición?
  t.slides.forEach((s,i)=>{
    const text=(s.body||[]).map(p=>typeof p==="string"?p:(p.term||p.name)).join("");
    (s.body||[]).forEach(p=>{
      if(!p||!p.term) return;
      const def=t.glossary[p.term]; if(!def) return;
      const norm=x=>x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").match(/[a-z]{4,}/g)||[];
      const d=new Set(norm(def)), b=new Set(norm(text));
      const hit=[...d].filter(w=>b.has(w));
      const pct=Math.round(100*hit.length/d.size);
      if(pct>=45) issues.push(`REDUNDANCIA ${pct}% ${t.slug}[${i}] "${p.term}" ← ${hit.join(",")}`);
    });
  });
}
console.log(`${topics.length} secciones, ${topics.reduce((n,t)=>n+t.slides.length,0)} diapositivas`);
console.log(issues.length?issues.join("\n"):"sin problemas");
