/* 自动生成，来源：./abilities.js */
export const BattleAbilities = {
  noability: {
    isNonstandard: "Past",
    flags: {},
    name: "No Ability",
    rating: 0.1,
    num: 0
  },
  adaptability: {
    onModifySTAB(stab, source, target, move) {
      if (move.forceSTAB || source.hasType(move.type)) {
        if (stab === 2) {
          return 2.25;
        }
        return 2;
      }
    },
    flags: {},
    name: "Adaptability",
    rating: 4,
    num: 91
  },
  aerilate: {
    onModifyTypePriority: -1,
    onModifyType(move, pokemon) {
      const noModifyType = [
        "judgment",
        "multiattack",
        "naturalgift",
        "revelationdance",
        "technoblast",
        "terrainpulse",
        "weatherball"
      ];
      if (move.type === "Normal" && (!noModifyType.includes(move.id) || this.activeMove?.isMax) && !(move.isZ && move.category !== "Status") && !(move.name === "Tera Blast" && pokemon.terastallized)) {
        move.type = "Flying";
        move.typeChangerBoosted = this.effect;
      }
    },
    onBasePowerPriority: 23,
    onBasePower(basePower, pokemon, target, move) {
      if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
    },
    flags: {},
    name: "Aerilate",
    rating: 4,
    num: 184
  },
  aftermath: {
    onDamagingHitOrder: 1,
    onDamagingHit(damage, target, source, move) {
      if (!target.hp && this.checkMoveMakesContact(move, source, target, true)) {
        this.damage(source.baseMaxhp / 4, source, target);
      }
    },
    flags: {},
    name: "Aftermath",
    rating: 2,
    num: 106
  },
  airlock: {
    onSwitchIn(pokemon) {
      this.add("-ability", pokemon, "Air Lock");
      this.effect.onStart.call(this, pokemon);
    },
    onStart(pokemon) {
      pokemon.abilityState.ending = false;
      this.eachEvent("WeatherChange", this.effect);
    },
    onEnd(pokemon) {
      pokemon.abilityState.ending = true;
      this.eachEvent("WeatherChange", this.effect);
    },
    suppressWeather: true,
    flags: {},
    name: "Air Lock",
    rating: 1.5,
    num: 76
  },
  analytic: {
    onBasePowerPriority: 21,
    onBasePower(basePower, pokemon) {
      let boosted = true;
      for (const target of this.getAllActive()) {
        if (target === pokemon) continue;
        if (this.queue.willMove(target)) {
          boosted = false;
          break;
        }
      }
      if (boosted) {
        this.debug("Analytic boost");
        return this.chainModify([5325, 4096]);
      }
    },
    flags: {},
    name: "Analytic",
    rating: 2.5,
    num: 148
  },
  angerpoint: {
    onHit(target, source, move) {
      if (!target.hp) return;
      if (move?.effectType === "Move" && target.getMoveHitData(move).crit) {
        this.boost({atk: 12}, target, target);
      }
    },
    flags: {},
    name: "Anger Point",
    rating: 1,
    num: 83
  },
  angershell: {
    onDamage(damage, target, source, effect) {
      if (effect.effectType === "Move" && !effect.multihit && !(effect.hasSheerForce && source.hasAbility("sheerforce"))) {
        this.effectState.checkedAngerShell = false;
      } else {
        this.effectState.checkedAngerShell = true;
      }
    },
    onTryEatItem(item) {
      const healingItems = [
        "aguavberry",
        "enigmaberry",
        "figyberry",
        "iapapaberry",
        "magoberry",
        "sitrusberry",
        "wikiberry",
        "oranberry",
        "berryjuice"
      ];
      if (healingItems.includes(item.id)) {
        return this.effectState.checkedAngerShell;
      }
      return true;
    },
    onAfterMoveSecondary(target, source, move) {
      this.effectState.checkedAngerShell = true;
      if (!source || source === target || !target.hp || !move.totalDamage) return;
      const lastAttackedBy = target.getLastAttackedBy();
      if (!lastAttackedBy) return;
      const damage = move.multihit ? move.totalDamage : lastAttackedBy.damage;
      if (target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2) {
        this.boost({atk: 1, spa: 1, spe: 1, def: -1, spd: -1}, target, target);
      }
    },
    flags: {},
    name: "Anger Shell",
    rating: 3,
    num: 271
  },
  anticipation: {
    onStart(pokemon) {
      for (const target of pokemon.foes()) {
        for (const moveSlot of target.moveSlots) {
          const move = this.dex.moves.get(moveSlot.move);
          if (move.category === "Status") continue;
          const moveType = move.id === "hiddenpower" ? target.hpType : move.type;
          if (this.dex.getImmunity(moveType, pokemon) && this.dex.getEffectiveness(moveType, pokemon) > 0 || move.ohko) {
            this.add("-ability", pokemon, "Anticipation");
            return;
          }
        }
      }
    },
    flags: {},
    name: "Anticipation",
    rating: 0.5,
    num: 107
  },
  arenatrap: {
    onFoeTrapPokemon(pokemon) {
      if (!pokemon.isAdjacent(this.effectState.target)) return;
      if (pokemon.isGrounded()) {
        pokemon.tryTrap(true);
      }
    },
    onFoeMaybeTrapPokemon(pokemon, source) {
      if (!source) source = this.effectState.target;
      if (!source || !pokemon.isAdjacent(source)) return;
      if (pokemon.isGrounded(!pokemon.knownType)) {
        pokemon.maybeTrapped = true;
      }
    },
    flags: {},
    name: "Arena Trap",
    rating: 5,
    num: 71
  },
  armortail: {
    onFoeTryMove(target, source, move) {
      const targetAllExceptions = ["perishsong", "flowershield", "rototiller"];
      if (move.target === "foeSide" || move.target === "all" && !targetAllExceptions.includes(move.id)) {
        return;
      }
      const armorTailHolder = this.effectState.target;
      if ((source.isAlly(armorTailHolder) || move.target === "all") && move.priority > 0.1) {
        this.attrLastMove("[still]");
        this.add("cant", armorTailHolder, "ability: Armor Tail", move, `[of] ${target}`);
        return false;
      }
    },
    flags: {breakable: 1},
    name: "Armor Tail",
    rating: 2.5,
    num: 296
  },
  aromaveil: {
    onAllyTryAddVolatile(status, target, source, effect) {
      if (["attract", "disable", "encore", "healblock", "taunt", "torment"].includes(status.id)) {
        if (effect.effectType === "Move") {
          const effectHolder = this.effectState.target;
          this.add("-block", target, "ability: Aroma Veil", `[of] ${effectHolder}`);
        }
        return null;
      }
    },
    flags: {breakable: 1},
    name: "Aroma Veil",
    rating: 2,
    num: 165
  },
  asoneglastrier: {
    onSwitchInPriority: 1,
    onStart(pokemon) {
      if (this.effectState.unnerved) return;
      this.add("-ability", pokemon, "As One");
      this.add("-ability", pokemon, "Unnerve");
      this.effectState.unnerved = true;
    },
    onEnd() {
      this.effectState.unnerved = false;
    },
    onFoeTryEatItem() {
      return !this.effectState.unnerved;
    },
    onSourceAfterFaint(length, target, source, effect) {
      if (effect && effect.effectType === "Move") {
        this.boost({atk: length}, source, source, this.dex.abilities.get("chillingneigh"));
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1},
    name: "As One (Glastrier)",
    rating: 3.5,
    num: 266
  },
  asonespectrier: {
    onSwitchInPriority: 1,
    onStart(pokemon) {
      if (this.effectState.unnerved) return;
      this.add("-ability", pokemon, "As One");
      this.add("-ability", pokemon, "Unnerve");
      this.effectState.unnerved = true;
    },
    onEnd() {
      this.effectState.unnerved = false;
    },
    onFoeTryEatItem() {
      return !this.effectState.unnerved;
    },
    onSourceAfterFaint(length, target, source, effect) {
      if (effect && effect.effectType === "Move") {
        this.boost({spa: length}, source, source, this.dex.abilities.get("grimneigh"));
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1},
    name: "As One (Spectrier)",
    rating: 3.5,
    num: 267
  },
  aurabreak: {
    onStart(pokemon) {
      this.add("-ability", pokemon, "Aura Break");
    },
    onAnyTryPrimaryHit(target, source, move) {
      if (target === source || move.category === "Status") return;
      move.hasAuraBreak = true;
    },
    flags: {breakable: 1},
    name: "Aura Break",
    rating: 1,
    num: 188
  },
  baddreams: {
    onResidualOrder: 28,
    onResidualSubOrder: 2,
    onResidual(pokemon) {
      if (!pokemon.hp) return;
      for (const target of pokemon.foes()) {
        if (target.status === "slp" || target.hasAbility("comatose")) {
          this.damage(target.baseMaxhp / 8, target, pokemon);
        }
      }
    },
    flags: {},
    name: "Bad Dreams",
    rating: 1.5,
    num: 123
  },
  ballfetch: {
    flags: {},
    name: "Ball Fetch",
    rating: 0,
    num: 237
  },
  battery: {
    onAllyBasePowerPriority: 22,
    onAllyBasePower(basePower, attacker, defender, move) {
      if (attacker !== this.effectState.target && move.category === "Special") {
        this.debug("Battery boost");
        return this.chainModify([5325, 4096]);
      }
    },
    flags: {},
    name: "Battery",
    rating: 0,
    num: 217
  },
  battlearmor: {
    onCriticalHit: false,
    flags: {breakable: 1},
    name: "Battle Armor",
    rating: 1,
    num: 4
  },
  battlebond: {
    onSourceAfterFaint(length, target, source, effect) {
      if (source.bondTriggered) return;
      if (effect?.effectType !== "Move") return;
      if (source.species.id === "greninjabond" && source.hp && !source.transformed && source.side.foePokemonLeft()) {
        this.boost({atk: 1, spa: 1, spe: 1}, source, source, this.effect);
        this.add("-activate", source, "ability: Battle Bond");
        source.bondTriggered = true;
      }
    },
    onModifyMovePriority: -1,
    onModifyMove(move, attacker) {
      if (move.id === "watershuriken" && attacker.species.name === "Greninja-Ash" && !attacker.transformed) {
        move.multihit = 3;
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1},
    name: "Battle Bond",
    rating: 3.5,
    num: 210
  },
  beadsofruin: {
    onStart(pokemon) {
      if (this.suppressingAbility(pokemon)) return;
      this.add("-ability", pokemon, "Beads of Ruin");
    },
    onAnyModifySpD(spd, target, source, move) {
      const abilityHolder = this.effectState.target;
      if (target.hasAbility("Beads of Ruin")) return;
      if (!move.ruinedSpD?.hasAbility("Beads of Ruin")) move.ruinedSpD = abilityHolder;
      if (move.ruinedSpD !== abilityHolder) return;
      this.debug("Beads of Ruin SpD drop");
      return this.chainModify(0.75);
    },
    flags: {},
    name: "Beads of Ruin",
    rating: 4.5,
    num: 284
  },
  beastboost: {
    onSourceAfterFaint(length, target, source, effect) {
      if (effect && effect.effectType === "Move") {
        const bestStat = source.getBestStat(true, true);
        this.boost({[bestStat]: length}, source);
      }
    },
    flags: {},
    name: "Beast Boost",
    rating: 3.5,
    num: 224
  },
  berserk: {
    onDamage(damage, target, source, effect) {
      if (effect.effectType === "Move" && !effect.multihit && !(effect.hasSheerForce && source.hasAbility("sheerforce"))) {
        this.effectState.checkedBerserk = false;
      } else {
        this.effectState.checkedBerserk = true;
      }
    },
    onTryEatItem(item) {
      const healingItems = [
        "aguavberry",
        "enigmaberry",
        "figyberry",
        "iapapaberry",
        "magoberry",
        "sitrusberry",
        "wikiberry",
        "oranberry",
        "berryjuice"
      ];
      if (healingItems.includes(item.id)) {
        return this.effectState.checkedBerserk;
      }
      return true;
    },
    onAfterMoveSecondary(target, source, move) {
      this.effectState.checkedBerserk = true;
      if (!source || source === target || !target.hp || !move.totalDamage) return;
      const lastAttackedBy = target.getLastAttackedBy();
      if (!lastAttackedBy) return;
      const damage = move.multihit && !move.smartTarget ? move.totalDamage : lastAttackedBy.damage;
      if (target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2) {
        this.boost({spa: 1}, target, target);
      }
    },
    flags: {},
    name: "Berserk",
    rating: 2,
    num: 201
  },
  bigpecks: {
    onTryBoost(boost, target, source, effect) {
      if (source && target === source) return;
      if (boost.def && boost.def < 0) {
        delete boost.def;
        if (!effect.secondaries && effect.id !== "octolock") {
          this.add("-fail", target, "unboost", "Defense", "[from] ability: Big Pecks", `[of] ${target}`);
        }
      }
    },
    flags: {breakable: 1},
    name: "Big Pecks",
    rating: 0.5,
    num: 145
  },
  blaze: {
    onModifyAtkPriority: 5,
    onModifyAtk(atk, attacker, defender, move) {
      if (move.type === "Fire" && attacker.hp <= attacker.maxhp / 3) {
        this.debug("Blaze boost");
        return this.chainModify(1.5);
      }
    },
    onModifySpAPriority: 5,
    onModifySpA(atk, attacker, defender, move) {
      if (move.type === "Fire" && attacker.hp <= attacker.maxhp / 3) {
        this.debug("Blaze boost");
        return this.chainModify(1.5);
      }
    },
    flags: {},
    name: "Blaze",
    rating: 2,
    num: 66
  },
  bulletproof: {
    onTryHit(pokemon, target, move) {
      if (move.flags["bullet"]) {
        this.add("-immune", pokemon, "[from] ability: Bulletproof");
        return null;
      }
    },
    flags: {breakable: 1},
    name: "Bulletproof",
    rating: 3,
    num: 171
  },
  cheekpouch: {
    onEatItem(item, pokemon) {
      this.heal(pokemon.baseMaxhp / 3);
    },
    flags: {},
    name: "Cheek Pouch",
    rating: 2,
    num: 167
  },
  chillingneigh: {
    onSourceAfterFaint(length, target, source, effect) {
      if (effect && effect.effectType === "Move") {
        this.boost({atk: length}, source);
      }
    },
    flags: {},
    name: "Chilling Neigh",
    rating: 3,
    num: 264
  },
  chlorophyll: {
    onModifySpe(spe, pokemon) {
      if (["sunnyday", "desolateland"].includes(pokemon.effectiveWeather())) {
        return this.chainModify(2);
      }
    },
    flags: {},
    name: "Chlorophyll",
    rating: 3,
    num: 34
  },
  clearbody: {
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
        this.add("-fail", target, "unboost", "[from] ability: Clear Body", `[of] ${target}`);
      }
    },
    flags: {breakable: 1},
    name: "Clear Body",
    rating: 2,
    num: 29
  },
  cloudnine: {
    onSwitchIn(pokemon) {
      this.add("-ability", pokemon, "Cloud Nine");
      this.effect.onStart.call(this, pokemon);
    },
    onStart(pokemon) {
      pokemon.abilityState.ending = false;
      this.eachEvent("WeatherChange", this.effect);
    },
    onEnd(pokemon) {
      pokemon.abilityState.ending = true;
      this.eachEvent("WeatherChange", this.effect);
    },
    suppressWeather: true,
    flags: {},
    name: "Cloud Nine",
    rating: 1.5,
    num: 13
  },
  colorchange: {
    onAfterMoveSecondary(target, source, move) {
      if (!target.hp) return;
      const type = move.type;
      if (target.isActive && move.effectType === "Move" && move.category !== "Status" && type !== "???" && !target.hasType(type)) {
        if (!target.setType(type)) return false;
        this.add("-start", target, "typechange", type, "[from] ability: Color Change");
        if (target.side.active.length === 2 && target.position === 1) {
          const action = this.queue.willMove(target);
          if (action && action.move.id === "curse") {
            action.targetLoc = -1;
          }
        }
      }
    },
    flags: {},
    name: "Color Change",
    rating: 0,
    num: 16
  },
  comatose: {
    onStart(pokemon) {
      this.add("-ability", pokemon, "Comatose");
    },
    onSetStatus(status, target, source, effect) {
      if (effect?.status) {
        this.add("-immune", target, "[from] ability: Comatose");
      }
      return false;
    },
    // Permanent sleep "status" implemented in the relevant sleep-checking effects
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1},
    name: "Comatose",
    rating: 4,
    num: 213
  },
  commander: {
    onAnySwitchInPriority: -2,
    onAnySwitchIn() {
      this.effect.onUpdate.call(this, this.effectState.target);
    },
    onStart(pokemon) {
      this.effect.onUpdate.call(this, pokemon);
    },
    onUpdate(pokemon) {
      if (this.gameType !== "doubles") return;
      if (this.queue.peek()?.choice === "runSwitch") return;
      const ally = pokemon.allies()[0];
      if (pokemon.switchFlag || ally?.switchFlag) return;
      if (!ally || pokemon.baseSpecies.baseSpecies !== "Tatsugiri" || ally.baseSpecies.baseSpecies !== "Dondozo") {
        if (pokemon.getVolatile("commanding")) pokemon.removeVolatile("commanding");
        return;
      }
      if (!pokemon.getVolatile("commanding")) {
        if (ally.getVolatile("commanded")) return;
        this.queue.cancelAction(pokemon);
        this.add("-activate", pokemon, "ability: Commander", `[of] ${ally}`);
        pokemon.addVolatile("commanding");
        ally.addVolatile("commanded", pokemon);
      } else {
        if (!ally.fainted) return;
        pokemon.removeVolatile("commanding");
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1},
    name: "Commander",
    rating: 0,
    num: 279
  },
  competitive: {
    onAfterEachBoost(boost, target, source, effect) {
      if (!source || target.isAlly(source)) {
        return;
      }
      let statsLowered = false;
      let i;
      for (i in boost) {
        if (boost[i] < 0) {
          statsLowered = true;
        }
      }
      if (statsLowered) {
        this.boost({spa: 2}, target, target, null, false, true);
      }
    },
    flags: {},
    name: "Competitive",
    rating: 2.5,
    num: 172
  },
  compoundeyes: {
    onSourceModifyAccuracyPriority: -1,
    onSourceModifyAccuracy(accuracy) {
      if (typeof accuracy !== "number") return;
      this.debug("compoundeyes - enhancing accuracy");
      return this.chainModify([5325, 4096]);
    },
    flags: {},
    name: "Compound Eyes",
    rating: 3,
    num: 14
  },
  contrary: {
    onChangeBoost(boost, target, source, effect) {
      if (effect && effect.id === "zpower") return;
      let i;
      for (i in boost) {
        boost[i] *= -1;
      }
    },
    flags: {breakable: 1},
    name: "Contrary",
    rating: 4.5,
    num: 126
  },
  corrosion: {
    // Implemented in sim/pokemon.js:Pokemon#setStatus
    flags: {},
    name: "Corrosion",
    rating: 2.5,
    num: 212
  },
  costar: {
    onSwitchInPriority: -2,
    onStart(pokemon) {
      const ally = pokemon.allies()[0];
      if (!ally) return;
      let i;
      for (i in ally.boosts) {
        pokemon.boosts[i] = ally.boosts[i];
      }
      const volatilesToCopy = ["dragoncheer", "focusenergy", "gmaxchistrike", "laserfocus"];
      for (const volatile of volatilesToCopy) pokemon.removeVolatile(volatile);
      for (const volatile of volatilesToCopy) {
        if (ally.volatiles[volatile]) {
          pokemon.addVolatile(volatile);
          if (volatile === "gmaxchistrike") pokemon.volatiles[volatile].layers = ally.volatiles[volatile].layers;
          if (volatile === "dragoncheer") pokemon.volatiles[volatile].hasDragonType = ally.volatiles[volatile].hasDragonType;
        }
      }
      this.add("-copyboost", pokemon, ally, "[from] ability: Costar");
    },
    flags: {},
    name: "Costar",
    rating: 0,
    num: 294
  },
  cottondown: {
    onDamagingHit(damage, target, source, move) {
      let activated = false;
      for (const pokemon of this.getAllActive()) {
        if (pokemon === target || pokemon.fainted) continue;
        if (!activated) {
          this.add("-ability", target, "Cotton Down");
          activated = true;
        }
        this.boost({spe: -1}, pokemon, target, null, true);
      }
    },
    flags: {},
    name: "Cotton Down",
    rating: 2,
    num: 238
  },
  cudchew: {
    onEatItem(item, pokemon, source, effect) {
      if (item.isBerry && (!effect || !["bugbite", "pluck"].includes(effect.id))) {
        this.effectState.berry = item;
        this.effectState.counter = 2;
        if (!this.queue.peek()) this.effectState.counter--;
      }
    },
    onResidualOrder: 28,
    onResidualSubOrder: 2,
    onResidual(pokemon) {
      if (!this.effectState.berry || !pokemon.hp) return;
      if (--this.effectState.counter <= 0) {
        const item = this.effectState.berry;
        this.add("-activate", pokemon, "ability: Cud Chew");
        this.add("-enditem", pokemon, item.name, "[eat]");
        if (this.singleEvent("Eat", item, null, pokemon, null, null)) {
          this.runEvent("EatItem", pokemon, null, null, item);
        }
        if (item.onEat) pokemon.ateBerry = true;
        delete this.effectState.berry;
        delete this.effectState.counter;
      }
    },
    flags: {},
    name: "Cud Chew",
    rating: 2,
    num: 291
  },
  curiousmedicine: {
    onStart(pokemon) {
      for (const ally of pokemon.adjacentAllies()) {
        ally.clearBoosts();
        this.add("-clearboost", ally, "[from] ability: Curious Medicine", `[of] ${pokemon}`);
      }
    },
    flags: {},
    name: "Curious Medicine",
    rating: 0,
    num: 261
  },
  cursedbody: {
    onDamagingHit(damage, target, source, move) {
      if (source.volatiles["disable"]) return;
      if (!move.isMax && !move.flags["futuremove"] && move.id !== "struggle") {
        if (this.randomChance(3, 10)) {
          source.addVolatile("disable", this.effectState.target);
        }
      }
    },
    flags: {},
    name: "Cursed Body",
    rating: 2,
    num: 130
  },
  cutecharm: {
    onDamagingHit(damage, target, source, move) {
      if (this.checkMoveMakesContact(move, source, target)) {
        if (this.randomChance(3, 10)) {
          source.addVolatile("attract", this.effectState.target);
        }
      }
    },
    flags: {},
    name: "Cute Charm",
    rating: 0.5,
    num: 56
  },
  damp: {
    onAnyTryMove(target, source, effect) {
      if (["explosion", "mindblown", "mistyexplosion", "selfdestruct"].includes(effect.id)) {
        this.attrLastMove("[still]");
        this.add("cant", this.effectState.target, "ability: Damp", effect, `[of] ${target}`);
        return false;
      }
    },
    onAnyDamage(damage, target, source, effect) {
      if (effect && effect.name === "Aftermath") {
        return false;
      }
    },
    flags: {breakable: 1},
    name: "Damp",
    rating: 0.5,
    num: 6
  },
  dancer: {
    flags: {},
    name: "Dancer",
    // implemented in runMove in scripts.js
    rating: 1.5,
    num: 216
  },
  darkaura: {
    onStart(pokemon) {
      if (this.suppressingAbility(pokemon)) return;
      this.add("-ability", pokemon, "Dark Aura");
    },
    onAnyBasePowerPriority: 20,
    onAnyBasePower(basePower, source, target, move) {
      if (target === source || move.category === "Status" || move.type !== "Dark") return;
      if (!move.auraBooster?.hasAbility("Dark Aura")) move.auraBooster = this.effectState.target;
      if (move.auraBooster !== this.effectState.target) return;
      return this.chainModify([move.hasAuraBreak ? 3072 : 5448, 4096]);
    },
    flags: {},
    name: "Dark Aura",
    rating: 3,
    num: 186
  },
  dauntlessshield: {
    onStart(pokemon) {
      if (pokemon.shieldBoost) return;
      pokemon.shieldBoost = true;
      this.boost({def: 1}, pokemon);
    },
    flags: {},
    name: "Dauntless Shield",
    rating: 3.5,
    num: 235
  },
  dazzling: {
    onFoeTryMove(target, source, move) {
      const targetAllExceptions = ["perishsong", "flowershield", "rototiller"];
      if (move.target === "foeSide" || move.target === "all" && !targetAllExceptions.includes(move.id)) {
        return;
      }
      const dazzlingHolder = this.effectState.target;
      if ((source.isAlly(dazzlingHolder) || move.target === "all") && move.priority > 0.1) {
        this.attrLastMove("[still]");
        this.add("cant", dazzlingHolder, "ability: Dazzling", move, `[of] ${target}`);
        return false;
      }
    },
    flags: {breakable: 1},
    name: "Dazzling",
    rating: 2.5,
    num: 219
  },
  defeatist: {
    onModifyAtkPriority: 5,
    onModifyAtk(atk, pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 2) {
        return this.chainModify(0.5);
      }
    },
    onModifySpAPriority: 5,
    onModifySpA(atk, pokemon) {
      if (pokemon.hp <= pokemon.maxhp / 2) {
        return this.chainModify(0.5);
      }
    },
    flags: {},
    name: "Defeatist",
    rating: -1,
    num: 129
  },
  defiant: {
    onAfterEachBoost(boost, target, source, effect) {
      if (!source || target.isAlly(source)) {
        return;
      }
      let statsLowered = false;
      let i;
      for (i in boost) {
        if (boost[i] < 0) {
          statsLowered = true;
        }
      }
      if (statsLowered) {
        this.boost({atk: 2}, target, target, null, false, true);
      }
    },
    flags: {},
    name: "Defiant",
    rating: 3,
    num: 128
  },
  deltastream: {
    onStart(source) {
      this.field.setWeather("deltastream");
    },
    onAnySetWeather(target, source, weather) {
      const strongWeathers = ["desolateland", "primordialsea", "deltastream"];
      if (this.field.getWeather().id === "deltastream" && !strongWeathers.includes(weather.id)) return false;
    },
    onEnd(pokemon) {
      if (this.field.weatherState.source !== pokemon) return;
      for (const target of this.getAllActive()) {
        if (target === pokemon) continue;
        if (target.hasAbility("deltastream")) {
          this.field.weatherState.source = target;
          return;
        }
      }
      this.field.clearWeather();
    },
    flags: {},
    name: "Delta Stream",
    rating: 4,
    num: 191
  },
  desolateland: {
    onStart(source) {
      this.field.setWeather("desolateland");
    },
    onAnySetWeather(target, source, weather) {
      const strongWeathers = ["desolateland", "primordialsea", "deltastream"];
      if (this.field.getWeather().id === "desolateland" && !strongWeathers.includes(weather.id)) return false;
    },
    onEnd(pokemon) {
      if (this.field.weatherState.source !== pokemon) return;
      for (const target of this.getAllActive()) {
        if (target === pokemon) continue;
        if (target.hasAbility("desolateland")) {
          this.field.weatherState.source = target;
          return;
        }
      }
      this.field.clearWeather();
    },
    flags: {},
    name: "Desolate Land",
    rating: 4.5,
    num: 190
  },
  disguise: {
    onDamagePriority: 1,
    onDamage(damage, target, source, effect) {
      if (effect?.effectType === "Move" && ["mimikyu", "mimikyutotem"].includes(target.species.id)) {
        this.add("-activate", target, "ability: Disguise");
        this.effectState.busted = true;
        return 0;
      }
    },
    onCriticalHit(target, source, move) {
      if (!target) return;
      if (!["mimikyu", "mimikyutotem"].includes(target.species.id)) {
        return;
      }
      const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
      if (hitSub) return;
      if (!target.runImmunity(move)) return;
      return false;
    },
    onEffectiveness(typeMod, target, type, move) {
      if (!target || move.category === "Status") return;
      if (!["mimikyu", "mimikyutotem"].includes(target.species.id)) {
        return;
      }
      const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
      if (hitSub) return;
      if (!target.runImmunity(move)) return;
      return 0;
    },
    onUpdate(pokemon) {
      if (["mimikyu", "mimikyutotem"].includes(pokemon.species.id) && this.effectState.busted) {
        const speciesid = pokemon.species.id === "mimikyutotem" ? "Mimikyu-Busted-Totem" : "Mimikyu-Busted";
        pokemon.formeChange(speciesid, this.effect, true);
        this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, this.dex.species.get(speciesid));
      }
    },
    flags: {
      failroleplay: 1,
      noreceiver: 1,
      noentrain: 1,
      notrace: 1,
      failskillswap: 1,
      cantsuppress: 1,
      breakable: 1,
      notransform: 1
    },
    name: "Disguise",
    rating: 3.5,
    num: 209
  },
  download: {
    onStart(pokemon) {
      let totaldef = 0;
      let totalspd = 0;
      for (const target of pokemon.foes()) {
        totaldef += target.getStat("def", false, true);
        totalspd += target.getStat("spd", false, true);
      }
      if (totaldef && totaldef >= totalspd) {
        this.boost({spa: 1});
      } else if (totalspd) {
        this.boost({atk: 1});
      }
    },
    flags: {},
    name: "Download",
    rating: 3.5,
    num: 88
  },
  dragonsmaw: {
    onModifyAtkPriority: 5,
    onModifyAtk(atk, attacker, defender, move) {
      if (move.type === "Dragon") {
        this.debug("Dragon's Maw boost");
        return this.chainModify(1.5);
      }
    },
    onModifySpAPriority: 5,
    onModifySpA(atk, attacker, defender, move) {
      if (move.type === "Dragon") {
        this.debug("Dragon's Maw boost");
        return this.chainModify(1.5);
      }
    },
    flags: {},
    name: "Dragon's Maw",
    rating: 3.5,
    num: 263
  },
  drizzle: {
    onStart(source) {
      if (source.species.id === "kyogre" && source.item === "blueorb") return;
      this.field.setWeather("raindance");
    },
    flags: {},
    name: "Drizzle",
    rating: 4,
    num: 2
  },
  drought: {
    onStart(source) {
      if (source.species.id === "groudon" && source.item === "redorb") return;
      this.field.setWeather("sunnyday");
    },
    flags: {},
    name: "Drought",
    rating: 4,
    num: 70
  },
  dryskin: {
    onTryHit(target, source, move) {
      if (target !== source && move.type === "Water") {
        if (!this.heal(target.baseMaxhp / 4)) {
          this.add("-immune", target, "[from] ability: Dry Skin");
        }
        return null;
      }
    },
    onSourceBasePowerPriority: 17,
    onSourceBasePower(basePower, attacker, defender, move) {
      if (move.type === "Fire") {
        return this.chainModify(1.25);
      }
    },
    onWeather(target, source, effect) {
      if (target.hasItem("utilityumbrella")) return;
      if (effect.id === "raindance" || effect.id === "primordialsea") {
        this.heal(target.baseMaxhp / 8);
      } else if (effect.id === "sunnyday" || effect.id === "desolateland") {
        this.damage(target.baseMaxhp / 8, target, target);
      }
    },
    flags: {breakable: 1},
    name: "Dry Skin",
    rating: 3,
    num: 87
  },
  earlybird: {
    flags: {},
    name: "Early Bird",
    // Implemented in statuses.js
    rating: 1.5,
    num: 48
  },
  eartheater: {
    onTryHit(target, source, move) {
      if (target !== source && move.type === "Ground") {
        if (!this.heal(target.baseMaxhp / 4)) {
          this.add("-immune", target, "[from] ability: Earth Eater");
        }
        return null;
      }
    },
    flags: {breakable: 1},
    name: "Earth Eater",
    rating: 3.5,
    num: 297
  },
  effectspore: {
    onDamagingHit(damage, target, source, move) {
      if (this.checkMoveMakesContact(move, source, target) && !source.status && source.runStatusImmunity("powder")) {
        const r = this.random(100);
        if (r < 11) {
          source.setStatus("slp", target);
        } else if (r < 21) {
          source.setStatus("par", target);
        } else if (r < 30) {
          source.setStatus("psn", target);
        }
      }
    },
    flags: {},
    name: "Effect Spore",
    rating: 2,
    num: 27
  },
  electricsurge: {
    onStart(source) {
      this.field.setTerrain("electricterrain");
    },
    flags: {},
    name: "Electric Surge",
    rating: 4,
    num: 226
  },
  electromorphosis: {
    onDamagingHitOrder: 1,
    onDamagingHit(damage, target, source, move) {
      target.addVolatile("charge");
    },
    flags: {},
    name: "Electromorphosis",
    rating: 3,
    num: 280
  },
  embodyaspectcornerstone: {
    onStart(pokemon) {
      if (pokemon.baseSpecies.name === "Ogerpon-Cornerstone-Tera" && pokemon.terastallized && !this.effectState.embodied) {
        this.effectState.embodied = true;
        this.boost({def: 1}, pokemon);
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1},
    name: "Embody Aspect (Cornerstone)",
    rating: 3.5,
    num: 304
  },
  embodyaspecthearthflame: {
    onStart(pokemon) {
      if (pokemon.baseSpecies.name === "Ogerpon-Hearthflame-Tera" && pokemon.terastallized && !this.effectState.embodied) {
        this.effectState.embodied = true;
        this.boost({atk: 1}, pokemon);
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1},
    name: "Embody Aspect (Hearthflame)",
    rating: 3.5,
    num: 303
  },
  embodyaspectteal: {
    onStart(pokemon) {
      if (pokemon.baseSpecies.name === "Ogerpon-Teal-Tera" && pokemon.terastallized && !this.effectState.embodied) {
        this.effectState.embodied = true;
        this.boost({spe: 1}, pokemon);
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1},
    name: "Embody Aspect (Teal)",
    rating: 3.5,
    num: 301
  },
  embodyaspectwellspring: {
    onStart(pokemon) {
      if (pokemon.baseSpecies.name === "Ogerpon-Wellspring-Tera" && pokemon.terastallized && !this.effectState.embodied) {
        this.effectState.embodied = true;
        this.boost({spd: 1}, pokemon);
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1},
    name: "Embody Aspect (Wellspring)",
    rating: 3.5,
    num: 302
  },
  emergencyexit: {
    onEmergencyExit(target) {
      if (!this.canSwitch(target.side) || target.forceSwitchFlag || target.switchFlag) return;
      for (const side of this.sides) {
        for (const active of side.active) {
          active.switchFlag = false;
        }
      }
      target.switchFlag = true;
      this.add("-activate", target, "ability: Emergency Exit");
    },
    flags: {},
    name: "Emergency Exit",
    rating: 1,
    num: 194
  },
  fairyaura: {
    onStart(pokemon) {
      if (this.suppressingAbility(pokemon)) return;
      this.add("-ability", pokemon, "Fairy Aura");
    },
    onAnyBasePowerPriority: 20,
    onAnyBasePower(basePower, source, target, move) {
      if (target === source || move.category === "Status" || move.type !== "Fairy") return;
      if (!move.auraBooster?.hasAbility("Fairy Aura")) move.auraBooster = this.effectState.target;
      if (move.auraBooster !== this.effectState.target) return;
      return this.chainModify([move.hasAuraBreak ? 3072 : 5448, 4096]);
    },
    flags: {},
    name: "Fairy Aura",
    rating: 3,
    num: 187
  },
  filter: {
    onSourceModifyDamage(damage, source, target, move) {
      if (target.getMoveHitData(move).typeMod > 0) {
        this.debug("Filter neutralize");
        return this.chainModify(0.75);
      }
    },
    flags: {breakable: 1},
    name: "Filter",
    rating: 3,
    num: 111
  },
  flamebody: {
    onDamagingHit(damage, target, source, move) {
      if (this.checkMoveMakesContact(move, source, target)) {
        if (this.randomChance(3, 10)) {
          source.trySetStatus("brn", target);
        }
      }
    },
    flags: {},
    name: "Flame Body",
    rating: 2,
    num: 49
  },
  flareboost: {
    onBasePowerPriority: 19,
    onBasePower(basePower, attacker, defender, move) {
      if (attacker.status === "brn" && move.category === "Special") {
        return this.chainModify(1.5);
      }
    },
    flags: {},
    name: "Flare Boost",
    rating: 2,
    num: 138
  },
  flashfire: {
    onTryHit(target, source, move) {
      if (target !== source && move.type === "Fire") {
        move.accuracy = true;
        if (!target.addVolatile("flashfire")) {
          this.add("-immune", target, "[from] ability: Flash Fire");
        }
        return null;
      }
    },
    onEnd(pokemon) {
      pokemon.removeVolatile("flashfire");
    },
    condition: {
      noCopy: true,
      // doesn't get copied by Baton Pass
      onStart(target) {
        this.add("-start", target, "ability: Flash Fire");
      },
      onModifyAtkPriority: 5,
      onModifyAtk(atk, attacker, defender, move) {
        if (move.type === "Fire" && attacker.hasAbility("flashfire")) {
          this.debug("Flash Fire boost");
          return this.chainModify(1.5);
        }
      },
      onModifySpAPriority: 5,
      onModifySpA(atk, attacker, defender, move) {
        if (move.type === "Fire" && attacker.hasAbility("flashfire")) {
          this.debug("Flash Fire boost");
          return this.chainModify(1.5);
        }
      },
      onEnd(target) {
        this.add("-end", target, "ability: Flash Fire", "[silent]");
      }
    },
    flags: {breakable: 1},
    name: "Flash Fire",
    rating: 3.5,
    num: 18
  },
  flowergift: {
    onSwitchInPriority: -2,
    onStart(pokemon) {
      this.singleEvent("WeatherChange", this.effect, this.effectState, pokemon);
    },
    onWeatherChange(pokemon) {
      if (!pokemon.isActive || pokemon.baseSpecies.baseSpecies !== "Cherrim" || pokemon.transformed) return;
      if (!pokemon.hp) return;
      if (["sunnyday", "desolateland"].includes(pokemon.effectiveWeather())) {
        if (pokemon.species.id !== "cherrimsunshine") {
          pokemon.formeChange("Cherrim-Sunshine", this.effect, false, "0", "[msg]");
        }
      } else {
        if (pokemon.species.id === "cherrimsunshine") {
          pokemon.formeChange("Cherrim", this.effect, false, "0", "[msg]");
        }
      }
    },
    onAllyModifyAtkPriority: 3,
    onAllyModifyAtk(atk, pokemon) {
      if (this.effectState.target.baseSpecies.baseSpecies !== "Cherrim") return;
      if (["sunnyday", "desolateland"].includes(pokemon.effectiveWeather())) {
        return this.chainModify(1.5);
      }
    },
    onAllyModifySpDPriority: 4,
    onAllyModifySpD(spd, pokemon) {
      if (this.effectState.target.baseSpecies.baseSpecies !== "Cherrim") return;
      if (["sunnyday", "desolateland"].includes(pokemon.effectiveWeather())) {
        return this.chainModify(1.5);
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, breakable: 1},
    name: "Flower Gift",
    rating: 1,
    num: 122
  },
  flowerveil: {
    onAllyTryBoost(boost, target, source, effect) {
      if (source && target === source || !target.hasType("Grass")) return;
      let showMsg = false;
      let i;
      for (i in boost) {
        if (boost[i] < 0) {
          delete boost[i];
          showMsg = true;
        }
      }
      if (showMsg && !effect.secondaries) {
        const effectHolder = this.effectState.target;
        this.add("-block", target, "ability: Flower Veil", `[of] ${effectHolder}`);
      }
    },
    onAllySetStatus(status, target, source, effect) {
      if (target.hasType("Grass") && source && target !== source && effect && effect.id !== "yawn") {
        this.debug("interrupting setStatus with Flower Veil");
        if (effect.name === "Synchronize" || effect.effectType === "Move" && !effect.secondaries) {
          const effectHolder = this.effectState.target;
          this.add("-block", target, "ability: Flower Veil", `[of] ${effectHolder}`);
        }
        return null;
      }
    },
    onAllyTryAddVolatile(status, target) {
      if (target.hasType("Grass") && status.id === "yawn") {
        this.debug("Flower Veil blocking yawn");
        const effectHolder = this.effectState.target;
        this.add("-block", target, "ability: Flower Veil", `[of] ${effectHolder}`);
        return null;
      }
    },
    flags: {breakable: 1},
    name: "Flower Veil",
    rating: 0,
    num: 166
  },
  fluffy: {
    onSourceModifyDamage(damage, source, target, move) {
      let mod = 1;
      if (move.type === "Fire") mod *= 2;
      if (move.flags["contact"]) mod /= 2;
      return this.chainModify(mod);
    },
    flags: {breakable: 1},
    name: "Fluffy",
    rating: 3.5,
    num: 218
  },
  forecast: {
    onSwitchInPriority: -2,
    onStart(pokemon) {
      this.singleEvent("WeatherChange", this.effect, this.effectState, pokemon);
    },
    onWeatherChange(pokemon) {
      if (pokemon.baseSpecies.baseSpecies !== "Castform" || pokemon.transformed) return;
      let forme = null;
      switch (pokemon.effectiveWeather()) {
        case "sunnyday":
        case "desolateland":
          if (pokemon.species.id !== "castformsunny") forme = "Castform-Sunny";
          break;
        case "raindance":
        case "primordialsea":
          if (pokemon.species.id !== "castformrainy") forme = "Castform-Rainy";
          break;
        case "hail":
        case "snowscape":
          if (pokemon.species.id !== "castformsnowy") forme = "Castform-Snowy";
          break;
        default:
          if (pokemon.species.id !== "castform") forme = "Castform";
          break;
      }
      if (pokemon.isActive && forme) {
        pokemon.formeChange(forme, this.effect, false, "0", "[msg]");
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1},
    name: "Forecast",
    rating: 2,
    num: 59
  },
  forewarn: {
    onStart(pokemon) {
      let warnMoves = [];
      let warnBp = 1;
      for (const target of pokemon.foes()) {
        for (const moveSlot of target.moveSlots) {
          const move = this.dex.moves.get(moveSlot.move);
          let bp = move.basePower;
          if (move.ohko) bp = 150;
          if (move.id === "counter" || move.id === "metalburst" || move.id === "mirrorcoat") bp = 120;
          if (bp === 1) bp = 80;
          if (!bp && move.category !== "Status") bp = 80;
          if (bp > warnBp) {
            warnMoves = [[move, target]];
            warnBp = bp;
          } else if (bp === warnBp) {
            warnMoves.push([move, target]);
          }
        }
      }
      if (!warnMoves.length) return;
      const [warnMoveName, warnTarget] = this.sample(warnMoves);
      this.add("-activate", pokemon, "ability: Forewarn", warnMoveName, `[of] ${warnTarget}`);
    },
    flags: {},
    name: "Forewarn",
    rating: 0.5,
    num: 108
  },
  friendguard: {
    onAnyModifyDamage(damage, source, target, move) {
      if (target !== this.effectState.target && target.isAlly(this.effectState.target)) {
        this.debug("Friend Guard weaken");
        return this.chainModify(0.75);
      }
    },
    flags: {breakable: 1},
    name: "Friend Guard",
    rating: 0,
    num: 132
  },
  frisk: {
    onStart(pokemon) {
      for (const target of pokemon.foes()) {
        if (target.item) {
          this.add("-item", target, target.getItem().name, "[from] ability: Frisk", `[of] ${pokemon}`);
        }
      }
    },
    flags: {},
    name: "Frisk",
    rating: 1.5,
    num: 119
  },
  fullmetalbody: {
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
        this.add("-fail", target, "unboost", "[from] ability: Full Metal Body", `[of] ${target}`);
      }
    },
    flags: {},
    name: "Full Metal Body",
    rating: 2,
    num: 230
  },
  furcoat: {
    onModifyDefPriority: 6,
    onModifyDef(def) {
      return this.chainModify(2);
    },
    flags: {breakable: 1},
    name: "Fur Coat",
    rating: 4,
    num: 169
  },
  galewings: {
    onModifyPriority(priority, pokemon, target, move) {
      if (move?.type === "Flying" && pokemon.hp === pokemon.maxhp) return priority + 1;
    },
    flags: {},
    name: "Gale Wings",
    rating: 1.5,
    num: 177
  },
  galvanize: {
    onModifyTypePriority: -1,
    onModifyType(move, pokemon) {
      const noModifyType = [
        "judgment",
        "multiattack",
        "naturalgift",
        "revelationdance",
        "technoblast",
        "terrainpulse",
        "weatherball"
      ];
      if (move.type === "Normal" && (!noModifyType.includes(move.id) || this.activeMove?.isMax) && !(move.isZ && move.category !== "Status") && !(move.name === "Tera Blast" && pokemon.terastallized)) {
        move.type = "Electric";
        move.typeChangerBoosted = this.effect;
      }
    },
    onBasePowerPriority: 23,
    onBasePower(basePower, pokemon, target, move) {
      if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
    },
    flags: {},
    name: "Galvanize",
    rating: 4,
    num: 206
  },
  gluttony: {
    onStart(pokemon) {
      pokemon.abilityState.gluttony = true;
    },
    onDamage(item, pokemon) {
      pokemon.abilityState.gluttony = true;
    },
    flags: {},
    name: "Gluttony",
    rating: 1.5,
    num: 82
  },
  goodasgold: {
    onTryHit(target, source, move) {
      if (move.category === "Status" && target !== source) {
        this.add("-immune", target, "[from] ability: Good as Gold");
        return null;
      }
    },
    flags: {breakable: 1},
    name: "Good as Gold",
    rating: 5,
    num: 283
  },
  gooey: {
    onDamagingHit(damage, target, source, move) {
      if (this.checkMoveMakesContact(move, source, target, true)) {
        this.add("-ability", target, "Gooey");
        this.boost({spe: -1}, source, target, null, true);
      }
    },
    flags: {},
    name: "Gooey",
    rating: 2,
    num: 183
  },
  gorillatactics: {
    onStart(pokemon) {
      pokemon.abilityState.choiceLock = "";
    },
    onBeforeMove(pokemon, target, move) {
      if (move.isZOrMaxPowered || move.id === "struggle") return;
      if (pokemon.abilityState.choiceLock && pokemon.abilityState.choiceLock !== move.id) {
        this.addMove("move", pokemon, move.name);
        this.attrLastMove("[still]");
        this.debug("Disabled by Gorilla Tactics");
        this.add("-fail", pokemon);
        return false;
      }
    },
    onModifyMove(move, pokemon) {
      if (pokemon.abilityState.choiceLock || move.isZOrMaxPowered || move.id === "struggle") return;
      pokemon.abilityState.choiceLock = move.id;
    },
    onModifyAtkPriority: 1,
    onModifyAtk(atk, pokemon) {
      if (pokemon.volatiles["dynamax"]) return;
      this.debug("Gorilla Tactics Atk Boost");
      return this.chainModify(1.5);
    },
    onDisableMove(pokemon) {
      if (!pokemon.abilityState.choiceLock) return;
      if (pokemon.volatiles["dynamax"]) return;
      for (const moveSlot of pokemon.moveSlots) {
        if (moveSlot.id !== pokemon.abilityState.choiceLock) {
          pokemon.disableMove(moveSlot.id, false, this.effectState.sourceEffect);
        }
      }
    },
    onEnd(pokemon) {
      pokemon.abilityState.choiceLock = "";
    },
    flags: {},
    name: "Gorilla Tactics",
    rating: 4.5,
    num: 255
  },
  grasspelt: {
    onModifyDefPriority: 6,
    onModifyDef(pokemon) {
      if (this.field.isTerrain("grassyterrain")) return this.chainModify(1.5);
    },
    flags: {breakable: 1},
    name: "Grass Pelt",
    rating: 0.5,
    num: 179
  },
  grassysurge: {
    onStart(source) {
      this.field.setTerrain("grassyterrain");
    },
    flags: {},
    name: "Grassy Surge",
    rating: 4,
    num: 229
  },
  grimneigh: {
    onSourceAfterFaint(length, target, source, effect) {
      if (effect && effect.effectType === "Move") {
        this.boost({spa: length}, source);
      }
    },
    flags: {},
    name: "Grim Neigh",
    rating: 3,
    num: 265
  },
  guarddog: {
    onDragOutPriority: 1,
    onDragOut(pokemon) {
      this.add("-activate", pokemon, "ability: Guard Dog");
      return null;
    },
    onTryBoostPriority: 2,
    onTryBoost(boost, target, source, effect) {
      if (effect.name === "Intimidate" && boost.atk) {
        delete boost.atk;
        this.boost({atk: 1}, target, target, null, false, true);
      }
    },
    flags: {breakable: 1},
    name: "Guard Dog",
    rating: 2,
    num: 275
  },
  gulpmissile: {
    onDamagingHit(damage, target, source, move) {
      if (!source.hp || !source.isActive || target.isSemiInvulnerable()) return;
      if (["cramorantgulping", "cramorantgorging"].includes(target.species.id)) {
        this.damage(source.baseMaxhp / 4, source, target);
        if (target.species.id === "cramorantgulping") {
          this.boost({def: -1}, source, target, null, true);
        } else {
          source.trySetStatus("par", target, move);
        }
        target.formeChange("cramorant", move);
      }
    },
    // The Dive part of this mechanic is implemented in Dive's `onTryMove` in moves.ts
    onSourceTryPrimaryHit(target, source, effect) {
      if (effect?.id === "surf" && source.hasAbility("gulpmissile") && source.species.name === "Cramorant") {
        const forme = source.hp <= source.maxhp / 2 ? "cramorantgorging" : "cramorantgulping";
        source.formeChange(forme, effect);
      }
    },
    flags: {cantsuppress: 1, notransform: 1},
    name: "Gulp Missile",
    rating: 2.5,
    num: 241
  },
  guts: {
    onModifyAtkPriority: 5,
    onModifyAtk(atk, pokemon) {
      if (pokemon.status) {
        return this.chainModify(1.5);
      }
    },
    flags: {},
    name: "Guts",
    rating: 3.5,
    num: 62
  },
  hadronengine: {
    onStart(pokemon) {
      if (!this.field.setTerrain("electricterrain") && this.field.isTerrain("electricterrain")) {
        this.add("-activate", pokemon, "ability: Hadron Engine");
      }
    },
    onModifySpAPriority: 5,
    onModifySpA(atk, attacker, defender, move) {
      if (this.field.isTerrain("electricterrain")) {
        this.debug("Hadron Engine boost");
        return this.chainModify([5461, 4096]);
      }
    },
    flags: {},
    name: "Hadron Engine",
    rating: 4.5,
    num: 289
  },
  harvest: {
    onResidualOrder: 28,
    onResidualSubOrder: 2,
    onResidual(pokemon) {
      if (this.field.isWeather(["sunnyday", "desolateland"]) || this.randomChance(1, 2)) {
        if (pokemon.hp && !pokemon.item && this.dex.items.get(pokemon.lastItem).isBerry) {
          pokemon.setItem(pokemon.lastItem);
          pokemon.lastItem = "";
          this.add("-item", pokemon, pokemon.getItem(), "[from] ability: Harvest");
        }
      }
    },
    flags: {},
    name: "Harvest",
    rating: 2.5,
    num: 139
  },
  healer: {
    onResidualOrder: 5,
    onResidualSubOrder: 3,
    onResidual(pokemon) {
      for (const allyActive of pokemon.adjacentAllies()) {
        if (allyActive.status && this.randomChance(3, 10)) {
          this.add("-activate", pokemon, "ability: Healer");
          allyActive.cureStatus();
        }
      }
    },
    flags: {},
    name: "Healer",
    rating: 0,
    num: 131
  },
  heatproof: {
    onSourceModifyAtkPriority: 6,
    onSourceModifyAtk(atk, attacker, defender, move) {
      if (move.type === "Fire") {
        this.debug("Heatproof Atk weaken");
        return this.chainModify(0.5);
      }
    },
    onSourceModifySpAPriority: 5,
    onSourceModifySpA(atk, attacker, defender, move) {
      if (move.type === "Fire") {
        this.debug("Heatproof SpA weaken");
        return this.chainModify(0.5);
      }
    },
    onDamage(damage, target, source, effect) {
      if (effect && effect.id === "brn") {
        return damage / 2;
      }
    },
    flags: {breakable: 1},
    name: "Heatproof",
    rating: 2,
    num: 85
  },
  heavymetal: {
    onModifyWeightPriority: 1,
    onModifyWeight(weighthg) {
      return weighthg * 2;
    },
    flags: {breakable: 1},
    name: "Heavy Metal",
    rating: 0,
    num: 134
  },
  honeygather: {
    flags: {},
    name: "Honey Gather",
    rating: 0,
    num: 118
  },
  hospitality: {
    onSwitchInPriority: -2,
    onStart(pokemon) {
      for (const ally of pokemon.adjacentAllies()) {
        this.heal(ally.baseMaxhp / 4, ally, pokemon);
      }
    },
    flags: {},
    name: "Hospitality",
    rating: 0,
    num: 299
  },
  hugepower: {
    onModifyAtkPriority: 5,
    onModifyAtk(atk) {
      return this.chainModify(2);
    },
    flags: {},
    name: "Huge Power",
    rating: 5,
    num: 37
  },
  hungerswitch: {
    onResidualOrder: 29,
    onResidual(pokemon) {
      if (pokemon.species.baseSpecies !== "Morpeko" || pokemon.terastallized) return;
      const targetForme = pokemon.species.name === "Morpeko" ? "Morpeko-Hangry" : "Morpeko";
      pokemon.formeChange(targetForme);
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1},
    name: "Hunger Switch",
    rating: 1,
    num: 258
  },
  hustle: {
    // This should be applied directly to the stat as opposed to chaining with the others
    onModifyAtkPriority: 5,
    onModifyAtk(atk) {
      return this.modify(atk, 1.5);
    },
    onSourceModifyAccuracyPriority: -1,
    onSourceModifyAccuracy(accuracy, target, source, move) {
      if (move.category === "Physical" && typeof accuracy === "number") {
        return this.chainModify([3277, 4096]);
      }
    },
    flags: {},
    name: "Hustle",
    rating: 3.5,
    num: 55
  },
  hydration: {
    onResidualOrder: 5,
    onResidualSubOrder: 3,
    onResidual(pokemon) {
      if (pokemon.status && ["raindance", "primordialsea"].includes(pokemon.effectiveWeather())) {
        this.debug("hydration");
        this.add("-activate", pokemon, "ability: Hydration");
        pokemon.cureStatus();
      }
    },
    flags: {},
    name: "Hydration",
    rating: 1.5,
    num: 93
  },
  hypercutter: {
    onTryBoost(boost, target, source, effect) {
      if (source && target === source) return;
      if (boost.atk && boost.atk < 0) {
        delete boost.atk;
        if (!effect.secondaries) {
          this.add("-fail", target, "unboost", "Attack", "[from] ability: Hyper Cutter", `[of] ${target}`);
        }
      }
    },
    flags: {breakable: 1},
    name: "Hyper Cutter",
    rating: 1.5,
    num: 52
  },
  icebody: {
    onWeather(target, source, effect) {
      if (effect.id === "hail" || effect.id === "snowscape") {
        this.heal(target.baseMaxhp / 16);
      }
    },
    onImmunity(type, pokemon) {
      if (type === "hail") return false;
    },
    flags: {},
    name: "Ice Body",
    rating: 1,
    num: 115
  },
  iceface: {
    onSwitchInPriority: -2,
    onStart(pokemon) {
      if (this.field.isWeather(["hail", "snowscape"]) && pokemon.species.id === "eiscuenoice") {
        this.add("-activate", pokemon, "ability: Ice Face");
        this.effectState.busted = false;
        pokemon.formeChange("Eiscue", this.effect, true);
      }
    },
    onDamagePriority: 1,
    onDamage(damage, target, source, effect) {
      if (effect?.effectType === "Move" && effect.category === "Physical" && target.species.id === "eiscue") {
        this.add("-activate", target, "ability: Ice Face");
        this.effectState.busted = true;
        return 0;
      }
    },
    onCriticalHit(target, type, move) {
      if (!target) return;
      if (move.category !== "Physical" || target.species.id !== "eiscue") return;
      if (target.volatiles["substitute"] && !(move.flags["bypasssub"] || move.infiltrates)) return;
      if (!target.runImmunity(move)) return;
      return false;
    },
    onEffectiveness(typeMod, target, type, move) {
      if (!target) return;
      if (move.category !== "Physical" || target.species.id !== "eiscue") return;
      const hitSub = target.volatiles["substitute"] && !move.flags["bypasssub"] && !(move.infiltrates && this.gen >= 6);
      if (hitSub) return;
      if (!target.runImmunity(move)) return;
      return 0;
    },
    onUpdate(pokemon) {
      if (pokemon.species.id === "eiscue" && this.effectState.busted) {
        pokemon.formeChange("Eiscue-Noice", this.effect, true);
      }
    },
    onWeatherChange(pokemon, source, sourceEffect) {
      if (sourceEffect?.suppressWeather) return;
      if (!pokemon.hp) return;
      if (this.field.isWeather(["hail", "snowscape"]) && pokemon.species.id === "eiscuenoice") {
        this.add("-activate", pokemon, "ability: Ice Face");
        this.effectState.busted = false;
        pokemon.formeChange("Eiscue", this.effect, true);
      }
    },
    flags: {
      failroleplay: 1,
      noreceiver: 1,
      noentrain: 1,
      notrace: 1,
      failskillswap: 1,
      cantsuppress: 1,
      breakable: 1,
      notransform: 1
    },
    name: "Ice Face",
    rating: 3,
    num: 248
  },
  icescales: {
    onSourceModifyDamage(damage, source, target, move) {
      if (move.category === "Special") {
        return this.chainModify(0.5);
      }
    },
    flags: {breakable: 1},
    name: "Ice Scales",
    rating: 4,
    num: 246
  },
  illuminate: {
    onTryBoost(boost, target, source, effect) {
      if (source && target === source) return;
      if (boost.accuracy && boost.accuracy < 0) {
        delete boost.accuracy;
        if (!effect.secondaries) {
          this.add("-fail", target, "unboost", "accuracy", "[from] ability: Illuminate", `[of] ${target}`);
        }
      }
    },
    onModifyMove(move) {
      move.ignoreEvasion = true;
    },
    flags: {breakable: 1},
    name: "Illuminate",
    rating: 0.5,
    num: 35
  },
  illusion: {
    onBeforeSwitchIn(pokemon) {
      pokemon.illusion = null;
      for (let i = pokemon.side.pokemon.length - 1; i > pokemon.position; i--) {
        const possibleTarget = pokemon.side.pokemon[i];
        if (!possibleTarget.fainted) {
          if (!pokemon.terastallized || !["Ogerpon", "Terapagos"].includes(possibleTarget.species.baseSpecies)) {
            pokemon.illusion = possibleTarget;
          }
          break;
        }
      }
    },
    onDamagingHit(damage, target, source, move) {
      if (target.illusion) {
        this.singleEvent("End", this.dex.abilities.get("Illusion"), target.abilityState, target, source, move);
      }
    },
    onEnd(pokemon) {
      if (pokemon.illusion) {
        this.debug("illusion cleared");
        pokemon.illusion = null;
        const details = pokemon.getUpdatedDetails();
        this.add("replace", pokemon, details);
        this.add("-end", pokemon, "Illusion");
        if (this.ruleTable.has("illusionlevelmod")) {
          this.hint("Illusion Level Mod is active, so this Pok\xE9mon's true level was hidden.", true);
        }
      }
    },
    onFaint(pokemon) {
      pokemon.illusion = null;
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1},
    name: "Illusion",
    rating: 4.5,
    num: 149
  },
  immunity: {
    onUpdate(pokemon) {
      if (pokemon.status === "psn" || pokemon.status === "tox") {
        this.add("-activate", pokemon, "ability: Immunity");
        pokemon.cureStatus();
      }
    },
    onSetStatus(status, target, source, effect) {
      if (status.id !== "psn" && status.id !== "tox") return;
      if (effect?.status) {
        this.add("-immune", target, "[from] ability: Immunity");
      }
      return false;
    },
    flags: {breakable: 1},
    name: "Immunity",
    rating: 2,
    num: 17
  },
  imposter: {
    onSwitchIn(pokemon) {
      const target = pokemon.side.foe.active[pokemon.side.foe.active.length - 1 - pokemon.position];
      if (target) {
        pokemon.transformInto(target, this.dex.abilities.get("imposter"));
      }
    },
    flags: {failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1},
    name: "Imposter",
    rating: 5,
    num: 150
  },
  infiltrator: {
    onModifyMove(move) {
      move.infiltrates = true;
    },
    flags: {},
    name: "Infiltrator",
    rating: 2.5,
    num: 151
  },
  innardsout: {
    onDamagingHitOrder: 1,
    onDamagingHit(damage, target, source, move) {
      if (!target.hp) {
        this.damage(target.getUndynamaxedHP(damage), source, target);
      }
    },
    flags: {},
    name: "Innards Out",
    rating: 4,
    num: 215
  },
  innerfocus: {
    onTryAddVolatile(status, pokemon) {
      if (status.id === "flinch") return null;
    },
    onTryBoost(boost, target, source, effect) {
      if (effect.name === "Intimidate" && boost.atk) {
        delete boost.atk;
        this.add("-fail", target, "unboost", "Attack", "[from] ability: Inner Focus", `[of] ${target}`);
      }
    },
    flags: {breakable: 1},
    name: "Inner Focus",
    rating: 1,
    num: 39
  },
  insomnia: {
    onUpdate(pokemon) {
      if (pokemon.status === "slp") {
        this.add("-activate", pokemon, "ability: Insomnia");
        pokemon.cureStatus();
      }
    },
    onSetStatus(status, target, source, effect) {
      if (status.id !== "slp") return;
      if (effect?.status) {
        this.add("-immune", target, "[from] ability: Insomnia");
      }
      return false;
    },
    onTryAddVolatile(status, target) {
      if (status.id === "yawn") {
        this.add("-immune", target, "[from] ability: Insomnia");
        return null;
      }
    },
    flags: {breakable: 1},
    name: "Insomnia",
    rating: 1.5,
    num: 15
  },
  intimidate: {
    onStart(pokemon) {
      let activated = false;
      for (const target of pokemon.adjacentFoes()) {
        if (!activated) {
          this.add("-ability", pokemon, "Intimidate", "boost");
          activated = true;
        }
        if (target.volatiles["substitute"]) {
          this.add("-immune", target);
        } else {
          this.boost({atk: -1}, target, pokemon, null, true);
        }
      }
    },
    flags: {},
    name: "Intimidate",
    rating: 3.5,
    num: 22
  },
  intrepidsword: {
    onStart(pokemon) {
      if (pokemon.swordBoost) return;
      pokemon.swordBoost = true;
      this.boost({atk: 1}, pokemon);
    },
    flags: {},
    name: "Intrepid Sword",
    rating: 4,
    num: 234
  },
  ironbarbs: {
    onDamagingHitOrder: 1,
    onDamagingHit(damage, target, source, move) {
      if (this.checkMoveMakesContact(move, source, target, true)) {
        this.damage(source.baseMaxhp / 8, source, target);
      }
    },
    flags: {},
    name: "Iron Barbs",
    rating: 2.5,
    num: 160
  },
  ironfist: {
    onBasePowerPriority: 23,
    onBasePower(basePower, attacker, defender, move) {
      if (move.flags["punch"]) {
        this.debug("Iron Fist boost");
        return this.chainModify([4915, 4096]);
      }
    },
    flags: {},
    name: "Iron Fist",
    rating: 3,
    num: 89
  },
  justified: {
    onDamagingHit(damage, target, source, move) {
      if (move.type === "Dark") {
        this.boost({atk: 1});
      }
    },
    flags: {},
    name: "Justified",
    rating: 2.5,
    num: 154
  },
  keeneye: {
    onTryBoost(boost, target, source, effect) {
      if (source && target === source) return;
      if (boost.accuracy && boost.accuracy < 0) {
        delete boost.accuracy;
        if (!effect.secondaries) {
          this.add("-fail", target, "unboost", "accuracy", "[from] ability: Keen Eye", `[of] ${target}`);
        }
      }
    },
    onModifyMove(move) {
      move.ignoreEvasion = true;
    },
    flags: {breakable: 1},
    name: "Keen Eye",
    rating: 0.5,
    num: 51
  },
  klutz: {
    // Klutz isn't technically active immediately in-game, but it activates early enough to beat all items
    // we should keep an eye out in future gens for items that activate on switch-in before Unnerve
    onSwitchInPriority: 1,
    // Item suppression implemented in Pokemon.ignoringItem() within sim/pokemon.js
    onStart(pokemon) {
      this.singleEvent("End", pokemon.getItem(), pokemon.itemState, pokemon);
    },
    flags: {},
    name: "Klutz",
    rating: -1,
    num: 103
  },
  leafguard: {
    onSetStatus(status, target, source, effect) {
      if (["sunnyday", "desolateland"].includes(target.effectiveWeather())) {
        if (effect?.status) {
          this.add("-immune", target, "[from] ability: Leaf Guard");
        }
        return false;
      }
    },
    onTryAddVolatile(status, target) {
      if (status.id === "yawn" && ["sunnyday", "desolateland"].includes(target.effectiveWeather())) {
        this.add("-immune", target, "[from] ability: Leaf Guard");
        return null;
      }
    },
    flags: {breakable: 1},
    name: "Leaf Guard",
    rating: 0.5,
    num: 102
  },
  levitate: {
    // airborneness implemented in sim/pokemon.js:Pokemon#isGrounded
    flags: {breakable: 1},
    name: "Levitate",
    rating: 3.5,
    num: 26
  },
  libero: {
    onPrepareHit(source, target, move) {
      if (this.effectState.libero) return;
      if (move.hasBounced || move.flags["futuremove"] || move.sourceEffect === "snatch" || move.callsMove) return;
      const type = move.type;
      if (type && type !== "???" && source.getTypes().join() !== type) {
        if (!source.setType(type)) return;
        this.effectState.libero = true;
        this.add("-start", source, "typechange", type, "[from] ability: Libero");
      }
    },
    flags: {},
    name: "Libero",
    rating: 4,
    num: 236
  },
  lightmetal: {
    onModifyWeight(weighthg) {
      return this.trunc(weighthg / 2);
    },
    flags: {breakable: 1},
    name: "Light Metal",
    rating: 1,
    num: 135
  },
  lightningrod: {
    onTryHit(target, source, move) {
      if (target !== source && move.type === "Electric") {
        if (!this.boost({spa: 1})) {
          this.add("-immune", target, "[from] ability: Lightning Rod");
        }
        return null;
      }
    },
    onAnyRedirectTarget(target, source, source2, move) {
      if (move.type !== "Electric" || move.flags["pledgecombo"]) return;
      const redirectTarget = ["randomNormal", "adjacentFoe"].includes(move.target) ? "normal" : move.target;
      if (this.validTarget(this.effectState.target, source, redirectTarget)) {
        if (move.smartTarget) move.smartTarget = false;
        if (this.effectState.target !== target) {
          this.add("-activate", this.effectState.target, "ability: Lightning Rod");
        }
        return this.effectState.target;
      }
    },
    flags: {breakable: 1},
    name: "Lightning Rod",
    rating: 3,
    num: 31
  },
  limber: {
    onUpdate(pokemon) {
      if (pokemon.status === "par") {
        this.add("-activate", pokemon, "ability: Limber");
        pokemon.cureStatus();
      }
    },
    onSetStatus(status, target, source, effect) {
      if (status.id !== "par") return;
      if (effect?.status) {
        this.add("-immune", target, "[from] ability: Limber");
      }
      return false;
    },
    flags: {breakable: 1},
    name: "Limber",
    rating: 2,
    num: 7
  },
  lingeringaroma: {
    onDamagingHit(damage, target, source, move) {
      const sourceAbility = source.getAbility();
      if (sourceAbility.flags["cantsuppress"] || sourceAbility.id === "lingeringaroma") {
        return;
      }
      if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
        const oldAbility = source.setAbility("lingeringaroma", target);
        if (oldAbility) {
          this.add("-activate", target, "ability: Lingering Aroma", this.dex.abilities.get(oldAbility).name, `[of] ${source}`);
        }
      }
    },
    flags: {},
    name: "Lingering Aroma",
    rating: 2,
    num: 268
  },
  liquidooze: {
    onSourceTryHeal(damage, target, source, effect) {
      this.debug(`Heal is occurring: ${target} <- ${source} :: ${effect.id}`);
      const canOoze = ["drain", "leechseed", "strengthsap"];
      if (canOoze.includes(effect.id)) {
        this.damage(damage);
        return 0;
      }
    },
    flags: {},
    name: "Liquid Ooze",
    rating: 2.5,
    num: 64
  },
  liquidvoice: {
    onModifyTypePriority: -1,
    onModifyType(move, pokemon) {
      if (move.flags["sound"] && !pokemon.volatiles["dynamax"]) {
        move.type = "Water";
      }
    },
    flags: {},
    name: "Liquid Voice",
    rating: 1.5,
    num: 204
  },
  longreach: {
    onModifyMove(move) {
      delete move.flags["contact"];
    },
    flags: {},
    name: "Long Reach",
    rating: 1,
    num: 203
  },
  magicbounce: {
    onTryHitPriority: 1,
    onTryHit(target, source, move) {
      if (target === source || move.hasBounced || !move.flags["reflectable"] || target.isSemiInvulnerable()) {
        return;
      }
      const newMove = this.dex.getActiveMove(move.id);
      newMove.hasBounced = true;
      newMove.pranksterBoosted = false;
      this.actions.useMove(newMove, target, {target: source});
      return null;
    },
    onAllyTryHitSide(target, source, move) {
      if (target.isAlly(source) || move.hasBounced || !move.flags["reflectable"] || target.isSemiInvulnerable()) {
        return;
      }
      const newMove = this.dex.getActiveMove(move.id);
      newMove.hasBounced = true;
      newMove.pranksterBoosted = false;
      this.actions.useMove(newMove, this.effectState.target, {target: source});
      move.hasBounced = true;
      return null;
    },
    flags: {breakable: 1},
    name: "Magic Bounce",
    rating: 4,
    num: 156
  },
  magicguard: {
    onDamage(damage, target, source, effect) {
      if (effect.effectType !== "Move") {
        if (effect.effectType === "Ability") this.add("-activate", source, "ability: " + effect.name);
        return false;
      }
    },
    flags: {},
    name: "Magic Guard",
    rating: 4,
    num: 98
  },
  magician: {
    onAfterMoveSecondarySelf(source, target, move) {
      if (!move || source.switchFlag === true || !move.hitTargets || source.item || source.volatiles["gem"] || move.id === "fling" || move.category === "Status") return;
      const hitTargets = move.hitTargets;
      this.speedSort(hitTargets);
      for (const pokemon of hitTargets) {
        if (pokemon !== source) {
          const yourItem = pokemon.takeItem(source);
          if (!yourItem) continue;
          if (!source.setItem(yourItem)) {
            pokemon.item = yourItem.id;
            continue;
          }
          this.add("-item", source, yourItem, "[from] ability: Magician", `[of] ${pokemon}`);
          return;
        }
      }
    },
    flags: {},
    name: "Magician",
    rating: 1,
    num: 170
  },
  magmaarmor: {
    onUpdate(pokemon) {
      if (pokemon.status === "frz") {
        this.add("-activate", pokemon, "ability: Magma Armor");
        pokemon.cureStatus();
      }
    },
    onImmunity(type, pokemon) {
      if (type === "frz") return false;
    },
    flags: {breakable: 1},
    name: "Magma Armor",
    rating: 0.5,
    num: 40
  },
  magnetpull: {
    onFoeTrapPokemon(pokemon) {
      if (pokemon.hasType("Steel") && pokemon.isAdjacent(this.effectState.target)) {
        pokemon.tryTrap(true);
      }
    },
    onFoeMaybeTrapPokemon(pokemon, source) {
      if (!source) source = this.effectState.target;
      if (!source || !pokemon.isAdjacent(source)) return;
      if (!pokemon.knownType || pokemon.hasType("Steel")) {
        pokemon.maybeTrapped = true;
      }
    },
    flags: {},
    name: "Magnet Pull",
    rating: 4,
    num: 42
  },
  marvelscale: {
    onModifyDefPriority: 6,
    onModifyDef(def, pokemon) {
      if (pokemon.status) {
        return this.chainModify(1.5);
      }
    },
    flags: {breakable: 1},
    name: "Marvel Scale",
    rating: 2.5,
    num: 63
  },
  megalauncher: {
    onBasePowerPriority: 19,
    onBasePower(basePower, attacker, defender, move) {
      if (move.flags["pulse"]) {
        return this.chainModify(1.5);
      }
    },
    flags: {},
    name: "Mega Launcher",
    rating: 3,
    num: 178
  },
  merciless: {
    onModifyCritRatio(critRatio, source, target) {
      if (target && ["psn", "tox"].includes(target.status)) return 5;
    },
    flags: {},
    name: "Merciless",
    rating: 1.5,
    num: 196
  },
  mimicry: {
    onSwitchInPriority: -1,
    onStart(pokemon) {
      this.singleEvent("TerrainChange", this.effect, this.effectState, pokemon);
    },
    onTerrainChange(pokemon) {
      let types;
      switch (this.field.terrain) {
        case "electricterrain":
          types = ["Electric"];
          break;
        case "grassyterrain":
          types = ["Grass"];
          break;
        case "mistyterrain":
          types = ["Fairy"];
          break;
        case "psychicterrain":
          types = ["Psychic"];
          break;
        default:
          types = pokemon.baseSpecies.types;
      }
      const oldTypes = pokemon.getTypes();
      if (oldTypes.join() === types.join() || !pokemon.setType(types)) return;
      if (this.field.terrain || pokemon.transformed) {
        this.add("-start", pokemon, "typechange", types.join("/"), "[from] ability: Mimicry");
        if (!this.field.terrain) this.hint("Transform Mimicry changes you to your original un-transformed types.");
      } else {
        this.add("-activate", pokemon, "ability: Mimicry");
        this.add("-end", pokemon, "typechange", "[silent]");
      }
    },
    flags: {},
    name: "Mimicry",
    rating: 0,
    num: 250
  },
  mindseye: {
    onTryBoost(boost, target, source, effect) {
      if (source && target === source) return;
      if (boost.accuracy && boost.accuracy < 0) {
        delete boost.accuracy;
        if (!effect.secondaries) {
          this.add("-fail", target, "unboost", "accuracy", "[from] ability: Mind's Eye", `[of] ${target}`);
        }
      }
    },
    onModifyMovePriority: -5,
    onModifyMove(move) {
      move.ignoreEvasion = true;
      if (!move.ignoreImmunity) move.ignoreImmunity = {};
    }
  }
};