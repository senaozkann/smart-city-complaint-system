const fs = require('fs');
let src = fs.readFileSync('server.js', 'utf8');

// Find the sokak-hayvanlari training section and add more examples
const insertBefore = `  { text: "köpeklerin bu yerde yuva yapması çevre için tehdit oluşturmakta", category: "sokak-hayvanlari" },`;

const newExamples = `  // Morfoloji ve farkli ifade bicimi ornekleri
  { text: "köpeklerin yuva kurması tehdit oluşturuyor", category: "sokak-hayvanlari" },
  { text: "köpeklerin burada toplanması tehlikeli", category: "sokak-hayvanlari" },
  { text: "köpeklerin saldırısına uğradık", category: "sokak-hayvanlari" },
  { text: "köpeklerin bölgeye zarar vermesi", category: "sokak-hayvanlari" },
  { text: "köpeklerin çevreye zarar vermesi sorunu", category: "sokak-hayvanlari" },
  { text: "köpeklerin varlığı tehdit unsuru oluşturuyor", category: "sokak-hayvanlari" },
  { text: "hayvanların bu bölgede yuva yapması tehdit", category: "sokak-hayvanlari" },
  { text: "hayvanların bölgemize yerleşmesi sorun", category: "sokak-hayvanlari" },
  { text: "hayvanların yuvası var tehdit unsuru", category: "sokak-hayvanlari" },
  { text: "kedilerin çevreyi kirletmesi sorun oluşturuyor", category: "sokak-hayvanlari" },
  { text: "köpeklerin mahalleye zarar vermesi önlensin", category: "sokak-hayvanlari" },
  { text: "sokak hayvanlarının tehdit oluşturduğu bildiriliyor", category: "sokak-hayvanlari" },
  { text: "köpeklerin bulunduğu bölgede güvenlik sorunu var", category: "sokak-hayvanlari" },
  { text: "hayvanlar çevreye tehdit oluşturuyor toplanmalı", category: "sokak-hayvanlari" },
  ${insertBefore}`;

if (!src.includes(insertBefore)) {
  console.log('INSERT POINT NOT FOUND');
  process.exit(1);
}

src = src.replace(insertBefore, newExamples);
fs.writeFileSync('server.js', src, 'utf8');
console.log('DONE - added morphology-aware training examples');
