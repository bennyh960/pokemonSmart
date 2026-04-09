export type MathOperation = "+" | "-" | "×" | "÷" | "()";

export type QuestionType = "store_basic_sum" | "battle_flat_damage" | "store_max_item_change" | "battle_multiplier_logic";

export interface NumberRange {
  min: number;
  max: number;
}

// export interface LevelRanges

export interface LevelFeatures {
    steps: "single" | "double" | "multi";
    reminders: boolean;
    percentage?: boolean;
    negativeNumbers?: boolean;
}

// for catch pokemon you need attack him first , show him you stronger than him !
// each pokemon has its own catching rate , some says for catching <pokemon> you will need to reduce his HP and throw  <x> <balls> .
// 1 <ball> cost <y> pokeShekels , and you have <z , z<x> <balls> .
// lvl 1: how many pokeballs you need to buy ?
// lvl 2: how many you will need to buy if you want to catch that <pokemon>?


// You came to pokestore and you need <x> <item1> and <y> <item2> , you have <z> pokeShekels and each <item1> cost <a> pokeShekels and each <item2> cost <b> pokeShekels.
// lvl 1: how many <item1>  you can buy with your money ? (item2 = 0)
// lvl 2: if you want to buy <x> <item1> and <y> <item2> how much money you need ?
// lvl 3: if you want to buy <x> <item1> and <y> <item2> how much money you will have left after the purchase ?
// lvl 3 : for <n> <item1> you buy you get 1 free <item1> , how many <item1> you can get with your money ?

// in battle - damage calculation is based on the formula : damage = (attack / defense) * basePower * effectiveness  , where effectiveness is 2 for super effective , 0.5 for not very effective and 1 for normal effective.
// you choose <pokemon1> which is type <type1/2> to attack <pokemon2> which is type <type1/2> , <pokemon1> has attack stat of <attack> and <pokemon2> has defense stat of <defense> ,
//  the move you choose is <move1> and  has base power of <basePower> . 
// pokemon that use same type move get STAB (same type attack bonus) which multiply the damage by 1.5.
// lvl 1: how much damage you will do if you attack with <move1> ? (ignore STAB and effectiveness)
// lvl 2: how much damage you will do if you attack with <move1> ? (include STAB if applicable, ignore effectiveness)
// lvl 3: how much damage you will do if you attack with <move1> ? (include STAB and effectiveness)