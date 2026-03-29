function scoreSector(required, initiative) {
  if (!required) return 50;
  return required === initiative ? 100 : 0;
}

function computeOverallScore(s) {
  return Math.round(s.sector*0.30 + s.geography*0.25 + s.budget*0.20 + s.kpi*0.15 + s.trackRecord*0.10);
}

const perfect = { sector:100, geography:100, budget:100, kpi:100, trackRecord:100 };
console.log('Perfect match score:', computeOverallScore(perfect), '— Expected: 100', computeOverallScore(perfect) === 100 ? '✅' : '❌');

const wrongSector = { sector:0, geography:100, budget:100, kpi:100, trackRecord:100 };
console.log('Wrong sector score:', computeOverallScore(wrongSector), '— Expected: < 75', computeOverallScore(wrongSector) < 75 ? '✅' : '❌');

console.log('Sector match:', scoreSector('EDUCATION','EDUCATION'), '— Expected: 100', scoreSector('EDUCATION','EDUCATION') === 100 ? '✅' : '❌');
console.log('Sector mismatch:', scoreSector('EDUCATION','HEALTHCARE'), '— Expected: 0', scoreSector('EDUCATION','HEALTHCARE') === 0 ? '✅' : '❌');
console.log('Unknown sector:', scoreSector(null,'EDUCATION'), '— Expected: 50', scoreSector(null,'EDUCATION') === 50 ? '✅' : '❌');