export const CLASSES = {
 Knight:{hp:180,mp:100,stamina:100,dash:470,color:"#ad5949",skill:"Crescent",title:"Balanced melee fighter",description:"Broad cleaves. Crescent briefly parries a faced strike during anticipation."},
 Spellweaver:{hp:140,mp:150,stamina:90,dash:430,color:"#70b5dc",skill:"Starfall",title:"Ranged spellcaster",description:"Ranged arc bolts. Starfall slows struck enemies with frost."},
 Ironbound:{hp:300,mp:70,stamina:120,dash:350,color:"#d1ac66",skill:"Bulwark",title:"Frontline defender",description:"Heavy strikes and deliberate recovery. Bulwark briefly wards incoming damage and restores a little health."},
 Rogue:{hp:150,mp:90,stamina:110,dash:580,color:"#b395de",skill:"Ambush",title:"Agile scout",description:"Compact strikes and the fastest dash. Ambush interrupts windups and rewards attacking from behind."},
 Warden:{hp:170,mp:130,stamina:100,dash:450,color:"#8cbd94",skill:"Renew",title:"Support spellcaster",description:"Arc bolts and support. Renew heals and cleanses webbing from nearby allies you face."}
} as const;
export type ClassName=keyof typeof CLASSES;
export const ATTRIBUTES=["strength","stamina","mp","awareness","agility","intelligence"] as const;
export type Attribute=typeof ATTRIBUTES[number];
export type Growth={gold:number;abilityPoints:number;strength:number;agility:number;intelligence:number;training:Record<Attribute,number>;weapon:string;hair:string;accessory:string;equippedSkill:string;inventory:string[]};
export const ITEMS=[
 {id:"sword",name:"Guild arming sword",type:"weapon",price:20000,description:"Reliable steel · stronger melee attacks"},
 {id:"focus",name:"Willow spell focus",type:"weapon",price:20000,description:"Carved moonwood · stronger arc bolts"},
 {id:"braid",name:"Pilgrim braid",type:"hair",price:3500,description:"Chestnut braid tied with linen"},
 {id:"silver-hair",name:"Moonlit hair",type:"hair",price:6500,description:"Silver locks from the fantasy atelier"},
 {id:"circlet",name:"Copper leaf circlet",type:"accessory",price:4500,description:"Handworked leaves · cosmetic"},
 {id:"earring",name:"Wanderer's earring",type:"accessory",price:1800,description:"A small bronze hoop · cosmetic"},
 {id:"potion",name:"Ember tonic",type:"consumable",price:800,description:"Restore 70 health · consumed immediately"}
] as const;
// Money is stored in bronze: 100 bronze = 1 silver; 100 silver = 1 gold.
export function money(bronze:number){const n=Math.max(0,Math.floor(bronze));return `${Math.floor(n/10000)}g ${Math.floor(n/100)%100}s ${n%100}b`;}
export function newGrowth(cls:ClassName):Growth{return {gold:100000,abilityPoints:0,strength:0,agility:0,intelligence:0,training:{strength:0,stamina:0,mp:0,awareness:0,agility:0,intelligence:0},weapon:"",hair:"natural",accessory:"",equippedSkill:CLASSES[cls].skill,inventory:[]};}
export function hasSurvey(hero:{heroClass:string;level:number;equippedSkill:string}){return hero.heroClass==="Rogue"&&hero.level>=5&&hero.equippedSkill==="Survey";}
