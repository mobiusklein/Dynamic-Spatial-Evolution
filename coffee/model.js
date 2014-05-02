// Generated by CoffeeScript 1.7.1
var Arena, Blockade, EntityClassRegistery, FACINGS, Random, Seeker, Siderophore, SiderophoreProducer, StrainTree, Walker, alleleFrequency, extendHeritable, generateRandomGenome, mutate, mutationRate, ss, tajimaD, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

if (typeof module !== "undefined" && module !== null) {
  console.log("Running in Node Mode");
  _ = require('lodash');
  ss = require("simple-statistics");
  ss.mixin();
  Random = require('random-js').Random;
}

if (_ == null) {
  throw Error("Unable to find lodash");
}

if (Random == null) {
  throw Error("Unable to find random");
}

if (ss == null) {
  throw Error("Unable to find simple-statistics");
}

EntityClassRegistery = {};

StrainTree = {
  'strain-0': []
};

mutationRate = 0.2;

mutate = function(heritableTraitsBase, random) {
  var didMutate, heritableTraits, parentStrain, probMutate, trait, traitName;
  heritableTraits = _.cloneDeep(heritableTraitsBase);
  didMutate = false;
  for (traitName in heritableTraits) {
    if (/strain/.test(traitName)) {
      continue;
    }
    probMutate = random.random();
    if (traitName === 'genome') {
      probMutate = 0;
    }
    if (probMutate <= mutationRate) {
      trait = heritableTraits[traitName];
      trait.mutateFunction(trait, random);
      trait.currentValue = trait.cleanFunction(trait.currentValue);
      if (trait.currentValue < trait.minValue) {
        trait.currentValue = trait.minValue;
      }
      if (trait.currentValue > trait.maxValue) {
        trait.currentValue = trait.maxValue;
      }
      if (traitName !== "genome") {
        didMutate = true;
      }
    }
  }
  if (didMutate) {
    parentStrain = heritableTraits.strain.currentValue;
    heritableTraits.strain.currentValue = _.uniqueId("strain-");
    StrainTree[parentStrain].push(heritableTraits.strain.currentValue);
    StrainTree[heritableTraits.strain.currentValue] = [];
  }
  return heritableTraits;
};

extendHeritable = function(classType, newTraits) {
  var traitsCopy;
  traitsCopy = _.cloneDeep(classType.heritableTraits);
  traitsCopy = _.extend(traitsCopy, _.cloneDeep(newTraits));
  return traitsCopy;
};

generateRandomGenome = function(length) {
  var genome, i, rng, _i;
  rng = new Random();
  genome = [];
  for (i = _i = 0; 0 <= length ? _i < length : _i > length; i = 0 <= length ? ++_i : --_i) {
    genome.push(rng.choice([true, false]));
  }
  return genome;
};

alleleFrequency = function(genomeSet) {
  var freq, frequencies, genome, ind, q, _i, _j, _len, _ref;
  frequencies = [];
  for (ind = _i = 0, _ref = genomeSet[0].length; 0 <= _ref ? _i < _ref : _i > _ref; ind = 0 <= _ref ? ++_i : --_i) {
    freq = [0, 0];
    for (_j = 0, _len = genomeSet.length; _j < _len; _j++) {
      genome = genomeSet[_j];
      if (genome[ind]) {
        freq[0]++;
      } else {
        freq[1]++;
      }
    }
    freq = (function() {
      var _k, _len1, _results;
      _results = [];
      for (_k = 0, _len1 = freq.length; _k < _len1; _k++) {
        q = freq[_k];
        _results.push(q / genomeSet[0].length);
      }
      return _results;
    })();
    frequencies.push(freq);
  }
  return frequencies;
};

