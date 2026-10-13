import { ease5 } from './assemblyTimeline';
const TAU=Math.PI*2;
export const positiveModulo=(a:number,b:number)=>(a%b+b)%b;
/** Four strokes in 720 degrees. Zero is the firing TDC of this cylinder.
 * Timing is explanatory; it does not claim a team's injection/firing calibration. */
export function combustionCycle(crankAngle:number,initialAngle:number,tdcAngle:number,cylinder:number) {
  const angle=positiveModulo(crankAngle+initialAngle-tdcAngle+(cylinder%2)*TAU,TAU*2);
  const stroke=Math.floor(angle/Math.PI);
  const local=angle/Math.PI-stroke;
  const spark=Math.exp(-(Math.min(angle,TAU*2-angle)**2)/.010);
  const burn=stroke===0?Math.sin(Math.PI*Math.min(1,local*2.5))**2*(1-local):0;
  const injection=stroke===3?Math.sin(Math.PI*Math.max(0,Math.min(1,(local-.15)/.65)))**2:0;
  return {angle,stroke,local,spark,burn,injection,name:['Рабочий ход','Выпуск','Впуск','Сжатие'][stroke]};
}
export function storyCycleAngle(progress:number) {
  return Math.PI*4*ease5((progress-.248)/.052);
}
