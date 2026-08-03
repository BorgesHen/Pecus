import {
  subtrairMeses,
  dataNascimentoPorIdade,
  idadeEmMeses,
  descreverIdade,
  idadeDoAnimal,
} from '@pecus/shared';

let falhas = 0;
function checa(rotulo: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'ERRO'} ${rotulo}: ${JSON.stringify(obtido)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

console.log('--- subtrair meses sem estourar o fim do mês ---');
checa('31/03/2026 - 1 mês', subtrairMeses('2026-03-31', 1), '2026-02-28');
checa('31/03/2024 - 1 mês (ano bissexto)', subtrairMeses('2024-03-31', 1), '2024-02-29');
checa('31/05/2026 - 1 mês', subtrairMeses('2026-05-31', 1), '2026-04-30');
checa('15/01/2026 - 18 meses', subtrairMeses('2026-01-15', 18), '2024-07-15');
checa('01/01/2026 - 12 meses', subtrairMeses('2026-01-01', 12), '2025-01-01');
checa('10/08/2026 - 0 meses', subtrairMeses('2026-08-10', 0), '2026-08-10');
checa('05/02/2026 - 25 meses', subtrairMeses('2026-02-05', 25), '2024-01-05');

console.log('\n--- data de nascimento por idade ---');
checa('18 meses em 03/08/2026', dataNascimentoPorIdade('2026-08-03', 18, 'MESES'), '2025-02-03');
checa('3 anos em 03/08/2026', dataNascimentoPorIdade('2026-08-03', 3, 'ANOS'), '2023-08-03');
checa('negativo tratado como 0', dataNascimentoPorIdade('2026-08-03', -5, 'MESES'), '2026-08-03');

console.log('\n--- idade em meses ---');
checa('nasc 03/02/2025, ref 03/08/2026', idadeEmMeses('2025-02-03', '2026-08-03'), 18);
checa('aniversário do mês ainda não chegou', idadeEmMeses('2025-08-20', '2026-08-03'), 11);
checa('aniversário do mês exato', idadeEmMeses('2025-08-03', '2026-08-03'), 12);
checa('mesmo dia = 0', idadeEmMeses('2026-08-03', '2026-08-03'), 0);
checa('futuro não vira negativo', idadeEmMeses('2027-01-01', '2026-08-03'), 0);
checa('29/02 bissexto -> 28/02', idadeEmMeses('2024-02-29', '2026-02-28'), 23);

console.log('\n--- ida e volta: digitar idade e ler de novo deve dar o mesmo ---');
const REFS = ['2026-08-03', '2026-01-31', '2026-03-31', '2024-02-29', '2026-12-01'];
let idaVoltaOk = 0;
let idaVoltaFalhas: string[] = [];
for (const ref of REFS) {
  for (let meses = 0; meses <= 120; meses++) {
    const nasc = dataNascimentoPorIdade(ref, meses, 'MESES');
    const lido = idadeEmMeses(nasc, ref);
    if (lido === meses) idaVoltaOk++;
    else idaVoltaFalhas.push(`ref ${ref}, ${meses} meses -> nasc ${nasc} -> leu ${lido}`);
  }
}
console.log(`${idaVoltaFalhas.length === 0 ? 'ok  ' : 'ERRO'} ${idaVoltaOk}/${REFS.length * 121} combinações fecharam`);
idaVoltaFalhas.slice(0, 8).forEach((f) => console.log('     ' + f));
if (idaVoltaFalhas.length) falhas++;

console.log('\n--- texto da idade ---');
checa('0', descreverIdade(0), 'menos de 1 mês');
checa('1', descreverIdade(1), '1 mês');
checa('11', descreverIdade(11), '11 meses');
checa('12', descreverIdade(12), '1 ano');
checa('13', descreverIdade(13), '1 ano e 1 mês');
checa('18', descreverIdade(18), '1 ano e 6 meses');
checa('24', descreverIdade(24), '2 anos');
checa('30', descreverIdade(30), '2 anos e 6 meses');

console.log('\n--- idade do animal ---');
checa('sem nascimento', idadeDoAnimal({ dataNascimento: null }, '2026-08-03'), null);
checa('com nascimento', idadeDoAnimal({ dataNascimento: '2025-02-03' }, '2026-08-03'), { meses: 18, texto: '1 ano e 6 meses' });
checa('aceita ISO completo do banco', idadeDoAnimal({ dataNascimento: '2025-02-03T00:00:00.000Z' }, '2026-08-03'), { meses: 18, texto: '1 ano e 6 meses' });

console.log('\n--- a idade envelhece sozinha (o ponto de não guardar número) ---');
const nascimento = dataNascimentoPorIdade('2026-08-03', 18, 'MESES');
for (const [quando, esperado] of [['2026-08-03', '1 ano e 6 meses'], ['2027-02-03', '2 anos'], ['2028-08-03', '3 anos e 6 meses']] as const) {
  checa(`em ${quando}`, idadeDoAnimal({ dataNascimento: nascimento }, quando)?.texto, esperado);
}

console.log(`\n${falhas === 0 ? 'TODOS OS CASOS OK' : `${falhas} GRUPO(S) COM FALHA`}`);
process.exit(falhas === 0 ? 0 : 1);