tajimaD = function(genomeSet) {
  var D, a1, a2, b1, b2, c1, c2, denominator, e1, e2, frequencies, i, locus, numSegSites, numerator, p, piEstimate, q, sampleSize, sum, _i, _len;
  frequencies = alleleFrequency(genomeSet);
  numSegSites = genomeSet[0].length;
  sampleSize = genomeSet.length;
  sum = 0;
  for (_i = 0, _len = frequencies.length; _i < _len; _i++) {
    locus = frequencies[_i];
    if (locus.some(function(g) {
      return g.length === genomeSet[0].length;
    })) {
      numSegSites--;
      continue;
    }
    p = locus[0], q = locus[1];
    sum += p * q;
  }
  piEstimate = sum * sampleSize / (sampleSize - 1);
  a1 = ((function() {
    var _j, _results;
    _results = [];
    for (i = _j = 1; 1 <= sampleSize ? _j < sampleSize : _j > sampleSize; i = 1 <= sampleSize ? ++_j : --_j) {
      _results.push(1 / i);
    }
    return _results;
  })()).sum();
  a2 = ((function() {
    var _j, _results;
    _results = [];
    for (i = _j = 1; 1 <= sampleSize ? _j < sampleSize : _j > sampleSize; i = 1 <= sampleSize ? ++_j : --_j) {
      _results.push(1 / (Math.pow(i, 2)));
    }
    return _results;
  })()).sum();
  b1 = (sampleSize + 1) / (3 * (sampleSize - 1));
  b2 = (2 * ((Math.pow(sampleSize, 2)) + sampleSize + 3)) / (9 * sampleSize * (sampleSize - 1));
  c1 = b1 - (1 / a1);
  c2 = b2 - ((sampleSize + 2) / (a1 * sampleSize)) + (a2 / (Math.pow(a1, 2)));
  e1 = c1 / a1;
  e2 = c2 / ((Math.pow(a1, 2)) + a2);
  numerator = piEstimate - (numSegSites / a1);
  console.log("pi Estimate: " + piEstimate + ", numSegSites: " + numSegSites);
  denominator = Math.pow(e1 * numSegSites + (e2 * numSegSites * (numSegSites - 1)), 0.5);
  D = numerator / denominator;
  return D;
};

