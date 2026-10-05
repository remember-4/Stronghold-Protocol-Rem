// This fork assumes every operator is owned at E2 Lv60 or above.
// Fold the independent ownership multiplier into operator base stats, after module attributes.
// Tokens/enemies are generated separately; this never grants them an ownership bonus directly.
const fields=['maxHp','atk','def'];
const scaled=stats=>{
 if(!stats)return stats;
 const out={...stats};for(const key of fields)if(Number.isFinite(out[key]))out[key]=Math.round(out[key]*1.1*1e6)/1e6;
 return out;
};
export function applyOwnedBonus(rec){
 if(!rec?.charId||!rec.stats||rec.isDiy||rec.ownedStatBonus===.1)return rec;
 rec.stats=scaled(rec.stats);
 if(rec.statsBase)rec.statsBase=scaled(rec.statsBase);
 // Module attrs stored here are their effective contribution in this mode (official snapshots stay unmodified).
 if(rec.modules)rec.modules=rec.modules.map(m=>({...m,attr:scaled(m.attr)}));
 rec.ownedStatBonus=.1;
 return rec;
}
