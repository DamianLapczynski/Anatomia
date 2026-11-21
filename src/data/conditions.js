// Baza schorzeń (tryb „Schorzenia”, src/conditions.js). Pola wpisu:
// pl, lat, alias[] (synonimy do wyszukiwarki), grp (grupa z COND_GROUPS), def – definicja, mech – patomechanika
// („jak to działa”), ryzyko, objawy[], badanie[], tests[] – klucze testów z Kliniki (func_tests / clinical_tests),
// roznic[] – różnicowanie, fizjo[] – postępowanie fizjoterapeutyczne, flagi – czerwone flagi, rokowanie,
// viz: { anim – animacja z src/poses.js, muscles – mięśnie chore (czerwone), inv – zaangażowane (pomarańczowe),
//        nerves / joints – klucze z bazy, bones – nazwy kości, cns – struktury mózgu i rdzenia ('Nazwa|strona'),
//        pain – punkty ciała z miejscem bólu, focus – kadr (upr, knee, foot, head, hands, spine), caption – opis }.
// Treść dydaktyczna i orientacyjna – nie zastępuje podręcznika ani diagnostyki lekarskiej.
import MS from './conditions_ms.js';
import SP from './conditions_spine.js';

export default { ...MS, ...SP };
export const COND_GROUPS = [['kg', 'Kończyna górna'], ['kd', 'Kończyna dolna'], ['kt', 'Kręgosłup'], ['nerw', 'Nerwy obwodowe'], ['neuro', 'Neurologia'], ['reu', 'Reumatologia i choroby ogólne']];