Arena = (function() {
  function Arena(argObj) {
    this.minX = argObj.minX;
    this.maxX = argObj.maxX;
    this.minY = argObj.minY;
    this.maxY = argObj.maxY;
    this.ticker = 0;
    this.creationQueue = [];
    this.actors = [];
    this.walkers = [];
    this.blockades = [];
    this.periodics = [];
    this.save = argObj.save || false;
    this.verbose = argObj.verbose || false;
    this.positions = {};
    this.history = [];
    this.random = new Random(argObj.randomSeed != null ? argObj.randomSeed : 1);
  }

  Arena.prototype.setPosition = function(obj) {
    return obj.fillRegion(this);
  };

  Arena.prototype.addWalker = function(opts, force) {
    var walker;
    if (opts == null) {
      opts = {};
    }
    if (force == null) {
      force = false;
    }
    opts = this.randomPositionWithin(opts, force);
    opts.random = this.random;
    walker = new Walker(opts);
    this.walkers.push(walker);
    return this.setPosition(walker);
  };

  Arena.prototype.addSeeker = function(opts, force) {
    var seeker;
    if (opts == null) {
      opts = {};
    }
    if (force == null) {
      force = false;
    }
    opts = this.randomPositionWithin(opts, force);
    opts.random = this.random;
    seeker = new Seeker(opts);
    this.actors.push(seeker);
    return this.setPosition(seeker);
  };

  Arena.prototype.addPeriodicWalker = function(opts, force) {
    var fn, self;
    if (force == null) {
      force = false;
    }
    opts.frequency = opts.frequency || 20;
    fn = function() {
      self.addWalker(this.randomPositionWithin(opts, force));
    };
    fn.frequency = opts.frequency;
    self = this;
    return this.periodics.push(fn);
  };

  Arena.prototype.addObject = function(obj, force) {
    if (force == null) {
      force = false;
    }
    obj.random = this.random;
    this.randomPositionWithin(obj, force);
    if (obj instanceof Seeker) {
      return this.actors.push(obj);
    } else if (obj instanceof Walker) {
      return this.walkers.push(obj);
    } else if (obj instanceof Blockade) {
      return this.blockades.push(obj);
    } else {
      throw Error("Could not infer arena slot for " + obj);
    }
  };

  Arena.prototype.randomPositionWithin = function(opts, force) {
    if (opts == null) {
      opts = {};
    }
    if (force == null) {
      force = false;
    }
    if (force || (opts.x == null)) {
      opts.x = this.random.randint(0, this.maxX);
    }
    if (force || (opts.y == null)) {
      opts.y = this.random.randint(0, this.maxY);
    }
    opts.x = Math.floor(opts.x);
    opts.y = Math.floor(opts.y);
    if ((this.positions[opts.x] != null) && (this.positions[opts.x][opts.y] != null) && this.positions[opts.x][opts.y].some(function(entity) {
      return entity.isBlockade;
    })) {
      opts = this.randomPositionWithin(opts, true);
    }
    return opts;
  };

  Arena.prototype.pathClear = function(obj, newPos) {
    var lastX, lastY, solid, x, y, _i, _j, _ref, _ref1, _ref2, _ref3;
    lastX = obj.x;
    for (x = _i = _ref = obj.x, _ref1 = obj.x + newPos.x; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; x = _ref <= _ref1 ? ++_i : --_i) {
      if (this.positions[x] == null) {
        this.positions[x] = {};
      }
      lastY = obj.y;
      for (y = _j = _ref2 = obj.y, _ref3 = obj.y + newPos.y; _ref2 <= _ref3 ? _j <= _ref3 : _j >= _ref3; y = _ref2 <= _ref3 ? ++_j : --_j) {
        if (this.positions[x][y] == null) {
          this.positions[x][y] = [];
        }
        solid = this.positions[x][y].some(function(i) {
          return i.solid;
        });
        if (solid) {
          return [lastX - obj.x, lastY - obj.y];
        }
        lastY = y;
      }
      lastX = x;
    }
    return [newPos.x, newPos.y];
  };

  Arena.prototype.tick = function() {
    var actor, block, dead, deceased, died, self, survivors, walker, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1, _ref2, _ref3;
    if (this.save) {
      this.history.push(this.positions);
    }
    this.ticker += 1;
    this.positions = {};
    deceased = {};
    self = this;
    _ref = this.blockades;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      block = _ref[_i];
      this.setPosition(block);
    }
    _ref1 = this.walkers;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      walker = _ref1[_j];
      walker.step(this);
      this.setPosition(walker);
    }
    dead = [];
    _ref2 = this.actors;
    for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
      actor = _ref2[_k];
      dead = actor.step(this);
      for (_l = 0, _len3 = dead.length; _l < _len3; _l++) {
        died = dead[_l];
        deceased[died.id] = true;
      }
      this.setPosition(actor);
    }
    survivors = [];
    this.walkers.forEach(function(obj, i) {
      if (deceased[obj.id] == null) {
        survivors.push(obj);
      } else {
        obj.state = "dead";
      }
    });
    this.walkers = survivors;
    survivors = [];
    _ref3 = this.actors;
    for (_m = 0, _len4 = _ref3.length; _m < _len4; _m++) {
      actor = _ref3[_m];
      if (deceased[actor.id] == null) {
        survivors.push(actor);
      }
    }
    this.actors = survivors;
    this.periodics.forEach(function(func, i) {
      if (self.ticker % func.frequency === 0) {
        func.apply(self, null);
      }
    });
  };

  return Arena;

})();

EntityClassRegistery["Arena"] = Arena;

