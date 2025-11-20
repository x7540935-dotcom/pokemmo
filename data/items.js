/* 自动生成，来源：items.js */
export const BattleItems = {
  abilityshield: {
    name: "Ability Shield",
    spritenum: 746,
    fling: {
      basePower: 30
    },
    ignoreKlutz: true,
    // Neutralizing Gas protection implemented in Pokemon.ignoringAbility() within sim/pokemon.ts
    // and in Neutralizing Gas itself within data/abilities.ts
    onSetAbility(ability, target, source, effect) {
      if (effect && effect.effectType === "Ability" && effect.name !== "Trace") {
        this.add("-ability", source, effect);
      }
      this.add("-block", target, "item: Ability Shield");
      return null;
    },
    // Mold Breaker protection implemented in Battle.suppressingAbility() within sim/battle.ts
    num: 1881,
    gen: 9
  },
  abomasite: {
    name: "Abomasite",
    spritenum: 575,
    megaStone: "Abomasnow-Mega",
    megaEvolves: "Abomasnow",
    itemUser: ["Abomasnow"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 674,
    gen: 6,
    isNonstandard: "Past"
  },
  absolite: {
    name: "Absolite",
    spritenum: 576,
    megaStone: "Absol-Mega",
    megaEvolves: "Absol",
    itemUser: ["Absol"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 677,
    gen: 6,
    isNonstandard: "Past"
  },
  absorbbulb: {
    name: "Absorb Bulb",
    spritenum: 2,
    fling: {
      basePower: 30
    },
    onDamagingHit(damage, target, source, move) {
      if (move.type === "Water") {
        target.useItem();
      }
    },
    boosts: {
      spa: 1
    },
    num: 545,
    gen: 5
  },
  adamantcrystal: {
    name: "Adamant Crystal",
    spritenum: 741,
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.num === 483 && (move.type === "Steel" || move.type === "Dragon")) {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source?.baseSpecies.num === 483 || pokemon.baseSpecies.num === 483) {
        return false;
      }
      return true;
    },
    forcedForme: "Dialga-Origin",
    itemUser: ["Dialga-Origin"],
    num: 1777,
    gen: 8
  },
  adamantorb: {
    name: "Adamant Orb",
    spritenum: 4,
    fling: {
      basePower: 60
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.num === 483 && (move.type === "Steel" || move.type === "Dragon")) {
        return this.chainModify([4915, 4096]);
      }
    },
    itemUser: ["Dialga"],
    num: 135,
    gen: 4
  },
  adrenalineorb: {
    name: "Adrenaline Orb",
    spritenum: 660,
    fling: {
      basePower: 30
    },
    onAfterBoost(boost, target, source, effect) {
      if (target.boosts["spe"] === 6 || boost.atk === 0) {
        return;
      }
      if (effect.name === "Intimidate") {
        target.useItem();
      }
    },
    boosts: {
      spe: 1
    },
    num: 846,
    gen: 7
  },
  aerodactylite: {
    name: "Aerodactylite",
    spritenum: 577,
    megaStone: "Aerodactyl-Mega",
    megaEvolves: "Aerodactyl",
    itemUser: ["Aerodactyl"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 672,
    gen: 6,
    isNonstandard: "Past"
  },
  aggronite: {
    name: "Aggronite",
    spritenum: 578,
    megaStone: "Aggron-Mega",
    megaEvolves: "Aggron",
    itemUser: ["Aggron"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 667,
    gen: 6,
    isNonstandard: "Past"
  },
  aguavberry: {
    name: "Aguav Berry",
    spritenum: 5,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Dragon"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onTryEatItem(item, pokemon) {
      if (!this.runEvent("TryHeal", pokemon, null, this.effect, pokemon.baseMaxhp / 3)) return false;
    },
    onEat(pokemon) {
      this.heal(pokemon.baseMaxhp / 3);
      if (pokemon.getNature().minus === "spd") {
        pokemon.addVolatile("confusion");
      }
    },
    num: 162,
    gen: 3
  },
  airballoon: {
    name: "Air Balloon",
    spritenum: 6,
    fling: {
      basePower: 10
    },
    onStart(target) {
      if (!target.ignoringItem() && !this.field.getPseudoWeather("gravity")) {
        this.add("-item", target, "Air Balloon");
      }
    },
    // airborneness implemented in sim/pokemon.js:Pokemon#isGrounded
    onDamagingHit(damage, target, source, move) {
      this.add("-enditem", target, "Air Balloon");
      target.item = "";
      this.clearEffectState(target.itemState);
      this.runEvent("AfterUseItem", target, null, null, this.dex.items.get("airballoon"));
    },
    onAfterSubDamage(damage, target, source, effect) {
      this.debug("effect: " + effect.id);
      if (effect.effectType === "Move") {
        this.add("-enditem", target, "Air Balloon");
        target.item = "";
        this.clearEffectState(target.itemState);
        this.runEvent("AfterUseItem", target, null, null, this.dex.items.get("airballoon"));
      }
    },
    num: 541,
    gen: 5
  },
  alakazite: {
    name: "Alakazite",
    spritenum: 579,
    megaStone: "Alakazam-Mega",
    megaEvolves: "Alakazam",
    itemUser: ["Alakazam"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 679,
    gen: 6,
    isNonstandard: "Past"
  },
  aloraichiumz: {
    name: "Aloraichium Z",
    spritenum: 655,
    onTakeItem: false,
    zMove: "Stoked Sparksurfer",
    zMoveFrom: "Thunderbolt",
    itemUser: ["Raichu-Alola"],
    num: 803,
    gen: 7,
    isNonstandard: "Past"
  },
  altarianite: {
    name: "Altarianite",
    spritenum: 615,
    megaStone: "Altaria-Mega",
    megaEvolves: "Altaria",
    itemUser: ["Altaria"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 755,
    gen: 6,
    isNonstandard: "Past"
  },
  ampharosite: {
    name: "Ampharosite",
    spritenum: 580,
    megaStone: "Ampharos-Mega",
    megaEvolves: "Ampharos",
    itemUser: ["Ampharos"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 658,
    gen: 6,
    isNonstandard: "Past"
  },
  apicotberry: {
    name: "Apicot Berry",
    spritenum: 10,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Ground"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      this.boost({spd: 1});
    },
    num: 205,
    gen: 3
  },
  armorfossil: {
    name: "Armor Fossil",
    spritenum: 12,
    fling: {
      basePower: 100
    },
    num: 104,
    gen: 4,
    isNonstandard: "Past"
  },
  aspearberry: {
    name: "Aspear Berry",
    spritenum: 13,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Ice"
    },
    onUpdate(pokemon) {
      if (pokemon.status === "frz") {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      if (pokemon.status === "frz") {
        pokemon.cureStatus();
      }
    },
    num: 153,
    gen: 3
  },
  assaultvest: {
    name: "Assault Vest",
    spritenum: 581,
    fling: {
      basePower: 80
    },
    onModifySpDPriority: 1,
    onModifySpD(spd) {
      return this.chainModify(1.5);
    },
    onDisableMove(pokemon) {
      for (const moveSlot of pokemon.moveSlots) {
        const move = this.dex.moves.get(moveSlot.id);
        if (move.category === "Status" && move.id !== "mefirst") {
          pokemon.disableMove(moveSlot.id);
        }
      }
    },
    num: 640,
    gen: 6
  },
  audinite: {
    name: "Audinite",
    spritenum: 617,
    megaStone: "Audino-Mega",
    megaEvolves: "Audino",
    itemUser: ["Audino"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 757,
    gen: 6,
    isNonstandard: "Past"
  },
  auspiciousarmor: {
    name: "Auspicious Armor",
    spritenum: 753,
    fling: {
      basePower: 30
    },
    num: 2344,
    gen: 9
  },
  babiriberry: {
    name: "Babiri Berry",
    spritenum: 17,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Steel"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Steel" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 199,
    gen: 4
  },
  banettite: {
    name: "Banettite",
    spritenum: 582,
    megaStone: "Banette-Mega",
    megaEvolves: "Banette",
    itemUser: ["Banette"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 668,
    gen: 6,
    isNonstandard: "Past"
  },
  barbaracite: {
    name: "Barbaracite",
    spritenum: 564,
    megaStone: "Barbaracle-Mega",
    megaEvolves: "Barbaracle",
    itemUser: ["Barbaracle"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2581,
    gen: 9,
    isNonstandard: "Future"
  },
  beastball: {
    name: "Beast Ball",
    spritenum: 661,
    num: 851,
    gen: 7,
    isPokeball: true
  },
  beedrillite: {
    name: "Beedrillite",
    spritenum: 628,
    megaStone: "Beedrill-Mega",
    megaEvolves: "Beedrill",
    itemUser: ["Beedrill"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 770,
    gen: 6,
    isNonstandard: "Past"
  },
  belueberry: {
    name: "Belue Berry",
    spritenum: 21,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Electric"
    },
    onEat: false,
    num: 183,
    gen: 3,
    isNonstandard: "Past"
  },
  berryjuice: {
    name: "Berry Juice",
    spritenum: 22,
    fling: {
      basePower: 30
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 2) {
        if (this.runEvent("TryHeal", pokemon, null, this.effect, 20) && pokemon.useItem()) {
          this.heal(20);
        }
      }
    },
    num: 43,
    gen: 2,
    isNonstandard: "Past"
  },
  berrysweet: {
    name: "Berry Sweet",
    spritenum: 706,
    fling: {
      basePower: 10
    },
    num: 1111,
    gen: 8
  },
  bignugget: {
    name: "Big Nugget",
    spritenum: 27,
    fling: {
      basePower: 130
    },
    num: 581,
    gen: 5
  },
  bigroot: {
    name: "Big Root",
    spritenum: 29,
    fling: {
      basePower: 10
    },
    onTryHealPriority: 1,
    onTryHeal(damage, target, source, effect) {
      const heals = ["drain", "leechseed", "ingrain", "aquaring", "strengthsap"];
      if (heals.includes(effect.id)) {
        return this.chainModify([5324, 4096]);
      }
    },
    num: 296,
    gen: 4
  },
  bindingband: {
    name: "Binding Band",
    spritenum: 31,
    fling: {
      basePower: 30
    },
    // implemented in statuses
    num: 544,
    gen: 5
  },
  blackbelt: {
    name: "Black Belt",
    spritenum: 32,
    fling: {
      basePower: 30
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Fighting") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 241,
    gen: 2
  },
  blackglasses: {
    name: "Black Glasses",
    spritenum: 35,
    fling: {
      basePower: 30
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Dark") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 240,
    gen: 2
  },
  blacksludge: {
    name: "Black Sludge",
    spritenum: 34,
    fling: {
      basePower: 30
    },
    onResidualOrder: 5,
    onResidualSubOrder: 4,
    onResidual(pokemon) {
      if (pokemon.hasType("Poison")) {
        this.heal(pokemon.baseMaxhp / 16);
      } else {
        this.damage(pokemon.baseMaxhp / 8);
      }
    },
    num: 281,
    gen: 4
  },
  blastoisinite: {
    name: "Blastoisinite",
    spritenum: 583,
    megaStone: "Blastoise-Mega",
    megaEvolves: "Blastoise",
    itemUser: ["Blastoise"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 661,
    gen: 6,
    isNonstandard: "Past"
  },
  blazikenite: {
    name: "Blazikenite",
    spritenum: 584,
    megaStone: "Blaziken-Mega",
    megaEvolves: "Blaziken",
    itemUser: ["Blaziken"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 664,
    gen: 6,
    isNonstandard: "Past"
  },
  blueorb: {
    name: "Blue Orb",
    spritenum: 41,
    onSwitchInPriority: -1,
    onSwitchIn(pokemon) {
      if (pokemon.isActive && pokemon.baseSpecies.name === "Kyogre" && !pokemon.transformed) {
        pokemon.formeChange("Kyogre-Primal", this.effect, true);
      }
    },
    onTakeItem(item, source) {
      if (source.baseSpecies.baseSpecies === "Kyogre") return false;
      return true;
    },
    itemUser: ["Kyogre"],
    isPrimalOrb: true,
    num: 535,
    gen: 6,
    isNonstandard: "Past"
  },
  blukberry: {
    name: "Bluk Berry",
    spritenum: 44,
    isBerry: true,
    naturalGift: {
      basePower: 90,
      type: "Fire"
    },
    onEat: false,
    num: 165,
    gen: 3,
    isNonstandard: "Past"
  },
  blunderpolicy: {
    name: "Blunder Policy",
    spritenum: 716,
    fling: {
      basePower: 80
    },
    // Item activation located in scripts.js
    num: 1121,
    gen: 8
  },
  boosterenergy: {
    name: "Booster Energy",
    spritenum: 745,
    fling: {
      basePower: 30
    },
    onSwitchInPriority: -2,
    onStart(pokemon) {
      this.effectState.started = true;
      this.effect.onUpdate.call(this, pokemon);
    },
    onUpdate(pokemon) {
      if (!this.effectState.started || pokemon.transformed) return;
      if (pokemon.hasAbility("protosynthesis") && !this.field.isWeather("sunnyday") && pokemon.useItem()) {
        pokemon.addVolatile("protosynthesis");
      }
      if (pokemon.hasAbility("quarkdrive") && !this.field.isTerrain("electricterrain") && pokemon.useItem()) {
        pokemon.addVolatile("quarkdrive");
      }
    },
    onTakeItem(item, source) {
      if (source.baseSpecies.tags.includes("Paradox")) return false;
      return true;
    },
    num: 1880,
    gen: 9
  },
  bottlecap: {
    name: "Bottle Cap",
    spritenum: 696,
    fling: {
      basePower: 30
    },
    num: 795,
    gen: 7
  },
  brightpowder: {
    name: "Bright Powder",
    spritenum: 51,
    fling: {
      basePower: 10
    },
    onModifyAccuracyPriority: -2,
    onModifyAccuracy(accuracy) {
      if (typeof accuracy !== "number") return;
      this.debug("brightpowder - decreasing accuracy");
      return this.chainModify([3686, 4096]);
    },
    num: 213,
    gen: 2
  },
  buggem: {
    name: "Bug Gem",
    spritenum: 53,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Bug" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 558,
    gen: 5,
    isNonstandard: "Past"
  },
  bugmemory: {
    name: "Bug Memory",
    spritenum: 673,
    onMemory: "Bug",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Bug",
    itemUser: ["Silvally-Bug"],
    num: 909,
    gen: 7,
    isNonstandard: "Past"
  },
  buginiumz: {
    name: "Buginium Z",
    spritenum: 642,
    onPlate: "Bug",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Bug",
    forcedForme: "Arceus-Bug",
    num: 787,
    gen: 7,
    isNonstandard: "Past"
  },
  burndrive: {
    name: "Burn Drive",
    spritenum: 54,
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 649 || pokemon.baseSpecies.num === 649) {
        return false;
      }
      return true;
    },
    onDrive: "Fire",
    forcedForme: "Genesect-Burn",
    itemUser: ["Genesect-Burn"],
    num: 118,
    gen: 5,
    isNonstandard: "Past"
  },
  cameruptite: {
    name: "Cameruptite",
    spritenum: 625,
    megaStone: "Camerupt-Mega",
    megaEvolves: "Camerupt",
    itemUser: ["Camerupt"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 767,
    gen: 6,
    isNonstandard: "Past"
  },
  cellbattery: {
    name: "Cell Battery",
    spritenum: 60,
    fling: {
      basePower: 30
    },
    onDamagingHit(damage, target, source, move) {
      if (move.type === "Electric") {
        target.useItem();
      }
    },
    boosts: {
      atk: 1
    },
    num: 546,
    gen: 5
  },
  chandelurite: {
    name: "Chandelurite",
    spritenum: 557,
    megaStone: "Chandelure-Mega",
    megaEvolves: "Chandelure",
    itemUser: ["Chandelure"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2574,
    gen: 9,
    isNonstandard: "Future"
  },
  charcoal: {
    name: "Charcoal",
    spritenum: 61,
    fling: {
      basePower: 30
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Fire") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 249,
    gen: 2
  },
  charizarditex: {
    name: "Charizardite X",
    spritenum: 585,
    megaStone: "Charizard-Mega-X",
    megaEvolves: "Charizard",
    itemUser: ["Charizard"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 660,
    gen: 6,
    isNonstandard: "Past"
  },
  charizarditey: {
    name: "Charizardite Y",
    spritenum: 586,
    megaStone: "Charizard-Mega-Y",
    megaEvolves: "Charizard",
    itemUser: ["Charizard"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 678,
    gen: 6,
    isNonstandard: "Past"
  },
  chartiberry: {
    name: "Charti Berry",
    spritenum: 62,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Rock"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Rock" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 195,
    gen: 4
  },
  cheriberry: {
    name: "Cheri Berry",
    spritenum: 63,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Fire"
    },
    onUpdate(pokemon) {
      if (pokemon.status === "par") {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      if (pokemon.status === "par") {
        pokemon.cureStatus();
      }
    },
    num: 149,
    gen: 3
  },
  cherishball: {
    name: "Cherish Ball",
    spritenum: 64,
    num: 16,
    gen: 4,
    isPokeball: true,
    isNonstandard: "Unobtainable"
  },
  chesnaughtite: {
    name: "Chesnaughtite",
    spritenum: 558,
    megaStone: "Chesnaught-Mega",
    megaEvolves: "Chesnaught",
    itemUser: ["Chesnaught"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2575,
    gen: 9,
    isNonstandard: "Future"
  },
  chestoberry: {
    name: "Chesto Berry",
    spritenum: 65,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Water"
    },
    onUpdate(pokemon) {
      if (pokemon.status === "slp") {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      if (pokemon.status === "slp") {
        pokemon.cureStatus();
      }
    },
    num: 150,
    gen: 3
  },
  chilanberry: {
    name: "Chilan Berry",
    spritenum: 66,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Normal"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Normal" && (!target.volatiles["substitute"] || move.flags["bypasssub"] || move.infiltrates && this.gen >= 6)) {
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 200,
    gen: 4
  },
  chilldrive: {
    name: "Chill Drive",
    spritenum: 67,
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 649 || pokemon.baseSpecies.num === 649) {
        return false;
      }
      return true;
    },
    onDrive: "Ice",
    forcedForme: "Genesect-Chill",
    itemUser: ["Genesect-Chill"],
    num: 119,
    gen: 5,
    isNonstandard: "Past"
  },
  chippedpot: {
    name: "Chipped Pot",
    spritenum: 720,
    fling: {
      basePower: 80
    },
    num: 1254,
    gen: 8
  },
  choiceband: {
    name: "Choice Band",
    spritenum: 68,
    fling: {
      basePower: 10
    },
    onStart(pokemon) {
      if (pokemon.volatiles["choicelock"]) {
        this.debug("removing choicelock");
      }
      pokemon.removeVolatile("choicelock");
    },
    onModifyMove(move, pokemon) {
      pokemon.addVolatile("choicelock");
    },
    onModifyAtkPriority: 1,
    onModifyAtk(atk, pokemon) {
      if (pokemon.volatiles["dynamax"]) return;
      return this.chainModify(1.5);
    },
    isChoice: true,
    num: 220,
    gen: 3
  },
  choicescarf: {
    name: "Choice Scarf",
    spritenum: 69,
    fling: {
      basePower: 10
    },
    onStart(pokemon) {
      if (pokemon.volatiles["choicelock"]) {
        this.debug("removing choicelock");
      }
      pokemon.removeVolatile("choicelock");
    },
    onModifyMove(move, pokemon) {
      pokemon.addVolatile("choicelock");
    },
    onModifySpe(spe, pokemon) {
      if (pokemon.volatiles["dynamax"]) return;
      return this.chainModify(1.5);
    },
    isChoice: true,
    num: 287,
    gen: 4
  },
  choicespecs: {
    name: "Choice Specs",
    spritenum: 70,
    fling: {
      basePower: 10
    },
    onStart(pokemon) {
      if (pokemon.volatiles["choicelock"]) {
        this.debug("removing choicelock");
      }
      pokemon.removeVolatile("choicelock");
    },
    onModifyMove(move, pokemon) {
      pokemon.addVolatile("choicelock");
    },
    onModifySpAPriority: 1,
    onModifySpA(spa, pokemon) {
      if (pokemon.volatiles["dynamax"]) return;
      return this.chainModify(1.5);
    },
    isChoice: true,
    num: 297,
    gen: 4
  },
  chopleberry: {
    name: "Chople Berry",
    spritenum: 71,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Fighting"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Fighting" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 189,
    gen: 4
  },
  clawfossil: {
    name: "Claw Fossil",
    spritenum: 72,
    fling: {
      basePower: 100
    },
    num: 100,
    gen: 3,
    isNonstandard: "Past"
  },
  clearamulet: {
    name: "Clear Amulet",
    spritenum: 747,
    fling: {
      basePower: 30
    },
    onTryBoostPriority: 1,
    onTryBoost(boost, target, source, effect) {
      if (source && target === source) return;
      let showMsg = false;
      let i;
      for (i in boost) {
        if (boost[i] < 0) {
          delete boost[i];
          showMsg = true;
        }
      }
      if (showMsg && !effect.secondaries && effect.id !== "octolock") {
        this.add("-fail", target, "unboost", "[from] item: Clear Amulet", `[of] ${target}`);
      }
    },
    num: 1882,
    gen: 9
  },
  clefablite: {
    name: "Clefablite",
    spritenum: 544,
    megaStone: "Clefable-Mega",
    megaEvolves: "Clefable",
    itemUser: ["Clefable"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2559,
    gen: 9,
    isNonstandard: "Future"
  },
  cloversweet: {
    name: "Clover Sweet",
    spritenum: 707,
    fling: {
      basePower: 10
    },
    num: 1112,
    gen: 8
  },
  cobaberry: {
    name: "Coba Berry",
    spritenum: 76,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Flying"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Flying" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 192,
    gen: 4
  },
  colburberry: {
    name: "Colbur Berry",
    spritenum: 78,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Dark"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Dark" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 198,
    gen: 4
  },
  cornerstonemask: {
    name: "Cornerstone Mask",
    spritenum: 758,
    fling: {
      basePower: 60
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.name.startsWith("Ogerpon-Cornerstone")) {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, source) {
      if (source.baseSpecies.baseSpecies === "Ogerpon") return false;
      return true;
    },
    forcedForme: "Ogerpon-Cornerstone",
    itemUser: ["Ogerpon-Cornerstone"],
    num: 2406,
    gen: 9
  },
  cornnberry: {
    name: "Cornn Berry",
    spritenum: 81,
    isBerry: true,
    naturalGift: {
      basePower: 90,
      type: "Bug"
    },
    onEat: false,
    num: 175,
    gen: 3,
    isNonstandard: "Past"
  },
  coverfossil: {
    name: "Cover Fossil",
    spritenum: 85,
    fling: {
      basePower: 100
    },
    num: 572,
    gen: 5,
    isNonstandard: "Past"
  },
  covertcloak: {
    name: "Covert Cloak",
    spritenum: 750,
    fling: {
      basePower: 30
    },
    onModifySecondaries(secondaries) {
      this.debug("Covert Cloak prevent secondary");
      return secondaries.filter((effect) => !!effect.self);
    },
    num: 1885,
    gen: 9
  },
  crackedpot: {
    name: "Cracked Pot",
    spritenum: 719,
    fling: {
      basePower: 80
    },
    num: 1253,
    gen: 8
  },
  custapberry: {
    name: "Custap Berry",
    spritenum: 86,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Ghost"
    },
    onFractionalPriorityPriority: -2,
    onFractionalPriority(priority, pokemon) {
      if (priority <= 0 && (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony)) {
        if (pokemon.eatItem()) {
          this.add("-activate", pokemon, "item: Custap Berry", "[consumed]");
          return 0.1;
        }
      }
    },
    onEat() {
    },
    num: 210,
    gen: 4
  },
  damprock: {
    name: "Damp Rock",
    spritenum: 88,
    fling: {
      basePower: 60
    },
    num: 285,
    gen: 4
  },
  darkgem: {
    name: "Dark Gem",
    spritenum: 89,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Dark" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 562,
    gen: 5,
    isNonstandard: "Past"
  },
  darkmemory: {
    name: "Dark Memory",
    spritenum: 683,
    onMemory: "Dark",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Dark",
    itemUser: ["Silvally-Dark"],
    num: 919,
    gen: 7,
    isNonstandard: "Past"
  },
  darkiniumz: {
    name: "Darkinium Z",
    spritenum: 646,
    onPlate: "Dark",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Dark",
    forcedForme: "Arceus-Dark",
    num: 791,
    gen: 7,
    isNonstandard: "Past"
  },
  dawnstone: {
    name: "Dawn Stone",
    spritenum: 92,
    fling: {
      basePower: 80
    },
    num: 109,
    gen: 4
  },
  decidiumz: {
    name: "Decidium Z",
    spritenum: 650,
    onTakeItem: false,
    zMove: "Sinister Arrow Raid",
    zMoveFrom: "Spirit Shackle",
    itemUser: ["Decidueye"],
    num: 798,
    gen: 7,
    isNonstandard: "Past"
  },
  deepseascale: {
    name: "Deep Sea Scale",
    spritenum: 93,
    fling: {
      basePower: 30
    },
    onModifySpDPriority: 2,
    onModifySpD(spd, pokemon) {
      if (pokemon.baseSpecies.name === "Clamperl") {
        return this.chainModify(2);
      }
    },
    itemUser: ["Clamperl"],
    num: 227,
    gen: 3,
    isNonstandard: "Past"
  },
  deepseatooth: {
    name: "Deep Sea Tooth",
    spritenum: 94,
    fling: {
      basePower: 90
    },
    onModifySpAPriority: 1,
    onModifySpA(spa, pokemon) {
      if (pokemon.baseSpecies.name === "Clamperl") {
        return this.chainModify(2);
      }
    },
    itemUser: ["Clamperl"],
    num: 226,
    gen: 3,
    isNonstandard: "Past"
  },
  delphoxite: {
    name: "Delphoxite",
    spritenum: 559,
    megaStone: "Delphox-Mega",
    megaEvolves: "Delphox",
    itemUser: ["Delphox"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2576,
    gen: 9,
    isNonstandard: "Future"
  },
  destinyknot: {
    name: "Destiny Knot",
    spritenum: 95,
    fling: {
      basePower: 10
    },
    onAttractPriority: -100,
    onAttract(target, source) {
      this.debug(`attract intercepted: ${target} from ${source}`);
      if (!source || source === target) return;
      if (!source.volatiles["attract"]) source.addVolatile("attract", target);
    },
    num: 280,
    gen: 4
  },
  diancite: {
    name: "Diancite",
    spritenum: 624,
    megaStone: "Diancie-Mega",
    megaEvolves: "Diancie",
    itemUser: ["Diancie"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 764,
    gen: 6,
    isNonstandard: "Past"
  },
  diveball: {
    name: "Dive Ball",
    spritenum: 101,
    num: 7,
    gen: 3,
    isPokeball: true
  },
  domefossil: {
    name: "Dome Fossil",
    spritenum: 102,
    fling: {
      basePower: 100
    },
    num: 102,
    gen: 3,
    isNonstandard: "Past"
  },
  dousedrive: {
    name: "Douse Drive",
    spritenum: 103,
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 649 || pokemon.baseSpecies.num === 649) {
        return false;
      }
      return true;
    },
    onDrive: "Water",
    forcedForme: "Genesect-Douse",
    itemUser: ["Genesect-Douse"],
    num: 116,
    gen: 5,
    isNonstandard: "Past"
  },
  dracoplate: {
    name: "Draco Plate",
    spritenum: 105,
    onPlate: "Dragon",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Dragon") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Dragon",
    num: 311,
    gen: 4
  },
  dragalgite: {
    name: "Dragalgite",
    spritenum: 565,
    megaStone: "Dragalge-Mega",
    megaEvolves: "Dragalge",
    itemUser: ["Dragalge"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2582,
    gen: 9,
    isNonstandard: "Future"
  },
  dragonfang: {
    name: "Dragon Fang",
    spritenum: 106,
    fling: {
      basePower: 70
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Dragon") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 250,
    gen: 2
  },
  dragongem: {
    name: "Dragon Gem",
    spritenum: 107,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Dragon" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 561,
    gen: 5,
    isNonstandard: "Past"
  },
  dragonmemory: {
    name: "Dragon Memory",
    spritenum: 682,
    onMemory: "Dragon",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Dragon",
    itemUser: ["Silvally-Dragon"],
    num: 918,
    gen: 7,
    isNonstandard: "Past"
  },
  dragonscale: {
    name: "Dragon Scale",
    spritenum: 108,
    fling: {
      basePower: 30
    },
    num: 235,
    gen: 2
  },
  dragoninite: {
    name: "Dragoninite",
    spritenum: 547,
    megaStone: "Dragonite-Mega",
    megaEvolves: "Dragonite",
    itemUser: ["Dragonite"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2562,
    gen: 9,
    isNonstandard: "Future"
  },
  dragoniumz: {
    name: "Dragonium Z",
    spritenum: 645,
    onPlate: "Dragon",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Dragon",
    forcedForme: "Arceus-Dragon",
    num: 790,
    gen: 7,
    isNonstandard: "Past"
  },
  drampanite: {
    name: "Drampanite",
    spritenum: 569,
    megaStone: "Drampa-Mega",
    megaEvolves: "Drampa",
    itemUser: ["Drampa"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2585,
    gen: 9,
    isNonstandard: "Future"
  },
  dreadplate: {
    name: "Dread Plate",
    spritenum: 110,
    onPlate: "Dark",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Dark") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Dark",
    num: 312,
    gen: 4
  },
  dreamball: {
    name: "Dream Ball",
    spritenum: 111,
    num: 576,
    gen: 5,
    isPokeball: true
  },
  dubiousdisc: {
    name: "Dubious Disc",
    spritenum: 113,
    fling: {
      basePower: 50
    },
    num: 324,
    gen: 4
  },
  durinberry: {
    name: "Durin Berry",
    spritenum: 114,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Water"
    },
    onEat: false,
    num: 182,
    gen: 3,
    isNonstandard: "Past"
  },
  duskball: {
    name: "Dusk Ball",
    spritenum: 115,
    num: 13,
    gen: 4,
    isPokeball: true
  },
  duskstone: {
    name: "Dusk Stone",
    spritenum: 116,
    fling: {
      basePower: 80
    },
    num: 108,
    gen: 4
  },
  earthplate: {
    name: "Earth Plate",
    spritenum: 117,
    onPlate: "Ground",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Ground") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Ground",
    num: 305,
    gen: 4
  },
  eelektrossite: {
    name: "Eelektrossite",
    spritenum: 556,
    megaStone: "Eelektross-Mega",
    megaEvolves: "Eelektross",
    itemUser: ["Eelektross"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2573,
    gen: 9,
    isNonstandard: "Future"
  },
  eeviumz: {
    name: "Eevium Z",
    spritenum: 657,
    onTakeItem: false,
    zMove: "Extreme Evoboost",
    zMoveFrom: "Last Resort",
    itemUser: ["Eevee"],
    num: 805,
    gen: 7,
    isNonstandard: "Past"
  },
  ejectbutton: {
    name: "Eject Button",
    spritenum: 118,
    fling: {
      basePower: 30
    },
    onAfterMoveSecondaryPriority: 2,
    onAfterMoveSecondary(target, source, move) {
      if (source && source !== target && target.hp && move && move.category !== "Status" && !move.flags["futuremove"]) {
        if (!this.canSwitch(target.side) || target.forceSwitchFlag || target.beingCalledBack || target.isSkyDropped()) return;
        if (target.volatiles["commanding"] || target.volatiles["commanded"]) return;
        for (const pokemon of this.getAllActive()) {
          if (pokemon.switchFlag === true) return;
        }
        target.switchFlag = true;
        if (target.useItem()) {
          source.switchFlag = false;
        } else {
          target.switchFlag = false;
        }
      }
    },
    num: 547,
    gen: 5
  },
  ejectpack: {
    name: "Eject Pack",
    spritenum: 714,
    fling: {
      basePower: 50
    },
    onAfterBoost(boost, pokemon) {
      if (this.effectState.eject || this.activeMove?.id === "partingshot") return;
      let i;
      for (i in boost) {
        if (boost[i] < 0) {
          this.effectState.eject = true;
          break;
        }
      }
    },
    onAnySwitchInPriority: -4,
    onAnySwitchIn() {
      if (!this.effectState.eject) return;
      this.effectState.target.useItem();
    },
    onAnyAfterMega() {
      if (!this.effectState.eject) return;
      this.effectState.target.useItem();
    },
    onAnyAfterMove() {
      if (!this.effectState.eject) return;
      this.effectState.target.useItem();
    },
    onResidualOrder: 29,
    onResidual(pokemon) {
      if (!this.effectState.eject) return;
      this.effectState.target.useItem();
    },
    onUseItem(item, pokemon) {
      if (!this.canSwitch(pokemon.side)) return false;
      if (pokemon.volatiles["commanding"] || pokemon.volatiles["commanded"]) return false;
      for (const active of this.getAllActive()) {
        if (active.switchFlag === true) return false;
      }
      return true;
    },
    onUse(pokemon) {
      pokemon.switchFlag = true;
    },
    onEnd() {
      delete this.effectState.eject;
    },
    num: 1119,
    gen: 8
  },
  electirizer: {
    name: "Electirizer",
    spritenum: 119,
    fling: {
      basePower: 80
    },
    num: 322,
    gen: 4
  },
  electricgem: {
    name: "Electric Gem",
    spritenum: 120,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status" || move.flags["pledgecombo"]) return;
      if (move.type === "Electric" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 550,
    gen: 5,
    isNonstandard: "Past"
  },
  electricmemory: {
    name: "Electric Memory",
    spritenum: 679,
    onMemory: "Electric",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Electric",
    itemUser: ["Silvally-Electric"],
    num: 915,
    gen: 7,
    isNonstandard: "Past"
  },
  electricseed: {
    name: "Electric Seed",
    spritenum: 664,
    fling: {
      basePower: 10
    },
    onSwitchInPriority: -1,
    onStart(pokemon) {
      if (!pokemon.ignoringItem() && this.field.isTerrain("electricterrain")) {
        pokemon.useItem();
      }
    },
    onTerrainChange(pokemon) {
      if (this.field.isTerrain("electricterrain")) {
        pokemon.useItem();
      }
    },
    boosts: {
      def: 1
    },
    num: 881,
    gen: 7
  },
  electriumz: {
    name: "Electrium Z",
    spritenum: 634,
    onPlate: "Electric",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Electric",
    forcedForme: "Arceus-Electric",
    num: 779,
    gen: 7,
    isNonstandard: "Past"
  },
  emboarite: {
    name: "Emboarite",
    spritenum: 552,
    megaStone: "Emboar-Mega",
    megaEvolves: "Emboar",
    itemUser: ["Emboar"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2569,
    gen: 9,
    isNonstandard: "Future"
  },
  enigmaberry: {
    name: "Enigma Berry",
    spritenum: 124,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Bug"
    },
    onHit(target, source, move) {
      if (move && target.getMoveHitData(move).typeMod > 0) {
        if (target.eatItem()) {
          this.heal(target.baseMaxhp / 4);
        }
      }
    },
    onTryEatItem(item, pokemon) {
      if (!this.runEvent("TryHeal", pokemon, null, this.effect, pokemon.baseMaxhp / 4)) return false;
    },
    onEat() {
    },
    num: 208,
    gen: 3
  },
  eviolite: {
    name: "Eviolite",
    spritenum: 130,
    fling: {
      basePower: 40
    },
    onModifyDefPriority: 2,
    onModifyDef(def, pokemon) {
      if (pokemon.baseSpecies.nfe) {
        return this.chainModify(1.5);
      }
    },
    onModifySpDPriority: 2,
    onModifySpD(spd, pokemon) {
      if (pokemon.baseSpecies.nfe) {
        return this.chainModify(1.5);
      }
    },
    num: 538,
    gen: 5
  },
  excadrite: {
    name: "Excadrite",
    spritenum: 553,
    megaStone: "Excadrill-Mega",
    megaEvolves: "Excadrill",
    itemUser: ["Excadrill"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2570,
    gen: 9,
    isNonstandard: "Future"
  },
  expertbelt: {
    name: "Expert Belt",
    spritenum: 132,
    fling: {
      basePower: 10
    },
    onModifyDamage(damage, source, target, move) {
      if (move && target.getMoveHitData(move).typeMod > 0) {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 268,
    gen: 4
  },
  fairiumz: {
    name: "Fairium Z",
    spritenum: 648,
    onPlate: "Fairy",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Fairy",
    forcedForme: "Arceus-Fairy",
    num: 793,
    gen: 7,
    isNonstandard: "Past"
  },
  fairyfeather: {
    name: "Fairy Feather",
    spritenum: 754,
    fling: {
      basePower: 10
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Fairy") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 2401,
    gen: 9
  },
  fairygem: {
    name: "Fairy Gem",
    spritenum: 611,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Fairy" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 715,
    gen: 6,
    isNonstandard: "Past"
  },
  fairymemory: {
    name: "Fairy Memory",
    spritenum: 684,
    onMemory: "Fairy",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Fairy",
    itemUser: ["Silvally-Fairy"],
    num: 920,
    gen: 7,
    isNonstandard: "Past"
  },
  falinksite: {
    name: "Falinksite",
    spritenum: 570,
    megaStone: "Falinks-Mega",
    megaEvolves: "Falinks",
    itemUser: ["Falinks"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2586,
    gen: 9,
    isNonstandard: "Future"
  },
  fastball: {
    name: "Fast Ball",
    spritenum: 137,
    num: 492,
    gen: 2,
    isPokeball: true
  },
  feraligite: {
    name: "Feraligite",
    spritenum: 549,
    megaStone: "Feraligatr-Mega",
    megaEvolves: "Feraligatr",
    itemUser: ["Feraligatr"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2564,
    gen: 9,
    isNonstandard: "Future"
  },
  fightinggem: {
    name: "Fighting Gem",
    spritenum: 139,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Fighting" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 553,
    gen: 5,
    isNonstandard: "Past"
  },
  fightingmemory: {
    name: "Fighting Memory",
    spritenum: 668,
    onMemory: "Fighting",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Fighting",
    itemUser: ["Silvally-Fighting"],
    num: 904,
    gen: 7,
    isNonstandard: "Past"
  },
  fightiniumz: {
    name: "Fightinium Z",
    spritenum: 637,
    onPlate: "Fighting",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Fighting",
    forcedForme: "Arceus-Fighting",
    num: 782,
    gen: 7,
    isNonstandard: "Past"
  },
  figyberry: {
    name: "Figy Berry",
    spritenum: 140,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Bug"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onTryEatItem(item, pokemon) {
      if (!this.runEvent("TryHeal", pokemon, null, this.effect, pokemon.baseMaxhp / 3)) return false;
    },
    onEat(pokemon) {
      this.heal(pokemon.baseMaxhp / 3);
      if (pokemon.getNature().minus === "atk") {
        pokemon.addVolatile("confusion");
      }
    },
    num: 159,
    gen: 3
  },
  firegem: {
    name: "Fire Gem",
    spritenum: 141,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status" || move.flags["pledgecombo"]) return;
      if (move.type === "Fire" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 548,
    gen: 5,
    isNonstandard: "Past"
  },
  firememory: {
    name: "Fire Memory",
    spritenum: 676,
    onMemory: "Fire",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Fire",
    itemUser: ["Silvally-Fire"],
    num: 912,
    gen: 7,
    isNonstandard: "Past"
  },
  firestone: {
    name: "Fire Stone",
    spritenum: 142,
    fling: {
      basePower: 30
    },
    num: 82,
    gen: 1
  },
  firiumz: {
    name: "Firium Z",
    spritenum: 632,
    onPlate: "Fire",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Fire",
    forcedForme: "Arceus-Fire",
    num: 777,
    gen: 7,
    isNonstandard: "Past"
  },
  fistplate: {
    name: "Fist Plate",
    spritenum: 143,
    onPlate: "Fighting",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Fighting") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Fighting",
    num: 303,
    gen: 4
  },
  flameorb: {
    name: "Flame Orb",
    spritenum: 145,
    fling: {
      basePower: 30,
      status: "brn"
    },
    onResidualOrder: 28,
    onResidualSubOrder: 3,
    onResidual(pokemon) {
      pokemon.trySetStatus("brn", pokemon);
    },
    num: 273,
    gen: 4
  },
  flameplate: {
    name: "Flame Plate",
    spritenum: 146,
    onPlate: "Fire",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Fire") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Fire",
    num: 298,
    gen: 4
  },
  floatstone: {
    name: "Float Stone",
    spritenum: 147,
    fling: {
      basePower: 30
    },
    onModifyWeight(weighthg) {
      return this.trunc(weighthg / 2);
    },
    num: 539,
    gen: 5
  },
  floettite: {
    name: "Floettite",
    spritenum: 562,
    megaStone: "Floette-Mega",
    megaEvolves: "Floette-Eternal",
    itemUser: ["Floette-Eternal"],
    onTakeItem(item, source) {
      if ([item.megaEvolves, item.megaStone].includes(source.baseSpecies.name)) return false;
      return true;
    },
    num: 2579,
    gen: 9,
    isNonstandard: "Future"
  },
  flowersweet: {
    name: "Flower Sweet",
    spritenum: 708,
    fling: {
      basePower: 0
    },
    num: 1113,
    gen: 8
  },
  flyinggem: {
    name: "Flying Gem",
    spritenum: 149,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Flying" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 556,
    gen: 5,
    isNonstandard: "Past"
  },
  flyingmemory: {
    name: "Flying Memory",
    spritenum: 669,
    onMemory: "Flying",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Flying",
    itemUser: ["Silvally-Flying"],
    num: 905,
    gen: 7,
    isNonstandard: "Past"
  },
  flyiniumz: {
    name: "Flyinium Z",
    spritenum: 640,
    onPlate: "Flying",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Flying",
    forcedForme: "Arceus-Flying",
    num: 785,
    gen: 7,
    isNonstandard: "Past"
  },
  focusband: {
    name: "Focus Band",
    spritenum: 150,
    fling: {
      basePower: 10
    },
    onDamagePriority: -40,
    onDamage(damage, target, source, effect) {
      if (this.randomChance(1, 10) && damage >= target.hp && effect && effect.effectType === "Move") {
        this.add("-activate", target, "item: Focus Band");
        return target.hp - 1;
      }
    },
    num: 230,
    gen: 2
  },
  focussash: {
    name: "Focus Sash",
    spritenum: 151,
    fling: {
      basePower: 10
    },
    onDamagePriority: -40,
    onDamage(damage, target, source, effect) {
      if (target.hp === target.maxhp && damage >= target.hp && effect && effect.effectType === "Move") {
        if (target.useItem()) {
          return target.hp - 1;
        }
      }
    },
    num: 275,
    gen: 4
  },
  fossilizedbird: {
    name: "Fossilized Bird",
    spritenum: 700,
    fling: {
      basePower: 100
    },
    num: 1105,
    gen: 8,
    isNonstandard: "Past"
  },
  fossilizeddino: {
    name: "Fossilized Dino",
    spritenum: 703,
    fling: {
      basePower: 100
    },
    num: 1108,
    gen: 8,
    isNonstandard: "Past"
  },
  fossilizeddrake: {
    name: "Fossilized Drake",
    spritenum: 702,
    fling: {
      basePower: 100
    },
    num: 1107,
    gen: 8,
    isNonstandard: "Past"
  },
  fossilizedfish: {
    name: "Fossilized Fish",
    spritenum: 701,
    fling: {
      basePower: 100
    },
    num: 1106,
    gen: 8,
    isNonstandard: "Past"
  },
  friendball: {
    name: "Friend Ball",
    spritenum: 153,
    num: 497,
    gen: 2,
    isPokeball: true
  },
  froslassite: {
    name: "Froslassite",
    spritenum: 551,
    megaStone: "Froslass-Mega",
    megaEvolves: "Froslass",
    itemUser: ["Froslass"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2566,
    gen: 9,
    isNonstandard: "Future"
  },
  fullincense: {
    name: "Full Incense",
    spritenum: 155,
    fling: {
      basePower: 10
    },
    onFractionalPriority: -0.1,
    num: 316,
    gen: 4,
    isNonstandard: "Past"
  },
  galaricacuff: {
    name: "Galarica Cuff",
    spritenum: 739,
    fling: {
      basePower: 30
    },
    num: 1582,
    gen: 8
  },
  galaricawreath: {
    name: "Galarica Wreath",
    spritenum: 740,
    fling: {
      basePower: 30
    },
    num: 1592,
    gen: 8
  },
  galladite: {
    name: "Galladite",
    spritenum: 616,
    megaStone: "Gallade-Mega",
    megaEvolves: "Gallade",
    itemUser: ["Gallade"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 756,
    gen: 6,
    isNonstandard: "Past"
  },
  ganlonberry: {
    name: "Ganlon Berry",
    spritenum: 158,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Ice"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      this.boost({def: 1});
    },
    num: 202,
    gen: 3
  },
  garchompite: {
    name: "Garchompite",
    spritenum: 573,
    megaStone: "Garchomp-Mega",
    megaEvolves: "Garchomp",
    itemUser: ["Garchomp"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 683,
    gen: 6,
    isNonstandard: "Past"
  },
  gardevoirite: {
    name: "Gardevoirite",
    spritenum: 587,
    megaStone: "Gardevoir-Mega",
    megaEvolves: "Gardevoir",
    itemUser: ["Gardevoir"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 657,
    gen: 6,
    isNonstandard: "Past"
  },
  gengarite: {
    name: "Gengarite",
    spritenum: 588,
    megaStone: "Gengar-Mega",
    megaEvolves: "Gengar",
    itemUser: ["Gengar"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 656,
    gen: 6,
    isNonstandard: "Past"
  },
  ghostgem: {
    name: "Ghost Gem",
    spritenum: 161,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Ghost" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 560,
    gen: 5,
    isNonstandard: "Past"
  },
  ghostmemory: {
    name: "Ghost Memory",
    spritenum: 674,
    onMemory: "Ghost",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Ghost",
    itemUser: ["Silvally-Ghost"],
    num: 910,
    gen: 7,
    isNonstandard: "Past"
  },
  ghostiumz: {
    name: "Ghostium Z",
    spritenum: 644,
    onPlate: "Ghost",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Ghost",
    forcedForme: "Arceus-Ghost",
    num: 789,
    gen: 7,
    isNonstandard: "Past"
  },
  glalitite: {
    name: "Glalitite",
    spritenum: 623,
    megaStone: "Glalie-Mega",
    megaEvolves: "Glalie",
    itemUser: ["Glalie"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 763,
    gen: 6,
    isNonstandard: "Past"
  },
  goldbottlecap: {
    name: "Gold Bottle Cap",
    spritenum: 697,
    fling: {
      basePower: 30
    },
    num: 796,
    gen: 7
  },
  grassgem: {
    name: "Grass Gem",
    spritenum: 172,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status" || move.flags["pledgecombo"]) return;
      if (move.type === "Grass" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 551,
    gen: 5,
    isNonstandard: "Past"
  },
  grassmemory: {
    name: "Grass Memory",
    spritenum: 678,
    onMemory: "Grass",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Grass",
    itemUser: ["Silvally-Grass"],
    num: 914,
    gen: 7,
    isNonstandard: "Past"
  },
  grassiumz: {
    name: "Grassium Z",
    spritenum: 635,
    onPlate: "Grass",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Grass",
    forcedForme: "Arceus-Grass",
    num: 780,
    gen: 7,
    isNonstandard: "Past"
  },
  grassyseed: {
    name: "Grassy Seed",
    spritenum: 667,
    fling: {
      basePower: 10
    },
    onSwitchInPriority: -1,
    onStart(pokemon) {
      if (!pokemon.ignoringItem() && this.field.isTerrain("grassyterrain")) {
        pokemon.useItem();
      }
    },
    onTerrainChange(pokemon) {
      if (this.field.isTerrain("grassyterrain")) {
        pokemon.useItem();
      }
    },
    boosts: {
      def: 1
    },
    num: 884,
    gen: 7
  },
  greatball: {
    name: "Great Ball",
    spritenum: 174,
    num: 3,
    gen: 1,
    isPokeball: true
  },
  greninjite: {
    name: "Greninjite",
    spritenum: 560,
    megaStone: "Greninja-Mega",
    megaEvolves: "Greninja",
    itemUser: ["Greninja"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2577,
    gen: 9,
    isNonstandard: "Future"
  },
  grepaberry: {
    name: "Grepa Berry",
    spritenum: 178,
    isBerry: true,
    naturalGift: {
      basePower: 90,
      type: "Flying"
    },
    onEat: false,
    num: 173,
    gen: 3
  },
  gripclaw: {
    name: "Grip Claw",
    spritenum: 179,
    fling: {
      basePower: 90
    },
    // implemented in statuses
    num: 286,
    gen: 4
  },
  griseouscore: {
    name: "Griseous Core",
    spritenum: 743,
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.num === 487 && (move.type === "Ghost" || move.type === "Dragon")) {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source?.baseSpecies.num === 487 || pokemon.baseSpecies.num === 487) {
        return false;
      }
      return true;
    },
    forcedForme: "Giratina-Origin",
    itemUser: ["Giratina-Origin"],
    num: 1779,
    gen: 8
  },
  griseousorb: {
    name: "Griseous Orb",
    spritenum: 180,
    fling: {
      basePower: 60
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.num === 487 && (move.type === "Ghost" || move.type === "Dragon")) {
        return this.chainModify([4915, 4096]);
      }
    },
    itemUser: ["Giratina"],
    num: 112,
    gen: 4
  },
  groundgem: {
    name: "Ground Gem",
    spritenum: 182,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Ground" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 555,
    gen: 5,
    isNonstandard: "Past"
  },
  groundmemory: {
    name: "Ground Memory",
    spritenum: 671,
    onMemory: "Ground",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Ground",
    itemUser: ["Silvally-Ground"],
    num: 907,
    gen: 7,
    isNonstandard: "Past"
  },
  groundiumz: {
    name: "Groundium Z",
    spritenum: 639,
    onPlate: "Ground",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Ground",
    forcedForme: "Arceus-Ground",
    num: 784,
    gen: 7,
    isNonstandard: "Past"
  },
  gyaradosite: {
    name: "Gyaradosite",
    spritenum: 589,
    megaStone: "Gyarados-Mega",
    megaEvolves: "Gyarados",
    itemUser: ["Gyarados"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 676,
    gen: 6,
    isNonstandard: "Past"
  },
  habanberry: {
    name: "Haban Berry",
    spritenum: 185,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Dragon"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Dragon" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 197,
    gen: 4
  },
  hardstone: {
    name: "Hard Stone",
    spritenum: 187,
    fling: {
      basePower: 100
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move && move.type === "Rock") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 238,
    gen: 2
  },
  hawluchanite: {
    name: "Hawluchanite",
    spritenum: 566,
    megaStone: "Hawlucha-Mega",
    megaEvolves: "Hawlucha",
    itemUser: ["Hawlucha"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2583,
    gen: 9,
    isNonstandard: "Future"
  },
  healball: {
    name: "Heal Ball",
    spritenum: 188,
    num: 14,
    gen: 4,
    isPokeball: true
  },
  hearthflamemask: {
    name: "Hearthflame Mask",
    spritenum: 760,
    fling: {
      basePower: 60
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.name.startsWith("Ogerpon-Hearthflame")) {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, source) {
      if (source.baseSpecies.baseSpecies === "Ogerpon") return false;
      return true;
    },
    forcedForme: "Ogerpon-Hearthflame",
    itemUser: ["Ogerpon-Hearthflame"],
    num: 2408,
    gen: 9
  },
  heatrock: {
    name: "Heat Rock",
    spritenum: 193,
    fling: {
      basePower: 60
    },
    num: 284,
    gen: 4
  },
  heavyball: {
    name: "Heavy Ball",
    spritenum: 194,
    num: 495,
    gen: 2,
    isPokeball: true
  },
  heavydutyboots: {
    name: "Heavy-Duty Boots",
    spritenum: 715,
    fling: {
      basePower: 80
    },
    num: 1120,
    gen: 8
    // Hazard Immunity implemented in moves.ts
  },
  helixfossil: {
    name: "Helix Fossil",
    spritenum: 195,
    fling: {
      basePower: 100
    },
    num: 101,
    gen: 3,
    isNonstandard: "Past"
  },
  heracronite: {
    name: "Heracronite",
    spritenum: 590,
    megaStone: "Heracross-Mega",
    megaEvolves: "Heracross",
    itemUser: ["Heracross"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 680,
    gen: 6,
    isNonstandard: "Past"
  },
  hondewberry: {
    name: "Hondew Berry",
    spritenum: 213,
    isBerry: true,
    naturalGift: {
      basePower: 90,
      type: "Ground"
    },
    onEat: false,
    num: 172,
    gen: 3
  },
  houndoominite: {
    name: "Houndoominite",
    spritenum: 591,
    megaStone: "Houndoom-Mega",
    megaEvolves: "Houndoom",
    itemUser: ["Houndoom"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 666,
    gen: 6,
    isNonstandard: "Past"
  },
  iapapaberry: {
    name: "Iapapa Berry",
    spritenum: 217,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Dark"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onTryEatItem(item, pokemon) {
      if (!this.runEvent("TryHeal", pokemon, null, this.effect, pokemon.baseMaxhp / 3)) return false;
    },
    onEat(pokemon) {
      this.heal(pokemon.baseMaxhp / 3);
      if (pokemon.getNature().minus === "def") {
        pokemon.addVolatile("confusion");
      }
    },
    num: 163,
    gen: 3
  },
  icegem: {
    name: "Ice Gem",
    spritenum: 218,
    isGem: true,
    onSourceTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      if (move.type === "Ice" && source.useItem()) {
        source.addVolatile("gem");
      }
    },
    num: 552,
    gen: 5,
    isNonstandard: "Past"
  },
  icememory: {
    name: "Ice Memory",
    spritenum: 681,
    onMemory: "Ice",
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 773 || pokemon.baseSpecies.num === 773) {
        return false;
      }
      return true;
    },
    forcedForme: "Silvally-Ice",
    itemUser: ["Silvally-Ice"],
    num: 917,
    gen: 7,
    isNonstandard: "Past"
  },
  icestone: {
    name: "Ice Stone",
    spritenum: 693,
    fling: {
      basePower: 30
    },
    num: 849,
    gen: 7
  },
  icicleplate: {
    name: "Icicle Plate",
    spritenum: 220,
    onPlate: "Ice",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Ice") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Ice",
    num: 302,
    gen: 4
  },
  iciumz: {
    name: "Icium Z",
    spritenum: 636,
    onPlate: "Ice",
    onTakeItem: false,
    zMove: true,
    zMoveType: "Ice",
    forcedForme: "Arceus-Ice",
    num: 781,
    gen: 7,
    isNonstandard: "Past"
  },
  icyrock: {
    name: "Icy Rock",
    spritenum: 221,
    fling: {
      basePower: 40
    },
    num: 282,
    gen: 4
  },
  inciniumz: {
    name: "Incinium Z",
    spritenum: 651,
    onTakeItem: false,
    zMove: "Malicious Moonsault",
    zMoveFrom: "Darkest Lariat",
    itemUser: ["Incineroar"],
    num: 799,
    gen: 7,
    isNonstandard: "Past"
  },
  insectplate: {
    name: "Insect Plate",
    spritenum: 223,
    onPlate: "Bug",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Bug") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Bug",
    num: 308,
    gen: 4
  },
  ironball: {
    name: "Iron Ball",
    spritenum: 224,
    fling: {
      basePower: 130
    },
    onEffectiveness(typeMod, target, type, move) {
      if (!target) return;
      if (target.volatiles["ingrain"] || target.volatiles["smackdown"] || this.field.getPseudoWeather("gravity")) return;
      if (move.type === "Ground" && target.hasType("Flying")) return 0;
    },
    // airborneness negation implemented in sim/pokemon.js:Pokemon#isGrounded
    onModifySpe(spe) {
      return this.chainModify(0.5);
    },
    num: 278,
    gen: 4
  },
  ironplate: {
    name: "Iron Plate",
    spritenum: 225,
    onPlate: "Steel",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Steel") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Steel",
    num: 313,
    gen: 4
  },
  jabocaberry: {
    name: "Jaboca Berry",
    spritenum: 230,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Dragon"
    },
    onDamagingHit(damage, target, source, move) {
      if (move.category === "Physical" && source.hp && source.isActive && !source.hasAbility("magicguard")) {
        if (target.eatItem()) {
          this.damage(source.baseMaxhp / (target.hasAbility("ripen") ? 4 : 8), source, target);
        }
      }
    },
    onEat() {
    },
    num: 211,
    gen: 4
  },
  jawfossil: {
    name: "Jaw Fossil",
    spritenum: 694,
    fling: {
      basePower: 100
    },
    num: 710,
    gen: 6,
    isNonstandard: "Past"
  },
  kasibberry: {
    name: "Kasib Berry",
    spritenum: 233,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Ghost"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Ghost" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 196,
    gen: 4
  },
  kebiaberry: {
    name: "Kebia Berry",
    spritenum: 234,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Poison"
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.type === "Poison" && target.getMoveHitData(move).typeMod > 0) {
        const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
        if (hitSub) return;
        if (target.eatItem()) {
          this.debug("-50% reduction");
          this.add("-enditem", target, this.effect, "[weaken]");
          return this.chainModify(0.5);
        }
      }
    },
    onEat() {
    },
    num: 190,
    gen: 4
  },
  keeberry: {
    name: "Kee Berry",
    spritenum: 593,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Fairy"
    },
    onAfterMoveSecondary(target, source, move) {
      if (move.category === "Physical") {
        if (move.id === "present" && move.heal) return;
        target.eatItem();
      }
    },
    onEat(pokemon) {
      this.boost({def: 1});
    },
    num: 687,
    gen: 6
  },
  kelpsyberry: {
    name: "Kelpsy Berry",
    spritenum: 235,
    isBerry: true,
    naturalGift: {
      basePower: 90,
      type: "Fighting"
    },
    onEat: false,
    num: 170,
    gen: 3
  },
  kangaskhanite: {
    name: "Kangaskhanite",
    spritenum: 592,
    megaStone: "Kangaskhan-Mega",
    megaEvolves: "Kangaskhan",
    itemUser: ["Kangaskhan"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 675,
    gen: 6,
    isNonstandard: "Past"
  },
  kingsrock: {
    name: "King's Rock",
    spritenum: 236,
    fling: {
      basePower: 30,
      volatileStatus: "flinch"
    },
    onModifyMovePriority: -1,
    onModifyMove(move) {
      if (move.category !== "Status") {
        if (!move.secondaries) move.secondaries = [];
        for (const secondary of move.secondaries) {
          if (secondary.volatileStatus === "flinch") return;
        }
        move.secondaries.push({
          chance: 10,
          volatileStatus: "flinch"
        });
      }
    },
    num: 221,
    gen: 2
  },
  kommoniumz: {
    name: "Kommonium Z",
    spritenum: 690,
    onTakeItem: false,
    zMove: "Clangorous Soulblaze",
    zMoveFrom: "Clanging Scales",
    itemUser: ["Kommo-o", "Kommo-o-Totem"],
    num: 926,
    gen: 7,
    isNonstandard: "Past"
  },
  laggingtail: {
    name: "Lagging Tail",
    spritenum: 237,
    fling: {
      basePower: 10
    },
    onFractionalPriority: -0.1,
    num: 279,
    gen: 4
  },
  lansatberry: {
    name: "Lansat Berry",
    spritenum: 238,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Flying"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      pokemon.addVolatile("focusenergy");
    },
    num: 206,
    gen: 3
  },
  latiasite: {
    name: "Latiasite",
    spritenum: 629,
    megaStone: "Latias-Mega",
    megaEvolves: "Latias",
    itemUser: ["Latias"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 684,
    gen: 6,
    isNonstandard: "Past"
  },
  latiosite: {
    name: "Latiosite",
    spritenum: 630,
    megaStone: "Latios-Mega",
    megaEvolves: "Latios",
    itemUser: ["Latios"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 685,
    gen: 6,
    isNonstandard: "Past"
  },
  laxincense: {
    name: "Lax Incense",
    spritenum: 240,
    fling: {
      basePower: 10
    },
    onModifyAccuracyPriority: -2,
    onModifyAccuracy(accuracy) {
      if (typeof accuracy !== "number") return;
      this.debug("lax incense - decreasing accuracy");
      return this.chainModify([3686, 4096]);
    },
    num: 255,
    gen: 3,
    isNonstandard: "Past"
  },
  leafstone: {
    name: "Leaf Stone",
    spritenum: 241,
    fling: {
      basePower: 30
    },
    num: 85,
    gen: 1
  },
  leek: {
    name: "Leek",
    fling: {
      basePower: 60
    },
    spritenum: 475,
    onModifyCritRatio(critRatio, user) {
      if (["farfetchd", "sirfetchd"].includes(this.toID(user.baseSpecies.baseSpecies))) {
        return critRatio + 2;
      }
    },
    itemUser: ["Farfetch\u2019d", "Farfetch\u2019d-Galar", "Sirfetch\u2019d"],
    num: 259,
    gen: 8,
    isNonstandard: "Past"
  },
  leftovers: {
    name: "Leftovers",
    spritenum: 242,
    fling: {
      basePower: 10
    },
    onResidualOrder: 5,
    onResidualSubOrder: 4,
    onResidual(pokemon) {
      this.heal(pokemon.baseMaxhp / 16);
    },
    num: 234,
    gen: 2
  },
  leppaberry: {
    name: "Leppa Berry",
    spritenum: 244,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Fighting"
    },
    onUpdate(pokemon) {
      if (!pokemon.hp) return;
      if (pokemon.moveSlots.some((move) => move.pp === 0)) {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      const moveSlot = pokemon.moveSlots.find((move) => move.pp === 0) || pokemon.moveSlots.find((move) => move.pp < move.maxpp);
      if (!moveSlot) return;
      moveSlot.pp += 10;
      if (moveSlot.pp > moveSlot.maxpp) moveSlot.pp = moveSlot.maxpp;
      this.add("-activate", pokemon, "item: Leppa Berry", moveSlot.move, "[consumed]");
    },
    num: 154,
    gen: 3
  },
  levelball: {
    name: "Level Ball",
    spritenum: 246,
    num: 493,
    gen: 2,
    isPokeball: true
  },
  liechiberry: {
    name: "Liechi Berry",
    spritenum: 248,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Grass"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      this.boost({atk: 1});
    },
    num: 201,
    gen: 3
  },
  lifeorb: {
    name: "Life Orb",
    spritenum: 249,
    fling: {
      basePower: 30
    },
    onModifyDamage(damage, source, target, move) {
      return this.chainModify([5324, 4096]);
    },
    onAfterMoveSecondarySelf(source, target, move) {
      if (source && source !== target && move && move.category !== "Status" && !source.forceSwitchFlag) {
        this.damage(source.baseMaxhp / 10, source, source, this.dex.items.get("lifeorb"));
      }
    },
    num: 270,
    gen: 4
  },
  lightball: {
    name: "Light Ball",
    spritenum: 251,
    fling: {
      basePower: 30,
      status: "par"
    },
    onModifyAtkPriority: 1,
    onModifyAtk(atk, pokemon) {
      if (pokemon.baseSpecies.baseSpecies === "Pikachu") {
        return this.chainModify(2);
      }
    },
    onModifySpAPriority: 1,
    onModifySpA(spa, pokemon) {
      if (pokemon.baseSpecies.baseSpecies === "Pikachu") {
        return this.chainModify(2);
      }
    },
    itemUser: ["Pikachu", "Pikachu-Cosplay", "Pikachu-Rock-Star", "Pikachu-Belle", "Pikachu-Pop-Star", "Pikachu-PhD", "Pikachu-Libre", "Pikachu-Original", "Pikachu-Hoenn", "Pikachu-Sinnoh", "Pikachu-Unova", "Pikachu-Kalos", "Pikachu-Alola", "Pikachu-Partner", "Pikachu-Starter", "Pikachu-World"],
    num: 236,
    gen: 2
  },
  lightclay: {
    name: "Light Clay",
    spritenum: 252,
    fling: {
      basePower: 30
    },
    // implemented in the corresponding thing
    num: 269,
    gen: 4
  },
  loadeddice: {
    name: "Loaded Dice",
    spritenum: 751,
    fling: {
      basePower: 30
    },
    // partially implemented in sim/battle-actions.ts:BattleActions#hitStepMoveHitLoop
    onModifyMove(move) {
      if (move.multiaccuracy) {
        delete move.multiaccuracy;
      }
    },
    num: 1886,
    gen: 9
  },
  lopunnite: {
    name: "Lopunnite",
    spritenum: 626,
    megaStone: "Lopunny-Mega",
    megaEvolves: "Lopunny",
    itemUser: ["Lopunny"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 768,
    gen: 6,
    isNonstandard: "Past"
  },
  loveball: {
    name: "Love Ball",
    spritenum: 258,
    num: 496,
    gen: 2,
    isPokeball: true
  },
  lovesweet: {
    name: "Love Sweet",
    spritenum: 705,
    fling: {
      basePower: 10
    },
    num: 1110,
    gen: 8
  },
  lucarionite: {
    name: "Lucarionite",
    spritenum: 594,
    megaStone: "Lucario-Mega",
    megaEvolves: "Lucario",
    itemUser: ["Lucario"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 673,
    gen: 6,
    isNonstandard: "Past"
  },
  luckypunch: {
    name: "Lucky Punch",
    spritenum: 261,
    fling: {
      basePower: 40
    },
    onModifyCritRatio(critRatio, user) {
      if (user.baseSpecies.name === "Chansey") {
        return critRatio + 2;
      }
    },
    itemUser: ["Chansey"],
    num: 256,
    gen: 2,
    isNonstandard: "Past"
  },
  lumberry: {
    name: "Lum Berry",
    spritenum: 262,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Flying"
    },
    onAfterSetStatusPriority: -1,
    onAfterSetStatus(status, pokemon) {
      pokemon.eatItem();
    },
    onUpdate(pokemon) {
      if (pokemon.status || pokemon.volatiles["confusion"]) {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      pokemon.cureStatus();
      pokemon.removeVolatile("confusion");
    },
    num: 157,
    gen: 3
  },
  luminousmoss: {
    name: "Luminous Moss",
    spritenum: 595,
    fling: {
      basePower: 30
    },
    onDamagingHit(damage, target, source, move) {
      if (move.type === "Water") {
        target.useItem();
      }
    },
    boosts: {
      spd: 1
    },
    num: 648,
    gen: 6
  },
  lunaliumz: {
    name: "Lunalium Z",
    spritenum: 686,
    onTakeItem: false,
    zMove: "Menacing Moonraze Maelstrom",
    zMoveFrom: "Moongeist Beam",
    itemUser: ["Lunala", "Necrozma-Dawn-Wings"],
    num: 922,
    gen: 7,
    isNonstandard: "Past"
  },
  lureball: {
    name: "Lure Ball",
    spritenum: 264,
    num: 494,
    gen: 2,
    isPokeball: true
  },
  lustrousglobe: {
    name: "Lustrous Globe",
    spritenum: 742,
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.num === 484 && (move.type === "Water" || move.type === "Dragon")) {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source?.baseSpecies.num === 484 || pokemon.baseSpecies.num === 484) {
        return false;
      }
      return true;
    },
    forcedForme: "Palkia-Origin",
    itemUser: ["Palkia-Origin"],
    num: 1778,
    gen: 8
  },
  lustrousorb: {
    name: "Lustrous Orb",
    spritenum: 265,
    fling: {
      basePower: 60
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (user.baseSpecies.num === 484 && (move.type === "Water" || move.type === "Dragon")) {
        return this.chainModify([4915, 4096]);
      }
    },
    itemUser: ["Palkia"],
    num: 136,
    gen: 4
  },
  luxuryball: {
    name: "Luxury Ball",
    spritenum: 266,
    num: 11,
    gen: 3,
    isPokeball: true
  },
  lycaniumz: {
    name: "Lycanium Z",
    spritenum: 689,
    onTakeItem: false,
    zMove: "Splintered Stormshards",
    zMoveFrom: "Stone Edge",
    itemUser: ["Lycanroc", "Lycanroc-Midnight", "Lycanroc-Dusk"],
    num: 925,
    gen: 7,
    isNonstandard: "Past"
  },
  machobrace: {
    name: "Macho Brace",
    spritenum: 269,
    ignoreKlutz: true,
    fling: {
      basePower: 60
    },
    onModifySpe(spe) {
      return this.chainModify(0.5);
    },
    num: 215,
    gen: 3,
    isNonstandard: "Past"
  },
  magmarizer: {
    name: "Magmarizer",
    spritenum: 272,
    fling: {
      basePower: 80
    },
    num: 323,
    gen: 4
  },
  magnet: {
    name: "Magnet",
    spritenum: 273,
    fling: {
      basePower: 30
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Electric") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 242,
    gen: 2
  },
  magoberry: {
    name: "Mago Berry",
    spritenum: 274,
    isBerry: true,
    naturalGift: {
      basePower: 80,
      type: "Ghost"
    },
    onUpdate(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onTryEatItem(item, pokemon) {
      if (!this.runEvent("TryHeal", pokemon, null, this.effect, pokemon.baseMaxhp / 3)) return false;
    },
    onEat(pokemon) {
      this.heal(pokemon.baseMaxhp / 3);
      if (pokemon.getNature().minus === "spe") {
        pokemon.addVolatile("confusion");
      }
    },
    num: 161,
    gen: 3
  },
  magostberry: {
    name: "Magost Berry",
    spritenum: 275,
    isBerry: true,
    naturalGift: {
      basePower: 90,
      type: "Rock"
    },
    onEat: false,
    num: 176,
    gen: 3,
    isNonstandard: "Past"
  },
  mail: {
    name: "Mail",
    spritenum: 403,
    onTakeItem(item, source) {
      if (!this.activeMove) return false;
      if (this.activeMove.id !== "knockoff" && this.activeMove.id !== "thief" && this.activeMove.id !== "covet") return false;
    },
    num: 137,
    gen: 2,
    isNonstandard: "Past"
  },
  malamarite: {
    name: "Malamarite",
    spritenum: 563,
    megaStone: "Malamar-Mega",
    megaEvolves: "Malamar",
    itemUser: ["Malamar"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2580,
    gen: 9,
    isNonstandard: "Future"
  },
  maliciousarmor: {
    name: "Malicious Armor",
    spritenum: 744,
    fling: {
      basePower: 30
    },
    num: 1861,
    gen: 9
  },
  manectite: {
    name: "Manectite",
    spritenum: 596,
    megaStone: "Manectric-Mega",
    megaEvolves: "Manectric",
    itemUser: ["Manectric"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 682,
    gen: 6,
    isNonstandard: "Past"
  },
  marangaberry: {
    name: "Maranga Berry",
    spritenum: 597,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Dark"
    },
    onAfterMoveSecondary(target, source, move) {
      if (move.category === "Special") {
        target.eatItem();
      }
    },
    onEat(pokemon) {
      this.boost({spd: 1});
    },
    num: 688,
    gen: 6
  },
  marshadiumz: {
    name: "Marshadium Z",
    spritenum: 654,
    onTakeItem: false,
    zMove: "Soul-Stealing 7-Star Strike",
    zMoveFrom: "Spectral Thief",
    itemUser: ["Marshadow"],
    num: 802,
    gen: 7,
    isNonstandard: "Past"
  },
  masterball: {
    name: "Master Ball",
    spritenum: 276,
    num: 1,
    gen: 1,
    isPokeball: true
  },
  masterpieceteacup: {
    name: "Masterpiece Teacup",
    spritenum: 757,
    fling: {
      basePower: 80
    },
    num: 2404,
    gen: 9
  },
  mawilite: {
    name: "Mawilite",
    spritenum: 598,
    megaStone: "Mawile-Mega",
    megaEvolves: "Mawile",
    itemUser: ["Mawile"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 681,
    gen: 6,
    isNonstandard: "Past"
  },
  meadowplate: {
    name: "Meadow Plate",
    spritenum: 282,
    onPlate: "Grass",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Grass") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Grass",
    num: 301,
    gen: 4
  },
  medichamite: {
    name: "Medichamite",
    spritenum: 599,
    megaStone: "Medicham-Mega",
    megaEvolves: "Medicham",
    itemUser: ["Medicham"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 665,
    gen: 6,
    isNonstandard: "Past"
  },
  meganiumite: {
    name: "Meganiumite",
    spritenum: 548,
    megaStone: "Meganium-Mega",
    megaEvolves: "Meganium",
    itemUser: ["Meganium"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 2563,
    gen: 9,
    isNonstandard: "Future"
  },
  mentalherb: {
    name: "Mental Herb",
    spritenum: 285,
    fling: {
      basePower: 10,
      effect(pokemon) {
        const conditions = ["attract", "taunt", "encore", "torment", "disable", "healblock"];
        for (const firstCondition of conditions) {
          if (pokemon.volatiles[firstCondition]) {
            for (const secondCondition of conditions) {
              pokemon.removeVolatile(secondCondition);
              if (firstCondition === "attract" && secondCondition === "attract") {
                this.add("-end", pokemon, "move: Attract", "[from] item: Mental Herb");
              }
            }
            return;
          }
        }
      }
    },
    onUpdate(pokemon) {
      const conditions = ["attract", "taunt", "encore", "torment", "disable", "healblock"];
      for (const firstCondition of conditions) {
        if (pokemon.volatiles[firstCondition]) {
          if (!pokemon.useItem()) return;
          for (const secondCondition of conditions) {
            pokemon.removeVolatile(secondCondition);
            if (firstCondition === "attract" && secondCondition === "attract") {
              this.add("-end", pokemon, "move: Attract", "[from] item: Mental Herb");
            }
          }
          return;
        }
      }
    },
    num: 219,
    gen: 3
  },
  metagrossite: {
    name: "Metagrossite",
    spritenum: 618,
    megaStone: "Metagross-Mega",
    megaEvolves: "Metagross",
    itemUser: ["Metagross"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 758,
    gen: 6,
    isNonstandard: "Past"
  },
  metalalloy: {
    name: "Metal Alloy",
    spritenum: 761,
    num: 2482,
    gen: 9
  },
  metalcoat: {
    name: "Metal Coat",
    spritenum: 286,
    fling: {
      basePower: 30
    },
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Steel") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 233,
    gen: 2
  },
  metalpowder: {
    name: "Metal Powder",
    fling: {
      basePower: 10
    },
    spritenum: 287,
    onModifyDefPriority: 2,
    onModifyDef(def, pokemon) {
      if (pokemon.species.name === "Ditto" && !pokemon.transformed) {
        return this.chainModify(2);
      }
    },
    itemUser: ["Ditto"],
    num: 257,
    gen: 2,
    isNonstandard: "Past"
  },
  metronome: {
    name: "Metronome",
    spritenum: 289,
    fling: {
      basePower: 30
    },
    onStart(pokemon) {
      pokemon.addVolatile("metronome");
    },
    condition: {
      onStart(pokemon) {
        this.effectState.lastMove = "";
        this.effectState.numConsecutive = 0;
      },
      onTryMovePriority: -2,
      onTryMove(pokemon, target, move) {
        if (!pokemon.hasItem("metronome")) {
          pokemon.removeVolatile("metronome");
          return;
        }
        if (move.callsMove) return;
        if (this.effectState.lastMove === move.id && pokemon.moveLastTurnResult) {
          this.effectState.numConsecutive++;
        } else if (pokemon.volatiles["twoturnmove"]) {
          if (this.effectState.lastMove !== move.id) {
            this.effectState.numConsecutive = 1;
          } else {
            this.effectState.numConsecutive++;
          }
        } else {
          this.effectState.numConsecutive = 0;
        }
        this.effectState.lastMove = move.id;
      },
      onModifyDamage(damage, source, target, move) {
        const dmgMod = [4096, 4915, 5734, 6553, 7372, 8192];
        const numConsecutive = this.effectState.numConsecutive > 5 ? 5 : this.effectState.numConsecutive;
        this.debug(`Current Metronome boost: ${dmgMod[numConsecutive]}/4096`);
        return this.chainModify([dmgMod[numConsecutive], 4096]);
      }
    },
    num: 277,
    gen: 4
  },
  mewniumz: {
    name: "Mewnium Z",
    spritenum: 658,
    onTakeItem: false,
    zMove: "Genesis Supernova",
    zMoveFrom: "Psychic",
    itemUser: ["Mew"],
    num: 806,
    gen: 7,
    isNonstandard: "Past"
  },
  mewtwonitex: {
    name: "Mewtwonite X",
    spritenum: 600,
    megaStone: "Mewtwo-Mega-X",
    megaEvolves: "Mewtwo",
    itemUser: ["Mewtwo"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 662,
    gen: 6,
    isNonstandard: "Past"
  },
  mewtwonitey: {
    name: "Mewtwonite Y",
    spritenum: 601,
    megaStone: "Mewtwo-Mega-Y",
    megaEvolves: "Mewtwo",
    itemUser: ["Mewtwo"],
    onTakeItem(item, source) {
      if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
      return true;
    },
    num: 663,
    gen: 6,
    isNonstandard: "Past"
  },
  micleberry: {
    name: "Micle Berry",
    spritenum: 290,
    isBerry: true,
    naturalGift: {
      basePower: 100,
      type: "Rock"
    },
    onResidual(pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 4 || pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility("gluttony") && pokemon.abilityState.gluttony) {
        pokemon.eatItem();
      }
    },
    onEat(pokemon) {
      pokemon.addVolatile("micleberry");
    },
    condition: {
      duration: 2,
      onSourceAccuracy(accuracy, target, source, move) {
        if (!move.ohko) {
          this.add("-enditem", source, "Micle Berry");
          source.removeVolatile("micleberry");
          if (typeof accuracy === "number") {
            return this.chainModify([4915, 4096]);
          }
        }
      }
    },
    num: 209,
    gen: 4
  },
  mimikiumz: {
    name: "Mimikium Z",
    spritenum: 688,
    onTakeItem: false,
    zMove: "Let's Snuggle Forever",
    zMoveFrom: "Play Rough",
    itemUser: ["Mimikyu", "Mimikyu-Busted", "Mimikyu-Totem", "Mimikyu-Busted-Totem"],
    num: 924,
    isNonstandard: "Past",
    gen: 7
  },
  mindplate: {
    name: "Mind Plate",
    spritenum: 291,
    onPlate: "Psychic",
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Psychic") {
        return this.chainModify([4915, 4096]);
      }
    },
    onTakeItem(item, pokemon, source) {
      if (source && source.baseSpecies.num === 493 || pokemon.baseSpecies.num === 493) {
        return false;
      }
      return true;
    },
    forcedForme: "Arceus-Psychic",
    num: 307,
    gen: 4
  },
  miracleseed: {
    name: "Miracle Seed",
    fling: {
      basePower: 30
    },
    spritenum: 292,
    onBasePowerPriority: 15,
    onBasePower(basePower, user, target, move) {
      if (move.type === "Grass") {
        return this.chainModify([4915, 4096]);
      }
    },
    num: 239,
    gen: 2
  },
  mirrorherb: {
    name: "Mirror Herb",
    spritenum: 748,
    fling: {
      basePower: 30
    },
    onFoeAfterBoost(boost, target, source, effect) {
      if (effect?.name === "Opportunist" || effect?.name === "Mirror Herb") return;
      if (!this.effectState.boosts) this.effectState.boosts = {};
    }
  }
};