Blockade = (function() {
  Blockade.COUNT = 0;

  function Blockade(argObj) {
    this.id = "blockade-" + Blockade.COUNT;
    this.x = argObj.x;
    this.y = argObj.y;
    this.width = argObj.width;
    this.height = argObj.height;
    this.solid = true;
    this.isBlockade = true;
    this.isWalker = false;
    this.state = "";
    Blockade.COUNT++;
  }

  Blockade.prototype.fillRegion = function(boundsObj) {
    var maxX, maxY, minX, minY, x, xAxisRange, y, yAxisRange, _i, _len, _results;
    minX = this.x - this.width;
    minY = this.y - this.height;
    minX = minX >= 0 ? minX : 0;
    minY = minY >= 0 ? minY : 0;
    maxX = this.x + this.width;
    maxY = this.y + this.height;
    maxX = maxX > this.maxX ? this.maxX : maxX;
    maxY = maxY > this.maxY ? this.maxY : maxY;
    xAxisRange = (function() {
      var _i, _results;
      _results = [];
      for (x = _i = minX; minX <= maxX ? _i <= maxX : _i >= maxX; x = minX <= maxX ? ++_i : --_i) {
        _results.push(x);
      }
      return _results;
    })();
    yAxisRange = (function() {
      var _i, _results;
      _results = [];
      for (y = _i = minY; minY <= maxY ? _i <= maxY : _i >= maxY; y = minY <= maxY ? ++_i : --_i) {
        _results.push(y);
      }
      return _results;
    })();
    _results = [];
    for (_i = 0, _len = xAxisRange.length; _i < _len; _i++) {
      x = xAxisRange[_i];
      _results.push((function() {
        var _j, _len1, _results1;
        _results1 = [];
        for (_j = 0, _len1 = yAxisRange.length; _j < _len1; _j++) {
          y = yAxisRange[_j];
          if (boundsObj.positions[x] == null) {
            boundsObj.positions[x] = {};
          }
          if (boundsObj.positions[x][y] == null) {
            boundsObj.positions[x][y] = [];
          }
          _results1.push(boundsObj.positions[x][y].push(this));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  return Blockade;

})();

EntityClassRegistery["Blockade"] = Blockade;

Walker = (function() {
  Walker.WALKER_COUNT = 0;

  function Walker(argObj) {
    this.id = "walker-" + Walker.WALKER_COUNT;
    this.x = argObj.x;
    this.y = argObj.y;
    this.size = (argObj.size != null ? argObj.size : 1);
    this.stepSize = (argObj.stepSize != null ? argObj.stepSize : 1);
    this.state = argObj.state;
    this.type = argObj.type;
    this.solid = false;
    this.value = argObj.value != null ? argObj.value : 1;
    this.age = 0;
    this.isBlockade = false;
    this.isWalker = true;
    this.mark = false;
    Walker.WALKER_COUNT += 1;
    this.random = argObj.random ? argObj.random : new Random(1);
    this.stepStartHook = argObj.stepStartHook != null ? argObj.stepStartHook : {};
    this.preMoveHook = argObj.preMoveHook != null ? argObj.preMoveHook : {};
    this.postMoveHook = argObj.postMoveHook != null ? argObj.postMoveHook : {};
    this.stepEndHook = argObj.stepEndHook != null ? argObj.stepEndHook : {};
    this.postMoveHook["unstuck"] = this.unstuck;
  }

  Walker.prototype.stepStart = function(boundsObj) {
    var fn, fnName, _results;
    _results = [];
    for (fnName in this.stepStartHook) {
      fn = this.stepStartHook[fnName];
      _results.push(fn.apply(this, [boundsObj]));
    }
    return _results;
  };

  Walker.prototype.preMove = function(boundsObj) {
    var fn, fnName, _results;
    _results = [];
    for (fnName in this.preMoveHook) {
      fn = this.preMoveHook[fnName];
      _results.push(fn.apply(this, [boundsObj]));
    }
    return _results;
  };

  Walker.prototype.postMove = function(boundsObj) {
    var fn, fnName, _results;
    _results = [];
    for (fnName in this.postMoveHook) {
      fn = this.postMoveHook[fnName];
      _results.push(fn.apply(this, [boundsObj]));
    }
    return _results;
  };

  Walker.prototype.stepEnd = function(boundsObj) {
    var fn, fnName, _results;
    _results = [];
    for (fnName in this.stepEndHook) {
      fn = this.stepEndHook[fnName];
      _results.push(fn.apply(this, [boundsObj]));
    }
    return _results;
  };

  Walker.prototype.unstuck = function(boundsObj) {
    if ((boundsObj.positions[this.x] != null) && (boundsObj.positions[this.x][this.y] != null) && boundsObj.positions[this.x][this.y].some(function(obj) {
      return obj instanceof Blockade;
    })) {
      console.log("Unstuck! " + this.id);
      return boundsObj.randomPositionWithin(this, true);
    }
  };

  Walker.prototype.onEaten = function(eater) {
    return eater.totalFood += this.value;
  };

  Walker.prototype.step = function(boundsObj) {
    var newX, newY, _ref;
    this.age += 1;
    this.stepStart(boundsObj);
    this.preMove(boundsObj);
    newX = this.random.randint(-this.stepSize, this.stepSize);
    newY = this.random.randint(-this.stepSize, this.stepSize);
    _ref = boundsObj.pathClear(this, {
      x: newX,
      y: newY
    }), newX = _ref[0], newY = _ref[1];
    this.x += newX;
    this.y += newY;
    this.within(boundsObj);
    this.postMove(boundsObj);
    return this.stepEnd(boundsObj);
  };

  Walker.prototype.within = function(boundsObj, escape) {
    if (escape == null) {
      escape = true;
    }
    if (this.x <= boundsObj.minX) {
      if (escape) {
        this.x += this.stepSize * 1 + this.size;
      }
    } else {
      if (this.x >= boundsObj.maxX) {
        if (escape) {
          this.x -= this.stepSize * 1 + this.size;
        }
      }
    }
    if (this.y <= boundsObj.minY) {
      if (escape) {
        this.y += this.stepSize * 1 + this.size;
      }
    } else {
      if (this.y >= boundsObj.maxY) {
        if (escape) {
          this.y -= this.stepSize * 1 + this.size;
        }
      }
    }
  };

  Walker.prototype.fillRegion = function(boundsObj) {
    var maxX, maxY, minX, minY, x, xAxisRange, y, yAxisRange, _i, _len, _results;
    minX = this.x - this.size;
    minY = this.y - this.size;
    minX = minX >= 0 ? minX : 0;
    minY = minY >= 0 ? minY : 0;
    maxX = this.x + this.size;
    maxY = this.y + this.size;
    maxX = maxX > this.maxX ? this.maxX : maxX;
    maxY = maxY > this.maxY ? this.maxY : maxY;
    xAxisRange = (function() {
      var _i, _results;
      _results = [];
      for (x = _i = minX; minX <= maxX ? _i <= maxX : _i >= maxX; x = minX <= maxX ? ++_i : --_i) {
        _results.push(x);
      }
      return _results;
    })();
    yAxisRange = (function() {
      var _i, _results;
      _results = [];
      for (y = _i = minY; minY <= maxY ? _i <= maxY : _i >= maxY; y = minY <= maxY ? ++_i : --_i) {
        _results.push(y);
      }
      return _results;
    })();
    _results = [];
    for (_i = 0, _len = xAxisRange.length; _i < _len; _i++) {
      x = xAxisRange[_i];
      _results.push((function() {
        var _j, _len1, _results1;
        _results1 = [];
        for (_j = 0, _len1 = yAxisRange.length; _j < _len1; _j++) {
          y = yAxisRange[_j];
          if (boundsObj.positions[x] == null) {
            boundsObj.positions[x] = {};
          }
          if (boundsObj.positions[x][y] == null) {
            boundsObj.positions[x][y] = [];
          }
          _results1.push(boundsObj.positions[x][y].push(this));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  return Walker;

})();

EntityClassRegistery["Walker"] = Walker;

FACINGS = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

Seeker = (function(_super) {
  __extends(Seeker, _super);

  Seeker.SEEKER_COUNT = 0;

  Seeker.baseGenome = generateRandomGenome(100);

  Seeker.heritableTraits = {
    stepSize: {
      baseValue: 5,
      currentValue: 5,
      minValue: 1,
      maxValue: 100,
      gaussMean: -0.8,
      gaussVariance: 3,
      mutateFunction: function(trait, random) {
        var mod;
        mod = random.gauss(trait.gaussMean, trait.gaussVariance);
        return trait.currentValue += mod;
      },
      cleanFunction: Math.round
    },
    genome: {
      baseValue: Seeker.baseGenome,
      currentValue: Seeker.baseGenome,
      perBaseMutationRate: 0.0001,
      mutateFunction: function(trait, random) {
        var i, mutatedIndices, numMutatedIndices, _i, _len, _results;
        numMutatedIndices = trait.currentValue.length * trait.perBaseMutationRate;
        mutatedIndices = random.sample((function() {
          var _i, _ref, _results;
          _results = [];
          for (i = _i = 0, _ref = trait.currentValue.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
            _results.push(i);
          }
          return _results;
        })(), numMutatedIndices);
        _results = [];
        for (_i = 0, _len = mutatedIndices.length; _i < _len; _i++) {
          i = mutatedIndices[_i];
          _results.push(trait.currentValue[i] = !trait.currentValue[i]);
        }
        return _results;
      },
      cleanFunction: function(g) {
        return g;
      }
    },
    strain: {
      currentValue: "strain-0"
    }
  };

  function Seeker(argObj) {
    Seeker.__super__.constructor.call(this, argObj);
    this.id = "seeker-" + Seeker.SEEKER_COUNT;
    this.canEat = argObj.canEat != null ? argObj.canEat : ['food'];
    this.solid = true;
    this.facing = (argObj.facing == null ? [1, 1] : argObj.facing);
    this.tumbleFrequency = argObj.tumbleFrequency || [0.01, 0.1];
    this.heritableTraits = argObj.heritableTraits == null ? _.cloneDeep(Seeker.heritableTraits) : argObj.heritableTraits;
    this.size = (argObj.size == null ? 5 : argObj.size);
    this.stepSize = (argObj.stepSize == null ? 5 : argObj.stepSize);
    this.totalFood = argObj.startingFood || 75;
    this.minimumReplicationFoodThreshold = argObj.minimumReplicationFoodThreshold || 300;
    this.BMR = argObj.BMR || function(optsObj) {
      return this.totalFood -= (this.stepSize + (this.stepSize - this.heritableTraits.stepSize.baseValue)) / 1000;
    };
    this.minimumReplicationDelay = argObj.minimumReplicationDelay || 10;
    this.eaten = 0;
    this.lastEaten = [0, 0, 0];
    Seeker.SEEKER_COUNT += 1;
    this.inherit();
  }

  Seeker.prototype.step = function(boundsObj) {
    var actionChoice, close, closeThings, diffEaten, newFacing, newX, newY, o, remove, tumbleProb, _i, _j, _len, _len1, _ref, _ref1;
    this.age += 1;
    this.stepStart(boundsObj);
    this.BMR();
    diffEaten = (this.eaten - this.lastEaten[0]) > (this.lastEaten[0] - this.lastEaten[1]);
    tumbleProb = (diffEaten ? this.tumbleFrequency[0] : this.tumbleFrequency[1]);
    actionChoice = this.random.random();
    if (actionChoice < tumbleProb) {
      newFacing = this.facing;
      while (this.facing === newFacing) {
        this.facing = this.random.choice(FACINGS);
      }
    }
    this.lastEaten.unshift(this.eaten);
    if (this.lastEaten.length > 2) {
      this.lastEaten.pop();
    }
    this.eaten = 0;
    closeThings = this.sense(boundsObj);
    remove = [];
    for (_i = 0, _len = closeThings.length; _i < _len; _i++) {
      close = closeThings[_i];
      for (_j = 0, _len1 = close.length; _j < _len1; _j++) {
        o = close[_j];
        if ((_ref = o.type, __indexOf.call(this.canEat, _ref) >= 0) && !o.mark) {
          o.onEaten(this);
          this.eaten += 1;
          o.mark = true;
          remove.push(o);
          if (this.totalFood > this.minimumReplicationFoodThreshold && this.age > this.minimumReplicationDelay) {
            this.replicate(boundsObj);
            remove.push(this);
            return remove;
          }
        }
      }
    }
    this.preMove(boundsObj);
    newX = this.stepSize * this.facing[0];
    newY = this.stepSize * this.facing[1];
    _ref1 = boundsObj.pathClear(this, {
      x: newX,
      y: newY
    }), newX = _ref1[0], newY = _ref1[1];
    this.x += newX;
    this.y += newY;
    this.within(boundsObj);
    this.postMove(boundsObj);
    if (this.totalFood < 0) {
      this.mark = true;
      remove.push(this);
    } else if (this.totalFood > this.minimumReplicationFoodThreshold && this.age > this.minimumReplicationDelay) {
      this.replicate(boundsObj);
      this.mark = true;
      remove.push(this);
      return remove;
    } else if (this.totalFood < 50) {
      this.state = "starving";
    } else {
      this.state = "";
    }
    this.stepEnd(boundsObj);
    return remove;
  };

  Seeker.prototype.within = function(boundsObj, escape) {
    var corrected;
    if (escape == null) {
      escape = true;
    }
    corrected = false;
    if (this.x <= boundsObj.minX) {
      corrected = true;
      if (escape) {
        this.x += this.stepSize * 1;
        this.facing[0] *= -1;
      }
    } else if (this.x >= boundsObj.maxX) {
      corrected = true;
      if (escape) {
        this.x -= this.stepSize * 1;
        this.facing[0] *= -1;
      }
    }
    if (this.y <= boundsObj.minY) {
      corrected = true;
      if (escape) {
        this.y += this.stepSize * 1;
        this.facing[1] *= -1;
      }
    } else if (this.y >= boundsObj.maxY) {
      corrected = true;
      if (escape) {
        this.facing[1] *= -1;
        this.y -= this.stepSize * 1;
      }
    }
  };

  Seeker.prototype.sense = function(arenaObj) {
    var beingsSensed, maxX, maxY, midX, midY, minX, minY, other, self, x, y, _i, _j, _k, _len, _ref;
    midX = this.x;
    midY = this.y;
    maxX = midX + (this.size + 1);
    maxY = midY + (this.size + 1);
    minX = midX - (this.size + 1);
    minY = midY - (this.size + 1);
    beingsSensed = [];
    self = this;
    for (x = _i = minX; minX <= maxX ? _i <= maxX : _i >= maxX; x = minX <= maxX ? ++_i : --_i) {
      if (x < 0) {
        continue;
      }
      if (x > arenaObj.maxX) {
        continue;
      }
      for (y = _j = minY; minY <= maxY ? _j <= maxY : _j >= maxY; y = minY <= maxY ? ++_j : --_j) {
        if (y < 0) {
          continue;
        }
        if (y > arenaObj.maxY) {
          continue;
        }
        if (arenaObj.positions[x] != null) {
          if (arenaObj.positions[x][y] != null) {
            _ref = arenaObj.positions[x][y];
            for (_k = 0, _len = _ref.length; _k < _len; _k++) {
              other = _ref[_k];
              if (other.id !== this.id) {
                beingsSensed.push(arenaObj.positions[x][y]);
              }
            }
          }
        }
      }
    }
    return beingsSensed;
  };

  Seeker.prototype.death = function(boundsObj) {
    console.log(this.id + " died");
    return this.mark = true;
  };

  Seeker.prototype.replicate = function(boundsObj) {
    var traits;
    this.mark = true;
    traits = this;
    traits.heritableTraits = mutate(this.heritableTraits, this.random);
    boundsObj.addSeeker(traits);
    traits.heritableTraits = mutate(this.heritableTraits, this.random);
    boundsObj.addSeeker(traits);
  };

  Seeker.prototype.inherit = function() {
    var traitName, _results;
    _results = [];
    for (traitName in this.heritableTraits) {
      _results.push(this[traitName] = this.heritableTraits[traitName].currentValue);
    }
    return _results;
  };

  return Seeker;

})(Walker);

EntityClassRegistery["Seeker"] = Seeker;

Siderophore = (function(_super) {
  __extends(Siderophore, _super);

  Siderophore.maturationTime = 30;

  Siderophore.matureValue = 6;

  function Siderophore(argObj) {
    if (argObj.stepStartHook == null) {
      argObj.stepStartHook = {};
    }
    argObj.stepStartHook["react"] = (function(paramObj) {
      if (this.age > Siderophore.maturationTime && !this.reacted) {
        return this.react();
      }
    });
    argObj.type = 'siderophore';
    argObj.value = 0;
    argObj.size = 2;
    Siderophore.__super__.constructor.call(this, argObj);
    this.reacted = false;
    this.spawnedBy = argObj.spawnedBy;
  }

  Siderophore.prototype.react = function() {
    this.reacted = true;
    this.type = 'bound-siderophore';
    return this.value = Siderophore.matureValue;
  };

  return Siderophore;

})(Walker);

EntityClassRegistery["Siderophore"] = Siderophore;

SiderophoreProducer = (function(_super) {
  __extends(SiderophoreProducer, _super);

  SiderophoreProducer.siderophoreCost = 3;

  SiderophoreProducer.siderophoreProductionRate = 30;

  SiderophoreProducer.COUNT = 0;

  SiderophoreProducer.heritableTraits = extendHeritable(Seeker, {
    siderophoreProductionRate: {
      baseValue: 30,
      currentValue: 30,
      minValue: 10,
      maxValue: 100,
      gaussMean: 1.2,
      gaussVariance: 3,
      mutateFunction: function(trait, random) {
        var mod;
        mod = random.gauss(trait.gaussMean, trait.gaussVariance);
        return trait.currentValue += mod;
      },
      cleanFunction: Math.round
    }
  });

  function SiderophoreProducer(argObj) {
    if (argObj.canEat == null) {
      argObj.canEat = [];
    }
    if (!(__indexOf.call(argObj.canEat, 'bound-siderophore') >= 0)) {
      argObj.canEat.push('bound-siderophore');
    }
    if (!(__indexOf.call(argObj.canEat, 'glucose') >= 0)) {
      argObj.canEat.push('glucose');
    }
    argObj.type = 'siderophore-producer';
    argObj.heritableTraits = argObj.heritableTraits == null ? _.cloneDeep(SiderophoreProducer.heritableTraits) : argObj.heritableTraits;
    if (argObj.stepStartHook == null) {
      argObj.stepStartHook = {};
    }
    argObj.stepStartHook['produceSiderophore'] = (function(paramObj) {
      if ((this.age % this.siderophoreProductionRate === 0) && (this.totalFood > 50)) {
        return this.produceSiderophore(paramObj);
      }
    });
    SiderophoreProducer.__super__.constructor.call(this, argObj);
    this.id = "siderophore-producer-" + SiderophoreProducer.COUNT++;
  }

  SiderophoreProducer.prototype.produceSiderophore = function(boundsObj) {
    var pos, siderophore;
    this.totalFood -= SiderophoreProducer.siderophoreCost;
    pos = {
      x: this.x,
      y: this.y,
      spawnedBy: this.id
    };
    siderophore = new Siderophore(pos);
    return boundsObj.addObject(siderophore);
  };

  SiderophoreProducer.prototype.replicate = function(boundsObj) {
    var daughterA, daughterB, traits;
    traits = this;
    traits.heritableTraits = mutate(this.heritableTraits, this.random);
    daughterA = new SiderophoreProducer(traits);
    traits.heritableTraits = mutate(this.heritableTraits, this.random);
    daughterB = new SiderophoreProducer(traits);
    boundsObj.addObject(daughterA);
    boundsObj.addObject(daughterB);
    this.mark = true;
  };

  return SiderophoreProducer;

})(Seeker);

try {
  exports.Walker = Walker;
  exports.Seeker = Seeker;
  exports.Arena = Arena;
  exports.Siderophore = Siderophore;
  exports.SiderophoreProducer = SiderophoreProducer;
  exports.EntityClassRegistery = EntityClassRegistery;
  exports.StrainTree = StrainTree;
  exports.mutate = mutate;
  exports.Utils = {};
} catch (_error) {}

//# sourceMappingURL=model.map
